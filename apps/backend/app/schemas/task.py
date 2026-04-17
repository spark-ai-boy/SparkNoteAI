# 后台任务 Schema

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class TaskStatusEnum(str, Enum):
    """任务状态枚举"""
    PENDING = "pending"      # 等待中
    RUNNING = "running"      # 运行中
    COMPLETED = "completed"  # 已完成
    FAILED = "failed"        # 失败
    CANCELLED = "cancelled"  # 已取消


class TaskTypeEnum(str, Enum):
    """任务类型枚举"""
    IMPORT = "import"                # 导入任务
    KNOWLEDGE_GRAPH_BUILD = "knowledge_graph_build"  # 知识图谱构建


class TaskCreate(BaseModel):
    """创建任务请求"""
    title: str = Field(..., description="任务标题")
    task_type: TaskTypeEnum = Field(..., description="任务类型")
    description: Optional[str] = Field(None, description="任务描述")
    metadata_json: Optional[Dict[str, Any]] = Field(None, description="任务元数据")

    @field_validator('metadata_json', mode='before')
    @classmethod
    def parse_metadata_json(cls, value):
        import json
        if isinstance(value, str):
            return json.loads(value) if value else None
        return value


class TaskResponse(BaseModel):
    """任务响应"""
    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    task_type: str
    metadata_json: Optional[Dict[str, Any]] = None
    status: TaskStatusEnum
    progress: int
    error_message: Optional[str] = None
    result_content: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @field_validator('metadata_json', mode='before')
    @classmethod
    def parse_metadata_json(cls, value):
        import json
        if isinstance(value, str):
            return json.loads(value) if value else None
        return value


class TaskListResponse(BaseModel):
    """任务列表响应"""
    id: int
    user_id: int
    title: str
    task_type: str
    status: TaskStatusEnum
    progress: int
    error_message: Optional[str] = None
    result_content: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    metadata_json: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

    @field_validator('metadata_json', mode='before')
    @classmethod
    def parse_metadata_json(cls, value):
        import json
        if isinstance(value, str):
            return json.loads(value) if value else None
        return value


class TaskProgressUpdate(BaseModel):
    """更新任务进度请求"""
    status: Optional[TaskStatusEnum] = None
    progress: Optional[int] = Field(None, ge=0, le=100)
    result_content: Optional[str] = None
    error_message: Optional[str] = None


class PaginatedTaskResponse(BaseModel):
    """分页任务列表响应"""
    items: List[TaskListResponse]
    total: int
    page: int
    size: int
    pages: int
