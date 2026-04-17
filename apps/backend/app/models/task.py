# 后台任务模型

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from ..core.database import Base
import enum


class TaskStatus(str, enum.Enum):
    """任务状态枚举"""
    PENDING = "pending"      # 等待中
    RUNNING = "running"      # 运行中
    COMPLETED = "completed"  # 已完成
    FAILED = "failed"        # 失败
    CANCELLED = "cancelled"  # 已取消


class TaskType(str, enum.Enum):
    """任务类型枚举"""
    IMPORT = "import"                # 导入任务（微信公众号、小红书等）
    KNOWLEDGE_GRAPH_BUILD = "knowledge_graph_build"  # 知识图谱构建
    # 未来可扩展：mindmap_generate, ai_summary, etc.


class Task(Base):
    """通用后台任务模型"""
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # 任务基本信息
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)  # 任务描述
    task_type = Column(String(50), default=TaskType.IMPORT.value)  # 任务类型

    # 任务相关数据（JSON 格式存储，灵活扩展）
    # import 任务：{"url": "...", "platform": "..."}
    # knowledge_graph_build 任务：{"note_ids": [...]}
    metadata_json = Column(Text, nullable=True)

    # 任务状态（使用 String 而非 Enum，避免数据库兼容性问题）
    status = Column(String(20), default=TaskStatus.PENDING.value, nullable=False)
    progress = Column(Integer, default=0)  # 进度 0-100

    # 结果信息
    result_content = Column(Text, nullable=True)  # 完成结果
    error_message = Column(Text, nullable=True)  # 错误信息

    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
