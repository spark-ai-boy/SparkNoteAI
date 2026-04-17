"""
用户偏好 Schema
"""

from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from datetime import datetime


class NotificationSettings(BaseModel):
    """通知设置"""
    task_complete: bool = Field(default=True, description="任务完成时通知")
    import_progress: bool = Field(default=True, description="导入进度通知")
    import_complete: bool = Field(default=True, description="导入完成时通知")
    knowledge_graph_complete: bool = Field(default=True, description="知识图谱构建完成时通知")
    error_alerts: bool = Field(default=True, description="错误警告通知")


class UserPreferenceBase(BaseModel):
    """用户偏好基础"""
    theme: str = Field(default="system", description="主题：system | light | dark")
    language: str = Field(default="zh-CN", description="语言：zh-CN | en-US")
    font_size: int = Field(default=14, description="字体大小")
    sidebar_collapsed: bool = Field(default=False, description="侧边栏是否收起")
    default_llm_integration: Optional[str] = Field(None, description="默认 LLM 配置 key")
    default_storage_integration: Optional[str] = Field(None, description="默认存储配置 key")
    notifications: Optional[NotificationSettings] = Field(default_factory=NotificationSettings, description="通知设置")


class UserPreferenceUpdate(BaseModel):
    """更新用户偏好请求"""
    theme: Optional[str] = None
    language: Optional[str] = None
    font_size: Optional[int] = None
    sidebar_collapsed: Optional[bool] = None
    default_llm_integration: Optional[str] = None
    default_storage_integration: Optional[str] = None
    notifications: Optional[Dict[str, Any]] = None
    preferences: Optional[Dict[str, Any]] = None


class UserPreferenceResponse(UserPreferenceBase):
    """用户偏好响应"""
    notifications: NotificationSettings = Field(default_factory=NotificationSettings)
    preferences: Dict[str, Any] = Field(default={})
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
