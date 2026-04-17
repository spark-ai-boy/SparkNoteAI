# 导入器工厂

from typing import Type, Dict, Optional
from .base import BaseImporter
from .wechat import WechatImporter
from .xiaohongshu import XiaohongshuImporter
from .bilibili import BilibiliImporter
from .youtube import YoutubeImporter


class ImporterFactory:
    """导入器工厂类"""

    _importers: Dict[str, Type[BaseImporter]] = {}

    @classmethod
    def register(cls, platform: str, importer_class: Type[BaseImporter]):
        """注册导入器"""
        cls._importers[platform] = importer_class

    @classmethod
    def get_importer(cls, platform: str, **kwargs) -> BaseImporter:
        """
        获取导入器实例

        Args:
            platform: 平台名称
            **kwargs: 传递给导入器的参数

        Returns:
            导入器实例
        """
        importer_class = cls._importers.get(platform)
        if not importer_class:
            raise ValueError(f"不支持的平台：{platform}")
        return importer_class(**kwargs)

    @classmethod
    def list_platforms(cls) -> list:
        """获取所有支持的平台列表"""
        return list(cls._importers.keys())


# 注册内置导入器
ImporterFactory.register("wechat", WechatImporter)
ImporterFactory.register("xiaohongshu", XiaohongshuImporter)
ImporterFactory.register("bilibili", BilibiliImporter)
ImporterFactory.register("youtube", YoutubeImporter)
