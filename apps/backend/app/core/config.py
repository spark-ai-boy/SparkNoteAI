# 配置模块

import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List


class Settings(BaseSettings):
    """应用配置

    赋值优先级：
    1. 环境变量（Docker 注入）
    2. 代码默认值（仅开发环境兜底）
    """
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=None,  # 不读取 .env 文件，仅使用环境变量
    )

    # 应用
    APP_NAME: str = "SparkNoteAI"
    APP_VERSION: str = "dev"
    BUILD_NUMBER: str = "unknown"
    DEBUG: bool = False

    API_BASE_URL: str = "http://localhost:8000"

    # 数据库 / 缓存
    # 开发环境默认直连 localhost（Docker 环境会覆盖为 db 主机名）
    DATABASE_URL: str = "postgresql://sparknoteai:sparknoteai123@localhost:5432/sparknoteai"
    REDIS_URL: str = "redis://:sparknoteai123@localhost:6379/0"

    # JWT
    # 开发环境默认 key，生产环境必须通过环境变量覆盖
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 天

    # CORS（存为字符串，通过 property 转为 list 供外界使用）
    CORS_ORIGINS: str = (
        "http://localhost:8081,"
        "http://localhost:19000,"
        "http://localhost:19001,"
        "http://localhost:19002,"
        "http://127.0.0.1:8081,"
        "http://127.0.0.1:19000,"
        "http://127.0.0.1:19001,"
        "http://127.0.0.1:19002,"
        "http://127.0.0.1,"
        "http://localhost"
    )

    # 兼容的客户端版本
    COMPATIBLE_CLIENT_VERSIONS: str = ""

    # 加密密钥（开发环境使用有效的 Fernet key，生产环境必须通过环境变量覆盖）
    ENCRYPTION_KEY: str = "0mcgyRBQCP6VQRPAMarqRiJ_7eGyDHv-DVHm4L3gZsY="

    # Neo4j
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "sparknoteai123"

    # 管理员账号
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin123"
    ADMIN_EMAIL: str = "admin@example.com"

    @property
    def cors_origins(self) -> List[str]:
        return [url.strip() for url in self.CORS_ORIGINS.split(",") if url.strip()]


settings = Settings()
