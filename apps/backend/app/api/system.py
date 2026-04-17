# 系统状态路由

import os
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy"}


@router.get("/version")
async def get_version():
    """获取服务器版本信息"""
    # 解析兼容的客户端版本列表
    compatible_versions = []
    if settings.COMPATIBLE_CLIENT_VERSIONS:
        compatible_versions = [
            v.strip() for v in settings.COMPATIBLE_CLIENT_VERSIONS.split(",")
        ]
    else:
        # 如果没有配置，默认兼容当前版本
        compatible_versions = [settings.APP_VERSION]

    return {
        "version": settings.APP_VERSION,
        "build": settings.BUILD_NUMBER,
        "app_name": settings.APP_NAME,
        "compatible_client_versions": compatible_versions
    }
