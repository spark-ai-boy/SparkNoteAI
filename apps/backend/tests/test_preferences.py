"""
用户偏好 API 测试
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.integration import Integration, UserPreference
from app.models.user import User


@pytest.fixture
def sample_preference(db_session: Session, test_user: User) -> UserPreference:
    """创建测试用户偏好"""
    pref = UserPreference(
        user_id=test_user.id,
        theme="dark",
        language="zh-CN",
        font_size=16,
        sidebar_collapsed=True,
        default_llm_integration="my-openai",
        default_storage_integration="my-storage",
        preferences={
            "editor_mode": "rich",
            "auto_save": True
        }
    )
    db_session.add(pref)
    db_session.commit()
    return pref


@pytest.fixture
def sample_integrations_for_defaults(db_session: Session, test_user: User) -> tuple:
    """创建默认集成配置"""
    llm = Integration(
        user_id=test_user.id,
        integration_type="llm",
        config_key="default-llm-pref",
        name="默认 LLM",
        provider="openai",
        config={"api_key": "key", "model": "gpt-4o"},
        is_default=True
    )
    storage = Integration(
        user_id=test_user.id,
        integration_type="storage",
        config_key="default-storage-pref",
        name="默认存储",
        provider="local",
        config={"upload_dir": "uploads"},
        is_default=True
    )
    db_session.add_all([llm, storage])
    db_session.commit()
    return (llm, storage)


class TestPreferenceGet:
    """测试获取用户偏好"""

    def test_get_preference(self, client: TestClient, auth_headers: dict, sample_preference: UserPreference):
        """测试获取用户偏好"""
        response = client.get("/api/preferences", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["theme"] == "dark"
        assert data["language"] == "zh-CN"
        assert data["font_size"] == 16
        assert data["sidebar_collapsed"] is True
        assert data["default_llm_integration"] == "my-openai"
        assert data["default_storage_integration"] == "my-storage"
        assert data["preferences"]["editor_mode"] == "rich"

    def test_get_preference_not_exist(self, client: TestClient, auth_headers: dict):
        """测试获取不存在的偏好（应自动创建）"""
        response = client.get("/api/preferences", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # 应返回默认值
        assert data["theme"] == "system"
        assert data["language"] == "zh-CN"
        assert data["font_size"] == 14
        assert data["sidebar_collapsed"] is False


class TestPreferenceUpdate:
    """测试更新用户偏好"""

    def test_update_preference(self, client: TestClient, auth_headers: dict):
        """测试更新用户偏好"""
        response = client.put(
            "/api/preferences",
            headers=auth_headers,
            json={
                "theme": "light",
                "font_size": 18,
                "sidebar_collapsed": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["theme"] == "light"
        assert data["font_size"] == 18
        assert data["sidebar_collapsed"] is False
        # 未改变的字段应保持默认值
        assert data["language"] == "zh-CN"

    def test_update_preference_language(self, client: TestClient, auth_headers: dict):
        """测试更新语言"""
        response = client.put(
            "/api/preferences",
            headers=auth_headers,
            json={
                "language": "en-US"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["language"] == "en-US"

    def test_update_preference_default_integrations(self, client: TestClient, auth_headers: dict):
        """测试更新默认集成配置"""
        response = client.put(
            "/api/preferences",
            headers=auth_headers,
            json={
                "default_llm_integration": "my-custom-llm",
                "default_storage_integration": "my-custom-storage"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["default_llm_integration"] == "my-custom-llm"
        assert data["default_storage_integration"] == "my-custom-storage"

    def test_update_preference_empty(self, client: TestClient, auth_headers: dict):
        """测试空更新"""
        response = client.put(
            "/api/preferences",
            headers=auth_headers,
            json={}
        )
        assert response.status_code == 400
        assert "没有提供要更新的字段" in response.json()["detail"]


class TestPreferenceDefaults:
    """测试获取默认集成配置"""

    def test_get_defaults(self, client: TestClient, auth_headers: dict, sample_preference: UserPreference):
        """测试获取默认配置"""
        response = client.get("/api/preferences/defaults", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "theme" in data
        assert "language" in data
        assert "default_llm_integration" in data
        assert data["default_llm_integration"] == "my-openai"

    def test_get_defaults_no_preference(self, client: TestClient, auth_headers: dict):
        """测试没有偏好时的默认配置"""
        response = client.get("/api/preferences/defaults", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["theme"] == "system"
        assert data["default_llm_integration"] is None
        assert data["default_storage_integration"] is None

    def test_get_defaults_with_real_integrations(self, client: TestClient, auth_headers: dict, sample_integrations_for_defaults: tuple):
        """测试存在真实集成配置时的默认值"""
        # 先更新偏好指向实际存在的配置
        client.put(
            "/api/preferences",
            headers=auth_headers,
            json={
                "default_llm_integration": "default-llm-pref",
                "default_storage_integration": "default-storage-pref"
            }
        )

        response = client.get("/api/preferences/defaults", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["default_llm_integration"] == "default-llm-pref"
        assert data["default_storage_integration"] == "default-storage-pref"


class TestPreferenceThemes:
    """测试主题设置"""

    @pytest.mark.parametrize("theme", ["light", "dark", "system"])
    def test_valid_themes(self, client: TestClient, auth_headers: dict, theme: str):
        """测试有效主题值"""
        response = client.put(
            "/api/preferences",
            headers=auth_headers,
            json={"theme": theme}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["theme"] == theme


class TestPreferenceLanguages:
    """测试语言设置"""

    @pytest.mark.parametrize("language", ["zh-CN", "en-US"])
    def test_valid_languages(self, client: TestClient, auth_headers: dict, language: str):
        """测试有效语言值"""
        response = client.put(
            "/api/preferences",
            headers=auth_headers,
            json={"language": language}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["language"] == language


class TestPreferenceFontSizes:
    """测试字体大小设置"""

    @pytest.mark.parametrize("size", [12, 14, 16, 18])
    def test_valid_font_sizes(self, client: TestClient, auth_headers: dict, size: int):
        """测试有效字体大小"""
        response = client.put(
            "/api/preferences",
            headers=auth_headers,
            json={"font_size": size}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["font_size"] == size


class TestPreferenceUnauthorized:
    """测试未授权访问"""

    def test_get_preference_unauthorized(self, client: TestClient):
        """测试未授权获取偏好"""
        response = client.get("/api/preferences")
        assert response.status_code == 401

    def test_update_preference_unauthorized(self, client: TestClient):
        """测试未授权更新偏好"""
        response = client.put(
            "/api/preferences",
            json={"theme": "dark"}
        )
        assert response.status_code == 401

    def test_get_defaults_unauthorized(self, client: TestClient):
        """测试未授权获取默认配置"""
        response = client.get("/api/preferences/defaults")
        assert response.status_code == 401


class TestNotificationSettings:
    """测试通知设置"""

    def test_get_preference_with_notifications(self, client: TestClient, auth_headers: dict, sample_preference: UserPreference):
        """测试获取偏好包含通知设置"""
        response = client.get("/api/preferences", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        # 默认通知设置
        assert data["notifications"]["task_complete"] is True
        assert data["notifications"]["import_progress"] is True
        assert data["notifications"]["import_complete"] is True
        assert data["notifications"]["knowledge_graph_complete"] is True
        assert data["notifications"]["error_alerts"] is True

    def test_update_notification_single_setting(self, client: TestClient, auth_headers: dict):
        """测试更新单个通知设置"""
        response = client.put(
            "/api/preferences",
            headers=auth_headers,
            json={
                "notifications": {
                    "task_complete": False
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["notifications"]["task_complete"] is False
        # 其他设置应保持默认值
        assert data["notifications"]["import_progress"] is True
        assert data["notifications"]["error_alerts"] is True

    def test_update_notification_multiple_settings(self, client: TestClient, auth_headers: dict):
        """测试更新多个通知设置"""
        response = client.put(
            "/api/preferences",
            headers=auth_headers,
            json={
                "notifications": {
                    "task_complete": False,
                    "import_progress": False,
                    "error_alerts": True
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["notifications"]["task_complete"] is False
        assert data["notifications"]["import_progress"] is False
        assert data["notifications"]["error_alerts"] is True
        # 未指定的设置应保持默认值
        assert data["notifications"]["import_complete"] is True
        assert data["notifications"]["knowledge_graph_complete"] is True

    def test_update_notification_merge(self, client: TestClient, auth_headers: dict):
        """测试通知设置合并更新"""
        # 第一次更新
        client.put(
            "/api/preferences",
            headers=auth_headers,
            json={
                "notifications": {
                    "task_complete": False
                }
            }
        )
        # 第二次更新（只更新另一个字段）
        response = client.put(
            "/api/preferences",
            headers=auth_headers,
            json={
                "notifications": {
                    "import_progress": False
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        # 第一次的设置应保持
        assert data["notifications"]["task_complete"] is False
        # 新的设置
        assert data["notifications"]["import_progress"] is False
        # 其他保持默认
        assert data["notifications"]["error_alerts"] is True

    def test_update_notification_with_other_preferences(self, client: TestClient, auth_headers: dict):
        """测试同时更新通知和其他偏好"""
        response = client.put(
            "/api/preferences",
            headers=auth_headers,
            json={
                "theme": "dark",
                "notifications": {
                    "task_complete": False
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["theme"] == "dark"
        assert data["notifications"]["task_complete"] is False
