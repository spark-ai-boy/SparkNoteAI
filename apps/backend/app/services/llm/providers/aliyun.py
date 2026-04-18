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
            placeholder="https://dashscope.aliyuncs.com/api/v1",
            default="https://dashscope.aliyuncs.com/api/v1"
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
            base_url = self.get_base_url() or "https://dashscope.aliyuncs.com/api/v1"
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{base_url}/services/aigc/text-generation/generation",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "input": {"messages": [{"role": "user", "content": "Hi"}]},
                        "parameters": {"max_tokens": 1},
                    },
                    timeout=10.0
                )
                # 解析响应体
                data = response.json()

                # 阿里云返回 200 但可能包含错误码
                if response.status_code == 200:
                    # 检查是否有错误码
                    if data.get('code'):
                        error_code = data.get('code')
                        error_msg = data.get('message', '未知错误')
                        if error_code in ['InvalidParameter', 'ModelNotFound', 'InvalidModel', 'InvalidTaskModel']:
                            return False, f"模型 '{model}' 不存在或无效 ({error_msg})"
                        elif error_code == 'InvalidApiKey':
                            return False, "API Key 无效"
                        elif error_code == 'QuotaExhausted':
                            # 配额用完，但 API Key 和模型名是正确的
                            return True, "API Key 验证成功（但配额已用完）"
                        else:
                            # 其他错误码，返回详细信息便于调试
                            return False, f"验证失败 ({error_code}): {error_msg}"
                    # 成功响应
                    return True, "连接成功"
                elif response.status_code == 401:
                    return False, "API Key 无效"
                elif response.status_code == 404:
                    return False, f"模型 '{model}' 不存在"
                else:
                    # 其他 HTTP 错误，返回详细信息
                    return False, f"HTTP 错误：{response.status_code}"
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                return False, "API Key 无效"
            return False, f"HTTP 错误: {e.response.status_code}"
        except Exception as e:
            return False, f"连接失败: {str(e)}"

    async def generate(self, prompt: str, model: str, system_prompt: str = None, temperature: float = 0.7) -> str:
        """生成文本"""
        api_key = self.get_api_key()
        base_url = self.get_base_url() or "https://dashscope.aliyuncs.com/api/v1"

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/services/aigc/text-generation/generation",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "input": {"messages": messages},
                    "parameters": {"max_tokens": 2000, "temperature": temperature},
                },
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()

            # 阿里云返回格式可能不同
            if 'output' in data and 'text' in data['output']:
                return data['output']['text']
            elif 'choices' in data and len(data['choices']) > 0:
                return data['choices'][0]['message']['content']
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
        base_url = self.get_base_url() or "https://dashscope.aliyuncs.com/api/v1"

        msg_list = []
        if system_prompt:
            msg_list.append({"role": "system", "content": system_prompt})
        msg_list.extend(messages)

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{base_url}/services/aigc/text-generation/generation",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "X-DashScope-SSE": "enable",  # 启用 SSE
                },
                json={
                    "model": model,
                    "input": {"messages": msg_list},
                    "parameters": {"max_tokens": 2000, "temperature": temperature, "incremental_output": True},
                    "stream": True,
                },
                timeout=60.0
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    # 阿里云 SSE 格式：data:{"output":{"text":"..."}}
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()  # 去掉 "data:" 前缀
                    if not data or data == "[DONE]":
                        continue
                    try:
                        chunk = json.loads(data)
                        # 检查是否有错误
                        if chunk.get('code'):
                            error_msg = chunk.get('message', '未知错误')
                            yield f"[ERROR: {error_msg}]"
                            break
                        # 提取文本内容
                        if 'output' in chunk and 'text' in chunk['output']:
                            content = chunk['output']['text']
                            if content:
                                yield content
                        elif 'choices' in chunk and len(chunk['choices']) > 0:
                            delta = chunk['choices'][0].get('delta', {})
                            content = delta.get('content', '')
                            if content:
                                yield content
                    except json.JSONDecodeError as e:
                        logger.debug(f"阿里云-流式 JSON 解码错误: error={e}, line={line[:100]}")
                        continue
