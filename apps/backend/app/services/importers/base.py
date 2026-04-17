# 导入器抽象基类

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class ImportResult:
    """导入结果"""
    title: str
    content: str  # markdown 格式内容
    summary: str  # 内容摘要
    platform: str  # 来源平台
    source_url: str  # 原始链接
    metadata: Optional[dict] = None  # 额外元数据


class BaseImporter(ABC):
    """导入器抽象基类"""

    # 平台标识，子类需要定义
    platform: str = "unknown"

    @abstractmethod
    async def fetch_content(self, url: str) -> str:
        """
        抓取原始内容

        Args:
            url: 内容链接

        Returns:
            抓取的原始内容（HTML 或其他格式）
        """
        pass

    @abstractmethod
    async def parse_content(self, raw_content: str, url: str) -> ImportResult:
        """
        解析内容为 markdown 格式

        Args:
            raw_content: 原始内容
            url: 原始链接

        Returns:
            导入结果（包含 markdown 格式内容）
        """
        pass

    @abstractmethod
    async def extract_title(self, url: str) -> str:
        """
        从 URL 或内容中提取标题

        Args:
            url: 内容链接

        Returns:
            标题文本
        """
        pass

    async def import_from_url(self, url: str) -> ImportResult:
        """
        完整的导入流程：抓取 -> 解析 -> 返回结果

        Args:
            url: 内容链接

        Returns:
            导入结果
        """
        raw_content = await self.fetch_content(url)
        result = await self.parse_content(raw_content, url)
        result.source_url = url
        return result

    def generate_markdown(self, title: str, content: str, metadata: Optional[dict] = None) -> str:
        """
        生成标准的 markdown 格式

        Args:
            title: 标题
            content: 正文内容
            metadata: 元数据

        Returns:
            markdown 格式的字符串
        """
        md = f"# {title}\n\n"

        if metadata:
            if metadata.get("author"):
                md += f"**作者**: {metadata['author']}\n\n"
            if metadata.get("publish_date"):
                md += f"**发布时间**: {metadata['publish_date']}\n\n"
            if metadata.get("tags"):
                md += f"**标签**: {', '.join(metadata['tags'])}\n\n"

        md += f"---\n\n{content}\n"

        return md
