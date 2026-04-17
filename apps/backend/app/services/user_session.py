# 用户会话服务

from sqlalchemy import select, update
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.models.user_session import UserSession
from app.schemas.user_session import UserSessionBase
import re


def parse_user_agent(user_agent: str) -> dict:
    """解析 User-Agent 获取设备和浏览器信息"""
    result = {
        'device_type': 'desktop',
        'browser': 'Unknown',
        'os': 'Unknown'
    }

    # 检测设备类型
    if re.search(r'Mobile|Android|iPhone|iPad', user_agent):
        if re.search(r'iPad', user_agent):
            result['device_type'] = 'tablet'
        else:
            result['device_type'] = 'mobile'

    # 检测浏览器
    if re.search(r'Edg/', user_agent):
        result['browser'] = 'Edge'
    elif re.search(r'Chrome/', user_agent):
        result['browser'] = 'Chrome'
    elif re.search(r'Safari/', user_agent):
        result['browser'] = 'Safari'
    elif re.search(r'Firefox/', user_agent):
        result['browser'] = 'Firefox'
    elif re.search(r'MSIE|Trident/', user_agent):
        result['browser'] = 'Internet Explorer'

    # 检测操作系统
    if re.search(r'Windows', user_agent):
        result['os'] = 'Windows'
    elif re.search(r'Mac OS X', user_agent):
        result['os'] = 'macOS'
    elif re.search(r'Linux', user_agent):
        result['os'] = 'Linux'
    elif re.search(r'iOS', user_agent):
        result['os'] = 'iOS'
    elif re.search(r'Android', user_agent):
        result['os'] = 'Android'

    return result


def generate_device_name(browser: str, os: str, device_type: str) -> str:
    """生成设备名称"""
    if device_type == 'mobile':
        return f"{browser} on Mobile"
    elif device_type == 'tablet':
        return f"{browser} on Tablet"
    else:
        return f"{browser} on {os}"


def get_location_from_ip(ip_address: str) -> str:
    """根据 IP 地址获取位置信息（简化版，实际可接入 IP 库）"""
    # 本地 IP
    if ip_address.startswith('192.168.') or ip_address.startswith('10.') or ip_address.startswith('172.'):
        return '本地网络'

    # 简化处理：默认返回未知
    # 实际项目中可以接入 MaxMind GeoIP 或 IP2Region
    return '未知位置'


def create_user_session(
    db: Session,
    user_id: int,
    session_token: str,
    user_agent: str,
    ip_address: str
) -> UserSession:
    """创建用户会话"""
    # 解析 User-Agent
    ua_info = parse_user_agent(user_agent)

    # 生成设备名称
    device_name = generate_device_name(ua_info['browser'], ua_info['os'], ua_info['device_type'])

    # 获取位置
    location = get_location_from_ip(ip_address)

    # 设置过期时间（7 天）
    expires_at = datetime.utcnow() + timedelta(days=7)

    # 将当前用户的其他会话设为非当前
    db.execute(
        update(UserSession)
        .where(UserSession.user_id == user_id)
        .values(is_current=False)
    )

    # 创建新会话
    session = UserSession(
        user_id=user_id,
        session_token=session_token,
        device_type=ua_info['device_type'],
        device_name=device_name,
        browser=ua_info['browser'],
        os=ua_info['os'],
        ip_address=ip_address,
        location=location,
        is_current=True,
        expires_at=expires_at
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return session


def get_user_sessions(db: Session, user_id: int) -> list[UserSession]:
    """获取用户的所有会话"""
    stmt = (
        select(UserSession)
        .where(UserSession.user_id == user_id)
        .order_by(UserSession.last_active_at.desc())
    )
    return db.execute(stmt).scalars().all()


def revoke_session(db: Session, session_id: int, user_id: int) -> bool:
    """注销指定会话"""
    session = db.get(UserSession, session_id)
    if session and session.user_id == user_id:
        db.delete(session)
        db.commit()
        return True
    return False


def revoke_all_other_sessions(db: Session, user_id: int, current_session_id: int) -> int:
    """注销所有其他会话，返回注销的数量"""
    stmt = (
        select(UserSession)
        .where(UserSession.user_id == user_id)
        .where(UserSession.id != current_session_id)
    )
    sessions = db.execute(stmt).scalars().all()
    count = len(sessions)
    for session in sessions:
        db.delete(session)
    db.commit()
    return count


def update_session_activity(db: Session, session_id: int) -> None:
    """更新会话最后活跃时间"""
    session = db.get(UserSession, session_id)
    if session:
        session.last_active_at = datetime.utcnow()
        db.commit()


def cleanup_expired_sessions(db: Session) -> int:
    """清理过期会话，返回清理数量"""
    stmt = select(UserSession).where(UserSession.expires_at < datetime.utcnow())
    sessions = db.execute(stmt).scalars().all()
    count = len(sessions)
    for session in sessions:
        db.delete(session)
    db.commit()
    return count
