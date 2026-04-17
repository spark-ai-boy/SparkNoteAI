"""
集中式日志配置

所有日志包含：
- 时间戳（ISO 8601 格式）
- 日志级别
- 模块名
- user_id（可选，通过 extra 传入）
- 日志内容
"""

import logging
import sys
from typing import Optional


class ContextAdapter(logging.LoggerAdapter):
    """
    日志适配器，自动注入 user_id 等上下文信息

    用法：
        logger = get_logger(__name__)
        logger.info("用户登录", user_id=123)
    """

    def process(self, msg: str, kwargs: dict) -> tuple[str, dict]:
        extra = kwargs.get("extra", {})
        # 合并 adapter 级别的 extra 和调用级别的 extra
        extra.update(self.extra)

        user_id = extra.pop("user_id", None)
        context = ""
        if user_id is not None:
            context = f" [user_id={user_id}]"

        # 将 extra 传回，确保其他组件（如 JSON handler）能拿到
        kwargs["extra"] = extra
        return f"{context} {msg}", kwargs


def get_logger(name: str) -> ContextAdapter:
    """
    获取 Logger 实例

    Args:
        name: 模块名，通常传入 __name__

    Returns:
        ContextAdapter 实例
    """
    return ContextAdapter(logging.getLogger(name), {})


def setup_logging(level: str = "INFO") -> None:
    """
    配置根 Logger 的格式化和输出

    在应用启动时调用一次（main.py 中）。
    """
    log_level = getattr(logging, level.upper(), logging.INFO)

    # 统一格式：时间 | 级别 | 模块 | 消息
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-7s | %(name)-40s |%(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    # 配置根 logger
    root = logging.getLogger()
    root.setLevel(log_level)
    root.addHandler(handler)

    # 第三方库降噪
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
