# 图片存储配置基类和具体实现

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Type
import json


class ImageStorageConfig(ABC):
    """图片存储配置基类"""

    storage_type: str = ""

    @classmethod
    @abstractmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ImageStorageConfig":
        """从字典创建配置"""
        pass

    @abstractmethod
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        pass

    @abstractmethod
    def validate(self) -> None:
        """验证配置有效性

        Raises:
            ValueError: 配置无效时抛出
        """
        pass

    @classmethod
    def get_encrypted_fields(cls) -> list:
        """返回需要加密的字段列表"""
        return []


class LocalStorageConfig(ImageStorageConfig):
    """本地存储配置"""

    storage_type = "local"

    def __init__(self, upload_dir: str = "uploads"):
        self.upload_dir = upload_dir

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LocalStorageConfig":
        return cls(upload_dir=data.get("upload_dir", "uploads"))

    def to_dict(self) -> Dict[str, Any]:
        return {"upload_dir": self.upload_dir}

    def validate(self) -> None:
        # 本地存储不需要额外验证
        pass


class LskyProConfig(ImageStorageConfig):
    """兰空图床配置"""

    storage_type = "lskypro"

    def __init__(
        self,
        api_url: str = "",
        api_token: str = "",
        strategy_id: Optional[str] = None,
    ):
        self.api_url = api_url
        self.api_token = api_token
        self.strategy_id = strategy_id

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LskyProConfig":
        return cls(
            api_url=data.get("api_url", ""),
            api_token=data.get("api_token", ""),
            strategy_id=data.get("strategy_id"),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "api_url": self.api_url,
            "api_token": self.api_token,
            "strategy_id": self.strategy_id,
        }

    def validate(self) -> None:
        """验证兰空图床配置"""
        import re
        from urllib.parse import urlparse

        if not self.api_url:
            raise ValueError("兰空图床 API URL 不能为空")

        if not self.api_token:
            raise ValueError("兰空图床 API Token 不能为空")

        # 验证 URL 格式
        url_pattern = re.compile(
            r'^https?://'
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'
            r'localhost|'
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'
            r'(?::\d+)?'
            r'(?:/?|[/?]\S+)$', re.IGNORECASE
        )

        if not url_pattern.match(self.api_url):
            raise ValueError(f"无效的 URL 格式: {self.api_url}")

        # 强制使用 HTTPS（生产环境）
        if not self.api_url.startswith('https://') and not self.api_url.startswith('http://localhost'):
            raise ValueError('为了安全，API URL 必须使用 HTTPS 协议')

        # 阻止内网 IP
        try:
            parsed = urlparse(self.api_url)
            hostname = parsed.hostname

            if hostname and hostname != 'localhost':
                import socket
                ip_addresses = socket.getaddrinfo(hostname, None)

                for ip_info in ip_addresses:
                    ip = ip_info[4][0]

                    # 检查是否是内网 IP
                    if ip.startswith('10.') or \
                       ip.startswith('192.168.') or \
                       ip.startswith('172.16.') or \
                       ip.startswith('172.17.') or \
                       ip.startswith('172.18.') or \
                       ip.startswith('172.19.') or \
                       ip.startswith('172.2') or \
                       ip.startswith('172.30.') or \
                       ip.startswith('172.31.') or \
                       ip == '127.0.0.1' or \
                       ip == '::1' or \
                       (ip.startswith('172.') and int(ip.split('.')[1]) >= 16 and int(ip.split('.')[1]) <= 31):
                        raise ValueError('不允许使用内网 IP 地址')
        except socket.gaierror:
            raise ValueError('无法解析的域名')

    @classmethod
    def get_encrypted_fields(cls) -> list:
        """API Token 需要加密存储"""
        return ["api_token"]


# 配置类型注册表
_CONFIG_REGISTRY: Dict[str, Type[ImageStorageConfig]] = {
    "local": LocalStorageConfig,
    "lskypro": LskyProConfig,
}


def get_config_class(storage_type: str) -> Type[ImageStorageConfig]:
    """获取配置类"""
    if storage_type not in _CONFIG_REGISTRY:
        raise ValueError(f"未知的存储类型: {storage_type}")
    return _CONFIG_REGISTRY[storage_type]


def create_config(storage_type: str, data: Dict[str, Any]) -> ImageStorageConfig:
    """创建配置对象

    Args:
        storage_type: 存储类型
        data: 配置数据字典

    Returns:
        配置对象

    Raises:
        ValueError: 配置无效时抛出
    """
    config_class = get_config_class(storage_type)
    config = config_class.from_dict(data)
    config.validate()
    return config


def register_config_type(storage_type: str, config_class: Type[ImageStorageConfig]):
    """注册新的配置类型"""
    _CONFIG_REGISTRY[storage_type] = config_class
