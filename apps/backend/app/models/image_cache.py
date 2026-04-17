# 图片缓存模型

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, BigInteger, Text
from sqlalchemy.sql import func

from ..core.database import Base


class ImageCache(Base):
    """图片缓存模型 - 存储原始 URL 到缓存 URL 的映射"""

    __tablename__ = "image_caches"

    id = Column(Integer, primary_key=True, index=True)
    original_url = Column(String, nullable=False, unique=True, index=True)  # 原始图片 URL（微信等）
    cached_url = Column(String, nullable=False)  # 缓存后的图片 URL
    storage_type = Column(String, nullable=False, default="local")  # "local" | "lskypro"
    file_path = Column(String)  # 本地文件路径或图床返回的路径
    file_size = Column(BigInteger)  # 文件大小（字节）
    mime_type = Column(String, default="image/jpeg")  # MIME 类型
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)  # 关联用户（可选）
    created_at = Column(DateTime(timezone=True), server_default=func.now())
