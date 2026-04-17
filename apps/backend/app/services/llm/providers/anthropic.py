# Anthropic Provider

from typing import List, Dict, Any, Tuple, AsyncGenerator
import httpx
import json

from ..base_provider import LLMProvider, ConfigField, ModelInfo


class AnthropicProvider(LLMProvider):
    """Anthropic Claude 提供商"""

    provider_id = "anthropic"
    provider_name = "Anthropic"
    description = "Anthropic Claude 系列模型"
    website = "https://www.anthropic.com"

    config_fields = [
        ConfigField(
            name="api_key",
            label="API Key",
            type="password",
            required=True,
            description="Anthropic API Key",
            placeholder="sk-ant-..."
        ),
    ]

    supports_custom_model = True
    supports_model_list = True

    DEFAULT_MODELS = [
        ModelInfo(id="claude-3-opus-20240229", name="Claude 3 Opus", description="最强大的模型", max_tokens=200000),
        ModelInfo(id="claude-3-sonnet-20240229", name="Claude 3 Sonnet", description="平衡性能和速度", max_tokens=200000),
        ModelInfo(id="claude-3-haiku-20240307", name="Claude 3 Haiku", description="最快的模型", max_tokens=200000),
        ModelInfo(id="claude-3-5-sonnet-20241022", name="Claude 3.5 Sonnet", description="最新版本", max_tokens=200000),
    ]

    async def get_models(self) -> List[ModelInfo]:
        """获取可用模型列表

        Anthropic 不提供模型列表 API，返回预定义列表
        """
        return self.DEFAULT_MODELS

    async def validate_config(self) -> Tuple[bool, str]:
        """验证配置"""
        api_key = self.get_api_key()
        if not api_key:
            return False, "API Key 不能为空"

        try:
            # 使用用户配置的模型进行验证，如果没有则使用默认模型
            model = self.config.get("model") or "claude-3-haiku-20240307"

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "Content-Type": "application/json",
                        "anthropic-version": "2023-06-01",
                    },
                    json={
                        "model": model,
                        "max_tokens": 1,
                        "messages": [{"role": "user", "content": "Hi"}],
                    },
                    timeout=10.0
                )
                if response.status_code == 404:
                    return False, f"模型 '{model}' 不存在"
                elif response.status_code == 401:
                    return False, "API Key 无效"
                elif response.status_code >= 400:
                    # 其他错误（如配额不足等）也算验证通过
                    return True, "API Key 验证成功"
                else:
                    return True, "连接成功"
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                return False, "API Key 无效"
            return False, f"HTTP 错误: {e.response.status_code}"
        except Exception as e:
            return False, f"连接失败: {str(e)}"

    async def generate(self, prompt: str, model: str, system_prompt: str = None) -> str:
        """生成文本"""
        api_key = self.get_api_key()

        headers = {
            "x-api-key": api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
        }

        data = {
            "model": model,
            "max_tokens": 2000,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_prompt:
            data["system"] = system_prompt

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=data,
                timeout=60.0
            )
            response.raise_for_status()
            return response.json()["content"][0]["text"]

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        model: str,
        system_prompt: str = None
    ) -> AsyncGenerator[str, None]:
        """流式生成"""
        api_key = self.get_api_key()

        headers = {
            "x-api-key": api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
        }

        data = {
            "model": model,
            "max_tokens": 2000,
            "messages": messages,
            "stream": True,
        }
        if system_prompt:
            data["system"] = system_prompt

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=data,
                timeout=60.0
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        try:
                            chunk = json.loads(data)
                            if chunk.get("type") == "content_block_delta":
                                delta = chunk.get("delta", {})
                                if delta.get("type") == "text_delta":
                                    content = delta.get("text", "")
                                    if content:
                                        yield content
                        except json.JSONDecodeError:
                            continue
