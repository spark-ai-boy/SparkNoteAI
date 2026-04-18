# OpenAI 兼容协议 Provider

from typing import List, Dict, Any, Tuple, AsyncGenerator
import httpx
import json

from ..base_provider import LLMProvider, ConfigField, ModelInfo


class OpenAICompatibleProvider(LLMProvider):
    """OpenAI 兼容协议提供商（用户自定义 API）"""

    provider_id = "openai_compatible"
    provider_name = "OpenAI 兼容"
    description = "兼容 OpenAI API 协议的第三方服务，如 Ollama、vLLM、LocalAI 等"
    website = ""

    config_fields = [
        ConfigField(
            name="api_key",
            label="API Key",
            type="password",
            required=True,
            description="API Key（部分服务可留空）",
            placeholder="sk-..."
        ),
        ConfigField(
            name="base_url",
            label="API 地址",
            type="url",
            required=True,
            description="兼容 OpenAI 协议的 API 基础地址",
            placeholder="http://localhost:11434/v1"
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
        if not base_url:
            return False, "API 地址不能为空"

        try:
            base_url = base_url.rstrip("/")
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{base_url}/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                    timeout=10.0
                )
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
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        base_url = self.get_base_url().rstrip("/")
        api_key = self.get_api_key()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model,
                    "messages": messages,
                    "max_tokens": 2000,
                    "temperature": temperature,
                },
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        model: str,
        system_prompt: str = None,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """流式生成"""
        msg_list = []
        if system_prompt:
            msg_list.append({"role": "system", "content": system_prompt})
        msg_list.extend(messages)

        base_url = self.get_base_url().rstrip("/")
        api_key = self.get_api_key()

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model,
                    "messages": msg_list,
                    "max_tokens": 2000,
                    "temperature": temperature,
                    "stream": True,
                },
                timeout=60.0
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            delta = chunk["choices"][0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            continue
