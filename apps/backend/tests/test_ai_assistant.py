"""
AI 助手 API 测试
"""

import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.integration import Integration, FeatureSetting
from app.models.user import User


@pytest.fixture
def sample_llm_for_ai(db_session: Session, test_user: User) -> Integration:
    """创建用于 AI 助手的 LLM 集成"""
    integration = Integration(
        user_id=test_user.id,
        integration_type="llm",
        config_key="ai-openai",
        name="AI 助手 OpenAI",
        provider="openai",
        config={"api_key": "sk-test-key", "model": "gpt-4o"},
        is_default=True,
        is_enabled=True
    )
    db_session.add(integration)
    db_session.commit()
    return integration


@pytest.fixture
def sample_ai_assistant_setting(db_session: Session, test_user: User, sample_llm_for_ai: Integration) -> FeatureSetting:
    """创建 AI 助手场景配置"""
    setting = FeatureSetting(
        user_id=test_user.id,
        feature_id="ai_assistant",
        integration_refs={"llm": sample_llm_for_ai.config_key},
        use_default_llm=False,
        use_default_storage=True,
        custom_settings={
            "temperature": 0.7,
            "max_history": 20,
            "system_prompt": "你是一个有帮助的 AI 助手，名字叫知语拾光。"
        },
        is_enabled=True
    )
    db_session.add(setting)
    db_session.commit()
    return setting


class TestAIAssistantConfig:
    """测试 AI 助手配置"""

    def test_get_config(self, client: TestClient, auth_headers: dict, sample_ai_assistant_setting: FeatureSetting):
        """测试获取 AI 助手配置"""
        response = client.get("/api/features/ai_assistant/config", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["feature_id"] == "ai_assistant"
        assert data["provider"] == "openai"
        assert data["model"] == "gpt-4o"
        assert data["temperature"] == 0.7
        assert data["max_history"] == 20
        assert data["is_enabled"] is True

    def test_get_config_no_llm(self, client: TestClient, auth_headers: dict, db_session: Session, test_user: User):
        """测试没有 LLM 配置时"""
        # 创建没有关联 LLM 的场景
        setting = FeatureSetting(
            user_id=test_user.id,
            feature_id="ai_assistant",
            use_default_llm=True,
            is_enabled=True
        )
        db_session.add(setting)
        db_session.commit()

        response = client.get("/api/features/ai_assistant/config", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # 应返回默认配置或 None
        assert data["feature_id"] == "ai_assistant"

    def test_get_config_disabled(self, client: TestClient, auth_headers: dict, db_session: Session, test_user: User):
        """测试禁用的 AI 助手配置"""
        setting = FeatureSetting(
            user_id=test_user.id,
            feature_id="ai_assistant",
            is_enabled=False
        )
        db_session.add(setting)
        db_session.commit()

        response = client.get("/api/features/ai_assistant/config", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["is_enabled"] is False


class TestAIAssistantChat:
    """测试 AI 聊天"""

    @patch('app.services.llm.factory.ProviderRegistry.create_provider')
    def test_chat_stream(self, mock_create_provider, client: TestClient, auth_headers: dict, sample_ai_assistant_setting: FeatureSetting):
        """测试流式聊天"""
        # Mock provider
        mock_provider = MagicMock()
        mock_provider.generate_stream = AsyncMock()

        async def mock_stream():
            yield "你好"
            yield "！"

        mock_provider.generate_stream.return_value = mock_stream()
        mock_create_provider.return_value = mock_provider

        response = client.post(
            "/api/features/ai_assistant/chat",
            headers=auth_headers,
            json={
                "messages": [
                    {"role": "user", "content": "你好"}
                ],
                "stream": True
            }
        )
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]

    @patch('app.services.llm.factory.ProviderRegistry.create_provider')
    def test_chat_non_stream(self, mock_create_provider, client: TestClient, auth_headers: dict, sample_ai_assistant_setting: FeatureSetting):
        """测试非流式聊天"""
        mock_provider = MagicMock()
        mock_provider.generate = AsyncMock(return_value="你好！有什么可以帮你的吗？")
        mock_create_provider.return_value = mock_provider

        response = client.post(
            "/api/features/ai_assistant/chat/non-stream",
            headers=auth_headers,
            json={
                "messages": [
                    {"role": "user", "content": "你好"}
                ],
                "stream": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "content" in data

    @patch('app.services.llm.factory.ProviderRegistry.create_provider')
    def test_chat_with_custom_system_prompt(self, mock_create_provider, client: TestClient, auth_headers: dict, sample_ai_assistant_setting: FeatureSetting, db_session: Session):
        """测试使用自定义系统提示词"""
        mock_provider = MagicMock()
        mock_provider.generate = AsyncMock(return_value="我是你的编程助手")
        mock_create_provider.return_value = mock_provider

        # 更新场景配置
        sample_ai_assistant_setting.custom_settings["system_prompt"] = "你是一个专业的编程助手"
        db_session.commit()

        response = client.post(
            "/api/features/ai_assistant/chat/non-stream",
            headers=auth_headers,
            json={
                "messages": [
                    {"role": "user", "content": "帮我写一个函数"}
                ],
                "stream": False
            }
        )
        assert response.status_code == 200

    def test_chat_feature_disabled(self, client: TestClient, auth_headers: dict, db_session: Session, test_user: User):
        """测试禁用的 AI 助手功能"""
        setting = FeatureSetting(
            user_id=test_user.id,
            feature_id="ai_assistant",
            is_enabled=False
        )
        db_session.add(setting)
        db_session.commit()

        response = client.post(
            "/api/features/ai_assistant/chat",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "你好"}],
                "stream": False
            }
        )
        assert response.status_code == 403
        assert "已禁用" in response.json()["detail"]

    def test_chat_no_llm_config(self, client: TestClient, auth_headers: dict, db_session: Session, test_user: User):
        """测试没有配置 LLM 时"""
        setting = FeatureSetting(
            user_id=test_user.id,
            feature_id="ai_assistant",
            use_default_llm=True,
            is_enabled=True
        )
        db_session.add(setting)
        db_session.commit()

        response = client.post(
            "/api/features/ai_assistant/chat/non-stream",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "你好"}],
                "stream": False
            }
        )
        assert response.status_code == 400
        assert "未配置 LLM" in response.json()["detail"]

    def test_chat_invalid_model(self, client: TestClient, auth_headers: dict, db_session: Session, test_user: User):
        """测试 LLM 配置中没有指定模型"""
        # 创建没有 model 配置的 LLM
        integration = Integration(
            user_id=test_user.id,
            integration_type="llm",
            config_key="no-model-llm",
            name="无模型 LLM",
            provider="openai",
            config={"api_key": "key"},  # 没有 model
            is_default=True,
            is_enabled=True
        )
        db_session.add(integration)

        setting = FeatureSetting(
            user_id=test_user.id,
            feature_id="ai_assistant",
            integration_refs={"llm": integration.config_key},
            use_default_llm=False,
            is_enabled=True
        )
        db_session.add(setting)
        db_session.commit()

        response = client.post(
            "/api/features/ai_assistant/chat/non-stream",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "你好"}],
                "stream": False
            }
        )
        assert response.status_code == 400
        assert "未指定模型" in response.json()["detail"]


class TestAIAssistantMultiTurn:
    """测试多轮对话"""

    @patch('app.services.llm.factory.ProviderRegistry.create_provider')
    def test_multi_turn_conversation(self, mock_create_provider, client: TestClient, auth_headers: dict, sample_ai_assistant_setting: FeatureSetting):
        """测试多轮对话"""
        mock_provider = MagicMock()
        mock_provider.generate = AsyncMock(return_value="好的，我明白了")
        mock_create_provider.return_value = mock_provider

        # 第一轮
        response1 = client.post(
            "/api/features/ai_assistant/chat/non-stream",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "你好"}],
                "stream": False
            }
        )
        assert response1.status_code == 200

        # 第二轮（带历史）
        response2 = client.post(
            "/api/features/ai_assistant/chat/non-stream",
            headers=auth_headers,
            json={
                "messages": [
                    {"role": "user", "content": "你好"},
                    {"role": "assistant", "content": "你好！有什么可以帮你的？"},
                    {"role": "user", "content": "帮我解释一下 Python 的装饰器"}
                ],
                "stream": False
            }
        )
        assert response2.status_code == 200


class TestAIAssistantUnauthorized:
    """测试未授权访问"""

    def test_get_config_unauthorized(self, client: TestClient):
        """测试未授权获取配置"""
        response = client.get("/api/features/ai_assistant/config")
        assert response.status_code == 401

    def test_chat_unauthorized(self, client: TestClient):
        """测试未授权聊天"""
        response = client.post(
            "/api/features/ai_assistant/chat",
            json={
                "messages": [{"role": "user", "content": "你好"}],
                "stream": False
            }
        )
        assert response.status_code == 401

    def test_chat_non_stream_unauthorized(self, client: TestClient):
        """测试未授权非流式聊天"""
        response = client.post(
            "/api/features/ai_assistant/chat/non-stream",
            json={
                "messages": [{"role": "user", "content": "你好"}],
                "stream": False
            }
        )
        assert response.status_code == 401
