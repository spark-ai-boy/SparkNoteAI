"""
场景配置 API 测试
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.integration import Integration, FeatureSetting
from app.models.user import User


@pytest.fixture
def sample_llm_integration_for_feature(db_session: Session, test_user: User) -> Integration:
    """创建用于场景配置的 LLM 集成"""
    integration = Integration(
        user_id=test_user.id,
        integration_type="llm",
        config_key="feature-openai",
        name="场景配置 OpenAI",
        provider="openai",
        config={"api_key": "key", "model": "gpt-4o"},
        is_default=False,
        is_enabled=True
    )
    db_session.add(integration)
    db_session.commit()
    return integration


@pytest.fixture
def sample_feature_setting(db_session: Session, test_user: User, sample_llm_integration_for_feature: Integration) -> FeatureSetting:
    """创建测试场景配置"""
    setting = FeatureSetting(
        user_id=test_user.id,
        feature_id="knowledge_graph",
        integration_refs={"llm": sample_llm_integration_for_feature.config_key},
        use_default_llm=False,
        use_default_storage=True,
        custom_settings={
            "temperature": 0.3,
            "entity_count": 10
        },
        is_enabled=True
    )
    db_session.add(setting)
    db_session.commit()
    return setting


class TestFeatureDefinitions:
    """测试功能定义"""

    def test_list_feature_definitions(self, client: TestClient, auth_headers: dict):
        """测试获取所有功能定义"""
        response = client.get("/api/features", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # 应该包含知识图谱
        assert any(f["feature_id"] == "knowledge_graph" for f in data)

    def test_get_feature_schema(self, client: TestClient, auth_headers: dict):
        """测试获取功能 Schema"""
        response = client.get("/api/features/knowledge_graph/schema", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["feature_id"] == "knowledge_graph"
        assert "feature_name" in data
        assert "config_fields" in data

    def test_get_feature_schema_not_found(self, client: TestClient, auth_headers: dict):
        """测试获取不存在的功能"""
        response = client.get("/api/features/nonexistent/schema", headers=auth_headers)
        assert response.status_code == 404


class TestFeatureSetting:
    """测试场景配置"""

    def test_get_feature_setting(self, client: TestClient, auth_headers: dict, sample_feature_setting: FeatureSetting):
        """测试获取场景配置"""
        response = client.get(
            "/api/features/knowledge_graph/settings",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["feature_id"] == "knowledge_graph"
        assert data["integration_refs"]["llm"] == "feature-openai"
        assert data["use_default_llm"] is False
        assert data["custom_settings"]["temperature"] == 0.3

    def test_get_feature_setting_not_exist(self, client: TestClient, auth_headers: dict):
        """测试获取不存在的场景配置（应自动创建）"""
        response = client.get(
            "/api/features/ai_assistant/settings",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["feature_id"] == "ai_assistant"
        assert data["use_default_llm"] is True  # 默认使用默认值

    def test_update_feature_setting(self, client: TestClient, auth_headers: dict):
        """测试更新场景配置"""
        response = client.put(
            "/api/features/knowledge_graph/settings",
            headers=auth_headers,
            json={
                "integration_refs": {"llm": "my-llm"},
                "use_default_llm": False,
                "custom_settings": {
                    "temperature": 0.5,
                    "entity_count": 15
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["integration_refs"]["llm"] == "my-llm"
        assert data["custom_settings"]["temperature"] == 0.5
        assert data["custom_settings"]["entity_count"] == 15

    def test_update_feature_setting_partial(self, client: TestClient, auth_headers: dict, sample_feature_setting: FeatureSetting):
        """测试部分更新场景配置"""
        response = client.put(
            "/api/features/knowledge_graph/settings",
            headers=auth_headers,
            json={
                "is_enabled": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_enabled"] is False
        # 其他字段应保持不变
        assert data["custom_settings"]["temperature"] == 0.3

    def test_update_feature_setting_use_default(self, client: TestClient, auth_headers: dict, sample_feature_setting: FeatureSetting):
        """测试切换为使用默认配置"""
        response = client.put(
            "/api/features/knowledge_graph/settings",
            headers=auth_headers,
            json={
                "use_default_llm": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["use_default_llm"] is True

    def test_reset_feature_setting(self, client: TestClient, auth_headers: dict, sample_feature_setting: FeatureSetting):
        """测试重置场景配置"""
        response = client.delete(
            "/api/features/knowledge_graph/settings",
            headers=auth_headers
        )
        assert response.status_code == 200

        # 验证已重置
        response = client.get(
            "/api/features/knowledge_graph/settings",
            headers=auth_headers
        )
        data = response.json()
        assert data["integration_refs"] == {}
        assert data["use_default_llm"] is True
        assert data["custom_settings"] == {}

    def test_list_all_feature_settings(self, client: TestClient, auth_headers: dict, sample_feature_setting: FeatureSetting):
        """测试获取所有场景配置"""
        response = client.get("/api/features/settings", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1


class TestFeatureRuntimeConfig:
    """测试运行时配置"""

    def test_get_runtime_config_with_integration(self, client: TestClient, auth_headers: dict, sample_feature_setting: FeatureSetting):
        """测试获取运行时配置（包含集成配置）"""
        response = client.get(
            "/api/features/knowledge_graph/runtime-config",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["feature_id"] == "knowledge_graph"
        assert "llm_config" in data  # 应包含解密后的 LLM 配置
        assert data["is_enabled"] is True

    def test_get_runtime_config_use_default(self, client: TestClient, auth_headers: dict, db_session: Session, test_user: User):
        """测试使用默认配置时的运行时配置"""
        # 创建默认 LLM 配置
        default_llm = Integration(
            user_id=test_user.id,
            integration_type="llm",
            config_key="default-llm",
            name="默认 LLM",
            provider="openai",
            config={"api_key": "default-key", "model": "gpt-4o"},
            is_default=True,
            is_enabled=True
        )
        db_session.add(default_llm)
        db_session.commit()

        # 创建使用默认配置的场景
        setting = FeatureSetting(
            user_id=test_user.id,
            feature_id="notes",
            use_default_llm=True,
            is_enabled=True
        )
        db_session.add(setting)
        db_session.commit()

        response = client.get(
            "/api/features/notes/runtime-config",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        # 应返回默认配置
        assert data["llm_config"]["model"] == "gpt-4o"

    def test_get_runtime_config_no_llm(self, client: TestClient, auth_headers: dict):
        """测试没有配置 LLM 时"""
        # 先创建一个没有配置的场景
        response = client.get(
            "/api/features/nonexistent_feature/runtime-config",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestFeatureSettingUnauthorized:
    """测试未授权访问"""

    def test_get_feature_setting_unauthorized(self, client: TestClient):
        """测试未授权获取场景配置"""
        response = client.get("/api/features/knowledge_graph/settings")
        assert response.status_code == 401

    def test_update_feature_setting_unauthorized(self, client: TestClient):
        """测试未授权更新场景配置"""
        response = client.put(
            "/api/features/knowledge_graph/settings",
            json={"is_enabled": False}
        )
        assert response.status_code == 401

    def test_reset_feature_setting_unauthorized(self, client: TestClient):
        """测试未授权重置场景配置"""
        response = client.delete("/api/features/knowledge_graph/settings")
        assert response.status_code == 401
