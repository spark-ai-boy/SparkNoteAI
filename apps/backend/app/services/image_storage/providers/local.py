# 本地存储 Provider

import os
import shutil
from typing import Dict, Any, Tuple
from datetime import datetime

from app.core.logger import get_logger
from ..base_provider import ImageStorageProvider, ConfigField
from ....core.config import settings

logger = get_logger(__name__)


class LocalStorageProvider(ImageStorageProvider):
    """本地存储提供商"""

    provider_id = "local"
    provider_name = "本地存储"
    description = "图片存储在本地服务器，适合个人使用"
    icon = "hard-drive"
    is_default = True

    # 本地存储不需要额外配置
    config_fields = [
        ConfigField(
            name="base_path",
            label="存储路径",
            type="text",
            required=False,
            description="图片存储的本地路径（相对于项目根目录）",
            placeholder="data/uploads/images",
            default="data/uploads/images"
        ),
        ConfigField(
            name="base_url",
            label="访问 URL 前缀",
            type="url",
            required=False,
            description="图片访问的 URL 前缀",
            placeholder="/uploads",
            default="/uploads"
        ),
    ]

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        # 使用绝对路径，确保与 main.py 中挂载的静态文件目录一致
        # __file__ = app/services/image_storage/providers/local.py
        # 往上 5 级到项目根目录（/app），再拼 data/uploads/images
        base_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))), "data", "uploads", "images")
        self.base_path = self.get_config_value("base_path", base_dir)
        self.base_url = self.get_config_value("base_url", "/uploads")

        # 确保存储目录存在
        os.makedirs(self.base_path, exist_ok=True)

    async def upload(self, file_data: bytes, filename: str) -> str:
        """上传文件到本地"""
        # 生成文件路径：uploads/images/2024/01/filename_xxx.png
        now = datetime.now()
        relative_dir = os.path.join(
            str(now.year),
            f"{now.month:02d}"
        )
        full_dir = os.path.join(self.base_path, relative_dir)
        os.makedirs(full_dir, exist_ok=True)

        # 生成唯一文件名
        name, ext = os.path.splitext(filename)
        timestamp = now.strftime("%d%H%M%S")
        unique_filename = f"{name}_{timestamp}{ext}"
        file_path = os.path.join(full_dir, unique_filename)

        # 写入文件
        with open(file_path, "wb") as f:
            f.write(file_data)

        # 返回访问 URL（相对路径，前端会自动拼接 API 地址）
        relative_path = os.path.join(relative_dir, unique_filename)
        url_path = f"{self.base_url}/{relative_path.replace(os.sep, '/')}"

        # 返回完整 URL（包含 API_BASE_URL）
        api_base_url = settings.API_BASE_URL.rstrip("/")
        full_url = f"{api_base_url}{url_path}"
        logger.debug(f"本地存储-图片上传成功: url={full_url}")
        return full_url

    async def delete(self, url: str) -> bool:
        """删除本地文件"""
        try:
            # 从 URL 提取相对路径
            if not url.startswith(self.base_url):
                return False

            relative_path = url[len(self.base_url):].lstrip("/")
            file_path = os.path.join(self.base_path, relative_path)

            # 安全检查：确保文件在 base_path 下
            real_path = os.path.realpath(file_path)
            real_base = os.path.realpath(self.base_path)
            if not real_path.startswith(real_base):
                return False

            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception as e:
            logger.error(f"本地存储-删除文件失败: url={url}, error={e}")
            return False

    async def validate_config(self) -> Tuple[bool, str]:
        """验证配置"""
        try:
            # 检查目录是否可写
            if not os.path.exists(self.base_path):
                os.makedirs(self.base_path, exist_ok=True)

            # 测试写入
            test_file = os.path.join(self.base_path, ".test")
            with open(test_file, "w") as f:
                f.write("test")
            os.remove(test_file)

            return True, "本地存储配置有效"
        except Exception as e:
            return False, f"本地存储配置无效: {str(e)}"
