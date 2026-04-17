# 知识图谱 Schema

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum


class NodeTypeEnum(str, Enum):
    CONCEPT = "concept"
    TOPIC = "topic"
    ENTITY = "entity"


class EdgeTypeEnum(str, Enum):
    RELATED = "related"
    HIERARCHICAL = "hierarchical"
    SEQUENTIAL = "sequential"


class GraphNodeBase(BaseModel):
    name: str
    node_type: NodeTypeEnum = NodeTypeEnum.CONCEPT
    description: Optional[str] = None
    source_note_ids: Optional[str] = None


class GraphNodeCreate(GraphNodeBase):
    user_id: int


class GraphNodeResponse(GraphNodeBase):
    id: int
    user_id: int
    is_verified: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GraphEdgeBase(BaseModel):
    source_node_id: int
    target_node_id: int
    edge_type: EdgeTypeEnum = EdgeTypeEnum.RELATED
    description: Optional[str] = None
    strength: float = 0.5


class GraphEdgeCreate(GraphEdgeBase):
    user_id: int


class GraphEdgeResponse(GraphEdgeBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GraphData(BaseModel):
    """图谱数据（用于前端可视化）"""
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


class KnowledgeGraphStatus(BaseModel):
    """知识图谱静态状态（不包含构建任务状态，任务状态请查询 /api/tasks）"""
    has_llm_config: bool
    graph_exists: bool
    node_count: int
    edge_count: int
    is_building: bool = False
    building_progress: int = 0
    is_full_build: bool = False
    last_built_at: Optional[str] = None


class BuildGraphRequest(BaseModel):
    """构建图谱请求"""
    note_ids: Optional[List[int]] = None
    rebuild: bool = False  # 是否重新构建（清空现有图谱）


class BuildGraphProgress(BaseModel):
    """构建图谱进度"""
    status: str
    progress: int
    message: str
    stats: Optional[Dict[str, Any]] = None
