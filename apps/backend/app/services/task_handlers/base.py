"""
任务处理器抽象基类
定义所有任务处理器的标准接口
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Callable, Awaitable

# 进度回调类型: (progress: int, message: str) -> None
ProgressCallback = Callable[[int, str], Awaitable[None]]


class TaskHandler(ABC):
    """
    任务处理器抽象基类

    所有具体的任务处理器都需要继承此类并实现 execute 方法
    """

    @property
    @abstractmethod
    def task_type(self) -> str:
        """
        返回任务类型标识符

        Returns:
            唯一的任务类型字符串，如 "import", "knowledge_graph_build"
        """
        pass

    @abstractmethod
    async def execute(
        self,
        task_id: int,
        user_id: int,
        metadata: Dict[str, Any],
        progress_callback: ProgressCallback,
    ) -> Dict[str, Any]:
        """
        执行具体任务逻辑

        Args:
            task_id: 任务ID
            user_id: 用户ID
            metadata: 任务元数据参数
            progress_callback: 进度回调函数，调用格式: await progress_callback(进度0-100, 状态消息)

        Returns:
            任务执行结果数据，将被存储到 task.result_content (JSON格式)

        Raises:
            Exception: 任务执行失败时抛出异常，将由 TaskRunner 统一捕获并记录
        """
        pass

    def validate_metadata(self, metadata: Dict[str, Any]) -> None:
        """
        验证任务元数据（可选重写）

        Args:
            metadata: 任务元数据

        Raises:
            ValueError: 元数据验证失败时抛出
        """
        pass
