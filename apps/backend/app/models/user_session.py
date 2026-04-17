# 用户会话模型

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base


class UserSession(Base):
    """用户会话表 - 记录用户登录设备信息"""
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # 会话标识
    session_token = Column(String(255), unique=True, index=True, nullable=False)

    # 设备信息
    device_type = Column(String(50), nullable=False)  # desktop, mobile, tablet
    device_name = Column(String(100), nullable=False)  # Chrome on Mac, Safari on iPhone
    browser = Column(String(50))  # Chrome, Safari, Firefox
    os = Column(String(50))  # macOS, Windows, iOS, Android

    # 网络和位置
    ip_address = Column(String(50), nullable=False)
    location = Column(String(100))  # 北京，中国

    # 会话状态
    is_current = Column(Boolean, default=False)
    last_active_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))

    # 关联用户
    user = relationship("User", back_populates="sessions")
