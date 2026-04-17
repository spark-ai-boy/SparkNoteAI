# 加密工具函数

from cryptography.fernet import Fernet
from ..core.config import settings
from ..core.logger import get_logger

logger = get_logger(__name__)


def get_encryption_key() -> bytes:
    """
    获取加密密钥

    从环境变量读取 ENCRYPTION_KEY
    如果没有设置，则生成一个新的密钥（仅用于开发环境）

    Returns:
        bytes: 32 字节的加密密钥
    """
    key_str = settings.ENCRYPTION_KEY

    if not key_str:
        # 开发环境：如果没有配置，生成一个新密钥
        # 生产环境必须配置 ENCRYPTION_KEY 环境变量
        key = Fernet.generate_key()
        logger.warning("未配置 ENCRYPTION_KEY，使用临时生成的密钥。请将此密钥添加到环境配置中")
        return key

    # 如果是字符串，转换为 bytes
    if isinstance(key_str, str):
        key_bytes = key_str.encode()
    else:
        key_bytes = key_str

    # 验证密钥格式
    try:
        Fernet(key_bytes)
    except ValueError:
        raise ValueError(
            "ENCRYPTION_KEY 格式无效。请使用 Fernet 生成的 32 字节 base64 编码密钥。\n"
            f"生成新密钥：python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
        )

    return key_bytes


def encrypt_api_key(api_key: str) -> str:
    """
    加密 API Key

    Args:
        api_key: 原始 API Key 字符串

    Returns:
        str: 加密后的字符串（base64 编码）
    """
    f = Fernet(get_encryption_key())
    encrypted = f.encrypt(api_key.encode())
    return encrypted.decode()


def decrypt_api_key(encrypted_key: str) -> str:
    """
    解密 API Key

    Args:
        encrypted_key: 加密的 API Key 字符串

    Returns:
        str: 解密后的原始 API Key
    """
    f = Fernet(get_encryption_key())
    decrypted = f.decrypt(encrypted_key.encode())
    return decrypted.decode()


def get_api_key_prefix(api_key: str, prefix_len: int = 8) -> str:
    """
    获取 API Key 前缀（用于显示）

    Args:
        api_key: 原始 API Key 字符串
        prefix_len: 前缀长度，默认 8 个字符

    Returns:
        str: API Key 前缀
    """
    if not api_key:
        return ""
    return api_key[:prefix_len] if len(api_key) > prefix_len else api_key
