# 场景配置基类

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Type
from pydantic import BaseModel


class ConfigGroup(BaseModel):
    """配置分组定义"""
    id: str      # 分组标识，如 "llm", "image_storage"
    label: str   # 分组显示名，如 "大模型配置", "图片存储"
    icon: str = "settings"  # 图标名称（lucide 图标名，如 "sparkles", "file-text"）


class ConfigField(BaseModel):
    """配置字段定义"""
    name: str                    # 字段名
    label: str                   # 显示名
    type: str                    # 类型：text, password, url, number, select, boolean
    required: bool = True        # 是否必填
    description: str = ""        # 字段说明
    placeholder: str = ""        # 占位提示
    default: Any = None          # 默认值
    options: Optional[List[Dict[str, str]]] = None  # select 类型的选项
    group: Optional[str] = None  # 分组标识，对应 ConfigGroup.id


class FeatureConfig(ABC):
    """场景配置基类

    所有场景配置必须继承此类，并定义自己的配置字段。
    """

    # 场景元信息（类属性，子类必须定义）
    feature_id: str = ""          # 唯一标识，如 "knowledge_graph"
    feature_name: str = ""        # 显示名称，如 "知识图谱"
    description: str = ""         # 描述
    icon: str = ""                # 图标（emoji 或 lucide icon 名）

    # 配置分组定义（可选）
    config_groups: List[ConfigGroup] = []

    # 配置字段定义（子类必须定义）
    config_fields: List[ConfigField] = []

    # 默认配置
    default_config: Dict[str, Any] = {}

    # 是否必须配置（False 表示有默认值，可以不配置）
    is_required: bool = False

    @classmethod
    def get_config_schema(cls) -> Dict[str, Any]:
        """获取配置表单 Schema（用于前端动态渲染）"""
        return {
            "feature_id": cls.feature_id,
            "feature_name": cls.feature_name,
            "description": cls.description,
            "icon": cls.icon,
            "config_groups": [g.model_dump() for g in cls.config_groups],
            "config_fields": [f.model_dump() for f in cls.config_fields],
            "default_config": cls.default_config,
            "is_required": cls.is_required,
        }

    @classmethod
    def validate_config(cls, config: Dict[str, Any]) -> tuple[bool, str]:
        """验证配置是否有效

        Returns:
            (是否有效, 错误信息)
        """
        # 检查必填字段
        required_fields = [f.name for f in cls.config_fields if f.required]
        for field in required_fields:
            if field not in config or config[field] is None or config[field] == "":
                return False, f"缺少必填配置项: {field}"

        # 检查字段类型
        for field_def in cls.config_fields:
            value = config.get(field_def.name)
            if value is None:
                continue

            if field_def.type == "number":
                try:
                    float(value)
                except (ValueError, TypeError):
                    return False, f"{field_def.label} 必须是数字"
            elif field_def.type == "boolean":
                if not isinstance(value, bool):
                    return False, f"{field_def.label} 必须是布尔值"

        return True, ""

    @classmethod
    def merge_with_defaults(cls, config: Dict[str, Any]) -> Dict[str, Any]:
        """将配置与默认值合并"""
        result = cls.default_config.copy()
        result.update(config)
        return result


# ============ 内置场景配置 ============

class KnowledgeGraphFeatureConfig(FeatureConfig):
    """知识图谱场景配置"""

    feature_id = "knowledge_graph"
    feature_name = "知识图谱"
    description = "配置知识图谱构建相关设置"
    icon = "network"
    is_required = True  # 必须配置

    config_groups = [
        ConfigGroup(id="llm", label="大模型配置", icon="sparkles"),
        ConfigGroup(id="extraction", label="实体抽取", icon="network"),
        ConfigGroup(id="auto_update", label="自动更新", icon="refresh-cw"),
    ]

    config_fields = [
        ConfigField(
            name="llm_config_id",
            label="大模型配置",
            type="select",
            required=True,
            group="llm",
            description="用于知识图谱构建的大模型",
        ),
        ConfigField(
            name="temperature",
            label="Temperature",
            type="number",
            required=False,
            default=0.3,
            group="llm",
            description="模型温度，越低越稳定",
        ),
        ConfigField(
            name="entity_count",
            label="实体数量",
            type="number",
            required=False,
            default=3,
            group="extraction",
            description="每篇笔记提取的最大实体数量",
        ),
        ConfigField(
            name="auto_incremental_update",
            label="导入后自动更新图谱",
            type="boolean",
            required=False,
            default=True,
            group="auto_update",
            description="导入笔记后自动增量更新知识图谱",
        ),
    ]

    default_config = {
        "entity_count": 3,
        "temperature": 0.3,
        "auto_incremental_update": True,
    }


class AIAssistantFeatureConfig(FeatureConfig):
    """AI 助手场景配置"""

    feature_id = "ai_assistant"
    feature_name = "AI 助手"
    description = "配置 AI 助手聊天相关设置"
    icon = "message-square"
    is_required = False  # 有默认值，可选配置

    config_groups = [
        ConfigGroup(id="llm", label="大模型配置", icon="sparkles"),
        ConfigGroup(id="conversation", label="对话设置", icon="message-square"),
    ]

    config_fields = [
        ConfigField(
            name="llm_config_id",
            label="大模型配置",
            type="select",
            required=True,
            group="llm",
            description="用于 AI 助手的大模型",
        ),
        ConfigField(
            name="temperature",
            label="Temperature",
            type="number",
            required=False,
            default=0.7,
            group="llm",
            description="模型温度，越高越有创意",
        ),
        ConfigField(
            name="max_history",
            label="最大历史消息",
            type="number",
            required=False,
            default=20,
            group="conversation",
            description="保留的对话历史轮数",
        ),
        ConfigField(
            name="system_prompt",
            label="系统提示词",
            type="text",
            required=False,
            default="你是一个有帮助的 AI 助手，名字叫知语拾光。",
            group="conversation",
            description="AI 助手的系统提示词",
        ),
    ]

    default_config = {
        "temperature": 0.7,
        "max_history": 20,
        "system_prompt": "你是一个有帮助的 AI 助手，名字叫知语拾光。",
    }


class NotesFeatureConfig(FeatureConfig):
    """笔记场景配置"""

    feature_id = "notes"
    feature_name = "笔记管理"
    description = "配置笔记内容总结、标签提取、图片存储等相关设置"
    icon = "book"
    is_required = False

    config_groups = [
        ConfigGroup(id="llm", label="大模型配置", icon="sparkles"),
        ConfigGroup(id="content_summary", label="内容总结", icon="file-text"),
        ConfigGroup(id="tag_extraction", label="标签提取", icon="tag"),
        ConfigGroup(id="image_storage", label="图片存储", icon="image"),
    ]

    config_fields = [
        ConfigField(
            name="llm_config_id",
            label="大模型配置",
            type="select",
            required=True,
            group="llm",
            description="用于内容总结和标签提取的大模型",
        ),
        ConfigField(
            name="temperature",
            label="Temperature",
            type="number",
            required=False,
            default=0.5,
            group="llm",
            description="总结和标签提取的创造性程度（0-1，越低越稳定）",
        ),
        ConfigField(
            name="auto_summarize",
            label="导入内容自动总结",
            type="boolean",
            required=False,
            default=True,
            group="content_summary",
            description="导入微信公众号、小红书等内容时自动生成摘要",
        ),
        ConfigField(
            name="summary_max_length",
            label="摘要最大长度",
            type="number",
            required=False,
            default=200,
            group="content_summary",
            description="生成摘要的最大字数",
        ),
        ConfigField(
            name="auto_extract_tags",
            label="自动提取标签",
            type="boolean",
            required=False,
            default=False,
            group="tag_extraction",
            description="在用户手动添加标签的基础上，由大模型自动提取关键词作为标签",
        ),
        ConfigField(
            name="extract_tags_count",
            label="标签提取数量",
            type="number",
            required=False,
            default=3,
            group="tag_extraction",
            description="自动提取的标签数量（仅当开启自动提取时生效）",
        ),
        ConfigField(
            name="storage_config_id",
            label="图床配置",
            type="select",
            required=False,
            group="image_storage",
            description="用于图片上传的图床配置（默认本地存储）",
        ),
    ]

    default_config = {
        "auto_summarize": True,
        "auto_extract_tags": False,
        "summary_max_length": 200,
        "extract_tags_count": 3,
        "temperature": 0.5,
        "storage_config_id": None,
    }


# ============ 场景配置注册表 ============

class FeatureConfigRegistry:
    """场景配置注册表"""

    _features: Dict[str, Type[FeatureConfig]] = {}

    @classmethod
    def register(cls, feature_class: Type[FeatureConfig]) -> Type[FeatureConfig]:
        """注册场景配置"""
        cls._features[feature_class.feature_id] = feature_class
        return feature_class

    @classmethod
    def get_feature_class(cls, feature_id: str) -> Type[FeatureConfig]:
        """获取场景配置类"""
        if feature_id not in cls._features:
            raise ValueError(f"未知的场景配置: {feature_id}")
        return cls._features[feature_id]

    @classmethod
    def list_features(cls) -> List[Dict[str, Any]]:
        """列出所有场景配置"""
        return [
            feature_class.get_config_schema()
            for feature_class in cls._features.values()
        ]

    @classmethod
    def validate_feature_config(cls, feature_id: str, config: Dict[str, Any]) -> tuple[bool, str]:
        """验证场景配置"""
        try:
            feature_class = cls.get_feature_class(feature_id)
            return feature_class.validate_config(config)
        except ValueError as e:
            return False, str(e)

    @classmethod
    def get_default_config(cls, feature_id: str) -> Dict[str, Any]:
        """获取场景的默认配置"""
        try:
            feature_class = cls.get_feature_class(feature_id)
            return feature_class.default_config.copy()
        except ValueError:
            return {}

    @classmethod
    def list_schemas(cls) -> List[Dict[str, Any]]:
        """列出所有场景配置的 Schema（别名，与 list_features 相同）"""
        return cls.list_features()

    @classmethod
    def get_schema(cls, feature_id: str) -> Dict[str, Any] | None:
        """获取单个场景的 Schema"""
        try:
            feature_class = cls.get_feature_class(feature_id)
            return feature_class.get_config_schema()
        except ValueError:
            return None


# 注册内置场景配置
FeatureConfigRegistry.register(KnowledgeGraphFeatureConfig)
FeatureConfigRegistry.register(AIAssistantFeatureConfig)
FeatureConfigRegistry.register(NotesFeatureConfig)
