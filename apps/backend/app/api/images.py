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
