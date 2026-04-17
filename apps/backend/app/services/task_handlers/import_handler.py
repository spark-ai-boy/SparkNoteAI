"""
导入任务处理器
处理从微信公众号、小红书等平台导入内容的任务
"""

from typing import Any, Dict
from datetime import datetime

from sqlalchemy.orm import Session

from .base import TaskHandler, ProgressCallback
from ...core.database import SessionLocal
from ...core.logger import get_logger
from ...models.note import Note, Tag, NoteTag
from ...models.task import TaskStatus
from ..importers.factory import ImporterFactory
from ..image_cache import ImageCacheService
from ..summary_generator import generate_summary

logger = get_logger(__name__)


class ImportTaskHandler(TaskHandler):
    """内容导入任务处理器"""

    @property
    def task_type(self) -> str:
        return "import"

    def validate_metadata(self, metadata: Dict[str, Any]) -> None:
        """验证导入任务参数"""
        if not metadata.get("url"):
            raise ValueError("缺少 URL 参数")

    async def execute(
        self,
        task_id: int,
        user_id: int,
        metadata: Dict[str, Any],
        progress_callback: ProgressCallback,
    ) -> Dict[str, Any]:
        """
        执行导入任务

        Returns:
            {"note_id": int, "title": str, "platform": str}
        """
        db = SessionLocal()
        try:
            url = metadata.get("url")
            platform = metadata.get("platform", "wechat")

            logger.info(f"开始导入任务: task_id={task_id}, user_id={user_id}, url={url}, platform={platform}")
            await progress_callback(5, "正在获取页面信息...")

            # 获取导入器并提取标题
            importer = ImporterFactory.get_importer(platform, image_cache_service=None)
            try:
                extracted_title = await importer.extract_title(url)
                if extracted_title:
                    # 更新任务标题
                    from ...models.task import Task
                    task = db.query(Task).filter(Task.id == task_id).first()
                    if task:
                        task.title = extracted_title
                        db.commit()
            except Exception as e:
                logger.warning(f"导入任务提取标题失败: task_id={task_id}, error={e}")

            await progress_callback(20, "正在抓取内容...")

            result = await importer.import_from_url(url)

            await progress_callback(50, "内容解析完成")

            await progress_callback(60, "正在缓存图片...")
            image_cache_service = ImageCacheService(db, user_id=user_id)

            if hasattr(importer, 'cache_images_in_content'):
                importer.image_cache_service = image_cache_service
                result.content = await importer.cache_images_in_content(result.content)

            await progress_callback(80, "正在保存笔记...")

            note = Note(
                title=result.title,
                content=result.content,
                summary="",
                user_id=user_id,
                platform=result.platform,
                source_url=url,
            )
            db.add(note)
            db.commit()

            # 生成摘要
            try:
                summary = await generate_summary(db, user_id, result.content)
                if summary:
                    note.summary = summary
                    db.commit()
            except Exception as e:
                logger.error(f"导入任务生成摘要失败: task_id={task_id}, user_id={user_id}, error={e}")

            # 注意：不再将平台原始标签（如小红书的 #话题）创建为系统标签
            # 这些标签已保留在笔记内容的 markdown 中，供展示用

            await progress_callback(90, "正在更新知识图谱...")

            # 创建知识图谱增量更新任务（异步执行）
            await self._create_graph_update_task(db, user_id, note.id)

            await progress_callback(100, "导入完成")

            logger.info(f"导入任务完成: task_id={task_id}, user_id={user_id}, note_id={note.id}, title={note.title}")
            return {
                "note_id": note.id,
                "title": note.title,
                "platform": result.platform,
            }

        finally:
            db.close()

    async def _create_graph_update_task(self, db: Session, user_id: int, note_id: int) -> None:
        """创建知识图谱增量更新任务"""
        from ...models.note import Note as NoteModel
        from ...models.task import Task, TaskStatus
        from ...models.integration import Integration, FeatureSetting
        import json

        # 获取知识图谱场景配置
        feature_setting = db.query(FeatureSetting).filter(
            FeatureSetting.user_id == user_id,
            FeatureSetting.feature_id == "knowledge_graph"
        ).first()

        # 检查是否开启了自动增量更新
        if feature_setting and feature_setting.custom_settings:
            auto_update = feature_setting.custom_settings.get("auto_incremental_update", True)
        else:
            auto_update = True  # 默认开启

        if not auto_update:
            logger.info(f"跳过知识图谱更新：自动增量更新已关闭, user_id={user_id}, note_id={note_id}")
            return

        # 获取 LLM 集成配置
        integration = None

        # 从 knowledge_graph 场景的 integration_refs 中获取 LLM 配置
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
            logger.info(f"跳过知识图谱更新：LLM 配置不存在, user_id={user_id}, note_id={note_id}")
            return

        # 创建任务记录
        graph_task = Task(
            user_id=user_id,
            title=f"知识图谱增量更新（笔记 ID: {note_id}）",
            description="导入笔记后自动触发知识图谱增量更新",
            task_type="knowledge_graph_incremental",
            metadata_json=json.dumps({"note_id": note_id}),
            status=TaskStatus.PENDING.value,
            progress=0,
        )
        db.add(graph_task)
        db.commit()
        db.refresh(graph_task)

        logger.info(f"已创建知识图谱更新任务: task_id={graph_task.id}, user_id={user_id}, note_id={note_id}")

        # 注意：任务已创建并保存在数据库中，由后台任务调度器定期拉取执行
        # 这样可以避免在数据库事务中启动异步任务的问题

    async def _trigger_graph_update(self, user_id: int, note_id: int) -> None:
        """触发知识图谱增量更新"""
        from ...models.note import Note as NoteModel
        from ...models.integration import Integration, FeatureSetting
        from ...services.knowledge_graph import KnowledgeGraphService
        from ...core.database import SessionLocal

        db = SessionLocal()
        try:
            note = db.query(NoteModel).filter(
                NoteModel.id == note_id,
                NoteModel.user_id == user_id
            ).first()

            if not note:
                return

            # 获取知识图谱场景配置
            feature_setting = db.query(FeatureSetting).filter(
                FeatureSetting.user_id == user_id,
                FeatureSetting.feature_id == "knowledge_graph"
            ).first()

            # 检查是否开启了自动增量更新
            if feature_setting and feature_setting.custom_settings:
                auto_update = feature_setting.custom_settings.get("auto_incremental_update", True)
            else:
                auto_update = True  # 默认开启

            if not auto_update:
                logger.info(f"跳过知识图谱更新：自动增量更新已关闭, user_id={user_id}, note_id={note_id}")
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
                logger.info(f"跳过知识图谱更新：LLM 配置不存在, user_id={user_id}, note_id={note_id}")
                return

            service = KnowledgeGraphService(db, user_id)
            await service.incremental_update_for_note(note, integration)

        except Exception as e:
            logger.error(f"知识图谱更新失败: user_id={user_id}, note_id={note_id}, error={e}")
        finally:
            db.close()
