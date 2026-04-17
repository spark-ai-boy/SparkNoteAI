# OpenAI Provider

from typing import List, Dict, Any, Tuple, AsyncGenerator
import httpx
import json

from ..base_provider import LLMProvider, ConfigField, ModelInfo


class OpenAIProvider(LLMProvider):
    """OpenAI 提供商"""

    provider_id = "openai"
    provider_name = "OpenAI"
    description = "OpenAI GPT 系列模型，包括 GPT-4、GPT-3.5-Turbo 等"
    website = "https://openai.com"

    config_fields = [
        ConfigField(
            name="api_key",
            label="API Key",
            type="password",
            required=True,
            description="OpenAI API Key，以 sk- 开头",
            placeholder="sk-..."
        ),
        ConfigField(
            name="base_url",
            label="Base URL",
            type="url",
            required=False,
            description="可选，用于代理或自定义端点",
            placeholder="https://api.openai.com/v1",
            default="https://api.openai.com/v1"
        ),
    ]

    supports_custom_model = True
    supports_model_list = True

    # 预定义的模型列表
    DEFAULT_MODELS = [
        ModelInfo(id="gpt-4o", name="GPT-4o", description="最强大的多模态模型", max_tokens=128000),
        ModelInfo(id="gpt-4o-mini", name="GPT-4o Mini", description="快速、经济的模型", max_tokens=128000),
        ModelInfo(id="gpt-4-turbo", name="GPT-4 Turbo", description="高智能模型", max_tokens=128000),
        ModelInfo(id="gpt-3.5-turbo", name="GPT-3.5 Turbo", description="快速、经济的模型", max_tokens=16385),
    ]

    async def get_models(self) -> List[ModelInfo]:
        """获取可用模型列表"""
        api_key = self.get_api_key()
        if not api_key:
            return self.DEFAULT_MODELS

        try:
            base_url = self.get_base_url() or "https://api.openai.com/v1"
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{base_url}/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()

                # 过滤出 GPT 模型
                models = []
                for m in data.get("data", []):
                    model_id = m.get("id", "")
                    if any(x in model_id for x in ["gpt-4", "gpt-3.5"]):
                        models.append(ModelInfo(
                            id=model_id,
                            name=model_id,
                            description=""
                        ))
                return models if models else self.DEFAULT_MODELS
        except Exception:
            # 如果获取失败，返回默认列表
            return self.DEFAULT_MODELS

    async def validate_config(self) -> Tuple[bool, str]:
        """验证配置"""
        api_key = self.get_api_key()
        if not api_key:
            return False, "API Key 不能为空"

        try:
            base_url = self.get_base_url() or "https://api.openai.com/v1"
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{base_url}/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                    timeout=10.0
                )
                response.raise_for_status()

                # 2. 如果配置了模型名称，进一步验证模型是否存在
                model = self.config.get("model")
                if model:
                    # 发送一个简单的对话请求来验证模型
                    response = await client.post(
                        f"{base_url}/chat/completions",
                        headers={"Authorization": f"Bearer {api_key}"},
                        json={
                            "model": model,
                            "messages": [{"role": "user", "content": "Hi"}],
                            "max_tokens": 1,
                        },
                        timeout=10.0
                    )
                    # 解析响应体检查错误
                    try:
                        error_data = response.json()
                        error_type = error_data.get('error', {}).get('type', '')
                        error_msg = error_data.get('error', {}).get('message', '')

                        if response.status_code == 404:
                            return False, f"模型 '{model}' 不存在"
                        elif response.status_code == 401:
                            return False, "API Key 无效"
                        elif response.status_code == 400 and error_type == 'invalid_parameter':
                            # OpenAI 返回 400 表示模型名无效
                            return False, f"模型 '{model}' 不存在或无效 ({error_msg})"
                        elif response.status_code >= 400:
                            # 其他错误（如配额不足等）也算验证通过
                            return True, "API Key 验证成功"
                        else:
                            return True, "连接成功"
                    except Exception:
                        # 解析失败时根据状态码判断
                        if response.status_code >= 400:
                            return True, "API Key 验证成功"
                        return True, "连接成功"
                else:
                    return True, "API Key 验证成功"

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                return False, "API Key 无效"
            return False, f"HTTP 错误: {e.response.status_code}"
        except Exception as e:
            return False, f"连接失败：{str(e)}"

        return True, "连接成功"

    async def generate(self, prompt: str, model: str, system_prompt: str = None) -> str:
        """生成文本"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        base_url = self.get_base_url() or "https://api.openai.com/v1"
        api_key = self.get_api_key()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model,
                    "messages": messages,
                    "max_tokens": 2000,
                    "temperature": 0.7,
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
        system_prompt: str = None
    ) -> AsyncGenerator[str, None]:
        """流式生成"""
        msg_list = []
        if system_prompt:
            msg_list.append({"role": "system", "content": system_prompt})
        msg_list.extend(messages)

        base_url = self.get_base_url() or "https://api.openai.com/v1"
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
                    "temperature": 0.7,
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
