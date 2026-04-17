"""
集成配置 Schema
"""

from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from datetime import datetime


class IntegrationBase(BaseModel):
    """集成配置基础"""
    config_key: str = Field(..., description="配置唯一标识，如'openai-prod'")
    name: str = Field(..., description="显示名称")
    description: Optional[str] = Field(None, description="描述")
    icon: Optional[str] = Field(None, description="图标名")
    color: Optional[str] = Field(None, description="标签颜色")
    provider: str = Field(..., description="提供商类型")
    is_default: bool = Field(False, description="是否为默认配置")
    is_enabled: bool = Field(True, description="是否启用")
    tags: List[str] = Field(default=[], description="标签")


class IntegrationCreate(IntegrationBase):
    """创建集成配置请求"""
    integration_type: str = Field(..., description="集成类型: llm | storage | ...")
    config: Dict[str, Any] = Field(default={}, description="配置内容")


class IntegrationUpdate(BaseModel):
    """更新集成配置请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    provider: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_default: Optional[bool] = None
    is_enabled: Optional[bool] = None
    tags: Optional[List[str]] = None


class IntegrationResponse(IntegrationBase):
    """集成配置响应"""
    id: int
    integration_type: str
    config: Optional[Dict[str, Any]] = Field(None, description="配置内容（敏感字段脱敏）")
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class IntegrationDetailResponse(IntegrationResponse):
    """集成配置详情响应（包含完整配置）"""
    config: Dict[str, Any]


class IntegrationListResponse(BaseModel):
    """集成配置列表"""
    items: List[IntegrationResponse]
    total: int


class IntegrationTestRequest(BaseModel):
    """测试集成配置请求"""
    integration_type: str
    config_key: str


class IntegrationTestResponse(BaseModel):
    """测试集成配置响应"""
    success: bool
    message: str


class SetDefaultRequest(BaseModel):
    """设置默认配置请求"""
    integration_type: str
    config_key: str
