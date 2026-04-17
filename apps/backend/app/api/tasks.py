"""
统一任务 API
提供任务的创建、查询、取消等统一入口
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User as UserModel
from app.models.task import Task, TaskStatus, TaskType
from app.schemas.task import (
    TaskCreate,
    TaskResponse,
    TaskListResponse,
    TaskStatusEnum,
    PaginatedTaskResponse,
)
from app.services.task_handlers import TaskRegistry, register_all_handlers
from app.services.task_runner import TaskRunner

router = APIRouter()

# 确保处理器已注册（在应用启动时调用）
register_all_handlers()


@router.post("/tasks", response_model=TaskResponse)
def create_task(
    task_data: TaskCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """
    创建新任务

    支持的任务类型：
    - import: 导入内容（微信公众号、小红书等）
    - knowledge_graph_build: 构建知识图谱
    """
    # 检查任务类型是否有效
    if not TaskRegistry.has_handler(task_data.task_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的任务类型: {task_data.task_type}",
        )

    # 获取处理器并验证参数
    handler = TaskRegistry.get_handler(task_data.task_type)
    try:
        if task_data.metadata_json:
            import json
            metadata = json.loads(task_data.metadata_json) if isinstance(task_data.metadata_json, str) else task_data.metadata_json
        else:
            metadata = {}
        handler.validate_metadata(metadata)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # 根据任务类型生成默认标题
    title = task_data.title
    if not title:
        if task_data.task_type == TaskType.IMPORT.value:
            platform = metadata.get("platform", "wechat")
            title = f"导入的{platform}内容"
        else:
            title = f"{task_data.task_type}任务"

    # 创建任务记录
    import json
    db_task = Task(
        user_id=current_user.id,
        title=title,
        task_type=task_data.task_type,
        description=task_data.description,
        metadata_json=json.dumps(metadata) if metadata else None,
        status=TaskStatus.PENDING.value,
        progress=0,
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    # 在后台执行任务
    background_tasks.add_task(TaskRunner.execute, db_task.id, handler)

    from app.core.logger import get_logger
    logger = get_logger(__name__)
    logger.info(f"创建任务成功: task_id={db_task.id}, type={task_data.task_type}, user_id={current_user.id}, metadata={metadata}")

    return db_task


@router.get("/tasks", response_model=PaginatedTaskResponse)
def get_tasks(
    page: int = 1,
    size: int = 20,
    status_filter: Optional[TaskStatusEnum] = None,
    task_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """获取当前用户的任务列表（分页）"""
    query = db.query(Task).filter(Task.user_id == current_user.id)

    if status_filter:
        query = query.filter(Task.status == status_filter.value)

    if task_type:
        query = query.filter(Task.task_type == task_type)

    # 获取总数
    total = query.count()

    # 分页查询
    tasks = query.order_by(Task.created_at.desc()).offset((page - 1) * size).limit(size).all()

    # 计算总页数
    pages = (total + size - 1) // size if size > 0 else 0

    return {
        "items": tasks,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


@router.get("/tasks/types")
def get_task_types():
    """获取所有支持的任务类型"""
    handlers = TaskRegistry.list_handlers()
    return {
        "types": [
            {
                "type": handler.task_type,
                "name": _get_task_type_name(handler.task_type),
                "description": _get_task_type_description(handler.task_type),
            }
            for handler in handlers.values()
        ]
    }


@router.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """获取任务详情"""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )

    return task


@router.post("/tasks/{task_id}/cancel", response_model=TaskResponse)
async def cancel_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """取消任务"""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )

    if not TaskRunner.can_cancel(task):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"任务状态为 {task.status}，无法取消"
        )

    task.status = TaskStatus.CANCELLED.value
    task.completed_at = datetime.now()
    db.commit()
    db.refresh(task)

    return task


def _get_task_type_name(task_type: str) -> str:
    """获取任务类型中文名"""
    names = {
        "import": "内容导入",
        "knowledge_graph_build": "知识图谱构建",
    }
    return names.get(task_type, task_type)


def _get_task_type_description(task_type: str) -> str:
    """获取任务类型描述"""
    descriptions = {
        "import": "从微信公众号、小红书、B站等平台导入内容",
        "knowledge_graph_build": "基于笔记内容自动构建知识图谱",
    }
    return descriptions.get(task_type, "")
