# 知识图谱 API

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User as UserModel
from app.models.knowledge_graph import GraphNode, GraphEdge
from app.models.integration import Integration, FeatureSetting
from app.models.task import Task, TaskStatus
from app.schemas.knowledge_graph import (
    GraphData,
    KnowledgeGraphStatus,
    GraphNodeResponse,
    GraphEdgeResponse,
)
from app.services.knowledge_graph import KnowledgeGraphService

router = APIRouter()


@router.get("/knowledge-graph/status", response_model=KnowledgeGraphStatus)
def get_knowledge_graph_status(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """获取知识图谱静态状态

    注意：构建任务状态请通过 /api/tasks?task_type=knowledge_graph_build 查询
    """
    # 检查知识图谱场景是否配置了 LLM
    has_llm_config = False

    # 获取场景配置
    feature_setting = db.query(FeatureSetting).filter(
        FeatureSetting.user_id == current_user.id,
        FeatureSetting.feature_id == "knowledge_graph"
    ).first()

    # 1. 先检查场景配置中的 integration_refs（优先使用）
    integration = None
    if feature_setting and feature_setting.integration_refs:
        llm_key = feature_setting.integration_refs.get("llm")
        if llm_key:
            integration = db.query(Integration).filter(
                Integration.user_id == current_user.id,
                Integration.integration_type == "llm",
                Integration.config_key == llm_key,
                Integration.is_enabled == True
            ).first()

    # 2. 如果 integration_refs 中没有，检查是否使用默认配置
    if not integration:
        if not feature_setting or feature_setting.use_default_llm:
            integration = db.query(Integration).filter(
                Integration.user_id == current_user.id,
                Integration.integration_type == "llm",
                Integration.is_default == True,
                Integration.is_enabled == True
            ).first()

    if integration and integration.config and integration.config.get("api_key"):
        has_llm_config = True

    # 检查图谱是否存在
    node_count = db.query(func.count(GraphNode.id)).filter(
        GraphNode.user_id == current_user.id
    ).scalar()
    edge_count = db.query(func.count(GraphEdge.id)).filter(
        GraphEdge.user_id == current_user.id
    ).scalar()
    graph_exists = node_count > 0

    # 检查是否有正在进行的知识图谱构建任务
    building_task = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.task_type == 'knowledge_graph_build',
        Task.status.in_([TaskStatus.PENDING.value, TaskStatus.RUNNING.value])
    ).order_by(Task.created_at.desc()).first()

    is_building = building_task is not None
    building_progress = building_task.progress if building_task else 0

    return KnowledgeGraphStatus(
        has_llm_config=has_llm_config,
        graph_exists=graph_exists,
        node_count=node_count,
        edge_count=edge_count,
        is_building=is_building,
        building_progress=building_progress,
    )


@router.get("/knowledge-graph/data", response_model=GraphData)
def get_knowledge_graph_data(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """获取知识图谱数据（用于前端可视化）"""
    service = KnowledgeGraphService(db, current_user.id)
    return service.get_graph_data()


@router.delete("/knowledge-graph/data", response_model=Dict[str, str])
def clear_knowledge_graph(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """清空知识图谱"""
    service = KnowledgeGraphService(db, current_user.id)
    service.clear_graph()

    return {"message": "知识图谱已清空"}


@router.get("/knowledge-graph/nodes", response_model=List[GraphNodeResponse])
def get_graph_nodes(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """获取所有节点"""
    nodes = db.query(GraphNode).filter(
        GraphNode.user_id == current_user.id
    ).order_by(GraphNode.name).all()
    return nodes


@router.get("/knowledge-graph/edges", response_model=List[GraphEdgeResponse])
def get_graph_edges(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """获取所有边"""
    edges = db.query(GraphEdge).filter(
        GraphEdge.user_id == current_user.id
    ).all()
    return edges


@router.delete("/knowledge-graph/nodes/{node_id}")
def delete_graph_node(
    node_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """删除节点（同时删除关联的边）"""
    node = db.query(GraphNode).filter(
        GraphNode.id == node_id,
        GraphNode.user_id == current_user.id
    ).first()

    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="节点不存在"
        )

    # 删除关联的边
    db.query(GraphEdge).filter(
        GraphEdge.source_node_id == node_id
    ).delete()
    db.query(GraphEdge).filter(
        GraphEdge.target_node_id == node_id
    ).delete()

    # 删除节点
    db.delete(node)
    db.commit()

    return {"message": "节点已删除"}


@router.delete("/knowledge-graph/edges/{edge_id}")
def delete_graph_edge(
    edge_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """删除边"""
    edge = db.query(GraphEdge).filter(
        GraphEdge.id == edge_id,
        GraphEdge.user_id == current_user.id
    ).first()

    if not edge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="边不存在"
        )

    db.delete(edge)
    db.commit()

    return {"message": "边已删除"}


# === 构建知识图谱任务已迁移到 /api/tasks ===
#
# 创建构建任务：
#   POST /api/tasks
#   {
#     "task_type": "knowledge_graph_build",
#     "metadata_json": {"rebuild": true}
#   }
#
# 查询构建进度：
#   GET /api/tasks/{task_id}
#   或
#   GET /api/tasks?task_type=knowledge_graph_build&limit=1
#
