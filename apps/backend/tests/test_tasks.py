"""
任务系统 API 测试
"""

import pytest
import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.task import Task, TaskStatus, TaskType
from app.models.user import User


@pytest.fixture
def sample_task(db_session: Session, test_user: User) -> Task:
    """创建测试任务"""
    task = Task(
        user_id=test_user.id,
        title="测试导入任务",
        task_type=TaskType.IMPORT.value,
        description="测试描述",
        metadata_json=json.dumps({"url": "https://example.com", "platform": "wechat"}),
        status=TaskStatus.PENDING.value,
        progress=0
    )
    db_session.add(task)
    db_session.commit()
    return task


@pytest.fixture
def sample_completed_task(db_session: Session, test_user: User) -> Task:
    """创建已完成的测试任务"""
    task = Task(
        user_id=test_user.id,
        title="已完成任务",
        task_type=TaskType.IMPORT.value,
        status=TaskStatus.COMPLETED.value,
        progress=100,
        result_content="导入成功"
    )
    db_session.add(task)
    db_session.commit()
    return task


@pytest.fixture
def sample_running_task(db_session: Session, test_user: User) -> Task:
    """创建运行中的测试任务"""
    task = Task(
        user_id=test_user.id,
        title="运行中任务",
        task_type=TaskType.KNOWLEDGE_GRAPH_BUILD.value,
        status=TaskStatus.RUNNING.value,
        progress=50
    )
    db_session.add(task)
    db_session.commit()
    return task


class TestTaskGet:
    """测试获取任务"""

    def test_get_task_list(self, client: TestClient, auth_headers: dict, sample_task: Task):
        """测试获取任务列表"""
        response = client.get("/api/tasks", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(t["id"] == sample_task.id for t in data)

    def test_get_task_list_with_pagination(self, client: TestClient, auth_headers: dict, sample_task: Task):
        """测试任务列表分页"""
        response = client.get("/api/tasks?skip=0&limit=1", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 1

    def test_get_task_list_filter_by_status(self, client: TestClient, auth_headers: dict,
                                            sample_task: Task, sample_completed_task: Task):
        """测试按状态过滤任务"""
        response = client.get("/api/tasks?status_filter=completed", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert all(t["status"] == "completed" for t in data)

    def test_get_task_list_filter_by_type(self, client: TestClient, auth_headers: dict,
                                          sample_task: Task, sample_running_task: Task):
        """测试按类型过滤任务"""
        response = client.get("/api/tasks?task_type=import", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert all(t["task_type"] == "import" for t in data)

    def test_get_task_detail(self, client: TestClient, auth_headers: dict, sample_task: Task):
        """测试获取任务详情"""
        response = client.get(f"/api/tasks/{sample_task.id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_task.id
        assert data["title"] == sample_task.title
        assert data["status"] == sample_task.status

    def test_get_task_detail_not_found(self, client: TestClient, auth_headers: dict):
        """测试获取不存在的任务"""
        response = client.get("/api/tasks/99999", headers=auth_headers)
        assert response.status_code == 404
        assert "不存在" in response.json()["detail"]

    def test_get_other_user_task(self, client: TestClient, auth_headers: dict, db_session: Session):
        """测试获取其他用户的任务"""
        from app.models.user import User
        from app.utils.auth import get_password_hash

        # 创建其他用户
        other_user = User(
            username="other_task_user",
            email="other_task@example.com",
            password_hash=get_password_hash("pass")
        )
        db_session.add(other_user)
        db_session.flush()

        # 创建其他用户的任务
        other_task = Task(
            user_id=other_user.id,
            title="别人的任务",
            task_type=TaskType.IMPORT.value,
            status=TaskStatus.PENDING.value
        )
        db_session.add(other_task)
        db_session.commit()

        response = client.get(f"/api/tasks/{other_task.id}", headers=auth_headers)
        assert response.status_code == 404


class TestTaskCancel:
    """测试取消任务"""

    def test_cancel_pending_task(self, client: TestClient, auth_headers: dict, sample_task: Task):
        """测试取消待处理任务"""
        response = client.post(
            f"/api/tasks/{sample_task.id}/cancel",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "cancelled"

    def test_cancel_running_task(self, client: TestClient, auth_headers: dict, sample_running_task: Task):
        """测试取消运行中任务"""
        response = client.post(
            f"/api/tasks/{sample_running_task.id}/cancel",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "cancelled"

    def test_cancel_completed_task(self, client: TestClient, auth_headers: dict, sample_completed_task: Task):
        """测试取消已完成任务（应失败）"""
        response = client.post(
            f"/api/tasks/{sample_completed_task.id}/cancel",
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "无法取消" in response.json()["detail"]

    def test_cancel_nonexistent_task(self, client: TestClient, auth_headers: dict):
        """测试取消不存在的任务"""
        response = client.post("/api/tasks/99999/cancel", headers=auth_headers)
        assert response.status_code == 404


class TestTaskTypes:
    """测试任务类型列表"""

    def test_get_task_types(self, client: TestClient, auth_headers: dict):
        """测试获取任务类型列表"""
        response = client.get("/api/tasks/types", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "types" in data
        assert isinstance(data["types"], list)


class TestTaskUnauthorized:
    """测试未授权访问"""

    def test_get_tasks_unauthorized(self, client: TestClient):
        """测试未授权获取任务列表"""
        response = client.get("/api/tasks")
        assert response.status_code == 401

    def test_get_task_detail_unauthorized(self, client: TestClient):
        """测试未授权获取任务详情"""
        response = client.get("/api/tasks/1")
        assert response.status_code == 401

    def test_cancel_task_unauthorized(self, client: TestClient):
        """测试未授权取消任务"""
        response = client.post("/api/tasks/1/cancel")
        assert response.status_code == 401

    def test_get_task_types_no_auth(self, client: TestClient):
        """测试获取任务类型（不需要认证）"""
        response = client.get("/api/tasks/types")
        assert response.status_code == 200
