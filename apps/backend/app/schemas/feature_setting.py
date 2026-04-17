"""
场景配置 Schema
"""

from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from datetime import datetime


class FeatureSettingBase(BaseModel):
    """场景配置基础"""
    feature_id: str = Field(..., description="功能标识，如'knowledge_graph'")


class FeatureSettingUpdate(BaseModel):
    """更新场景配置请求"""
    integration_refs: Optional[Dict[str, str]] = Field(
        None,
        description="引用的集成配置，如{'llm': 'openai-prod', 'storage': 'local'}"
    )
    use_default_llm: Optional[bool] = Field(None, description="是否使用默认 LLM 配置")
    use_default_storage: Optional[bool] = Field(None, description="是否使用默认存储配置")
    custom_settings: Optional[Dict[str, Any]] = Field(None, description="功能特有设置")
    is_enabled: Optional[bool] = Field(None, description="功能开关")


class FeatureSettingResponse(FeatureSettingBase):
    """场景配置响应"""
    integration_refs: Dict[str, str] = Field(default={}, description="引用的集成配置")
    use_default_llm: bool = Field(default=True)
    use_default_storage: bool = Field(default=True)
    custom_settings: Dict[str, Any] = Field(default={})
    is_enabled: bool = Field(default=True)
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class FeatureRuntimeConfigResponse(BaseModel):
    """功能运行时配置响应（合并后的完整配置）"""
    feature_id: str
    integration_refs: Dict[str, str]
    custom_settings: Dict[str, Any]
    llm_config: Optional[Dict[str, Any]] = Field(None, description="有效的 LLM 配置")
    storage_config: Optional[Dict[str, Any]] = Field(None, description="有效的存储配置")
    is_enabled: bool
    provider: Optional[str] = Field(None, description="LLM 提供商 ID")
    model: Optional[str] = Field(None, description="使用的模型名称")
