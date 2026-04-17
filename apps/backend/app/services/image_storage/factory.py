# 图床 Provider Factory

from typing import Type, Dict, List, Any
from .base_provider import ImageStorageProvider, ConfigField
from .providers.local import LocalStorageProvider
from .providers.lskypro import LskyProProvider


class ImageStorageRegistry:
    """图床提供商注册表"""

    _providers: Dict[str, Type[ImageStorageProvider]] = {}

    @classmethod
    def register(cls, provider_class: Type[ImageStorageProvider]) -> Type[ImageStorageProvider]:
        """注册提供商

        使用方式：
            @ImageStorageRegistry.register
            class MyProvider(ImageStorageProvider):
                ...
        """
        cls._providers[provider_class.provider_id] = provider_class
        return provider_class

    @classmethod
    def register_provider(cls, provider_id: str, provider_class: Type[ImageStorageProvider]):
        """手动注册提供商"""
        cls._providers[provider_id] = provider_class

    @classmethod
    def get_provider_class(cls, provider_id: str) -> Type[ImageStorageProvider]:
        """获取提供商类"""
        if provider_id not in cls._providers:
            raise ValueError(f"未知的图床提供商: {provider_id}")
        return cls._providers[provider_id]

    @classmethod
    def create_provider(cls, provider_id: str, config: Dict[str, Any]) -> ImageStorageProvider:
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

    @classmethod
    def get_default_provider(cls) -> Type[ImageStorageProvider]:
        """获取默认提供商"""
        for provider_class in cls._providers.values():
            if provider_class.is_default:
                return provider_class
        # 如果没有设置默认，返回第一个
        if cls._providers:
            return list(cls._providers.values())[0]
        raise ValueError("没有可用的图床提供商")

    @classmethod
    def get_default_provider_id(cls) -> str:
        """获取默认提供商 ID"""
        default = cls.get_default_provider()
        return default.provider_id


# 自动注册内置提供商
ImageStorageRegistry.register(LocalStorageProvider)
ImageStorageRegistry.register(LskyProProvider)


# 兼容旧 API 的别名
def get_image_storage_service(provider_id: str, config: Dict[str, Any]) -> ImageStorageProvider:
    """工厂方法：获取图床 Provider 实例（兼容旧 API）"""
    return ImageStorageRegistry.create_provider(provider_id, config)


def list_image_storage_providers() -> List[Dict[str, Any]]:
    """获取所有注册的 Provider 信息（兼容旧 API）"""
    return ImageStorageRegistry.list_providers()
