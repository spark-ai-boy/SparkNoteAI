"""
任务处理器注册表
用于注册和获取任务处理器
"""

from typing import Dict, Type, Optional
from .base import TaskHandler


class TaskRegistry:
    """
    任务处理器注册表（单例模式）

    用于统一管理所有任务处理器的注册和查询
    """

    _instance = None
    _handlers: Dict[str, TaskHandler] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @classmethod
    def register(cls, handler: TaskHandler) -> None:
        """
        注册任务处理器

        Args:
            handler: 任务处理器实例

        Raises:
            ValueError: 如果该任务类型已注册
        """
        handler_type = handler.task_type
        if handler_type in cls._handlers:
            raise ValueError(f"任务处理器 '{handler_type}' 已注册")
        cls._handlers[handler_type] = handler

    @classmethod
    def unregister(cls, task_type: str) -> None:
        """
        注销任务处理器

        Args:
            task_type: 任务类型标识符
        """
        cls._handlers.pop(task_type, None)

    @classmethod
    def get_handler(cls, task_type: str) -> Optional[TaskHandler]:
        """
        获取任务处理器

        Args:
            task_type: 任务类型标识符

        Returns:
            对应的任务处理器实例，不存在则返回 None
        """
        return cls._handlers.get(task_type)

    @classmethod
    def has_handler(cls, task_type: str) -> bool:
        """
        检查是否已注册该任务类型

        Args:
            task_type: 任务类型标识符

        Returns:
            是否已注册
        """
        return task_type in cls._handlers

    @classmethod
    def list_handlers(cls) -> Dict[str, TaskHandler]:
        """
        获取所有已注册的任务处理器

        Returns:
            任务类型 -> 处理器的映射字典
        """
        return cls._handlers.copy()

    @classmethod
    def clear(cls) -> None:
        """清空所有注册的任务处理器（主要用于测试）"""
        cls._handlers.clear()
