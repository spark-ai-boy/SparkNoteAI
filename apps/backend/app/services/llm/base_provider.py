# LLM 提供商基类

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple, Optional
from pydantic import BaseModel
from typing import AsyncGenerator


class ConfigField(BaseModel):
    """配置字段定义"""
    name: str                    # 字段名，如 "api_key"
    label: str                   # 显示名，如 "API Key"
    type: str                    # 类型：text, password, url, number, select
    required: bool = True        # 是否必填
    description: str = ""        # 字段说明
    placeholder: str = ""        # 占位提示
    default: Any = None          # 默认值
    options: Optional[List[Dict[str, str]]] = None  # select 类型的选项 [{"value": "...", "label": "..."}]


class ModelInfo(BaseModel):
    """模型信息"""
    id: str                      # 模型 ID
    name: str                    # 显示名称
    description: str = ""        # 描述
    max_tokens: Optional[int] = None  # 最大 token 数
    supports_vision: bool = False     # 是否支持视觉


class LLMProvider(ABC):
    """LLM 提供商基类

    所有 LLM 提供商必须继承此类，并实现抽象方法。
    """

    # 提供商元信息（类属性，子类必须定义）
    provider_id: str = ""           # 唯一标识，如 "openai"
    provider_name: str = ""         # 显示名称，如 "OpenAI"
    description: str = ""           # 描述
    website: str = ""               # 官网链接

    # 配置字段定义（子类必须定义）
    config_fields: List[ConfigField] = []

    # 模型相关
    supports_custom_model: bool = False  # 是否支持自定义模型名（用户手动输入）
    supports_model_list: bool = True     # 是否支持获取模型列表

    def __init__(self, config: Dict[str, Any]):
        """初始化提供商

        Args:
            config: 用户配置，包含该提供商需要的所有字段
        """
        self.config = config
        self._validate_config_structure()

    def _validate_config_structure(self):
        """验证配置结构是否符合 config_fields 定义"""
        required_fields = [f.name for f in self.config_fields if f.required]
        for field in required_fields:
            if field not in self.config or self.config[field] is None:
                raise ValueError(f"缺少必填配置项: {field}")

    @classmethod
    def get_config_fields(cls) -> List[ConfigField]:
        """获取该提供商需要的配置字段列表"""
        return cls.config_fields

    @classmethod
    def get_config_schema(cls) -> Dict[str, Any]:
        """获取配置表单 Schema（用于前端动态渲染）"""
        return {
            "provider_id": cls.provider_id,
            "provider_name": cls.provider_name,
            "description": cls.description,
            "website": cls.website,
            "config_fields": [f.dict() for f in cls.config_fields],
            "supports_custom_model": cls.supports_custom_model,
            "supports_model_list": cls.supports_model_list,
        }

    @abstractmethod
    async def get_models(self) -> List[ModelInfo]:
        """获取可用模型列表

        Returns:
            模型信息列表
        """
        pass

    @abstractmethod
    async def validate_config(self) -> Tuple[bool, str]:
        """验证配置是否有效（通常通过调用 API 测试）

        Returns:
            (是否有效, 错误信息)
        """
        pass

    @abstractmethod
    async def generate(self, prompt: str, model: str, system_prompt: str = None, temperature: float = 0.7) -> str:
        """生成文本（非流式）

        Args:
            prompt: 用户提示
            model: 模型名称
            system_prompt: 系统提示
            temperature: 模型温度，0-1 之间，越低越稳定

        Returns:
            生成的文本
        """
        pass

    @abstractmethod
    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        model: str,
        system_prompt: str = None,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """流式生成文本

        Args:
            messages: 消息列表 [{"role": "user", "content": "..."}]
            model: 模型名称
            system_prompt: 系统提示
            temperature: 模型温度，0-1 之间，越低越稳定

        Yields:
            文本片段
        """
        pass

    def get_api_key(self) -> Optional[str]:
        """获取 API Key（辅助方法）"""
        return self.config.get("api_key")

    def get_base_url(self) -> str:
        """获取 Base URL（辅助方法）"""
        return self.config.get("base_url", "")

    def get_model(self) -> str:
        """获取默认模型（辅助方法）"""
        return self.config.get("model", "")
