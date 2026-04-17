# 微信公众号文章导入器

import httpx
from bs4 import BeautifulSoup
from typing import Optional
import re

from app.core.logger import get_logger
from .base import BaseImporter, ImportResult

logger = get_logger(__name__)


class WechatImporter(BaseImporter):
    """微信公众号文章导入器"""

    platform = "wechat"

    def __init__(self, image_cache_service=None):
        """
        初始化微信导入器

        Args:
            image_cache_service: 图片缓存服务实例（可选）
        """
        self.image_cache_service = image_cache_service

    async def fetch_content(self, url: str) -> str:
        """抓取微信公众号文章 HTML 内容"""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers, follow_redirects=True)
            response.raise_for_status()
            return response.text

    async def parse_content(self, raw_content: str, url: str) -> ImportResult:
        """解析 HTML 内容为 markdown 格式"""
        soup = BeautifulSoup(raw_content, "html.parser")

        # 提取标题
        title = self._extract_title(soup)

        # 提取元数据
        metadata = self._extract_metadata(soup)

        # 提取正文内容
        content = self._extract_article_content(soup)

        # 暂不生成摘要（需要用户配置 LLM Key 后手动生成）
        return ImportResult(
            title=title,
            content=content,
            summary="",  # 暂不生成摘要
            platform=self.platform,
            source_url=url,
            metadata=metadata,
        )

    async def cache_images_in_content(self, content: str) -> str:
        """
        缓存内容中的图片

        Args:
            content: markdown 格式的内容

        Returns:
            处理后的内容（图片 URL 已替换为缓存 URL）
        """
        if not self.image_cache_service:
            logger.debug("微信导入-image_cache_service 为 None，跳过缓存")
            return content

        # 提取所有 markdown 图片
        image_pattern = r'!\[([^\]]*)\]\(([^)]+)\)'
        matches = re.findall(image_pattern, content)

        logger.debug(f"微信导入-找到 {len(matches)} 张图片")

        for alt, img_url in matches:
            # 跳过已经是本地的 URL
            if img_url.startswith('/api/images/') or img_url.startswith('http://localhost'):
                logger.debug(f"微信导入-跳过本地 URL: {img_url}")
                continue

            try:
                logger.debug(f"微信导入-开始缓存图片: url={img_url[:80]}")
                # 缓存图片
                cached_url = await self.image_cache_service.get_or_cache(img_url)
                logger.debug(f"微信导入-缓存返回: url={cached_url}")
                # 替换 URL
                old_pattern = f'![{alt}]({img_url})'
                new_pattern = f'![{alt}]({cached_url})'
                content = content.replace(old_pattern, new_pattern)
            except Exception as e:
                logger.warning(f"微信导入-缓存图片失败: url={img_url[:80]}, error={e}")
                # 缓存失败不影响继续处理

        return content

    async def extract_title(self, url: str) -> str:
        """从 URL 提取标题（备用方案）"""
        # 从 URL 路径提取标题
        path = url.split("/")[-1] if "/" in url else url
        # URL 解码并清理
        title = path.replace("-", " ").replace("_", " ")
        # 移除文件扩展名
        title = re.sub(r'\.[a-zA-Z]+$', '', title)
        return title.strip() or "微信文章"

    def _extract_title(self, soup: BeautifulSoup) -> str:
        """从 HTML 中提取标题"""
        # 尝试多种选择器
        title_selectors = [
            "h1#activity-name",
            "h1#js-title",
            "h2.rich_media_title",
            "title",
            "meta[property='og:title']",
        ]

        for selector in title_selectors:
            if selector.startswith("meta"):
                element = soup.select_one(selector)
                if element and element.get("content"):
                    return element["content"].strip()
            else:
                element = soup.select_one(selector)
                if element and element.get_text(strip=True):
                    return element.get_text(strip=True)

        return "微信文章"

    def _extract_metadata(self, soup: BeautifulSoup) -> dict:
        """提取元数据"""
        metadata = {}

        # 提取作者
        author_selectors = [
            "span#js-author-name",
            "a.rich_media_meta_nickname",
            "meta[name='author']",
        ]
        for selector in author_selectors:
            if selector.startswith("meta"):
                element = soup.select_one(selector)
                if element and element.get("content"):
                    metadata["author"] = element["content"]
                    break
            else:
                element = soup.select_one(selector)
                if element and element.get_text(strip=True):
                    metadata["author"] = element.get_text(strip=True)
                    break

        # 提取发布时间
        date_pattern = r'\d{4}年\d{1,2}月\d{1,2}日'
        date_element = soup.find(string=re.compile(date_pattern))
        if date_element:
            metadata["publish_date"] = date_element.strip()

        # 提取摘要
        og_desc = soup.select_one("meta[property='og:description']")
        if og_desc and og_desc.get("content"):
            metadata["og_description"] = og_desc["content"]

        return metadata

    def _extract_article_content(self, soup: BeautifulSoup) -> str:
        """提取文章正文内容并转换为 markdown"""
        # 找到正文容器
        content_container = soup.select_one("div#js_content")
        if not content_container:
            content_container = soup.select_one("div.rich_media_content")

        if not content_container:
            # 如果找不到特定容器，尝试查找主要内容区域
            content_container = soup.find("div", class_=re.compile(r"rich_media_content|article-content"))

        if not content_container:
            return "无法提取文章内容"

        # 移除不需要的元素
        for tag in content_container.find_all(["script", "style", "iframe", "noscript"]):
            tag.decompose()

        # 移除公众号常见的无关元素
        for class_name in ["js_per_forward", "js_per_like", "rich_media_meta",
                           "js_article_footer", "js_reward", "js_to_like"]:
            for tag in content_container.find_all(class_=class_name):
                tag.decompose()

        return self._html_to_markdown(content_container)

    def _html_to_markdown(self, element) -> str:
        """将 HTML 元素转换为 markdown"""
        markdown_parts = []
        processed_elements = set()  # 跟踪已处理的元素，避免重复

        # 检查是否是标点符号或短文本（用于中文排版优化）
        def is_short_punctuation(text):
            if len(text) > 3:
                return False
            # 只匹配标点符号
            return bool(re.match(r'^[，。！？：；、""\'\)］》>…—～]+$', text))

        # 检查是否以标点符号结尾
        def ends_with_punctuation(text):
            if not text:
                return False
            return bool(re.search(r'[，。！？：；、""\'\)］》>…—～]$', text))

        # 递归处理所有子元素
        def process_children(parent):
            for child in parent.children:
                if hasattr(child, 'name'):
                    # 避免重复处理同一元素
                    child_id = id(child)
                    if child_id in processed_elements:
                        continue
                    processed_elements.add(child_id)

                    # 检查元素是否可见（不是空白文本）
                    part = self._convert_element(child)
                    if part:
                        # 代码块直接添加，不用 \n\n 连接（避免破坏内部格式）
                        if child.name == "pre" or part.startswith("```"):
                            markdown_parts.append("\n" + part + "\n")
                        elif is_short_punctuation(part) and markdown_parts and not ends_with_punctuation(markdown_parts[-1]):
                            # 短标点符号且前一个段落不是以标点结尾，合并到前一个段落
                            markdown_parts[-1] += part
                        else:
                            markdown_parts.append(part)

                    # 递归处理子元素（处理嵌套的图片等）
                    # section/span/div/figure 标签需要递归处理其子元素
                    if child.name in ['section', 'span', 'div', 'figure']:
                        process_children(child)

                elif child.string:
                    text = child.string.strip()
                    if text:
                        markdown_parts.append(text)

        process_children(element)
        # 过滤掉空字符串，但保留图片标记
        markdown_parts = [p for p in markdown_parts if p and p.strip()]
        return "\n\n".join(markdown_parts)

    def _convert_element(self, element) -> Optional[str]:
        """转换 HTML 元素为 markdown"""
        tag_name = element.name

        # 段落
        if tag_name == "p":
            text = element.get_text(strip=True)
            if text:
                return text
            # 空段落或只有图片的段落返回 None，由图片容器逻辑处理
            return None

        # 标题
        if tag_name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
            prefix = "#" * int(tag_name[1])
            text = element.get_text(strip=True)
            return f"{prefix} {text}" if text else None

        # 列表
        if tag_name == "ul":
            items = []
            for li in element.find_all("li", recursive=False):
                item_text = li.get_text(strip=True)
                if item_text:
                    items.append(f"- {item_text}")
            return "\n".join(items) if items else None

        if tag_name == "ol":
            items = []
            for i, li in enumerate(element.find_all("li", recursive=False), 1):
                item_text = li.get_text(strip=True)
                if item_text:
                    items.append(f"{i}. {item_text}")
            return "\n".join(items) if items else None

        # 引用
        if tag_name == "blockquote":
            text = element.get_text(strip=True)
            if text:
                return f"> {text}"
            return None

        # 代码块 (pre 包含 code)
        if tag_name == "pre":
            code_element = element.find("code")
            if code_element:
                # 获取语言类型
                class_attr = code_element.get("class", [])
                language = ""
                if isinstance(class_attr, list):
                    for cls in class_attr:
                        if cls.startswith("language-"):
                            language = cls.replace("language-", "")
                            break
                elif isinstance(class_attr, str) and class_attr.startswith("language-"):
                    language = class_attr.replace("language-", "")

                # 获取代码内容 - 递归获取所有子元素的文本（处理嵌套 span）
                # 微信文章的代码块结构：
                # - 有内容的 span（可能包含嵌套 span）
                # - 空 span（包含 br 标签，表示换行）
                code_parts = []
                prev_was_newline = False
                has_content = False  # 标记是否已经有实际内容

                def process_code_element(elem):
                    nonlocal prev_was_newline, has_content
                    # 检查是否是字符串（NavigableString），直接返回
                    if isinstance(elem, str) or not hasattr(elem, 'children'):
                        text = str(elem).strip() if elem else ""
                        if text:
                            code_parts.append(text)
                            has_content = True
                            prev_was_newline = False
                        return

                    for content in elem.children:
                        # 字符串节点直接处理
                        if isinstance(content, str):
                            text = content.strip()
                            if text:
                                code_parts.append(text)
                                has_content = True
                                prev_was_newline = False
                            continue

                        if hasattr(content, 'name'):
                            if content.name == "br":
                                # br 标签表示换行
                                if has_content and not prev_was_newline:
                                    code_parts.append("\n")
                                    prev_was_newline = True
                            elif content.name == "span":
                                # 先检查是否有 br 子元素
                                br_child = content.find("br")
                                text = content.get_text()
                                if text and not text.isspace():
                                    # 有内容的 span，添加文本（保留内部空格）
                                    code_parts.append(text)
                                    has_content = True
                                    prev_was_newline = False
                                elif br_child is not None:
                                    # 空 span 包含 br，表示换行
                                    if has_content and not prev_was_newline:
                                        code_parts.append("\n")
                                        prev_was_newline = True
                                else:
                                    # 空 span，可能是格式化用，递归处理子元素
                                    process_code_element(content)
                            else:
                                # 其他元素，递归获取文本
                                process_code_element(content)

                process_code_element(code_element)

                code_text = "".join(code_parts)
                # 只移除首尾的多余空白，保留内部换行
                code_text = code_text.rstrip()

                return f"```{language}\n{code_text}\n```"

            # 没有 code 元素，返回 pre 的文本（保留换行）
            text = element.get_text()
            return f"```\n{text}\n```" if text.strip() else None

        # 微信文章中的代码块可能是 div 或 section 带 code 样式
        if tag_name in ["div", "section"]:
            class_attr = element.get("class", [])
            class_str = " ".join(class_attr) if isinstance(class_attr, list) else str(class_attr)
            # 检测是否是代码块容器
            if "code" in class_str or "pre" in class_str or "syntax" in class_str:
                code_text = ""
                for content in element.children:
                    if hasattr(content, 'name'):
                        if content.name == "br":
                            code_text += "\n"
                        else:
                            code_text += content.get_text()
                    elif hasattr(content, 'string') and content.string:
                        code_text += str(content.string)

                code_text = code_text.rstrip()
                if code_text:
                    return f"```\n{code_text}\n```"

        # 行内代码
        if tag_name == "code":
            # 如果父元素是 pre，跳过（已经由 pre 处理）
            if element.parent and element.parent.name == "pre":
                return None
            text = element.get_text(strip=True)
            return f"`{text}`" if text else None

        # 图片容器 (section, span, div, p 等) - 返回 None 让递归逻辑继续处理子元素
        # 图片会由 img 标签的处理逻辑在正确位置生成
        if tag_name in ["section", "span", "div", "p", "figure"]:
            return None

        # 图片
        if tag_name == "img":
            src = element.get("src") or element.get("data-src")
            alt = element.get("alt", "图片")
            if src:
                return f"![{alt}]({src})"
            return None

        # 链接
        if tag_name == "a":
            href = element.get("href", "")
            text = element.get_text(strip=True)
            if text and href:
                return f"[{text}]({href})"
            return text

        # 强调
        if tag_name in ["strong", "b"]:
            text = element.get_text(strip=True)
            return f"**{text}**" if text else None

        # 换行
        if tag_name == "br":
            return "\n"

        # 默认：返回纯文本
        text = element.get_text(strip=True)
        return text if text else None
