"""图片上传 API"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
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


def _get_storage_provider(db: Session, user_id: int):
    """获取当前用户的默认图片存储 provider

    优先使用用户配置的图床，无配置时自动使用本地存储。
    """
    service = IntegrationService(db)
    integration = service.get_default_integration(
        user_id=user_id,
        integration_type="storage"
    )

    if integration:
        decrypted_config = IntegrationService._decrypt_config(integration.config or {})
        return ImageStorageRegistry.create_provider(integration.provider, decrypted_config)

    # 无配置时，使用本地存储
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
