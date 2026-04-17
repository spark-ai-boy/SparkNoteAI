"""
任务处理器模块
"""

from .base import TaskHandler, ProgressCallback
from .registry import TaskRegistry
from .import_handler import ImportTaskHandler
from .knowledge_graph_handler import KnowledgeGraphBuildHandler
from .knowledge_graph_incremental_handler import KnowledgeGraphIncrementalHandler

__all__ = [
    "TaskHandler",
    "ProgressCallback",
    "TaskRegistry",
    "ImportTaskHandler",
    "KnowledgeGraphBuildHandler",
    "KnowledgeGraphIncrementalHandler",
]


def register_all_handlers():
    """注册所有任务处理器"""
    TaskRegistry.register(ImportTaskHandler())
    TaskRegistry.register(KnowledgeGraphBuildHandler())
    TaskRegistry.register(KnowledgeGraphIncrementalHandler())
