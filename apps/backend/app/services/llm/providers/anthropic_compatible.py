# Anthropic 兼容协议 Provider

from typing import List, Dict, Any, Tuple, AsyncGenerator
import httpx
import json

from ..base_provider import LLMProvider, ConfigField, ModelInfo


class AnthropicCompatibleProvider(LLMProvider):
    """Anthropic 兼容协议提供商（用户自定义 API）"""

    provider_id = "anthropic_compatible"
    provider_name = "Anthropic 兼容"
    description = "兼容 Anthropic API 协议的第三方服务"
    website = ""

    config_fields = [
        ConfigField(
            name="api_key",
            label="API Key",
            type="password",
            required=True,
            description="API Key",
            placeholder="sk-ant-..."
        ),
        ConfigField(
            name="base_url",
            label="API 地址",
            type="url",
            required=True,
            description="兼容 Anthropic 协议的 API 基础地址",
            placeholder="http://localhost:8080/v1"
        ),
    ]

    supports_custom_model = True
    supports_model_list = False

    DEFAULT_MODELS: List[ModelInfo] = []

    async def get_models(self) -> List[ModelInfo]:
        """获取可用模型列表"""
        return self.DEFAULT_MODELS

    async def validate_config(self) -> Tuple[bool, str]:
        """验证配置"""
        api_key = self.get_api_key()
        base_url = self.get_base_url()
        if not api_key:
            return False, "API Key 不能为空"
        if not base_url:
            return False, "API 地址不能为空"

        try:
            base_url = base_url.rstrip("/")
            model = self.config.get("model") or ""

            headers = {
                "x-api-key": api_key,
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01",
            }

            data = {
                "max_tokens": 1,
                "messages": [{"role": "user", "content": "Hi"}],
            }
            if model:
                data["model"] = model

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{base_url}/messages",
                    headers=headers,
                    json=data,
                    timeout=30.0
                )
                if response.status_code == 401:
                    return False, "API Key 无效"
                elif response.status_code == 404:
                    return False, "API 地址不存在"
                response.raise_for_status()
                return True, "连接成功"
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                return False, "API Key 无效"
            return False, f"HTTP 错误: {e.response.status_code}"
        except Exception as e:
            return False, f"连接失败: {str(e)}"

    async def generate(self, prompt: str, model: str, system_prompt: str = None, temperature: float = 0.7) -> str:
        """生成文本"""
        api_key = self.get_api_key()
        base_url = self.get_base_url().rstrip("/")

        headers = {
            "x-api-key": api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
        }

        data = {
            "model": model,
            "max_tokens": 2000,
            "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_prompt:
            data["system"] = system_prompt

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/messages",
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
        system_prompt: str = None,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """流式生成"""
        api_key = self.get_api_key()
        base_url = self.get_base_url().rstrip("/")

        headers = {
            "x-api-key": api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
        }

        data = {
            "model": model,
            "max_tokens": 2000,
            "temperature": temperature,
            "messages": messages,
            "stream": True,
        }
        if system_prompt:
            data["system"] = system_prompt

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{base_url}/messages",
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
