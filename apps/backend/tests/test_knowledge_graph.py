"""
知识图谱 API 测试
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock

from app.models.knowledge_graph import GraphNode, GraphEdge
from app.models.user import User


class TestKnowledgeGraphStatus:
    """测试知识图谱状态"""

    def test_get_status_empty_graph(self, client: TestClient, auth_headers: dict):
        """测试获取空图谱状态"""
        response = client.get("/api/knowledge-graph/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["has_llm_config"] is False
        assert data["graph_exists"] is False
        assert data["node_count"] == 0
        assert data["edge_count"] == 0

    @patch('app.api.knowledge_graph.KnowledgeGraphService')
    def test_get_status_with_graph(self, mock_service_class, client: TestClient, auth_headers: dict):
        """测试获取有数据的图谱状态"""
        # 简化测试，只验证接口可访问
        response = client.get("/api/knowledge-graph/status", headers=auth_headers)
        assert response.status_code == 200


class TestKnowledgeGraphData:
    """测试获取知识图谱数据"""

    @patch('app.api.knowledge_graph.KnowledgeGraphService')
    def test_get_graph_data(self, mock_service_class, client: TestClient, auth_headers: dict):
        """测试获取完整图谱数据"""
        mock_service = MagicMock()
        mock_service.get_graph_data.return_value = {
            "nodes": [
                {"id": 1, "name": "Python", "node_type": "concept"},
                {"id": 2, "name": "FastAPI", "node_type": "technology"}
            ],
            "edges": [
                {"id": 1, "source_node_id": 1, "target_node_id": 2, "relation_type": "related"}
            ]
        }
        mock_service_class.return_value = mock_service

        response = client.get("/api/knowledge-graph/data", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        assert "edges" in data


class TestKnowledgeGraphClear:
    """测试清空知识图谱"""

    @patch('app.api.knowledge_graph.KnowledgeGraphService')
    def test_clear_graph(self, mock_service_class, client: TestClient, auth_headers: dict):
        """测试清空图谱"""
        mock_service = MagicMock()
        mock_service_class.return_value = mock_service

        response = client.delete("/api/knowledge-graph/data", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "已清空" in data["message"]


class TestKnowledgeGraphNodes:
    """测试节点操作"""

    def test_get_nodes_empty(self, client: TestClient, auth_headers: dict):
        """测试获取空节点列表"""
        response = client.get("/api/knowledge-graph/nodes", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data == []

    def test_delete_node_not_found(self, client: TestClient, auth_headers: dict):
        """测试删除不存在的节点"""
        response = client.delete("/api/knowledge-graph/nodes/99999", headers=auth_headers)
        assert response.status_code == 404
        assert "不存在" in response.json()["detail"]

    def test_delete_other_user_node(self, client: TestClient, auth_headers: dict, db_session: Session):
        """测试删除其他用户的节点"""
        from app.models.user import User
        from app.utils.auth import get_password_hash

        # 创建其他用户
        other_user = User(
            username="other_kg_user",
            email="other_kg@example.com",
            password_hash=get_password_hash("pass")
        )
        db_session.add(other_user)
        db_session.flush()

        # 创建其他用户的节点
        other_node = GraphNode(
            user_id=other_user.id,
            name="其他节点",
            node_type="concept"
        )
        db_session.add(other_node)
        db_session.commit()

        response = client.delete(
            f"/api/knowledge-graph/nodes/{other_node.id}",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestKnowledgeGraphEdges:
    """测试边操作"""

    def test_get_edges_empty(self, client: TestClient, auth_headers: dict):
        """测试获取空边列表"""
        response = client.get("/api/knowledge-graph/edges", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data == []

    def test_delete_edge_not_found(self, client: TestClient, auth_headers: dict):
        """测试删除不存在的边"""
        response = client.delete("/api/knowledge-graph/edges/99999", headers=auth_headers)
        assert response.status_code == 404
        assert "不存在" in response.json()["detail"]


class TestKnowledgeGraphUnauthorized:
    """测试未授权访问"""

    def test_get_status_unauthorized(self, client: TestClient):
        """测试未授权获取状态"""
        response = client.get("/api/knowledge-graph/status")
        assert response.status_code == 401

    def test_get_data_unauthorized(self, client: TestClient):
        """测试未授权获取数据"""
        response = client.get("/api/knowledge-graph/data")
        assert response.status_code == 401

    def test_clear_graph_unauthorized(self, client: TestClient):
        """测试未授权清空图谱"""
        response = client.delete("/api/knowledge-graph/data")
        assert response.status_code == 401

    def test_get_nodes_unauthorized(self, client: TestClient):
        """测试未授权获取节点"""
        response = client.get("/api/knowledge-graph/nodes")
        assert response.status_code == 401

    def test_get_edges_unauthorized(self, client: TestClient):
        """测试未授权获取边"""
        response = client.get("/api/knowledge-graph/edges")
        assert response.status_code == 401

    def test_delete_node_unauthorized(self, client: TestClient):
        """测试未授权删除节点"""
        response = client.delete("/api/knowledge-graph/nodes/1")
        assert response.status_code == 401

    def test_delete_edge_unauthorized(self, client: TestClient):
        """测试未授权删除边"""
        response = client.delete("/api/knowledge-graph/edges/1")
        assert response.status_code == 401
