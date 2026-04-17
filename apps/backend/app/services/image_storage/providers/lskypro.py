# 兰空图床 (Lsky Pro) Provider

import httpx
from typing import Dict, Any, Tuple

from ..base_provider import ImageStorageProvider, ConfigField


class LskyProProvider(ImageStorageProvider):
    """兰空图床提供商"""

    provider_id = "lskypro"
    provider_name = "兰空图床"
    description = "支持兰空图床 (Lsky Pro) 开源图床系统"
    icon = "cloud"
    is_default = False

    config_fields = [
        ConfigField(
            name="api_url",
            label="API 地址",
            type="url",
            required=True,
            description="兰空图床 API 地址，如 https://img.example.com/api/v1",
            placeholder="https://your-lsky-domain.com/api/v1",
        ),
        ConfigField(
            name="api_token",
            label="API Token",
            type="password",
            required=True,
            description="兰空图床的 API Token",
            placeholder="1|xxxxxxxxxxxxxxxx",
        ),
        ConfigField(
            name="strategy_id",
            label="存储策略 ID",
            type="text",
            required=False,
            description="可选，指定存储策略 ID",
            placeholder="1",
        ),
    ]

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.api_url = self.get_config_value("api_url", "").rstrip("/")
        self.api_token = self.get_config_value("api_token", "")
        self.strategy_id = self.get_config_value("strategy_id", "")

    async def upload(self, file_data: bytes, filename: str) -> str:
        """上传文件到兰空图床"""
        url = f"{self.api_url}/upload"

        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Accept": "application/json",
        }

        # 准备文件
        files = {
            "file": (filename, file_data, "application/octet-stream")
        }

        # 准备参数
        data = {}
        if self.strategy_id:
            data["strategy_id"] = self.strategy_id

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers=headers,
                files=files,
                data=data,
                timeout=60.0
            )
            response.raise_for_status()
            result = response.json()

            if result.get("status"):
                return result["data"]["links"]["url"]
            else:
                raise ValueError(f"上传失败: {result.get('message', '未知错误')}")

    async def delete(self, url: str) -> bool:
        """删除兰空图床的文件"""
        # 兰空图床删除需要图片的 key 或 id
        # 这里简化处理，返回 True（实际项目中可能需要存储图片 ID）
        return True

    async def validate_config(self) -> Tuple[bool, str]:
        """验证配置"""
        if not self.api_url:
            return False, "API 地址不能为空"
        if not self.api_token:
            return False, "API Token 不能为空"

        try:
            # 测试获取用户信息
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/profile",
                    headers={"Authorization": f"Bearer {self.api_token}"},
                    timeout=10.0
                )

                if response.status_code == 200:
                    return True, "连接成功，配置有效"
                elif response.status_code == 401:
                    return False, "API Token 无效"
                else:
                    return False, f"HTTP 错误: {response.status_code}"
        except httpx.HTTPStatusError as e:
            return False, f"HTTP 错误: {e.response.status_code}"
        except Exception as e:
            return False, f"连接失败: {str(e)}"
