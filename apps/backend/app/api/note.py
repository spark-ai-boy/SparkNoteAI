# 笔记 API

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import zipfile
import io
import os

from ..core.database import get_db
from ..core.logger import get_logger
from ..models.note import Note, Tag, NoteTag
from ..models.knowledge_graph import GraphNode, GraphEdge
from ..models.user import User
from .auth import get_current_user

logger = get_logger(__name__)

router = APIRouter(prefix="/notes", tags=["notes"])


# Schemas
class NoteCreate(BaseModel):
    title: str = "无标题"
    content: str = ""
    summary: Optional[str] = ""
    tag_ids: Optional[List[int]] = []
    platform: Optional[str] = "original"  # original, wechat, xiaohongshu, bilibili, youtube, other
    source_url: Optional[str] = ""


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    tag_ids: Optional[List[int]] = []
    platform: Optional[str] = None
    source_url: Optional[str] = None


class NoteResponse(BaseModel):
    id: int
    title: str
    content: str
    summary: str
    user_id: int
    platform: str  # original, wechat, xiaohongshu, bilibili, youtube, other
    source_url: Optional[str] = ""
    created_at: datetime
    updated_at: datetime
    tags: List[str]  # 标签名称（保持向后兼容）
    tag_ids: List[int]  # 标签 ID

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, note: "Note") -> "NoteResponse":
        """从 Note 模型创建响应，将 tags 转换为字符串列表"""
        return cls(
            id=note.id,
            title=note.title,
            content=note.content,
            summary=note.summary,
            user_id=note.user_id,
            platform=note.platform or "original",
            source_url=note.source_url or "",
            created_at=note.created_at,
            updated_at=note.updated_at,
            tags=note.tag_names,
            tag_ids=[tag.tag_id for tag in note.tags],
        )


class NoteListResponse(BaseModel):
    items: List[NoteResponse]
    total: int
    page: int
    size: int
    pages: int


@router.post("/", response_model=NoteResponse)
async def create_note(
    note_data: NoteCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建新笔记"""
    db_note = Note(
        title=note_data.title,
        content=note_data.content,
        summary=note_data.summary or "",
        user_id=current_user.id,
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)

    # 如果未提供摘要且开启了自动总结，后台生成
    if not note_data.summary and note_data.content:
        from ..services.summary_generator import generate_summary
        from ..models.integration import FeatureSetting as FeatureSettingModel
        try:
            notes_feature = db.query(FeatureSettingModel).filter(
                FeatureSettingModel.user_id == current_user.id,
                FeatureSettingModel.feature_id == "notes"
            ).first()
            auto_summarize = True
            if notes_feature and notes_feature.custom_settings:
                auto_summarize = notes_feature.custom_settings.get("auto_summarize", True)

            if auto_summarize:
                summary = await generate_summary(db, current_user.id, note_data.content)
                if summary:
                    db_note.summary = summary
                    db.commit()
                    logger.info(f"笔记摘要生成成功: note_id={db_note.id}, user_id={current_user.id}")
                else:
                    logger.warning(f"笔记摘要生成返回空: note_id={db_note.id}, user_id={current_user.id}")
        except Exception as e:
            logger.error(f"笔记摘要生成异常: note_id={db_note.id}, user_id={current_user.id}, error={e}")

        # 自动提取标签（如果开启）
        try:
            auto_extract_tags = False
            extract_tags_count = 3
            if notes_feature and notes_feature.custom_settings:
                auto_extract_tags = notes_feature.custom_settings.get("auto_extract_tags", False)
                extract_tags_count = notes_feature.custom_settings.get("extract_tags_count", 3)

            if auto_extract_tags:
                from ..services.summary_generator import extract_tags_with_llm
                from ..models.note import Tag
                tag_names = await extract_tags_with_llm(
                    db, current_user.id, note_data.content, tag_count=extract_tags_count
                )
                for tag_name in tag_names:
                    tag = db.query(Tag).filter(
                        Tag.name == tag_name,
                        Tag.user_id == current_user.id
                    ).first()
                    if tag:
                        note_tag = NoteTag(note_id=db_note.id, tag_id=tag.id)
                        db.add(note_tag)
                db.commit()
                db.refresh(db_note)
        except Exception as e:
            logger.error(f"笔记自动提取标签异常: note_id={db_note.id}, user_id={current_user.id}, error={e}")

    # 添加标签关联
    if note_data.tag_ids:
        for tag_id in note_data.tag_ids:
            note_tag = NoteTag(note_id=db_note.id, tag_id=tag_id)
            db.add(note_tag)
        db.commit()
        db.refresh(db_note)

    logger.info(f"笔记创建成功: note_id={db_note.id}, user_id={current_user.id}, title={db_note.title}")

    # 后台触发知识图谱构建（只更新当前笔记的概念）
    background_tasks.add_task(trigger_graph_update_for_note, current_user.id, db_note.id)

    return NoteResponse.from_orm(db_note)


@router.get("/", response_model=NoteListResponse)
def get_notes(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    tag: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取笔记列表（支持分页、搜索、标签筛选）"""
    query = db.query(Note).filter(Note.user_id == current_user.id)

    if search:
        query = query.filter(
            (Note.title.ilike(f"%{search}%")) | (Note.content.ilike(f"%{search}%"))
        )

    if tag:
        query = (
            query.join(NoteTag)
            .join(Tag)
            .filter(Tag.name.ilike(f"%{tag}%"))
        )

    total = query.count()
    pages = (total + size - 1) // size

    notes = query.order_by(Note.updated_at.desc()).offset((page - 1) * size).limit(size).all()

    # 手动加载 tags 关联以避免 N+1 查询
    for note in notes:
        _ = note.tag_names  # 预加载标签

    return NoteListResponse(
        items=[NoteResponse.from_orm(note) for note in notes],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


# Tags API - 放在动态路由 {note_id} 之前
class TagCreate(BaseModel):
    name: str
    color: Optional[str] = "#666666"


class TagResponse(BaseModel):
    id: int
    name: str
    color: str
    user_id: Optional[int] = None

    class Config:
        from_attributes = True


@router.get("/tags", response_model=List[TagResponse])
def get_tags(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取所有标签"""
    # 获取用户标签和系统标签
    tags = db.query(Tag).filter((Tag.user_id == current_user.id) | (Tag.user_id.is_(None))).all()
    return tags


@router.post("/tags", response_model=TagResponse)
def create_tag(
    tag_data: TagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建新标签"""
    # 检查是否已存在
    existing = db.query(Tag).filter(Tag.name == tag_data.name, Tag.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="标签已存在")

    db_tag = Tag(
        name=tag_data.name,
        color=tag_data.color,
        user_id=current_user.id,
    )
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag


@router.delete("/tags/{tag_id}")
def delete_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除标签（同时移除所有笔记的该标签关联）"""
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == current_user.id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="标签不存在")

    # 删除所有关联的 NoteTag（级联删除已在模型中配置）
    db.delete(tag)
    db.commit()

    return {"message": "标签已删除"}


@router.get("/export")
def export_notes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """导出所有笔记为 ZIP 压缩包"""
    # 查询当前用户的所有笔记
    notes = db.query(Note).filter(Note.user_id == current_user.id).all()

    if not notes:
        raise HTTPException(status_code=404, detail="暂无笔记可导出")

    # 在内存中创建 ZIP 文件
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for note in notes:
            # 生成 Markdown 内容（包含 Front Matter）
            md_content = f"# {note.title}\n\n"
            if note.source_url:
                md_content += f"来源：{note.source_url}\n\n"
            if note.tag_names:
                md_content += f"标签：{', '.join(note.tag_names)}\n\n"
            if note.summary:
                md_content += f"摘要：{note.summary}\n\n"
            md_content += note.content

            # 创建安全的文件名（移除非法字符）
            safe_title = "".join(c for c in note.title if c not in r'\/:*?"<>|')
            safe_title = safe_title.strip() or f"note_{note.id}"
            filename = f"{safe_title}.md"

            # 添加到 ZIP
            zip_file.writestr(filename, md_content)

    zip_buffer.seek(0)

    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={
            "Content-Disposition": "attachment; filename=sparknoteai_notes_export.zip"
        }
    )


@router.get("/{note_id}", response_model=NoteResponse)
def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取单个笔记详情"""
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    return NoteResponse.from_orm(note)


@router.put("/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: int,
    note_data: NoteUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新笔记"""
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")

    # 更新字段
    update_data = note_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field != "tag_ids":
            setattr(note, field, value)

    # 更新标签关联
    if "tag_ids" in update_data:
        # 删除旧关联
        db.query(NoteTag).filter(NoteTag.note_id == note_id).delete()
        db.commit()  # 先提交删除操作
        # 添加新关联
        for tag_id in note_data.tag_ids or []:
            note_tag = NoteTag(note_id=note_id, tag_id=tag_id)
            db.add(note_tag)

    db.commit()  # 提交更改
    db.refresh(note)  # 刷新对象

    # 重新加载 tags 关系
    _ = note.tags  # 加载关联

    logger.info(f"笔记更新成功: note_id={note_id}, user_id={current_user.id}, title={note.title}")

    # 后台触发知识图谱构建（只更新当前笔记的概念）
    background_tasks.add_task(trigger_graph_update_for_note, current_user.id, note_id)

    return NoteResponse.from_orm(note)


async def trigger_graph_update_for_note(user_id: int, note_id: int):
    """后台任务：更新单个笔记的知识图谱概念和关系"""
    from app.core.database import SessionLocal
    from app.services.knowledge_graph import KnowledgeGraphService
    from app.models.integration import Integration, FeatureSetting
    from app.models.note import Note as NoteModel

    db = SessionLocal()
    try:
        note = db.query(NoteModel).filter(NoteModel.id == note_id).first()
        if not note:
            logger.warning(f"知识图谱更新跳过：笔记不存在, note_id={note_id}")
            return

        # 获取 LLM 集成配置
        feature_setting = db.query(FeatureSetting).filter(
            FeatureSetting.user_id == user_id,
            FeatureSetting.feature_id == "knowledge_graph"
        ).first()

        integration = None
        if feature_setting and feature_setting.integration_refs:
            llm_key = feature_setting.integration_refs.get("llm")
            if llm_key:
                integration = db.query(Integration).filter(
                    Integration.user_id == user_id,
                    Integration.integration_type == "llm",
                    Integration.config_key == llm_key,
                    Integration.is_enabled == True
                ).first()

        if not integration or not integration.config or not integration.config.get("api_key"):
            logger.info(f"知识图谱更新跳过：LLM 配置不存在, note_id={note_id}, user_id={user_id}")
            return

        # 使用服务执行增量更新
        logger.info(f"开始知识图谱增量更新: note_id={note_id}, user_id={user_id}")
        service = KnowledgeGraphService(db, user_id)
        await service.incremental_update_for_note(note, integration)
        logger.info(f"知识图谱增量更新完成: note_id={note_id}, user_id={user_id}")

    except Exception as e:
        logger.error(f"知识图谱更新异常: note_id={note_id}, user_id={user_id}, error={e}", exc_info=True)
    finally:
        db.close()


async def cleanup_graph_after_note_delete(user_id: int, note_id: int):
    """后台任务：删除笔记后清理知识图谱"""
    from app.core.database import SessionLocal
    from app.services.knowledge_graph import KnowledgeGraphService

    db = SessionLocal()
    try:
        logger.info(f"开始清理知识图谱孤立节点: note_id={note_id}, user_id={user_id}")
        service = KnowledgeGraphService(db, user_id)
        stats = service.cleanup_graph_after_note_delete(note_id)
        logger.info(f"知识图谱清理完成: note_id={note_id}, user_id={user_id}, stats={stats}")
    except Exception as e:
        logger.error(f"知识图谱清理异常: note_id={note_id}, user_id={user_id}, error={e}")
    finally:
        db.close()


@router.delete("/{note_id}")
def delete_note(
    note_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除笔记"""
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")

    logger.info(f"笔记删除中: note_id={note_id}, user_id={current_user.id}, title={note.title}")
    db.delete(note)
    db.commit()

    # 后台触发知识图谱清理
    background_tasks.add_task(cleanup_graph_after_note_delete, current_user.id, note_id)

    return {"message": "笔记已删除"}
