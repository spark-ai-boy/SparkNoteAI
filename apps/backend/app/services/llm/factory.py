# LLM Provider Factory

from typing import Type, Dict, List, Any
from .base_provider import LLMProvider, ConfigField, ModelInfo
from .providers.openai import OpenAIProvider
from .providers.anthropic import AnthropicProvider
from .providers.azure import AzureOpenAIProvider
from .providers.aliyun import AliyunProvider
from .providers.openai_compatible import OpenAICompatibleProvider
from .providers.anthropic_compatible import AnthropicCompatibleProvider


class ProviderRegistry:
    """LLM 提供商注册表"""

    _providers: Dict[str, Type[LLMProvider]] = {}

    @classmethod
    def register(cls, provider_class: Type[LLMProvider]) -> Type[LLMProvider]:
        """注册提供商

        使用方式：
            @ProviderRegistry.register
            class MyProvider(LLMProvider):
                ...
        """
        cls._providers[provider_class.provider_id] = provider_class
        return provider_class

    @classmethod
    def register_provider(cls, provider_id: str, provider_class: Type[LLMProvider]):
        """手动注册提供商"""
        cls._providers[provider_id] = provider_class

    @classmethod
    def get_provider_class(cls, provider_id: str) -> Type[LLMProvider]:
        """获取提供商类"""
        if provider_id not in cls._providers:
            raise ValueError(f"未知的提供商: {provider_id}")
        return cls._providers[provider_id]

    @classmethod
    def create_provider(cls, provider_id: str, config: Dict[str, Any]) -> LLMProvider:
        """创建提供商实例"""
        provider_class = cls.get_provider_class(provider_id)
        return provider_class(config)

    @classmethod
    def list_providers(cls) -> List[Dict[str, Any]]:
        """列出所有已注册的提供商"""
        return [
            provider_class.get_config_schema()
            for provider_class in cls._providers.values()
        ]

    @classmethod
    def get_provider_schema(cls, provider_id: str) -> Dict[str, Any]:
        """获取指定提供商的配置 Schema"""
        provider_class = cls.get_provider_class(provider_id)
        return provider_class.get_config_schema()


# 自动注册内置提供商
ProviderRegistry.register(OpenAIProvider)
ProviderRegistry.register(AnthropicProvider)
ProviderRegistry.register(AzureOpenAIProvider)
ProviderRegistry.register(AliyunProvider)
ProviderRegistry.register(OpenAICompatibleProvider)
ProviderRegistry.register(AnthropicCompatibleProvider)


# 兼容旧 API 的别名
PROVIDER_REGISTRY = ProviderRegistry._providers


def get_llm_provider(provider_type: str, config: Dict[str, Any]) -> LLMProvider:
    """工厂方法：获取 LLM Provider 实例（兼容旧 API）"""
    return ProviderRegistry.create_provider(provider_type, config)


def list_providers() -> List[Dict[str, Any]]:
    """获取所有注册的 Provider 信息（兼容旧 API）"""
    return ProviderRegistry.list_providers()
