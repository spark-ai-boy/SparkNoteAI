# Azure OpenAI Provider

from typing import List, Dict, Any, Tuple, AsyncGenerator
import httpx
import json

from ..base_provider import LLMProvider, ConfigField, ModelInfo


class AzureOpenAIProvider(LLMProvider):
    """Azure OpenAI 提供商"""

    provider_id = "azure_openai"
    provider_name = "Azure OpenAI"
    description = "Azure OpenAI 服务，提供企业级的 OpenAI 模型访问"
    website = "https://azure.microsoft.com/services/openai"

    config_fields = [
        ConfigField(
            name="api_key",
            label="API Key",
            type="password",
            required=True,
            description="Azure OpenAI API Key",
            placeholder="..."
        ),
        ConfigField(
            name="endpoint",
            label="Endpoint",
            type="url",
            required=True,
            description="Azure OpenAI Endpoint，格式如 https://xxx.openai.azure.com",
            placeholder="https://your-resource.openai.azure.com"
        ),
        ConfigField(
            name="api_version",
            label="API Version",
            type="text",
            required=False,
            description="API 版本，默认 2023-05-15",
            placeholder="2023-05-15",
            default="2023-05-15"
        ),
    ]

    supports_custom_model = True
    supports_model_list = True

    async def get_models(self) -> List[ModelInfo]:
        """获取可用模型列表

        Azure 模型是部署的，名称由用户自定义
        """
        return [
            ModelInfo(id="gpt-4", name="GPT-4", description="部署名称: gpt-4"),
            ModelInfo(id="gpt-4o", name="GPT-4o", description="部署名称: gpt-4o"),
            ModelInfo(id="gpt-35-turbo", name="GPT-3.5 Turbo", description="部署名称: gpt-35-turbo"),
        ]

    async def validate_config(self) -> Tuple[bool, str]:
        """验证配置"""
        api_key = self.get_api_key()
        endpoint = self.config.get("endpoint")

        if not api_key:
            return False, "API Key 不能为空"
        if not endpoint:
            return False, "Endpoint 不能为空"

        try:
            # 使用用户提供的模型或默认模型进行测试
            model = self.get_model() or "gpt-4"
            api_version = self.config.get("api_version", "2023-05-15")
            url = f"{endpoint}/openai/deployments/{model}/chat/completions?api-version={api_version}"

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    headers={"api-key": api_key},
                    json={
                        "messages": [{"role": "user", "content": "Hi"}],
                        "max_tokens": 1,
                    },
                    timeout=10.0
                )
                response.raise_for_status()
                return True, "连接成功"
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                return False, "API Key 无效"
            if e.response.status_code == 404:
                return False, "部署名称不存在，请检查模型名称"
            return False, f"HTTP 错误: {e.response.status_code}"
        except Exception as e:
            return False, f"连接失败: {str(e)}"

    async def generate(self, prompt: str, model: str, system_prompt: str = None) -> str:
        """生成文本"""
        api_key = self.config.get("api_key")
        endpoint = self.config.get("endpoint")
        api_version = self.config.get("api_version", "2023-05-15")

        url = f"{endpoint}/openai/deployments/{model}/chat/completions?api-version={api_version}"

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers={"api-key": api_key},
                json={
                    "messages": messages,
                    "max_tokens": 2000,
                },
                timeout=60.0
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        model: str,
        system_prompt: str = None
    ) -> AsyncGenerator[str, None]:
        """流式生成"""
        api_key = self.config.get("api_key")
        endpoint = self.config.get("endpoint")
        api_version = self.config.get("api_version", "2023-05-15")

        url = f"{endpoint}/openai/deployments/{model}/chat/completions?api-version={api_version}"

        msg_list = []
        if system_prompt:
            msg_list.append({"role": "system", "content": system_prompt})
        msg_list.extend(messages)

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                url,
                headers={"api-key": api_key},
                json={
                    "messages": msg_list,
                    "max_tokens": 2000,
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
