# 用户会话 API

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User as UserModel
from app.models.user_session import UserSession
from app.schemas.user_session import UserSessionResponse, SessionRevokeRequest, SessionRevokeAllRequest
from app.services.user_session import (
    get_user_sessions,
    revoke_session,
    revoke_all_other_sessions,
)
from app.utils.auth import verify_password
from app.api.auth import get_current_user
from typing import List

router = APIRouter()


def get_client_ip(request: Request) -> str:
    """获取客户端 IP 地址"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.get("/me/sessions", response_model=List[UserSessionResponse])
def get_my_sessions(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """获取当前用户的会话列表"""
    sessions = get_user_sessions(db, current_user.id)
    return sessions


@router.post("/me/sessions/{session_id}/revoke")
def revoke_my_session(
    session_id: int,
    request_data: SessionRevokeRequest = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """注销指定会话"""
    # 验证密码（可选，对于敏感操作可以要求验证密码）
    if request_data and request_data.password:
        if not verify_password(request_data.password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="密码不正确"
            )

    success = revoke_session(db, session_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会话不存在"
        )

    return {"message": "会话已注销"}


@router.post("/me/sessions/revoke-all")
def revoke_all_my_sessions(
    request_data: SessionRevokeAllRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """注销所有其他会话（保留当前会话）"""
    # 验证密码
    if not verify_password(request_data.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="密码不正确"
        )

    # 获取当前会话 ID（从 token 中识别）
    from jose import jwt
    from app.core.config import settings

    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        current_session_token = payload.get("sub", "")
    except:
        current_session_token = ""

    # 查找当前会话
    current_session = None
    if current_session_token:
        current_session = db.query(UserSession).filter(
            UserSession.session_token == current_session_token,
            UserSession.user_id == current_user.id
        ).first()

    current_session_id = current_session.id if current_session else 0

    # 注销所有其他会话
    count = revoke_all_other_sessions(db, current_user.id, current_session_id)

    return {"message": f"已注销 {count} 个其他会话", "revoked_count": count}
