# B 站导入器（占位实现）

from typing import Optional
from .base import BaseImporter, ImportResult


class BilibiliImporter(BaseImporter):
    """B 站导入器"""

    platform = "bilibili"

    async def fetch_content(self, url: str) -> str:
        """抓取 B 站内容"""
        # TODO: 实现 B 站爬虫
        return "<html><body>B 站内容</body></html>"

    async def parse_content(self, raw_content: str, url: str) -> ImportResult:
        """解析内容为 markdown 格式"""
        # TODO: 实现解析逻辑
        return ImportResult(
            title="B 站视频",
            content="内容待解析",
            summary="",  # 暂不生成摘要（需要用户配置 LLM Key 后手动生成）
            platform=self.platform,
            source_url=url,
        )

    async def extract_title(self, url: str) -> str:
        """从 URL 提取标题"""
        return "B 站视频"
