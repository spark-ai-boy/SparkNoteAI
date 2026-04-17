# 图片存储配置 Schema

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class ConfigFieldSchema(BaseModel):
    """配置字段 Schema"""
    name: str
    label: str
    type: str
    required: bool = True
    description: str = ""
    placeholder: str = ""
    default: Any = None
    options: Optional[List[Dict[str, str]]] = None


class ImageStorageProviderInfoSchema(BaseModel):
    """图床提供商信息 Schema"""
    provider_id: str
    provider_name: str
    description: str = ""
    icon: str = ""
    config_fields: List[ConfigFieldSchema]
    is_default: bool = False


class ImageStorageConfigCreate(BaseModel):
    """创建图片存储配置"""
    provider_id: str = Field(..., description="提供商 ID")
    name: Optional[str] = Field(None, description="配置名称")
    config: Dict[str, Any] = Field(default_factory=dict, description="配置内容")


class ImageStorageConfigUpdate(BaseModel):
    """更新图片存储配置"""
    name: Optional[str] = Field(None, description="配置名称")
    provider_id: Optional[str] = Field(None, description="提供商 ID")
    config: Optional[Dict[str, Any]] = Field(None, description="配置内容")


class ImageStorageConfigResponse(BaseModel):
    """图片存储配置响应"""
    id: int
    name: str
    provider_id: str
    has_api_token: bool = False
    config: Dict[str, Any] = Field(default_factory=dict, description="配置内容（敏感字段已脱敏）")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ImageStorageTestRequest(BaseModel):
    """测试图片存储配置请求"""
    provider_id: str = Field(..., description="提供商 ID")
    config: Dict[str, Any] = Field(default_factory=dict, description="配置内容")


class ImageStorageTestResponse(BaseModel):
    """测试图片存储配置响应"""
    success: bool
    message: str
