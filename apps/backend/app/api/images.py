"""图片上传 API"""

import base64
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.logger import get_logger
from app.api.auth import get_current_user
from app.models.user import User as UserModel
from app.services.config_service import IntegrationService
from app.services.image_storage import ImageStorageRegistry

logger = get_logger(__name__)
router = APIRouter(prefix="/images", tags=["图片"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# 图片 magic bytes → 扩展名映射
MAGIC_BYTES = [
    (b'\xff\xd8\xff', '.jpg'),
    (b'\x89PNG\r\n\x1a\n', '.png'),
    (b'GIF87a', '.gif'),
    (b'GIF89a', '.gif'),
    (b'RIFF', '.webp'),  # WebP 是 RIFF 的子类型
    (b'BM', '.bmp'),
]


def _detect_mime_type(data: bytes) -> str | None:
    """根据文件头 magic bytes 推断图片类型"""
    for magic, ext in MAGIC_BYTES:
        if data[:len(magic)] == magic:
            return ext
    # WebP 特殊检测: RIFF....WEBP
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return '.webp'
    return None


def _get_storage_provider(db: Session, user_id: int):
    """获取当前用户的默认图片存储 provider

    优先使用笔记场景配置的图床，无配置时使用默认 storage 集成，最后回退到本地存储。
    """
    from app.models.integration import FeatureSetting, Integration

    service = IntegrationService(db)

    # 1. 优先使用笔记场景配置的图床
    notes_feature = db.query(FeatureSetting).filter(
        FeatureSetting.user_id == user_id,
        FeatureSetting.feature_id == "notes"
    ).first()
    storage_config_id = None
    if notes_feature and notes_feature.integration_refs:
        storage_config_id = notes_feature.integration_refs.get("storage")

    logger.info(f"图片存储查询: user_id={user_id}, notes_feature_exists={notes_feature is not None}, integration_refs={notes_feature.integration_refs if notes_feature else None}, storage_config_id={storage_config_id}")

    if storage_config_id:
        integration = db.query(Integration).filter(
            Integration.user_id == user_id,
            Integration.integration_type == "storage",
            Integration.config_key == storage_config_id,
            Integration.is_enabled == True
        ).first()
        if integration:
            decrypted_config = IntegrationService._decrypt_config(integration.config or {})
            return ImageStorageRegistry.create_provider(integration.provider, decrypted_config)

    # 2. 回退到默认 storage 集成
    integration = service.get_default_integration(
        user_id=user_id,
        integration_type="storage"
    )

    if integration:
        decrypted_config = IntegrationService._decrypt_config(integration.config or {})
        return ImageStorageRegistry.create_provider(integration.provider, decrypted_config)

    # 3. 无配置时，使用本地存储
    return ImageStorageRegistry.create_provider("local", {})


@router.post("/upload")
async def upload_image(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """上传一张或多张图片，返回访问 URL 列表"""
    provider = _get_storage_provider(db, current_user.id)

    urls = []
    for file in files:
        if not file.filename:
            continue

        # 验证文件类型
        ext = "." + file.filename.rsplit(".", 1)[-1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的文件类型: {ext}，支持: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            )

        # 读取并验证文件大小
        file_data = await file.read()
        if len(file_data) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"文件大小超过限制 ({MAX_FILE_SIZE // (1024 * 1024)}MB)"
            )

        # 上传
        url = await provider.upload(file_data, file.filename)
        urls.append(url)
        logger.info(f"图片上传成功: user_id={current_user.id}, filename={file.filename}, url={url}")

    return {"urls": urls}


class Base64ImageUpload(BaseModel):
    """Base64 图片上传请求体"""
    data: str  # base64 编码的图片数据
    filename: str  # 文件名，如 "photo.jpg"


class Base64ImageUploadRequest(BaseModel):
    """批量 Base64 图片上传请求"""
    images: List[Base64ImageUpload]


@router.post("/upload-base64")
async def upload_image_base64(
    request: Base64ImageUploadRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """通过 base64 上传图片（适用于移动端等无法使用 FormData 的场景）"""
    provider = _get_storage_provider(db, current_user.id)

    urls = []
    for image in request.images:
        logger.info(f"Base64图片上传: user_id={current_user.id}, filename={image.filename}, data_length={len(image.data)}")

        # 解码 base64
        try:
            file_data = base64.b64decode(image.data)
        except Exception as e:
            logger.error(f"base64 解码失败: filename={image.filename}, error={e}")
            raise HTTPException(status_code=400, detail="base64 数据格式错误")

        # 验证文件大小
        if len(file_data) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"文件大小超过限制 ({MAX_FILE_SIZE // (1024 * 1024)}MB)"
            )

        # 验证文件类型 — 如果文件名没有扩展名，根据 magic bytes 推断
        ext = "." + image.filename.rsplit(".", 1)[-1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            # 尝试根据文件头 magic bytes 判断
            mime_from_bytes = _detect_mime_type(file_data)
            if mime_from_bytes:
                ext = mime_from_bytes
                image.filename = f"{image.filename}{ext}"
                logger.info(f"从文件头推断类型: filename={image.filename}, ext={ext}")
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"不支持的文件类型: {ext}，支持: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
                )

        # 上传
        url = await provider.upload(file_data, image.filename)
        urls.append(url)
        logger.info(f"Base64图片上传成功: user_id={current_user.id}, filename={image.filename}, url={url}")

    return {"urls": urls}
