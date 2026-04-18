# 阿里云 Code Plan Provider

from typing import List, Dict, Any, Tuple, AsyncGenerator
import httpx
import json

from app.core.logger import get_logger
from ..base_provider import LLMProvider, ConfigField, ModelInfo

logger = get_logger(__name__)


class AliyunProvider(LLMProvider):
    """阿里云 Code Plan（DashScope）提供商"""

    provider_id = "aliyun"
    provider_name = "阿里百炼"
    description = "阿里云 DashScope 大模型服务"
    website = "https://dashscope.aliyun.com"

    config_fields = [
        ConfigField(
            name="api_key",
            label="API Key",
            type="password",
            required=True,
            description="阿里云 DashScope API Key",
            placeholder="sk-..."
        ),
        ConfigField(
            name="base_url",
            label="Base URL",
            type="url",
            required=False,
            description="可选，用于代理或私有化部署",
            placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1",
            default="https://dashscope.aliyuncs.com/compatible-mode/v1"
        ),
    ]

    supports_custom_model = True
    supports_model_list = False

    DEFAULT_MODELS = [
        ModelInfo(id="qwen-max", name="通义千问-Max", description="能力最强的模型"),
        ModelInfo(id="qwen-plus", name="通义千问-Plus", description="均衡的模型"),
        ModelInfo(id="qwen-turbo", name="通义千问-Turbo", description="快速经济的模型"),
        ModelInfo(id="qwen-coder-plus", name="通义千问-Coder-Plus", description="代码专用模型"),
        ModelInfo(id="deepseek-r1", name="DeepSeek-R1", description="深度思考模型"),
        ModelInfo(id="deepseek-v3", name="DeepSeek-V3", description="DeepSeek 最新模型"),
    ]

    async def get_models(self) -> List[ModelInfo]:
        """获取可用模型列表"""
        return self.DEFAULT_MODELS

    async def validate_config(self) -> Tuple[bool, str]:
        """验证配置"""
        api_key = self.get_api_key()
        if not api_key:
            return False, "API Key 不能为空"

        # 使用用户配置的模型进行验证，如果没有则使用默认模型
        model = self.config.get("model") or "qwen-turbo"

        try:
            base_url = self.get_base_url() or "https://dashscope.aliyuncs.com/compatible-mode/v1"
            base_url = base_url.rstrip("/")
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": "Hi"}],
                        "max_tokens": 1,
                    },
                    timeout=30.0
                )

                # 先尝试解析 JSON（非 200 时可能为空体或 HTML）
                try:
                    data = response.json()
                except Exception:
                    # 响应体不是 JSON，说明服务器返回了非标准错误
                    if response.status_code == 401:
                        return False, "API Key 无效"
                    elif response.status_code == 404:
                        return False, f"接口不存在，请检查 Base URL"
                    elif response.status_code == 429:
                        return False, "请求过于频繁（Rate Limit）"
                    else:
                        return False, f"HTTP 错误：{response.status_code}，服务器未返回有效 JSON"

                # 成功响应
                if response.status_code == 200:
                    if data.get('error'):
                        error_msg = data['error'].get('message', '未知错误')
                        error_code = data['error'].get('code', '')
                        if 'not found' in error_msg.lower() or error_code in ('model_not_found', 'invalid_model'):
                            return False, f"模型 '{model}' 不存在或无效"
                        elif 'invalid' in error_msg.lower() or 'api' in error_msg.lower():
                            return False, f"API Key 无效"
                        else:
                            return False, f"验证失败: {error_msg}"
                    return True, "连接成功"
                elif response.status_code == 401:
                    return False, "API Key 无效"
                elif response.status_code == 404:
                    return False, f"模型 '{model}' 不存在或接口路径有误"
                elif response.status_code == 429:
                    return False, "请求过于频繁（Rate Limit）"
                else:
                    error_msg = data.get('error', {}).get('message', '未知错误')
                    return False, f"HTTP 错误：{response.status_code} — {error_msg}"
        except httpx.ConnectError:
            return False, "无法连接到服务器，请检查网络或 Base URL"
        except httpx.TimeoutException:
            return False, "连接超时，请检查网络"
        except Exception as e:
            return False, f"连接失败: {str(e)}"

    async def generate(self, prompt: str, model: str, system_prompt: str = None, temperature: float = 0.7) -> str:
        """生成文本"""
        api_key = self.get_api_key()
        base_url = self.get_base_url() or "https://dashscope.aliyuncs.com/compatible-mode/v1"
        base_url = base_url.rstrip("/")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
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

            # OpenAI 兼容格式
            if 'choices' in data and len(data['choices']) > 0:
                return data['choices'][0]['message']['content']
            elif 'output' in data and 'text' in data['output']:
                return data['output']['text']
            raise ValueError("无法从响应中提取内容")

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        model: str,
        system_prompt: str = None,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """流式生成"""
        api_key = self.get_api_key()
        base_url = self.get_base_url() or "https://dashscope.aliyuncs.com/compatible-mode/v1"
        base_url = base_url.rstrip("/")

        msg_list = []
        if system_prompt:
            msg_list.append({"role": "system", "content": system_prompt})
        msg_list.extend(messages)

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
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
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if not data or data == "[DONE]":
                        continue
                    try:
                        chunk = json.loads(data)
                        # OpenAI 兼容格式
                        if 'choices' in chunk and len(chunk['choices']) > 0:
                            delta = chunk['choices'][0].get('delta', {})
                            content = delta.get('content', '')
                            if content:
                                yield content
                        # 阿里云原生格式（兼容旧接口）
                        elif 'output' in chunk and 'text' in chunk['output']:
                            content = chunk['output']['text']
                            if content:
                                yield content
                    except json.JSONDecodeError as e:
                        logger.debug(f"阿里云-流式 JSON 解码错误: error={e}, line={line[:100]}")
                        continue
