# 知识图谱模型

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func, Float, Boolean
from sqlalchemy.orm import relationship
from enum import Enum as PyEnum

from ..core.database import Base


class NodeType(str, PyEnum):
    """节点类型枚举"""
    CONCEPT = "concept"        # 核心概念
    TOPIC = "topic"            # 主题/类别
    ENTITY = "entity"          # 实体（人物、地点、组织等）


class EdgeType(str, PyEnum):
    """边类型枚举"""
    RELATED = "related"              # 关联关系
    HIERARCHICAL = "hierarchical"    # 层级关系（上下位）
    SEQUENTIAL = "sequential"        # 顺序关系（前置/后续）


class GraphNode(Base):
    """知识图谱节点"""

    __tablename__ = "knowledge_graph_nodes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # 节点基本信息
    name = Column(String(200), nullable=False, index=True)  # 概念名称
    node_type = Column(String(50), nullable=False, default=NodeType.CONCEPT)  # 节点类型

    # 节点描述
    description = Column(Text, nullable=True)

    # 来源笔记 ID 列表（逗号分隔）
    source_note_ids = Column(String(500), nullable=True)

    # 是否已验证（用户手动确认过）
    is_verified = Column(Boolean, default=False)

    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关联用户
    user = relationship("User", back_populates="knowledge_graph_nodes")

    # 关联的边（作为源节点和目标节点）
    outgoing_edges = relationship(
        "GraphEdge",
        foreign_keys="GraphEdge.source_node_id",
        back_populates="source_node",
        cascade="all, delete-orphan"
    )
    incoming_edges = relationship(
        "GraphEdge",
        foreign_keys="GraphEdge.target_node_id",
        back_populates="target_node"
    )


class GraphEdge(Base):
    """知识图谱边（节点间关系）"""

    __tablename__ = "knowledge_graph_edges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # 节点关联
    source_node_id = Column(Integer, ForeignKey("knowledge_graph_nodes.id"), nullable=False, index=True)
    target_node_id = Column(Integer, ForeignKey("knowledge_graph_nodes.id"), nullable=False, index=True)

    # 关系类型和描述
    edge_type = Column(String(50), nullable=False, default=EdgeType.RELATED)
    description = Column(Text, nullable=True)

    # 关联强度（0-1，由大模型评估或用户手动调整）
    strength = Column(Float, default=0.5)

    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关联用户
    user = relationship("User", back_populates="knowledge_graph_edges")

    # 关联节点
    source_node = relationship("GraphNode", foreign_keys=[source_node_id], back_populates="outgoing_edges")
    target_node = relationship("GraphNode", foreign_keys=[target_node_id], back_populates="incoming_edges")
