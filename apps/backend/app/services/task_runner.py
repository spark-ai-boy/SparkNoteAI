"""
任务运行器
统一管理任务的执行、进度更新、状态管理和错误处理
"""

import json
import traceback
from datetime import datetime
from typing import Any, Dict

from .task_handlers.base import TaskHandler, ProgressCallback
from ..core.logger import get_logger
from ..models.task import Task, TaskStatus
from ..core.database import SessionLocal

logger = get_logger(__name__)


class TaskRunner:
    """
    任务运行器

    负责：
    1. 任务执行的生命周期管理（pending -> running -> completed/failed）
    2. 统一的进度更新和持久化
    3. 统一的错误捕获和处理
    4. 结果数据的序列化存储
    """

    @staticmethod
    async def execute(task_id: int, handler: TaskHandler) -> None:
        """
        执行任务的统一入口

        Args:
            task_id: 任务ID
            handler: 任务处理器实例
        """
        # 创建独立的数据库会话（后台任务不能使用原请求的会话）
        db = SessionLocal()
        try:
            # 获取任务记录
            task = db.query(Task).filter(Task.id == task_id).first()
            if not task:
                logger.warning(f"任务不存在: task_id={task_id}")
                return

            # 更新状态为运行中
            task.status = TaskStatus.RUNNING.value
            task.progress = 0
            task.error_message = None
            db.commit()

            logger.info(f"开始执行任务: task_id={task_id}, type={handler.task_type}, user_id={task.user_id}")

            # 解析元数据
            metadata = {}
            if task.metadata_json:
                try:
                    metadata = json.loads(task.metadata_json)
                except json.JSONDecodeError:
                    metadata = {}

            # 创建进度回调函数
            async def progress_callback(progress: int, message: str) -> None:
                """更新任务进度"""
                task.progress = max(0, min(100, progress))
                task.error_message = message  # 用于存储当前状态消息
                db.commit()
                logger.debug(f"任务进度: task_id={task_id}, progress={progress}%, message={message}")

            # 执行任务
            result = await handler.execute(
                task_id=task_id,
                user_id=task.user_id,
                metadata=metadata,
                progress_callback=progress_callback,
            )

            # 任务完成
            task.status = TaskStatus.COMPLETED.value
            task.progress = 100
            task.completed_at = datetime.now()
            if result:
                task.result_content = json.dumps(result, ensure_ascii=False)
            db.commit()

            logger.info(f"任务完成: task_id={task_id}, user_id={task.user_id}")

        except Exception as e:
            # 统一错误处理
            logger.error(f"任务失败: task_id={task_id}, error={str(e)}", exc_info=True)

            task = db.query(Task).filter(Task.id == task_id).first()
            if task:
                task.status = TaskStatus.FAILED.value
                task.error_message = str(e)
                task.completed_at = datetime.now()
                db.commit()
        finally:
            db.close()

    @staticmethod
    def can_cancel(task: Task) -> bool:
        """
        检查任务是否可以取消

        Args:
            task: 任务记录

        Returns:
            是否可以取消
        """
        return task.status in [TaskStatus.PENDING.value, TaskStatus.RUNNING.value]

    @staticmethod
    async def cancel_task(task_id: int, user_id: int) -> Dict[str, Any]:
        """
        取消任务

        注意：由于使用 FastAPI BackgroundTasks，无法真正中断正在运行的任务，
        只能将任务状态标记为 cancelled，运行中的任务会在下次检查时发现并停止

        Args:
            task_id: 任务ID
            user_id: 用户ID

        Returns:
            操作结果
        """
        db = SessionLocal()
        try:
            task = db.query(Task).filter(
                Task.id == task_id,
                Task.user_id == user_id
            ).first()

            if not task:
                return {"success": False, "message": "任务不存在"}

            if not TaskRunner.can_cancel(task):
                return {
                    "success": False,
                    "message": f"任务状态为 {task.status}，无法取消",
                }

            task.status = TaskStatus.CANCELLED.value
            task.completed_at = datetime.now()
            db.commit()

            return {"success": True, "message": "任务已取消"}
        finally:
            db.close()
