# 图片缓存服务

import httpx
from typing import Optional
from sqlalchemy.orm import Session

from app.core.logger import get_logger
from app.models.image_cache import ImageCache
from app.models.integration import Integration, FeatureSetting
from app.services.image_storage import ImageStorageRegistry
from app.utils.encryption import decrypt_api_key

logger = get_logger(__name__)


class ImageCacheService:
    """图片缓存服务"""

    def __init__(self, db: Session, user_id: Optional[int] = None):
        self.db = db
        self.user_id = user_id
        self._storage = None

    def _get_storage(self):
        """获取图片存储服务"""
        if self._storage is not None:
            return self._storage

        # 获取用户的存储集成配置
        # 1. 先检查场景配置（notes 场景）
        integration = None
        if self.user_id:
            feature_setting = self.db.query(FeatureSetting).filter(
                FeatureSetting.user_id == self.user_id,
                FeatureSetting.feature_id == "notes"
            ).first()

            # 只要 integration_refs 中明确指定了 storage key，就优先使用
            storage_key = None
            if feature_setting and feature_setting.integration_refs:
                storage_key = feature_setting.integration_refs.get("storage")

            logger.info(f"图片存储查询: user_id={self.user_id}, feature_setting_exists={feature_setting is not None}, integration_refs={feature_setting.integration_refs if feature_setting else None}, storage_key={storage_key}")

            if storage_key:
                integration = self.db.query(Integration).filter(
                    Integration.user_id == self.user_id,
                    Integration.integration_type == "storage",
                    Integration.config_key == storage_key,
                    Integration.is_enabled == True
                ).first()
                if integration:
                    logger.info(f"图片存储命中: user_id={self.user_id}, config_key={storage_key}, provider={integration.provider}")

            # 2. 使用默认配置
            if not integration:
                integration = self.db.query(Integration).filter(
                    Integration.user_id == self.user_id,
                    Integration.integration_type == "storage",
                    Integration.is_default == True,
                    Integration.is_enabled == True
                ).first()

        if integration and integration.provider == "lskypro":
            # 获取配置字典并解密敏感字段
            config_dict = dict(integration.config) if integration.config else {}

            # 解密敏感字段
            sensitive_fields = ['api_token', 'token', 'password', 'secret', 'key', 'api_key']
            for field in sensitive_fields:
                if field in config_dict and config_dict[field]:
                    try:
                        config_dict[field] = decrypt_api_key(config_dict[field])
                    except Exception as e:
                        logger.warning(f"图片存储-{field} 解密失败: {e}")
                        pass

            self._storage = ImageStorageRegistry.create_provider("lskypro", config_dict)
            logger.info(f"使用兰空图床存储: user_id={self.user_id}, url={config_dict.get('api_url')}")
        else:
            # 默认本地存储
            self._storage = ImageStorageRegistry.create_provider("local", {})
            logger.info(f"使用本地存储: user_id={self.user_id}")

        return self._storage

    async def get_or_cache(self, original_url: str) -> str:
        """
        获取已缓存的图片 URL，或下载并缓存

        Args:
            original_url: 原始图片 URL

        Returns:
            str: 缓存后的图片 URL
        """
        # 检查是否已缓存
        cached = (
            self.db.query(ImageCache)
            .filter_by(original_url=original_url)
            .first()
        )
        if cached:
            return cached.cached_url

        # 下载图片
        headers = {}
        # 小红书图片防盗链，需要带 Referer
        if "xhscdn.com" in original_url or "ci.xiaohongshu.com" in original_url or "sns-webpic" in original_url:
            headers["Referer"] = "https://www.xiaohongshu.com/"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(original_url, headers=headers)
            response.raise_for_status()
            image_data = response.content

        # 获取存储服务
        storage = self._get_storage()

        # 生成文件名
        import uuid

        content_type = response.headers.get("content-type", "image/jpeg")
        ext = self._get_extension_from_mime(content_type)
        filename = f"{uuid.uuid4().hex}{ext}"

        # 上传
        cached_url = await storage.upload(image_data, filename)

        # 记录缓存
        cache_record = ImageCache(
            original_url=original_url,
            cached_url=cached_url,
            storage_type=storage.provider_id,
            file_path=filename,
            file_size=len(image_data),
            mime_type=content_type,
            user_id=self.user_id,
        )
        self.db.add(cache_record)
        self.db.commit()

        return cached_url

    def _get_extension_from_mime(self, mime_type: str) -> str:
        """从 MIME 类型获取文件扩展名"""
        mime_to_ext = {
            "image/jpeg": ".jpg",
            "image/jpg": ".jpg",
            "image/png": ".png",
            "image/gif": ".gif",
            "image/webp": ".webp",
            "image/svg+xml": ".svg",
            "image/bmp": ".bmp",
        }
        return mime_to_ext.get(mime_type, ".jpg")

    async def clear_cache(self, original_url: str) -> bool:
        """
        清除图片缓存

        Args:
            original_url: 原始图片 URL

        Returns:
            bool: 是否删除成功
        """
        cache = (
            self.db.query(ImageCache)
            .filter_by(original_url=original_url)
            .first()
        )
        if not cache:
            return False

        # 删除存储
        storage = self._get_storage()
        await storage.delete(cache.file_path)

        # 删除记录
        self.db.delete(cache)
        self.db.commit()
        return True
