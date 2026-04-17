# 用户模型

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    # 双因素认证 (2FA) 相关字段
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(100), nullable=True)  # TOTP 密钥
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关联笔记和标签
    notes = relationship("Note", back_populates="user", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="user", cascade="all, delete-orphan")

    # 关联知识图谱
    knowledge_graph_nodes = relationship("GraphNode", back_populates="user", cascade="all, delete-orphan")
    knowledge_graph_edges = relationship("GraphEdge", back_populates="user", cascade="all, delete-orphan")

    # 新配置系统关联
    integrations = relationship("Integration", back_populates="user", cascade="all, delete-orphan")
    feature_settings = relationship("FeatureSetting", back_populates="user", cascade="all, delete-orphan")
    preferences = relationship("UserPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")

    # 关联用户会话
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
