"""
笔记摘要生成服务

在笔记创建/导入时自动生成摘要：
1. 如果用户配置了 LLM，使用大模型生成摘要
2. 否则从内容中截取前 N 个字符作为摘要
"""

import re
from typing import List, Optional
from sqlalchemy.orm import Session

from app.core.logger import get_logger
from app.models.integration import Integration, FeatureSetting
from app.models.note import Note
from app.utils.encryption import decrypt_api_key
from app.services.llm.factory import ProviderRegistry

logger = get_logger(__name__)


# 无 LLM 时的截断长度
SUMMARY_TRUNCATE_LENGTH = 200


def get_llm_for_user(db: Session, user_id: int) -> Optional[Integration]:
    """获取用户的笔记场景 LLM 集成配置（用于摘要生成）

    仅从 notes 场景配置中获取，不回退到其他场景或默认配置。
    如果笔记场景未配置 LLM，返回 None，由调用方决定 fallback 行为。
    """
    notes_feature = db.query(FeatureSetting).filter(
        FeatureSetting.user_id == user_id,
        FeatureSetting.feature_id == "notes"
    ).first()

    if not notes_feature or not notes_feature.integration_refs:
        return None

    llm_key = notes_feature.integration_refs.get("llm")
    if not llm_key:
        return None

    return db.query(Integration).filter(
        Integration.user_id == user_id,
        Integration.integration_type == "llm",
        Integration.config_key == llm_key,
        Integration.is_enabled == True
    ).first()


def strip_markdown(content: str) -> str:
    """移除 markdown 语法，返回纯文本"""
    text = content
    # 移除代码块
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'`[^`]+`', '', text)
    # 移除图片语法 ![alt](url)
    text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
    # 移除链接语法 [text](url)
    text = re.sub(r'\[.*?\]\(.*?\)', '', text)
    # 移除粗体/斜体标记
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'__(.+?)__', r'\1', text)
    text = re.sub(r'_(.+?)_', r'\1', text)
    # 移除标题标记
    text = re.sub(r'^#{1,6}\s*', '', text, flags=re.MULTILINE)
    # 移除引用标记
    text = re.sub(r'^>\s*', '', text, flags=re.MULTILINE)
    # 移除列表标记
    text = re.sub(r'^[\s]*[-*+]\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^[\s]*\d+\.\s+', '', text, flags=re.MULTILINE)
    # 移除水平线
    text = re.sub(r'^[\s]*[-*_]{3,}\s*$', '', text, flags=re.MULTILINE)
    # 清理多余空白
    text = re.sub(r'\n{3,}', '\n\n', text).strip()
    return text


def extract_meaningful_text(content: str) -> str:
    """从 HTML 内容中提取有意义的纯文本，跳过链接、图片、脚本等"""
    text = content

    # 0. 如果是 markdown 内容（不含 HTML 标签），先移除 markdown 语法
    if '<' not in text[:200]:
        text = strip_markdown(text)
        return re.sub(r'\n+', ' ', text).strip()

    # 1. 移除 <script>、<style>、<nav>、<footer>、<header> 及其内容
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'<nav[^>]*>.*?</nav>', '', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'<footer[^>]*>.*?</footer>', '', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'<header[^>]*>.*?</header>', '', text, flags=re.IGNORECASE | re.DOTALL)

    # 2. 移除 <a> 链接及其内容
    text = re.sub(r'<a[^>]*>.*?</a>', '', text, flags=re.IGNORECASE | re.DOTALL)

    # 3. 移除 <img> 标签（无闭合）
    text = re.sub(r'<img[^>]*/?>', '', text, flags=re.IGNORECASE)

    # 4. 移除自闭合/独立标签（如 <br>, <hr>, <wbr>）
    text = re.sub(r'<(br|hr|wbr)[^>]*/?>', ' ', text, flags=re.IGNORECASE)

    # 5. 将块级元素标签替换为换行标记，保留其文本内容
    block_tags = r'(p|h[1-6]|div|li|blockquote|pre|section|article|table|tr|td|th|ul|ol|dl|dt|dd|figure|figcaption)'
    text = re.sub(f'<{block_tags}[^>]*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(f'</{block_tags}>', '\n', text, flags=re.IGNORECASE)

    # 6. 移除剩余所有 HTML 标签
    text = re.sub(r'<[^>]+>', '', text)

    # 7. 解码常见 HTML 实体
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<')
    text = text.replace('&gt;', '>').replace('&quot;', '"').replace('&#39;', "'")

    # 8. 清理空白：每行去除首尾空格，去除空行，合并多余换行
    lines = [line.strip() for line in text.split('\n')]
    text = '\n'.join(line for line in lines if line)

    # 9. 将多个换行合并为一个空格（摘要不需要换行）
    text = re.sub(r'\n+', ' ', text).strip()

    return text


def strip_html(content: str) -> str:
    """移除 HTML 标签，返回纯文本"""
    return extract_meaningful_text(content)


def truncate_content(content: str, max_length: int = SUMMARY_TRUNCATE_LENGTH) -> str:
    """从内容中提取有意义文本并截取前 N 个字符作为摘要"""
    plain_text = extract_meaningful_text(content)
    if len(plain_text) <= max_length:
        return plain_text
    # 截取并在末尾添加省略号
    return plain_text[:max_length].rstrip() + "..."


async def generate_summary_with_llm(
    content: str,
    integration: Integration,
    temperature: float = 0.5,
    max_length: int = 500,
) -> Optional[str]:
    """使用 LLM 生成笔记摘要

    Args:
        content: 笔记内容（可能包含 HTML）
        integration: LLM 集成配置
        temperature: 模型温度
        max_length: 摘要最大字数

    Returns:
        生成的摘要，失败时返回 None
    """
    try:
        config = integration.config or {}
        api_key = config.get("api_key")
        if not api_key:
            return None

        # 解密 API Key（如果已加密）
        try:
            api_key = decrypt_api_key(api_key)
        except Exception:
            pass  # 可能是未加密的密钥

        provider_id = integration.provider or "openai"
        model = config.get("model", "")

        provider = ProviderRegistry.create_provider(provider_id, {
            **config,
            "api_key": api_key,
        })

        # 截取内容前 3000 字符避免超长
        plain_text = extract_meaningful_text(content)[:3000]

        system_prompt = f"你是一个专业的内容摘要助手。请为以下内容生成一段简洁的摘要（50-{max_length}字），概括核心要点。直接返回摘要，不要添加其他说明。"

        summary = await provider.generate(
            prompt=plain_text,
            model=model,
            system_prompt=system_prompt,
            temperature=temperature,
        )

        result = summary.strip() if summary else None

        # 强制截断到 max_length，确保不超过数据库 varchar(500) 限制
        if result and len(result) > max_length:
            result = result[:max_length].rstrip() + "..."

        logger.info(f"LLM 摘要生成成功: provider={provider_id}, model={model}, length={len(result) if result else 0}")
        return result
    except Exception as e:
        logger.error(f"LLM 摘要生成失败: error={e}")
        return None


async def generate_summary(
    db: Session, user_id: int, content: str, max_length: int = None
) -> str:
    """生成笔记摘要

    优先使用 LLM 生成，如果未配置 LLM 则截取内容前 N 个字符。

    Args:
        db: 数据库会话
        user_id: 用户 ID
        content: 笔记内容
        max_length: 摘要最大字数（默认从场景配置读取，无配置时使用 500）

    Returns:
        生成的摘要文本
    """
    if not content or not content.strip():
        return ""

    # 获取场景配置
    notes_feature = db.query(FeatureSetting).filter(
        FeatureSetting.user_id == user_id,
        FeatureSetting.feature_id == "notes"
    ).first()

    custom = notes_feature.custom_settings if notes_feature else {}
    temperature = custom.get("temperature", 0.5)
    if max_length is None:
        max_length = custom.get("summary_max_length", 200)

    # 尝试使用 LLM 生成
    integration = get_llm_for_user(db, user_id)
    if integration and integration.config and integration.config.get("api_key"):
        logger.info(f"使用 LLM 生成摘要: user_id={user_id}, integration_id={integration.id}, provider={integration.provider}")
        summary = await generate_summary_with_llm(
            content, integration, temperature=temperature, max_length=max_length
        )
        if summary:
            # 最终安全检查：强制截断，确保不超过数据库 varchar 限制
            if len(summary) > max_length:
                summary = summary[:max_length].rstrip() + "..."
            return summary
        logger.warning(f"LLM 摘要返回空，回退到截断模式: user_id={user_id}")

    # 回退到截断
    logger.info(f"使用截断模式生成摘要: user_id={user_id}")
    return truncate_content(content, max_length)


async def extract_tags_with_llm(
    db: Session, user_id: int, content: str, tag_count: int = 3,
) -> List[str]:
    """使用 LLM 从笔记内容中提取标签

    Args:
        db: 数据库会话
        user_id: 用户 ID
        content: 笔记内容
        tag_count: 提取的标签数量

    Returns:
        标签名称列表
    """
    from app.models.note import Tag

    integration = get_llm_for_user(db, user_id)
    if not integration or not integration.config or not integration.config.get("api_key"):
        return []

    try:
        config = integration.config or {}
        api_key = config.get("api_key")
        try:
            api_key = decrypt_api_key(api_key)
        except Exception:
            pass

        provider_id = integration.provider or "openai"
        model = config.get("model", "")

        provider = ProviderRegistry.create_provider(provider_id, {
            **config,
            "api_key": api_key,
        })

        plain_text = extract_meaningful_text(content)[:2000]

        system_prompt = (
            f"你是一个专业的关键词提取助手。请从以下内容中提取 {tag_count} 个最能概括内容主题的关键词或短语作为标签。"
            "每个标签 2-6 个字，不要包含标点符号。直接返回 JSON 格式：{\"tags\": [\"标签1\", \"标签2\"]}，不要其他说明。"
        )

        result = await provider.generate(
            prompt=plain_text,
            model=model,
            system_prompt=system_prompt,
            temperature=0.3,
        )

        if not result:
            return []

        # 解析 JSON
        result = result.strip()
        if result.startswith("```json"):
            result = result[7:]
        if result.endswith("```"):
            result = result[:-3]
        result = result.strip()

        import json as json_mod
        data = json_mod.loads(result)
        tags = data.get("tags", [])[:tag_count]

        # 去重并查找或创建标签
        tag_names = []
        for tag_name in tags:
            tag_name = tag_name.strip().strip("#").strip()
            if not tag_name:
                continue

            # 查找用户已有的同名标签
            existing = db.query(Tag).filter(
                Tag.user_id == user_id,
                Tag.name == tag_name
            ).first()
            if not existing:
                existing = db.query(Tag).filter(
                    Tag.user_id.is_(None),
                    Tag.name == tag_name
                ).first()
            if not existing:
                import random
                preset_colors = [
                    "#EF4444", "#F97316", "#F59E0B", "#EAB308",
                    "#84CC16", "#22C55E", "#10B981", "#14B8A6",
                    "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6",
                    "#A855F7", "#D946EF", "#EC4899", "#F43F5E",
                ]
                random_color = random.choice(preset_colors)
                new_tag = Tag(name=tag_name, user_id=user_id, color=random_color)
                db.add(new_tag)
                db.flush()
                tag_names.append(new_tag.name)
            else:
                tag_names.append(existing.name)

        logger.info(f"LLM 标签提取成功: user_id={user_id}, tags={tag_names}")
        return tag_names
    except Exception as e:
        logger.error(f"LLM 标签提取失败: user_id={user_id}, error={e}")
        return []
