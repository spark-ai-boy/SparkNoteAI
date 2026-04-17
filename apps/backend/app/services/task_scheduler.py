"""
后台任务调度器
定期拉取 pending 状态的任务并执行
"""

import asyncio
from datetime import datetime
from typing import Optional

from ..core.database import SessionLocal
from ..core.logger import get_logger
from ..models.task import Task, TaskStatus
from .task_handlers import TaskRegistry
from .task_runner import TaskRunner

logger = get_logger(__name__)


class TaskScheduler:
    """
    后台任务调度器（轮询模式）

    定期扫描数据库中的 pending 状态任务，并调度执行
    """

    _instance: Optional["TaskScheduler"] = None
    _running: bool = False

    def __init__(self, poll_interval: float = 2.0):
        """
        初始化调度器

        Args:
            poll_interval: 轮询间隔（秒）
        """
        self.poll_interval = poll_interval
        self._task: Optional[asyncio.Task] = None

    @classmethod
    def get_instance(cls, poll_interval: float = 2.0) -> "TaskScheduler":
        """获取调度器单例"""
        if cls._instance is None:
            cls._instance = cls(poll_interval)
        return cls._instance

    async def start(self) -> None:
        """启动调度器"""
        if self._running:
            logger.info("调度器已在运行，跳过启动")
            return

        self._running = True
        self._task = asyncio.create_task(self._run())
        logger.info(f"调度器已启动，轮询间隔：{self.poll_interval}秒")

    async def stop(self) -> None:
        """停止调度器"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("调度器已停止")

    async def _run(self) -> None:
        """调度器主循环"""
        while self._running:
            try:
                await self._poll_and_execute()
            except Exception as e:
                logger.error(f"轮询异常: {e}")

            await asyncio.sleep(self.poll_interval)

    async def _poll_and_execute(self) -> None:
        """拉取 pending 任务并执行"""
        db = SessionLocal()
        try:
            # 查询 pending 状态的任务（按创建时间排序，先创建的优先执行）
            pending_tasks = db.query(Task).filter(
                Task.status == TaskStatus.PENDING.value
            ).order_by(Task.created_at.asc()).limit(5).all()

            for task in pending_tasks:
                # 获取任务处理器
                handler = TaskRegistry.get_handler(task.task_type)
                if handler:
                    logger.info(f"调度任务: task_id={task.id}, type={task.task_type}, user_id={task.user_id}, title={task.title}")
                    # 异步执行任务（不等待完成）
                    asyncio.create_task(TaskRunner.execute(task.id, handler))
                else:
                    logger.error(f"未找到任务处理器: task_id={task.id}, type={task.task_type}")
                    # 标记为失败
                    task.status = TaskStatus.FAILED.value
                    task.error_message = f"未找到任务处理器：{task.task_type}"
                    task.completed_at = datetime.now()
                    db.commit()

        finally:
            db.close()
