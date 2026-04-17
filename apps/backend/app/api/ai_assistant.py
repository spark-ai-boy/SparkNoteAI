"""
AI 助手 API

提供 AI 聊天功能，使用 ai_assistant 场景配置：
- 读取配置的 LLM、temperature、system_prompt
- 支持流式聊天响应
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User as UserModel
from app.services.config_service import FeatureSettingService
from app.services.feature_config.base import FeatureConfigRegistry, AIAssistantFeatureConfig
from app.services.llm.factory import ProviderRegistry

router = APIRouter(prefix="/features/ai_assistant", tags=["AI 助手"])


class ChatMessage(BaseModel):
    """聊天消息"""
    role: str  # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    """聊天请求"""
    messages: List[ChatMessage]
    stream: bool = True


class ChatConfigResponse(BaseModel):
    """AI 助手配置响应"""
    feature_id: str
    feature_name: str
    description: str
    icon: str
    provider: Optional[str] = None
    model: Optional[str] = None
    temperature: float = 0.7
    max_history: int = 20
    system_prompt: str = "你是一个有帮助的 AI 助手，名字叫知语拾光。"
    is_enabled: bool = True


@router.get("/config", response_model=ChatConfigResponse)
def get_ai_assistant_config(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """获取 AI 助手的当前配置

    返回包括：使用的 LLM 提供商、模型、temperature 等配置信息
    """
    service = FeatureSettingService(db)

    # 获取 ai_assistant 场景配置
    setting = service.get_or_create_setting(
        user_id=current_user.id,
        feature_id="ai_assistant"
    )

    # 获取实际使用的集成配置
    llm_integration = service.get_effective_integration(
        user_id=current_user.id,
        feature_id="ai_assistant",
        ref_type="llm"
    )

    # 获取自定义设置
    custom_settings = setting.custom_settings or {}

    return ChatConfigResponse(
        feature_id="ai_assistant",
        feature_name="AI 助手",
        description="配置 AI 助手聊天相关设置",
        icon="message-square",
        provider=llm_integration.provider if llm_integration else None,
        model=llm_integration.config.get("model") if llm_integration else None,
        temperature=custom_settings.get("temperature", 0.7),
        max_history=custom_settings.get("max_history", 20),
        system_prompt=custom_settings.get("system_prompt", "你是一个有帮助的 AI 助手，名字叫知语拾光。"),
        is_enabled=setting.is_enabled
    )


@router.post("/chat")
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """AI 助手聊天（流式）

    使用 ai_assistant 场景配置中的 LLM 和参数进行对话。

    请求示例:
    ```json
    {
      "messages": [
        {"role": "user", "content": "你好"}
      ],
      "stream": true
    }
    ```

    流式响应格式:
    - data: {"content": "消息片段"}
    - data: [DONE] (结束标记)
    """
    service = FeatureSettingService(db)

    # 获取 ai_assistant 场景配置
    setting = service.get_or_create_setting(
        user_id=current_user.id,
        feature_id="ai_assistant"
    )

    if not setting.is_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI 助手功能已禁用"
        )

    # 获取实际使用的 LLM 集成配置
    llm_integration = service.get_effective_integration(
        user_id=current_user.id,
        feature_id="ai_assistant",
        ref_type="llm"
    )

    if not llm_integration:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="未配置 LLM，请先配置 AI 助手的大模型"
        )

    # 解密配置
    from app.services.config_service import IntegrationService
    llm_config = IntegrationService._decrypt_config(llm_integration.config or {})

    # 获取自定义设置
    custom_settings = setting.custom_settings or {}
    temperature = custom_settings.get("temperature", 0.7)
    system_prompt = custom_settings.get(
        "system_prompt",
        "你是一个有帮助的 AI 助手，名字叫知语拾光。"
    )

    # 准备消息列表
    messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]

    # 获取模型
    model = llm_config.get("model")
    if not model:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="LLM 配置中未指定模型"
        )

    # 创建 LLM Provider
    try:
        provider = ProviderRegistry.create_provider(
            llm_integration.provider,
            llm_config
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建 LLM Provider 失败: {str(e)}"
        )

    if request.stream:
        # 流式响应
        async def generate_stream():
            try:
                async for chunk in provider.generate_stream(
                    messages=messages,
                    model=model,
                    system_prompt=system_prompt
                ):
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    else:
        # 非流式响应
        try:
            # 构建完整提示词
            full_prompt = messages[-1]["content"] if messages else ""
            response = await provider.generate(
                prompt=full_prompt,
                model=model,
                system_prompt=system_prompt
            )
            return {"content": response}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"生成响应失败: {str(e)}"
            )


@router.post("/chat/non-stream")
async def chat_non_stream(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """AI 助手聊天（非流式）

    适用于不支持流式响应的场景。
    """
    # 强制非流式
    request.stream = False
    return await chat(request, db, current_user)
