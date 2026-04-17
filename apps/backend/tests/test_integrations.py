"""
集成配置 API 测试
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.integration import Integration
from app.models.user import User


@pytest.fixture
def sample_llm_integration(db_session: Session, test_user: User) -> Integration:
    """创建测试 LLM 集成配置"""
    integration = Integration(
        user_id=test_user.id,
        integration_type="llm",
        config_key="openai-test",
        name="OpenAI 测试",
        provider="openai",
        config={
            "api_key": "test-api-key",
            "model": "gpt-4o-mini"
        },
        is_default=True,
        is_enabled=True
    )
    db_session.add(integration)
    db_session.commit()
    return integration


@pytest.fixture
def sample_storage_integration(db_session: Session, test_user: User) -> Integration:
    """创建测试存储集成配置"""
    integration = Integration(
        user_id=test_user.id,
        integration_type="storage",
        config_key="local-test",
        name="本地存储测试",
        provider="local",
        config={
            "upload_dir": "uploads/test"
        },
        is_default=True,
        is_enabled=True
    )
    db_session.add(integration)
    db_session.commit()
    return integration


class TestIntegrationProviders:
    """测试提供商列表"""

    def test_list_providers(self, client: TestClient, auth_headers: dict):
        """测试获取所有提供商"""
        response = client.get("/api/integrations/providers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "llm" in data
        assert "storage" in data
        assert len(data["llm"]["providers"]) > 0

    def test_list_providers_filter_llm(self, client: TestClient, auth_headers: dict):
        """测试只获取 LLM 提供商"""
        response = client.get(
            "/api/integrations/providers?integration_type=llm",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "llm" in data
        assert "storage" not in data

    def test_get_provider_schema_llm(self, client: TestClient, auth_headers: dict):
        """测试获取 OpenAI 提供商 Schema"""
        response = client.get(
            "/api/integrations/providers/openai?integration_type=llm",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["provider_id"] == "openai"
        assert "config_fields" in data
        assert len(data["config_fields"]) > 0

    def test_get_provider_schema_invalid(self, client: TestClient, auth_headers: dict):
        """测试获取不存在的提供商"""
        response = client.get(
            "/api/integrations/providers/invalid?integration_type=llm",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestIntegrationCRUD:
    """测试集成配置 CRUD"""

    def test_create_llm_integration(self, client: TestClient, auth_headers: dict):
        """测试创建 LLM 集成配置"""
        response = client.post(
            "/api/integrations",
            headers=auth_headers,
            json={
                "integration_type": "llm",
                "config_key": "my-openai",
                "name": "我的 OpenAI",
                "provider": "openai",
                "config": {
                    "api_key": "sk-test-key",
                    "model": "gpt-4o"
                },
                "is_default": False
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["config_key"] == "my-openai"
        assert data["name"] == "我的 OpenAI"
        assert data["provider"] == "openai"

    def test_create_storage_integration(self, client: TestClient, auth_headers: dict):
        """测试创建存储集成配置"""
        response = client.post(
            "/api/integrations",
            headers=auth_headers,
            json={
                "integration_type": "storage",
                "config_key": "my-lskypro",
                "name": "我的兰空图床",
                "provider": "lskypro",
                "config": {
                    "api_url": "https://img.example.com",
                    "api_token": "test-token"
                }
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["integration_type"] == "storage"
        assert data["provider"] == "lskypro"

    def test_create_integration_duplicate_key(self, client: TestClient, auth_headers: dict, sample_llm_integration: Integration):
        """测试创建重复的 config_key"""
        response = client.post(
            "/api/integrations",
            headers=auth_headers,
            json={
                "integration_type": "llm",
                "config_key": sample_llm_integration.config_key,  # 重复的 key
                "name": "重复配置",
                "provider": "openai",
                "config": {"api_key": "key"}
            }
        )
        assert response.status_code == 400
        assert "已存在" in response.json()["detail"]

    def test_list_integrations(self, client: TestClient, auth_headers: dict, sample_llm_integration: Integration):
        """测试获取集成配置列表"""
        response = client.get("/api/integrations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(i["config_key"] == "openai-test" for i in data)

    def test_list_integrations_filter_by_type(self, client: TestClient, auth_headers: dict, sample_llm_integration: Integration, sample_storage_integration: Integration):
        """测试按类型过滤"""
        response = client.get(
            "/api/integrations?integration_type=llm",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert all(i["integration_type"] == "llm" for i in data)

    def test_get_integration_detail(self, client: TestClient, auth_headers: dict, sample_llm_integration: Integration):
        """测试获取集成配置详情"""
        response = client.get(
            f"/api/integrations/llm/{sample_llm_integration.config_key}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["config_key"] == sample_llm_integration.config_key
        assert data["name"] == sample_llm_integration.name
        assert "config" in data  # 详情包含配置

    def test_get_integration_not_found(self, client: TestClient, auth_headers: dict):
        """测试获取不存在的配置"""
        response = client.get("/api/integrations/llm/nonexistent", headers=auth_headers)
        assert response.status_code == 404

    def test_update_integration(self, client: TestClient, auth_headers: dict, sample_llm_integration: Integration):
        """测试更新集成配置"""
        response = client.put(
            f"/api/integrations/llm/{sample_llm_integration.config_key}",
            headers=auth_headers,
            json={
                "name": "更新后的名称",
                "config": {
                    "api_key": "new-key",
                    "model": "gpt-4o-mini"
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "更新后的名称"

    def test_update_integration_partial(self, client: TestClient, auth_headers: dict, sample_llm_integration: Integration):
        """测试部分更新"""
        response = client.put(
            f"/api/integrations/llm/{sample_llm_integration.config_key}",
            headers=auth_headers,
            json={
                "name": "只改名字"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "只改名字"
        assert data["provider"] == sample_llm_integration.provider  # 未改变

    def test_delete_integration(self, client: TestClient, auth_headers: dict, sample_llm_integration: Integration, db_session: Session):
        """测试删除集成配置"""
        response = client.delete(
            f"/api/integrations/llm/{sample_llm_integration.config_key}",
            headers=auth_headers
        )
        assert response.status_code == 200

        # 验证数据库中已删除
        deleted = db_session.query(Integration).filter_by(id=sample_llm_integration.id).first()
        assert deleted is None

    def test_delete_integration_not_found(self, client: TestClient, auth_headers: dict):
        """测试删除不存在的配置"""
        response = client.delete("/api/integrations/llm/nonexistent", headers=auth_headers)
        assert response.status_code == 404


class TestIntegrationSetDefault:
    """测试设置默认配置"""

    def test_set_default_integration(self, client: TestClient, auth_headers: dict, db_session: Session, test_user: User):
        """测试设置默认配置"""
        # 创建非默认配置
        integration = Integration(
            user_id=test_user.id,
            integration_type="llm",
            config_key="secondary-openai",
            name="次要 OpenAI",
            provider="openai",
            config={"api_key": "key"},
            is_default=False
        )
        db_session.add(integration)
        db_session.commit()

        response = client.post(
            f"/api/integrations/llm/{integration.config_key}/set-default",
            headers=auth_headers
        )
        assert response.status_code == 200

        # 验证已设为默认
        db_session.refresh(integration)
        assert integration.is_default is True

    def test_set_default_other_user(self, client: TestClient, auth_headers: dict, db_session: Session):
        """测试设置其他用户的配置为默认"""
        # 创建其他用户的配置
        from app.models.user import User
        from app.utils.auth import get_password_hash
        other_user = User(
            username="other",
            email="other@example.com",
            password_hash=get_password_hash("pass")
        )
        db_session.add(other_user)
        db_session.flush()

        other_integration = Integration(
            user_id=other_user.id,
            integration_type="llm",
            config_key="other-openai",
            name="别人的 OpenAI",
            provider="openai",
            config={"api_key": "key"}
        )
        db_session.add(other_integration)
        db_session.commit()

        response = client.post(
            f"/api/integrations/llm/{other_integration.config_key}/set-default",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestIntegrationTestEndpoint:
    """测试集成配置测试端点"""

    def test_test_integration(self, client: TestClient, auth_headers: dict, sample_llm_integration: Integration):
        """测试测试集成配置端点"""
        response = client.post(
            f"/api/integrations/llm/{sample_llm_integration.config_key}/test",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "message" in data

    def test_test_integration_not_found(self, client: TestClient, auth_headers: dict):
        """测试不存在的集成配置"""
        response = client.post(
            "/api/integrations/llm/nonexistent/test",
            headers=auth_headers
        )
        # API 返回 200，但 success 为 false
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "不存在" in data["message"]

    def test_test_other_user_integration(self, client: TestClient, auth_headers: dict, db_session: Session):
        """测试其他用户的集成配置"""
        from app.models.user import User
        from app.utils.auth import get_password_hash

        other_user = User(
            username="other_test_user",
            email="other_test@example.com",
            password_hash=get_password_hash("pass")
        )
        db_session.add(other_user)
        db_session.flush()

        other_integration = Integration(
            user_id=other_user.id,
            integration_type="llm",
            config_key="other-test",
            name="别人的测试配置",
            provider="openai",
            config={"api_key": "key"}
        )
        db_session.add(other_integration)
        db_session.commit()

        response = client.post(
            f"/api/integrations/llm/{other_integration.config_key}/test",
            headers=auth_headers
        )
        # API 返回 200，但 success 为 false（因为找不到该用户的配置）
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False


class TestIntegrationUnauthorized:
    """测试未授权访问"""

    def test_list_integrations_unauthorized(self, client: TestClient):
        """测试未授权获取列表"""
        response = client.get("/api/integrations")
        assert response.status_code == 401

    def test_create_integration_unauthorized(self, client: TestClient):
        """测试未授权创建"""
        response = client.post(
            "/api/integrations",
            json={
                "integration_type": "llm",
                "config_key": "test",
                "name": "测试",
                "provider": "openai",
                "config": {}
            }
        )
        assert response.status_code == 401

    def test_get_integration_unauthorized(self, client: TestClient):
        """测试未授权获取详情"""
        response = client.get("/api/integrations/llm/test")
        assert response.status_code == 401

    def test_test_integration_unauthorized(self, client: TestClient):
        """测试未授权测试集成配置"""
        response = client.post("/api/integrations/llm/test/test")
        assert response.status_code == 401

    def test_set_default_unauthorized(self, client: TestClient):
        """测试未授权设置默认配置"""
        response = client.post("/api/integrations/llm/test/set-default")
        assert response.status_code == 401
