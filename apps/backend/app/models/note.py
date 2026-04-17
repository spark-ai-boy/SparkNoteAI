# 笔记模型

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from ..core.database import Base


class Note(Base):
    """笔记模型"""

    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, default="无标题")
    content = Column(Text, default="")
    summary = Column(String(500), default="")  # 内容摘要，自动生成
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # 来源平台：original(原创), wechat(微信公众号), xiaohongshu(小红书), bilibili(B 站), youtube(YouTube), other(其他)
    platform = Column(String(50), default="original")
    source_url = Column(Text, nullable=True)  # 来源链接

    # 创建和更新时间
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # 关联用户
    user = relationship("User", back_populates="notes")

    # 关联标签
    tags = relationship("NoteTag", back_populates="note", cascade="all, delete-orphan")

    @property
    def tag_names(self) -> list[str]:
        """返回标签名称列表"""
        return [tag.tag.name for tag in self.tags]


class Tag(Base):
    """标签模型"""

    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, index=True)  # 删除 unique=True，允许不同用户有同名标签
    color = Column(String(7), default="#666666")  # 十六进制颜色
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # 可选的用户关联，None 表示系统标签

    # 关联
    user = relationship("User", back_populates="tags")
    note_tags = relationship("NoteTag", back_populates="tag", cascade="all, delete-orphan")


class NoteTag(Base):
    """笔记 - 标签关联表（多对多）"""

    __tablename__ = "note_tags"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=False)
    tag_id = Column(Integer, ForeignKey("tags.id"), nullable=False)

    # 关联
    note = relationship("Note", back_populates="tags")
    tag = relationship("Tag", back_populates="note_tags")
