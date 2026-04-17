"""
统一集成配置模型

合并原 llm_configs 和 user_image_storage_configs，支持任意集成类型扩展
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from typing import Dict, Any, Optional

from ..core.database import Base, JSONType


class Integration(Base):
    """用户集成配置（统一管理外部服务连接）

    替代原有的:
    - llm_configs (LLM配置)
    - user_image_storage_configs (图床配置)

    未来可扩展:
    - database (数据库连接)
    - message_queue (消息队列)
    - search_engine (搜索引擎)
    """

    __tablename__ = "integrations"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # 集成类型 (llm | storage | database | ...)
    integration_type = Column(String(50), nullable=False, index=True)

    # 唯一标识（用户自定义，如"openai-prod"）
    # 用于场景配置引用，具有语义，便于识别
    config_key = Column(String(50), nullable=False)

    # 显示信息
    name = Column(String(50), nullable=False)           # "OpenAI 生产环境"
    description = Column(Text)                          # 配置描述
    icon = Column(String(50))                           # 图标名（lucide icon）
    color = Column(String(20))                          # 标签颜色

    # 提供商 (openai | anthropic | azure_openai | local | lskypro | ...)
    provider = Column(String(50), nullable=False)

    # 配置内容（JSONB，加密存储敏感字段）
    # LLM: {api_key, endpoint, model, max_tokens, temperature}
    # Storage: {api_url, api_token, strategy_id, upload_dir}
    config = Column(JSONType, nullable=False, default=dict)

    # 元数据
    is_default = Column(Boolean, default=False)         # 是否是该类型的默认配置
    is_enabled = Column(Boolean, default=True)          # 是否启用
    tags = Column(JSONType, default=list)               # ["正式", "开发"]

    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关联
    user = relationship("User", back_populates="integrations")

    __table_args__ = (
        # 同一用户同一类型下，config_key 唯一
        UniqueConstraint('user_id', 'integration_type', 'config_key', name='uix_user_integration_key'),
        # 索引：快速查询用户的某类型集成
        {"mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_unicode_ci"},
    )

    def get_config_value(self, key: str, default=None):
        """获取配置项"""
        if self.config is None:
            return default
        return self.config.get(key, default)

    def set_config_value(self, key: str, value) -> None:
        """设置配置项"""
        if self.config is None:
            self.config = {}
        self.config[key] = value

    def to_dict(self, include_config: bool = False, mask_secrets: bool = True) -> Dict[str, Any]:
        """转换为字典

        Args:
            include_config: 是否包含配置详情
            mask_secrets: 是否脱敏敏感字段
        """
        result = {
            "id": self.id,
            "config_key": self.config_key,
            "name": self.name,
            "description": self.description,
            "icon": self.icon,
            "color": self.color,
            "integration_type": self.integration_type,
            "provider": self.provider,
            "is_default": self.is_default,
            "is_enabled": self.is_enabled,
            "tags": self.tags or [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

        if include_config:
            config = self.config or {}
            # 添加 has_api_key 字段，告知前端是否已配置 API Key
            result["has_api_key"] = bool(config.get('api_key'))
            if mask_secrets:
                config = self._mask_sensitive_config(config)
            result["config"] = config

        return result

    @staticmethod
    def _mask_sensitive_config(config: Dict[str, Any]) -> Dict[str, Any]:
        """脱敏敏感字段"""
        result = config.copy()
        sensitive_fields = ['api_key', 'api_token', 'token', 'password', 'secret', 'key']
        for field in sensitive_fields:
            if field in result and result[field]:
                value = str(result[field])
                if len(value) > 8:
                    result[field] = value[:4] + '****' + value[-4:]
                else:
                    result[field] = '****'
        return result


class FeatureSetting(Base):
    """用户场景配置（功能级别的配置）

    替代原有的 user_settings.feature_configs JSONB 字段

    优势:
    1. 可查询：可以查询哪些用户使用了某个集成配置
    2. 可索引：feature_id 和 user_id 有索引
    3. 有约束：可以实施外键约束和级联操作
    """

    __tablename__ = "feature_settings"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    feature_id = Column(String(50), primary_key=True)   # "knowledge_graph" | "ai_assistant" | "notes"

    # 引用的集成配置（JSONB）
    # {"llm": "openai-prod", "storage": "local"}
    # key 是功能定义的 integration_refs 中定义的 key
    integration_refs = Column(JSONType, default=dict)

    # 是否使用默认集成（而非指定具体配置）
    use_default_llm = Column(Boolean, default=True)
    use_default_storage = Column(Boolean, default=True)

    # 功能特有设置（覆盖功能定义中的默认值）
    # knowledge_graph: {temperature: 0.3, entity_count: 10}
    # ai_assistant: {max_history: 20, system_prompt: "..."}
    custom_settings = Column(JSONType, default=dict)

    # 功能开关
    is_enabled = Column(Boolean, default=True)

    # 时间戳
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关联
    user = relationship("User", back_populates="feature_settings")

    def get_integration_ref(self, ref_type: str) -> Optional[str]:
        """获取引用的集成配置 key"""
        if self.integration_refs is None:
            return None
        return self.integration_refs.get(ref_type)

    def set_integration_ref(self, ref_type: str, config_key: str) -> None:
        """设置引用的集成配置 key"""
        if self.integration_refs is None:
            self.integration_refs = {}
        self.integration_refs[ref_type] = config_key

    def get_custom_setting(self, key: str, default=None):
        """获取自定义设置"""
        if self.custom_settings is None:
            return default
        return self.custom_settings.get(key, default)

    def set_custom_setting(self, key: str, value) -> None:
        """设置自定义设置"""
        if self.custom_settings is None:
            self.custom_settings = {}
        self.custom_settings[key] = value

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "feature_id": self.feature_id,
            "integration_refs": self.integration_refs or {},
            "use_default_llm": self.use_default_llm,
            "use_default_storage": self.use_default_storage,
            "custom_settings": self.custom_settings or {},
            "is_enabled": self.is_enabled,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class UserPreference(Base):
    """用户偏好设置

    替代原有的 user_settings.preferences JSONB 字段
    """

    __tablename__ = "user_preferences"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    # UI 偏好
    theme = Column(String(20), default="system")          # system | light | dark
    language = Column(String(10), default="zh-CN")        # zh-CN | en-US
    font_size = Column(Integer, default=14)               # 12 | 14 | 16 | 18
    sidebar_collapsed = Column(Boolean, default=False)

    # 默认集成引用（配置 key 名）
    # 当 FeatureSetting.use_default_llm = True 时，使用这里的值
    default_llm_integration = Column(String(50))          # "openai-prod"
    default_storage_integration = Column(String(50))      # "local"

    # 通知设置（JSONB 存储）
    # {"task_complete": true, "import_progress": true, ...}
    notifications = Column(JSONType, default=dict)

    # 其他偏好（扩展用）
    preferences = Column(JSONType, default=dict)

    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关联
    user = relationship("User", back_populates="preferences")

    def get_notification(self, key: str, default=True) -> bool:
        """获取通知设置"""
        if self.notifications is None:
            return default
        return self.notifications.get(key, default)

    def set_notification(self, key: str, value: bool) -> None:
        """设置通知"""
        if self.notifications is None:
            self.notifications = {}
        self.notifications[key] = value

    def get_preference(self, key: str, default=None):
        """获取偏好设置"""
        if self.preferences is None:
            return default
        return self.preferences.get(key, default)

    def set_preference(self, key: str, value) -> None:
        """设置偏好设置"""
        if self.preferences is None:
            self.preferences = {}
        self.preferences[key] = value

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        # 获取默认通知设置
        default_notifications = {
            "task_complete": True,
            "import_progress": True,
            "import_complete": True,
            "knowledge_graph_complete": True,
            "error_alerts": True,
        }
        # 合并用户通知设置
        notifications = {**default_notifications, **(self.notifications or {})}

        return {
            "theme": self.theme,
            "language": self.language,
            "font_size": self.font_size,
            "sidebar_collapsed": self.sidebar_collapsed,
            "default_llm_integration": self.default_llm_integration,
            "default_storage_integration": self.default_storage_integration,
            "notifications": notifications,
            "preferences": self.preferences or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
