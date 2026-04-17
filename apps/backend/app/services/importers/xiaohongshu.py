# 小红书笔记导入器

import httpx
from bs4 import BeautifulSoup
from typing import Optional
import re
import json

from app.core.logger import get_logger
from .base import BaseImporter, ImportResult

logger = get_logger(__name__)


class XiaohongshuImporter(BaseImporter):
    """小红书笔记导入器"""

    platform = "xiaohongshu"

    def __init__(self, image_cache_service=None):
        self.image_cache_service = image_cache_service

    async def fetch_content(self, url: str) -> str:
        """抓取小红书页面内容"""
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"macOS"',
        }

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.text

    async def parse_content(self, raw_content: str, url: str) -> ImportResult:
        """解析小红书笔记内容"""
        soup = BeautifulSoup(raw_content, "html.parser")

        title = ""
        description = ""
        images = []
        tags = []
        author = ""
        liked_count = ""

        # 尝试从 SSR 数据中提取笔记信息
        logger.debug(f"小红书-开始解析: url={url}")
        note_data = self._extract_note_data_from_ssr(soup)

        if note_data:
            title = note_data.get("title", "")
            description = note_data.get("desc", "")
            images = note_data.get("images", [])
            tags = note_data.get("tags", [])
            author = note_data.get("user", {}).get("nickname", "")
            liked_count = note_data.get("interact_info", {}).get("liked_count", "")

            # SSR 数据中 title 可能为空，从 og:title 补充
            if not title:
                title = self._extract_meta_content(soup, "og:title") or (soup.select_one("title").get_text(strip=True) if soup.select_one("title") else "小红书笔记")
                logger.debug(f"小红书-SSR 解析成功(title 从 meta 补充): title={title[:30]}, images={len(images)}, tags={len(tags)}")
            else:
                logger.debug(f"小红书-SSR 解析成功: title={title[:30]}, images={len(images)}, tags={len(tags)}")
        else:
            logger.debug(f"小红书-SSR 解析失败，降级到 meta 提取")
            # 降级：从 og meta 和页面元素提取
            title = self._extract_meta_content(soup, "og:title") or (soup.select_one("title").get_text(strip=True) if soup.select_one("title") else "小红书笔记")
            description = self._extract_meta_content(soup, "og:description") or ""
            # 尝试提取图片
            image_list = soup.select('meta[property="og:image"]')
            images = [img["content"] for img in image_list if img.get("content")]
            logger.debug(f"小红书-meta 提取结果: title={title[:30] if title else ''}, images={len(images)}")
            # 提取标签
            keyword_meta = self._extract_meta_content(soup, "keywords")
            if keyword_meta:
                tags = [t.strip() for t in keyword_meta.split(",") if t.strip()]

        # 转换为 markdown
        markdown_parts = []

        if title:
            markdown_parts.append(f"# {title}\n")

        if author:
            markdown_parts.append(f"> 作者：{author}")
        if liked_count:
            markdown_parts.append(f"> 点赞：{liked_count}")
        if author or liked_count:
            markdown_parts.append("")

        # 添加描述/正文
        if description:
            markdown_parts.append(description)
            markdown_parts.append("")

        # 添加图片
        for i, img_url in enumerate(images):
            # 跳过 GIF 动图（小红书笔记中的 GIF 通常无效）
            if img_url.endswith(".gif") or "spectrum/1" in img_url:
                continue
            markdown_parts.append(f"![图片{i+1}]({img_url})")
            markdown_parts.append("")

        # 添加标签
        if tags:
            markdown_parts.append("")
            tag_texts = [f"#{t}" for t in tags]
            markdown_parts.append(" ".join(tag_texts))

        content = "\n".join(markdown_parts).strip()

        # 生成摘要（取描述的前 200 字）
        summary = description[:200] if description else ""

        metadata = {}
        if author:
            metadata["author"] = author
        if liked_count:
            metadata["liked_count"] = liked_count
        if tags:
            metadata["tags"] = tags

        return ImportResult(
            title=title or "小红书笔记",
            content=content,
            summary=summary,
            platform=self.platform,
            source_url=url,
            metadata=metadata,
        )

    async def cache_images_in_content(self, content: str) -> str:
        """缓存内容中的图片"""
        if not self.image_cache_service:
            return content

        image_pattern = r'!\[([^\]]*)\]\(([^)]+)\)'
        matches = re.findall(image_pattern, content)

        for alt, img_url in matches:
            if img_url.startswith('/api/images/') or img_url.startswith('http://localhost'):
                continue

            try:
                cached_url = await self.image_cache_service.get_or_cache(img_url)
                old_pattern = f'![{alt}]({img_url})'
                new_pattern = f'![{alt}]({cached_url})'
                content = content.replace(old_pattern, new_pattern)
            except Exception as e:
                logger.warning(f"小红书-缓存图片失败: url={img_url}, error={e}")

        return content

    async def extract_title(self, url: str) -> str:
        """从 URL 提取标题（备用）"""
        return "小红书笔记"

    def _extract_meta_content(self, soup: BeautifulSoup, name: str) -> str:
        """提取 meta 标签内容"""
        # 尝试 name 属性
        meta = soup.select_one(f"meta[name='{name}']")
        if meta and meta.get("content"):
            return meta["content"].strip()
        # 尝试 property 属性
        meta = soup.select_one(f"meta[property='{name}']")
        if meta and meta.get("content"):
            return meta["content"].strip()
        return ""

    def _extract_note_data_from_ssr(self, soup: BeautifulSoup) -> Optional[dict]:
        """
        从小红书页面的 SSR 数据中提取笔记信息
        """
        ssr_data = None

        # 策略 1: 从 __INITIAL_STATE__ 提取
        script = soup.find("script", string=re.compile(r'window\.__INITIAL_STATE__'))
        if script:
            text = script.string or script.get_text()
            state = self._extract_json_from_script(text, "window.__INITIAL_STATE__")
            if state:
                result = self._parse_state(state)
                if result:
                    if result.get("title"):
                        return result
                    ssr_data = result

        # 策略 2: 从 __INITIAL_SSR_STATE__ 提取
        script = soup.find("script", string=re.compile(r'window\.__INITIAL_SSR_STATE__'))
        if script:
            text = script.string or script.get_text()
            state = self._extract_json_from_script(text, "window.__INITIAL_SSR_STATE__")
            if state:
                result = self._parse_state(state)
                if result:
                    if result.get("title"):
                        return result
                    ssr_data = result

        # 策略 3: 搜索所有 script 中可能包含 noteDetailMap 的 JSON
        for script in soup.find_all("script"):
            text = script.string or script.get_text()
            if "noteDetailMap" not in text and "noteDetail" not in text:
                continue
            start = text.find("{")
            end = text.rfind("}")
            if start == -1 or end == -1:
                continue
            try:
                state = json.loads(text[start:end+1])
                result = self._parse_state(state)
                if result:
                    if result.get("title"):
                        return result
                    ssr_data = result
            except Exception:
                pass

        # 如果所有策略都找到 SSR 数据但 title 为空，也返回（title 可由调用方从 meta 补充）
        return ssr_data

    def _extract_json_from_script(self, script_text: str, var_name: str) -> Optional[dict]:
        """
        从 script 标签内容中提取 JSON 对象
        """
        pattern = rf'{re.escape(var_name)}\s*=\s*'
        match = re.search(pattern, script_text)
        if not match:
            return None

        after_eq = script_text[match.end():]

        # 如果是 JSON.parse(...)
        parse_match = re.match(r'JSON\.parse\(\s*["\']', after_eq)
        if parse_match:
            json_str_start = after_eq.find('"') if after_eq[0] == '"' else after_eq.find("'")
            if json_str_start == -1:
                return None
            quote_char = after_eq[json_str_start]
            i = json_str_start + 1
            while i < len(after_eq):
                if after_eq[i] == '\\':
                    i += 2
                    continue
                if after_eq[i] == quote_char:
                    break
                i += 1
            json_str = after_eq[json_str_start+1:i]
            json_str = json_str.replace('\\"', '"').replace('\\\\', '\\').replace('\\n', '\n').replace('\\/', '/')
            # 替换 JavaScript undefined 为 null
            json_str = re.sub(r':\s*undefined\s*([,}\]])', r': null\1', json_str)
            try:
                return json.loads(json_str)
            except Exception as e:
                logger.debug(f"小红书-JSON.parse 解析失败: error={e}")
                return None

        # 直接是对象
        if after_eq.strip().startswith("{"):
            start = after_eq.find("{")
            depth = 0
            for i, ch in enumerate(after_eq[start:], start):
                if ch == '{':
                    depth += 1
                elif ch == '}':
                    depth -= 1
                    if depth == 0:
                        raw = after_eq[start:i+1]
                        # 替换 JavaScript undefined 为 null
                        raw = re.sub(r':\s*undefined\s*([,}\]])', r': null\1', raw)
                        try:
                            return json.loads(raw)
                        except Exception as e:
                            logger.debug(f"小红书-直接 JSON 解析失败: error={e}")
                            return None

        return None

    def _parse_state(self, state: dict) -> Optional[dict]:
        """
        解析 SSR 状态对象，提取笔记数据
        """
        note_data = None

        # 路径 1: noteDetailMap[noteId]['note'] （小红书单页笔记的实际结构）
        note_map = state.get("note", {}).get("noteDetailMap", {})
        if note_map and isinstance(note_map, dict):
            for note_id, note_detail in note_map.items():
                if isinstance(note_detail, dict) and "note" in note_detail:
                    note_obj = note_detail["note"]
                    if isinstance(note_obj, dict) and ("title" in note_obj or "desc" in note_obj):
                        return self._parse_note_object(note_obj)

        # 路径 2: state.note 或 state.notes 等嵌套结构
        for key in ["note", "notes", "noteDetail"]:
            if key in state:
                note_data = self._find_note_detail(state[key])
                if note_data:
                    break

        # 路径 3: 直接在 state 中找 noteCard / noteDetail
        if not note_data:
            note_data = self._find_note_detail(state)

        if not note_data:
            return None

        return self._parse_note_object(note_data)

    def _find_note_detail(self, data) -> Optional[dict]:
        """在嵌套数据中查找笔记详情"""
        if isinstance(data, dict):
            # 优先检查 noteCard / noteDetail 键
            for key in ["noteCard", "noteDetail", "note", "data"]:
                if key in data:
                    detail = data[key]
                    if isinstance(detail, dict) and ("title" in detail or "displayTitle" in detail or "desc" in detail):
                        return detail
                    if isinstance(detail, dict):
                        result = self._find_note_detail(detail)
                        if result:
                            return result
            # 当前字典包含笔记关键字段
            if "displayTitle" in data or ("title" in data and "desc" in data):
                return data

        if isinstance(data, list):
            for item in data:
                result = self._find_note_detail(item)
                if result:
                    return result

        return None

    def _parse_note_object(self, note_obj: dict) -> dict:
        """
        解析笔记对象，提取结构化数据
        """
        result = {
            "title": "",
            "desc": "",
            "images": [],
            "tags": [],
            "user": {"nickname": ""},
            "interact_info": {},
        }

        # 标题：displayTitle 或 title
        result["title"] = note_obj.get("displayTitle", "") or note_obj.get("title", "")

        # 描述：desc 或 description
        result["desc"] = note_obj.get("desc", "") or note_obj.get("description", "")

        # 用户信息
        user = note_obj.get("user", {})
        if not user:
            user = note_obj.get("userInfo", {})
        result["user"] = {
            "nickname": user.get("nickname", "") or user.get("name", ""),
        }

        # 互动信息
        interact = note_obj.get("interactInfo", note_obj.get("interact_info", {}))
        result["interact_info"] = {
            "liked_count": interact.get("likedCount", interact.get("liked_count", "")),
        }

        # 图片列表
        image_list = note_obj.get("imageList", note_obj.get("images", []))
        if isinstance(image_list, list):
            for img in image_list:
                if isinstance(img, str):
                    result["images"].append(img)
                elif isinstance(img, dict):
                    # 尝试 url / urlDefault / traceUrl / infoList
                    img_url = img.get("url", "") or img.get("urlDefault", "") or img.get("traceUrl", "")
                    if not img_url and "infoList" in img:
                        # infoList 包含不同尺寸，取最大的
                        for info in img.get("infoList", []):
                            img_url = info.get("url", "") or info.get("imageSceneUrl", "")
                    if img_url:
                        result["images"].append(img_url)
                    # 如果图片对象本身有 url 字段
                    elif img.get("url"):
                        result["images"].append(img["url"])

        # 如果没有从 imageList 获取到，尝试 imageList 嵌套结构
        if not result["images"]:
            image_list_obj = note_obj.get("imageList", {})
            if isinstance(image_list_obj, dict):
                for key in ["data", "list", "items"]:
                    if key in image_list_obj:
                        for img in image_list_obj[key]:
                            if isinstance(img, str):
                                result["images"].append(img)
                            elif isinstance(img, dict):
                                img_url = img.get("url", "") or img.get("urlDefault", "")
                                if img_url:
                                    result["images"].append(img_url)

        # 标签
        tag_list = note_obj.get("tagList", note_obj.get("tags", []))
        if isinstance(tag_list, list):
            for tag in tag_list:
                if isinstance(tag, str):
                    result["tags"].append(tag)
                elif isinstance(tag, dict):
                    tag_name = tag.get("name", "") or tag.get("tagName", "")
                    if tag_name:
                        result["tags"].append(tag_name)

        # 如果是通过 JSON 脚本提取的扁平对象，尝试补充字段
        if not result["title"] and "title" in note_obj:
            result["title"] = note_obj["title"]
        if not result["desc"] and "description" in note_obj:
            result["desc"] = note_obj["description"]

        return result
