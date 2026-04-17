# 用户 Schema

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    username: str
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="密码至少需要 6 个字符")


class UserUpdate(BaseModel):
    """更新用户信息（不包括密码）"""
    username: Optional[str] = Field(None, min_length=2, max_length=50)
    email: Optional[EmailStr] = None


class UserPasswordUpdate(BaseModel):
    """修改密码"""
    current_password: str = Field(..., description="当前密码")
    new_password: str = Field(..., min_length=6, description="新密码至少需要 6 个字符")


class User(UserBase):
    id: int
    is_active: bool
    two_factor_enabled: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserPasswordUpdate(BaseModel):
    """修改密码"""
    current_password: str = Field(..., description="当前密码")
    new_password: str = Field(..., min_length=6, description="新密码至少需要 6 个字符")


class TwoFactorEnableRequest(BaseModel):
    """启用 2FA 请求"""
    password: str = Field(..., description="当前密码验证")


class TwoFactorVerifyRequest(BaseModel):
    """验证 2FA 代码"""
    code: str = Field(..., min_length=6, max_length=6, description="6 位验证码")


class TwoFactorSetupResponse(BaseModel):
    """2FA 设置响应"""
    secret: str
    qr_code_url: str


class TwoFactorDisableRequest(BaseModel):
    """禁用 2FA 请求"""
    code: str = Field(..., min_length=6, max_length=6, description="6 位验证码")
    password: str = Field(..., description="当前密码验证")


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    two_factor_required: bool = False
    two_factor_secret: str | None = None


class TwoFactorLoginRequest(BaseModel):
    """2FA 登录请求（密码验证通过后）"""
    username: str
    code: str = Field(..., min_length=6, max_length=6, description="6 位验证码")


class TokenData(BaseModel):
    username: Optional[str] = None
