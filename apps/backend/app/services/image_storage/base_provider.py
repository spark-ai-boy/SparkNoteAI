# 图床 Provider 基类

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple, Optional
from pydantic import BaseModel


class ConfigField(BaseModel):
    """配置字段定义"""
    name: str                    # 字段名
    label: str                   # 显示名
    type: str                    # 类型：text, password, url, number, select
    required: bool = True        # 是否必填
    description: str = ""        # 字段说明
    placeholder: str = ""        # 占位提示
    default: Any = None          # 默认值
    options: Optional[List[Dict[str, str]]] = None  # select 类型的选项


class ImageStorageProvider(ABC):
    """图床 Provider 基类

    所有图床提供商必须继承此类，并实现抽象方法。
    """

    # 提供商元信息（类属性，子类必须定义）
    provider_id: str = ""           # 唯一标识，如 "local", "lskypro"
    provider_name: str = ""         # 显示名称，如 "本地存储"
    description: str = ""           # 描述
    icon: str = ""                  # 图标

    # 配置字段定义（子类必须定义）
    config_fields: List[ConfigField] = []

    # 是否为默认提供商
    is_default: bool = False

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
            "icon": cls.icon,
            "config_fields": [f.model_dump() for f in cls.config_fields],
            "is_default": cls.is_default,
        }

    @abstractmethod
    async def upload(self, file_data: bytes, filename: str) -> str:
        """上传文件

        Args:
            file_data: 文件二进制数据
            filename: 文件名

        Returns:
            文件访问 URL
        """
        pass

    @abstractmethod
    async def delete(self, url: str) -> bool:
        """删除文件

        Args:
            url: 文件访问 URL

        Returns:
            是否删除成功
        """
        pass

    @abstractmethod
    async def validate_config(self) -> Tuple[bool, str]:
        """验证配置是否有效

        Returns:
            (是否有效, 错误信息)
        """
        pass

    def get_config_value(self, key: str, default=None):
        """获取配置值"""
        return self.config.get(key, default)
