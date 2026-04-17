"""
场景配置 API

管理各功能模块的配置：
- knowledge_graph: 知识图谱
- ai_assistant: AI 助手
- notes: 笔记管理
- 未来可扩展任意功能
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User as UserModel
from app.schemas.feature_setting import (
    FeatureSettingUpdate,
    FeatureSettingResponse,
    FeatureRuntimeConfigResponse,
)
from app.services.config_service import FeatureSettingService, IntegrationService
from app.services.feature_config.base import FeatureConfigRegistry

router = APIRouter(prefix="/features", tags=["场景配置"])


@router.get("", response_model=List[Dict[str, Any]])
def list_feature_definitions(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """获取所有功能定义（Schema）

    返回各功能支持的配置项、默认值等信息，用于前端动态渲染表单。
    动态为 select 类型字段注入选项列表（如 LLM 集成配置）。

    示例:
        GET /features
    """
    schemas = FeatureConfigRegistry.list_schemas()

    # 为 select 类型字段动态注入 options
    integration_service = IntegrationService(db)

    import copy
    result = []
    for schema in schemas:
        schema = copy.deepcopy(schema)
        for field in schema.get("config_fields", []):
            if field.get("type") == "select":
                field_name = field.get("name", "")
                # 根据字段名判断需要注入的 options
                if field_name.endswith("_config_id") or field_name.endswith("_integration"):
                    # 推断集成类型：llm_config_id -> llm, storage_config_id -> storage
                    if "llm" in field_name:
                        integration_type = "llm"
                    elif "storage" in field_name:
                        integration_type = "storage"
                    else:
                        integration_type = None

                    if integration_type:
                        # 获取用户的集成配置列表
                        integrations = integration_service.get_integrations(
                            user_id=current_user.id,
                            integration_type=integration_type,
                            include_config=False
                        )
                        # 转换为 options 格式
                        field["options"] = [
                            {"value": i["config_key"], "label": i["name"]}
                            for i in integrations if i.get("is_enabled", True)
                        ]
        result.append(schema)

    return result


@router.get("/{feature_id}/schema", response_model=Dict[str, Any])
def get_feature_definition(
    feature_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """获取单个功能定义

    动态为 select 类型字段注入选项列表（如 LLM 集成配置）。

    示例:
        GET /features/knowledge_graph/schema
    """
    schema = FeatureConfigRegistry.get_schema(feature_id)
    if not schema:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"功能 '{feature_id}' 不存在"
        )

    # 为 select 类型字段动态注入 options
    integration_service = IntegrationService(db)

    # 深度复制 schema，避免修改原始定义
    import copy
    schema = copy.deepcopy(schema)

    for field in schema.get("config_fields", []):
        if field.get("type") == "select":
            field_name = field.get("name", "")
            # 根据字段名判断需要注入的 options
            if field_name.endswith("_config_id") or field_name.endswith("_integration"):
                # 推断集成类型：llm_config_id -> llm, storage_config_id -> storage
                if "llm" in field_name:
                    integration_type = "llm"
                elif "storage" in field_name:
                    integration_type = "storage"
                else:
                    integration_type = None

                if integration_type:
                    # 获取用户的集成配置列表
                    integrations = integration_service.get_integrations(
                        user_id=current_user.id,
                        integration_type=integration_type,
                        include_config=False
                    )
                    # 转换为 options 格式
                    field["options"] = [
                        {"value": i["config_key"], "label": i["name"]}
                        for i in integrations if i.get("is_enabled", True)
                    ]

    return schema


@router.get("/{feature_id}/settings", response_model=FeatureSettingResponse)
def get_feature_setting(
    feature_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """获取用户的功能配置

    示例:
        GET /features/knowledge_graph/settings
    """
    service = FeatureSettingService(db)
    setting = service.get_or_create_setting(
        user_id=current_user.id,
        feature_id=feature_id
    )

    return setting.to_dict()


@router.put("/{feature_id}/settings", response_model=FeatureSettingResponse)
def update_feature_setting(
    feature_id: str,
    data: FeatureSettingUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """更新功能配置

    示例:
        PUT /features/knowledge_graph/settings
        {
          "integration_refs": {"llm": "openai-prod"},
          "use_default_llm": false,
          "custom_settings": {"temperature": 0.3, "entity_count": 10}
        }
    """
    service = FeatureSettingService(db)

    # 构建更新字典
    updates = data.model_dump(exclude_unset=True)

    setting = service.update_setting(
        user_id=current_user.id,
        feature_id=feature_id,
        updates=updates
    )

    return setting.to_dict()


@router.delete("/{feature_id}/settings")
def reset_feature_setting(
    feature_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """重置功能配置为默认值

    示例:
        DELETE /features/knowledge_graph/settings
    """
    service = FeatureSettingService(db)

    setting = service.get_setting(current_user.id, feature_id)
    if setting:
        # 重置为默认值
        setting.integration_refs = {}
        setting.use_default_llm = True
        setting.use_default_storage = True
        setting.custom_settings = {}
        db.commit()

    return {"message": f"功能 '{feature_id}' 配置已重置"}


@router.get("/{feature_id}/runtime-config", response_model=FeatureRuntimeConfigResponse)
def get_feature_runtime_config(
    feature_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """获取功能运行时配置（合并后的完整配置）

    返回包括：
    - 用户自定义设置
    - 引用的集成配置（已解密）
    - 功能默认值

    示例:
        GET /features/knowledge_graph/runtime-config
    """
    from sqlalchemy.orm import joinedload

    service = FeatureSettingService(db)

    # 获取功能定义
    feature_def = FeatureConfigRegistry.get_schema(feature_id)
    if not feature_def:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"功能 '{feature_id}' 不存在"
        )

    # 获取场景设置
    setting = service.get_or_create_setting(current_user.id, feature_id)

    # 获取有效的 LLM 配置
    llm_config = None
    provider = None
    model = None

    # 从 integration_refs 中获取 LLM 配置 key
    llm_config_key = None
    if setting and setting.integration_refs:
        llm_config_key = setting.integration_refs.get('llm')

    if llm_config_key:
        # 获取 LLM 集成配置
        integration_service = IntegrationService(db)
        llm_integration = integration_service.get_integration(
            user_id=current_user.id,
            integration_type='llm',
            config_key=llm_config_key,
            decrypt=True
        )
        if llm_integration:
            llm_config = llm_integration.config or {}
            provider = llm_integration.provider
            # 从配置中获取 model 名称
            model = llm_integration.config.get('model') if llm_config else None

    # 如果没有配置 model，使用默认值
    if not model and feature_def.get('default_config'):
        model = feature_def['default_config'].get('model')

    return FeatureRuntimeConfigResponse(
        feature_id=feature_id,
        integration_refs=setting.integration_refs or {},
        custom_settings=setting.custom_settings or {},
        llm_config=llm_config,
        storage_config=None,
        is_enabled=setting.is_enabled,
        provider=provider,
        model=model
    )


@router.get("/settings", response_model=List[FeatureSettingResponse])
def list_feature_settings(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """获取所有功能配置

    示例:
        GET /features/settings
    """
    service = FeatureSettingService(db)
    return service.get_settings(current_user.id)
