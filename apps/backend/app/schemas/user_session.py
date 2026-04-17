# 用户会话 Schema

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class UserSessionBase(BaseModel):
    device_type: str
    device_name: str
    browser: Optional[str] = None
    os: Optional[str] = None
    ip_address: str
    location: str


class UserSessionResponse(UserSessionBase):
    id: int
    user_id: int
    is_current: bool
    last_active_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class SessionRevokeRequest(BaseModel):
    """注销会话请求（可选密码验证）"""
    password: Optional[str] = None


class SessionRevokeAllRequest(BaseModel):
    """注销所有其他会话请求"""
    password: str = Field(..., description="需要验证当前密码")
