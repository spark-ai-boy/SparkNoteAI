"""
集成配置 API

统一管理所有外部服务集成配置：
- LLM 集成 (openai, anthropic, azure, etc.)
- 存储集成 (local, lskypro, etc.)
- 未来可扩展：数据库、消息队列、搜索引擎等
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from app.core.database import get_db
from app.core.logger import get_logger
from app.api.auth import get_current_user
from app.models.user import User as UserModel

logger = get_logger(__name__)
from app.schemas.integration import (
    IntegrationCreate,
    IntegrationUpdate,
    IntegrationResponse,
    IntegrationDetailResponse,
    IntegrationTestResponse,
    SetDefaultRequest,
)
from app.services.config_service import IntegrationService
from app.services.llm.factory import ProviderRegistry as LLMProviderRegistry
from app.services.image_storage.factory import ImageStorageRegistry

router = APIRouter(prefix="/integrations", tags=["集成配置"])


@router.get("/providers", response_model=Dict[str, Any])
def list_integration_providers(
    integration_type: Optional[str] = Query(None, description="按类型过滤: llm | storage"),
):
    """获取所有可用的集成提供商列表及其 Schema

    用于前端动态渲染配置表单。

    示例:
        GET /integrations/providers
        GET /integrations/providers?integration_type=llm
    """
    result = {}

    # LLM 提供商
    if not integration_type or integration_type == "llm":
        result["llm"] = {
            "type": "llm",
            "name": "大语言模型",
            "description": "用于 AI 对话、文本生成、知识图谱构建等",
            "providers": LLMProviderRegistry.list_providers()
        }

    # 存储提供商
    if not integration_type or integration_type == "storage":
        result["storage"] = {
            "type": "storage",
            "name": "图片存储",
            "description": "用于图片上传、缓存和管理",
            "providers": ImageStorageRegistry.list_providers()
        }

    return result


@router.get("/providers/{provider_id}", response_model=Dict[str, Any])
def get_provider_schema(
    provider_id: str,
    integration_type: str = Query(..., description="集成类型: llm | storage"),
):
    """获取特定提供商的配置 Schema

    用于前端渲染特定提供商的配置表单。

    示例:
        GET /integrations/providers/openai?integration_type=llm
        GET /integrations/providers/lskypro?integration_type=storage
    """
    try:
        if integration_type == "llm":
            schema = LLMProviderRegistry.get_provider_schema(provider_id)
        elif integration_type == "storage":
            schema = ImageStorageRegistry.get_provider_schema(provider_id)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"不支持的集成类型: {integration_type}"
            )

        return schema

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("", response_model=List[IntegrationResponse])
def list_integrations(
    integration_type: Optional[str] = Query(None, description="按类型过滤: llm | storage"),
    include_config: bool = Query(False, description="是否包含配置详情"),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """获取用户的集成配置列表

    示例:
        GET /integrations?integration_type=llm
        GET /integrations?integration_type=storage&include_config=true
    """
    service = IntegrationService(db)
    return service.get_integrations(
        user_id=current_user.id,
        integration_type=integration_type,
        include_config=include_config
    )


@router.post("", response_model=IntegrationResponse, status_code=status.HTTP_201_CREATED)
def create_integration(
    data: IntegrationCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """创建集成配置

    示例:
        POST /integrations
        {
          "integration_type": "llm",
          "config_key": "openai-prod",
          "name": "OpenAI 生产环境",
          "provider": "openai",
          "config": {
            "api_key": "sk-xxx",
            "model": "gpt-4o"
          },
          "is_default": true
        }
    """
    service = IntegrationService(db)
    try:
        integration = service.create_integration(
            user_id=current_user.id,
            integration_type=data.integration_type,
            config_key=data.config_key,
            provider=data.provider,
            name=data.name,
            config=data.config,
            description=data.description,
            icon=data.icon,
            color=data.color,
            is_default=data.is_default,
            is_enabled=data.is_enabled,
            tags=data.tags
        )
        return integration.to_dict(include_config=False)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{integration_type}/{config_key}", response_model=IntegrationDetailResponse)
def get_integration(
    integration_type: str,
    config_key: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """获取单个集成配置详情

    示例:
        GET /integrations/llm/openai-prod
    """
    service = IntegrationService(db)
    integration = service.get_integration(
        user_id=current_user.id,
        integration_type=integration_type,
        config_key=config_key
    )

    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"配置 '{config_key}' 不存在"
        )

    return integration.to_dict(include_config=True)


@router.put("/{integration_type}/{config_key}", response_model=IntegrationResponse)
def update_integration(
    integration_type: str,
    config_key: str,
    data: IntegrationUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """更新集成配置

    示例:
        PUT /integrations/llm/openai-prod
        {
          "name": "新名称",
          "config": {
            "model": "gpt-4o-mini"
          }
        }
    """
    service = IntegrationService(db)

    # 构建更新字典（排除 None 值）
    updates = data.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="没有提供要更新的字段"
        )

    try:
        integration = service.update_integration(
            user_id=current_user.id,
            integration_type=integration_type,
            config_key=config_key,
            updates=updates
        )
        return integration.to_dict(include_config=False)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete("/{integration_type}/{config_key}")
def delete_integration(
    integration_type: str,
    config_key: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """删除集成配置

    - 如果该配置被场景引用，自动降级到使用默认配置
    - 如果删除的是默认配置，自动指定新的默认

    示例:
        DELETE /integrations/llm/openai-prod
    """
    service = IntegrationService(db)
    try:
        service.delete_integration(
            user_id=current_user.id,
            integration_type=integration_type,
            config_key=config_key
        )
        return {"message": f"配置 '{config_key}' 已删除"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        # 捕获其他异常，便于调试
        logger.error(f"删除集成配置异常: config_key={config_key}, error={e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除失败：{str(e)}"
        )


@router.post("/{integration_type}/{config_key}/test", response_model=IntegrationTestResponse)
def test_integration(
    integration_type: str,
    config_key: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """测试集成配置是否有效

    示例:
        POST /integrations/llm/openai-prod/test
    """
    service = IntegrationService(db)
    success, message = service.test_integration(
        user_id=current_user.id,
        integration_type=integration_type,
        config_key=config_key
    )

    return IntegrationTestResponse(success=success, message=message)


@router.post("/{integration_type}/test", response_model=IntegrationTestResponse)
def test_integration_temp(
    integration_type: str,
    provider: str = Body(..., description="提供商类型，如 openai, anthropic"),
    config: Dict[str, Any] = Body(..., description="配置内容"),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """测试临时配置（无需先保存）

    用于前端在创建新配置时，先测试配置是否有效。

    请求体：
    {
      "provider": "openai",
      "config": {
        "api_key": "sk-xxx",
        "model": "gpt-4o-mini"
      }
    }

    示例:
        POST /integrations/llm/test
    """
    service = IntegrationService(db)

    # 根据类型调用相应的验证方法
    if integration_type == 'llm':
        return service.test_llm_config_temp(provider, config)
    elif integration_type == 'storage':
        return service.test_storage_config_temp(provider, config)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持测试的类型：{integration_type}"
        )


@router.post("/{integration_type}/{config_key}/set-default")
def set_default_integration(
    integration_type: str,
    config_key: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """设置默认集成配置

    示例:
        POST /integrations/llm/openai-prod/set-default
    """
    service = IntegrationService(db)
    try:
        integration = service.set_default_integration(
            user_id=current_user.id,
            integration_type=integration_type,
            config_key=config_key
        )
        return {
            "message": f"'{config_key}' 已设为默认{integration_type}配置",
            "integration": integration.to_dict(include_config=False)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/{integration_type}/{config_key}/unset-default")
def unset_default_integration(
    integration_type: str,
    config_key: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """取消默认集成配置

    示例:
        POST /integrations/storage/lskypro-xxx/unset-default
    """
    service = IntegrationService(db)
    try:
        integration = service.unset_default_integration(
            user_id=current_user.id,
            integration_type=integration_type,
            config_key=config_key
        )
        return {
            "message": f"'{config_key}' 已取消默认{integration_type}配置",
            "integration": integration.to_dict(include_config=False)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
