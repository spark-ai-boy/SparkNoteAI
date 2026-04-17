"""
用户偏好 API

管理用户的 UI/UX 偏好和默认集成设置
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User as UserModel
from app.schemas.preference import (
    UserPreferenceUpdate,
    UserPreferenceResponse,
)
from app.services.config_service import UserPreferenceService

router = APIRouter(tags=["用户偏好"])


@router.get("", response_model=UserPreferenceResponse)
def get_preferences(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """获取用户偏好

    示例:
        GET /preferences
    """
    service = UserPreferenceService(db)
    pref = service.get_or_create(current_user.id)
    return pref.to_dict()


@router.put("", response_model=UserPreferenceResponse)
def update_preferences(
    data: UserPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """更新用户偏好

    示例:
        PUT /preferences
        {
          "theme": "dark",
          "language": "zh-CN",
          "default_llm_integration": "openai-prod",
          "notifications": {
            "task_complete": true,
            "import_progress": false
          }
        }
    """
    service = UserPreferenceService(db)

    updates = data.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=400,
            detail="没有提供要更新的字段"
        )

    # 处理 notifications 更新 - 合并而不是替换
    if 'notifications' in updates:
        pref = service.get_or_create(current_user.id)
        existing_notifications = pref.notifications or {}
        new_notifications = updates.pop('notifications')
        merged_notifications = {**existing_notifications, **(new_notifications or {})}
        updates['notifications'] = merged_notifications

    pref = service.update(current_user.id, updates)
    return pref.to_dict()


@router.get("/defaults")
def get_default_integrations(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """获取用户的默认集成配置

    示例:
        GET /preferences/defaults
    """
    service = UserPreferenceService(db)
    return service.get_defaults(current_user.id)
