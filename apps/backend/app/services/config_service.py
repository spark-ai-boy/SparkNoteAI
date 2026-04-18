"""
统一配置管理服务

整合集成配置、场景配置、用户偏好的管理
"""

from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..schemas.integration import IntegrationTestResponse

from ..models.integration import Integration, FeatureSetting, UserPreference
from ..models.user import User
from ..utils.encryption import encrypt_api_key, decrypt_api_key


class IntegrationService:
    """集成配置服务"""

    # 敏感字段列表
    SENSITIVE_FIELDS = ['api_key', 'api_token', 'token', 'password', 'secret']

    @staticmethod
    def _encrypt_config(config: Dict[str, Any]) -> Dict[str, Any]:
        """加密敏感字段"""
        result = config.copy()
        for field in IntegrationService.SENSITIVE_FIELDS:
            if field in result and result[field]:
                result[field] = encrypt_api_key(str(result[field]))
        return result

    @staticmethod
    def _decrypt_config(config: Dict[str, Any]) -> Dict[str, Any]:
        """解密敏感字段"""
        result = config.copy()
        for field in IntegrationService.SENSITIVE_FIELDS:
            if field in result and result[field]:
                try:
                    result[field] = decrypt_api_key(result[field])
                except Exception:
                    pass  # 解密失败保持原样
        return result

    def __init__(self, db: Session):
        self.db = db

    def get_integrations(
        self,
        user_id: int,
        integration_type: Optional[str] = None,
        include_config: bool = False
    ) -> List[Dict[str, Any]]:
        """获取用户的集成配置列表"""
        query = self.db.query(Integration).filter(Integration.user_id == user_id)

        if integration_type:
            query = query.filter(Integration.integration_type == integration_type)

        integrations = query.order_by(Integration.created_at.desc()).all()

        return [i.to_dict(include_config=include_config) for i in integrations]

    def get_integration(
        self,
        user_id: int,
        integration_type: str,
        config_key: str,
        decrypt: bool = False
    ) -> Optional[Integration]:
        """获取单个集成配置"""
        integration = self.db.query(Integration).filter(
            and_(
                Integration.user_id == user_id,
                Integration.integration_type == integration_type,
                Integration.config_key == config_key
            )
        ).first()

        if integration and decrypt:
            integration.config = self._decrypt_config(integration.config or {})

        return integration

    def get_default_integration(
        self,
        user_id: int,
        integration_type: str
    ) -> Optional[Integration]:
        """获取默认集成配置"""
        return self.db.query(Integration).filter(
            and_(
                Integration.user_id == user_id,
                Integration.integration_type == integration_type,
                Integration.is_default == True,
                Integration.is_enabled == True
            )
        ).first()

    def create_integration(
        self,
        user_id: int,
        integration_type: str,
        config_key: str,
        provider: str,
        name: str,
        config: Dict[str, Any],
        **kwargs
    ) -> Integration:
        """创建集成配置"""
        # 检查是否已存在
        existing = self.get_integration(user_id, integration_type, config_key)
        if existing:
            raise ValueError(f"配置 key '{config_key}' 已存在")

        # 加密敏感字段
        encrypted_config = self._encrypt_config(config)

        # 如果设为默认，取消其他默认配置
        if kwargs.get('is_default'):
            self._clear_default_flag(user_id, integration_type)

        integration = Integration(
            user_id=user_id,
            integration_type=integration_type,
            config_key=config_key,
            provider=provider,
            name=name,
            config=encrypted_config,
            description=kwargs.get('description'),
            icon=kwargs.get('icon'),
            color=kwargs.get('color'),
            is_default=kwargs.get('is_default', False),
            is_enabled=kwargs.get('is_enabled', True),
            tags=kwargs.get('tags', [])
        )

        self.db.add(integration)
        self.db.commit()
        self.db.refresh(integration)

        return integration

    def update_integration(
        self,
        user_id: int,
        integration_type: str,
        config_key: str,
        updates: Dict[str, Any]
    ) -> Integration:
        """更新集成配置"""
        integration = self.get_integration(user_id, integration_type, config_key)
        if not integration:
            raise ValueError(f"配置 '{config_key}' 不存在")

        # 处理配置更新
        if 'config' in updates:
            # 合并配置，加密敏感字段
            new_config = {**(integration.config or {}), **updates['config']}
            updates['config'] = self._encrypt_config(new_config)

        # 处理默认标志变更
        if updates.get('is_default') and not integration.is_default:
            self._clear_default_flag(user_id, integration_type)

        # 应用更新
        for key, value in updates.items():
            if hasattr(integration, key):
                setattr(integration, key, value)

        self.db.commit()
        self.db.refresh(integration)

        return integration

    def delete_integration(
        self,
        user_id: int,
        integration_type: str,
        config_key: str,
        auto_reassign_default: bool = True
    ) -> None:
        """删除集成配置

        Args:
            auto_reassign_default: 如果删除的是默认配置，是否自动指定新的默认
        """
        integration = self.get_integration(user_id, integration_type, config_key)
        if not integration:
            raise ValueError(f"配置 '{config_key}' 不存在")

        was_default = integration.is_default

        # 检查是否被场景配置引用
        # PostgreSQL JSONB 查询：使用 jsonb_each_text + any 来检查
        # 或者简单地在 Python 层过滤
        all_feature_settings = self.db.query(FeatureSetting).filter(
            FeatureSetting.user_id == user_id
        ).all()

        # 在 Python 层过滤出引用了该配置的场景
        feature_settings = [
            setting for setting in all_feature_settings
            if setting.integration_refs.get(integration_type) == config_key
        ]

        # 删除配置
        self.db.delete(integration)

        # 如果被引用，降级到使用默认
        for setting in feature_settings:
            if setting.integration_refs.get(integration_type) == config_key:
                setting.integration_refs.pop(integration_type, None)
                if integration_type == 'llm':
                    setting.use_default_llm = True
                elif integration_type == 'storage':
                    setting.use_default_storage = True

        # 如果删除的是默认配置，指定新的默认
        if was_default and auto_reassign_default:
            new_default = self.db.query(Integration).filter(
                and_(
                    Integration.user_id == user_id,
                    Integration.integration_type == integration_type,
                    Integration.config_key != config_key
                )
            ).order_by(Integration.created_at.desc()).first()

            if new_default:
                new_default.is_default = True

        self.db.commit()

    def set_default_integration(
        self,
        user_id: int,
        integration_type: str,
        config_key: str
    ) -> Integration:
        """设置默认集成配置"""
        # 清除现有的默认
        self._clear_default_flag(user_id, integration_type)

        # 设置新的默认
        integration = self.get_integration(user_id, integration_type, config_key)
        if not integration:
            raise ValueError(f"配置 '{config_key}' 不存在")

        integration.is_default = True
        self.db.commit()
        self.db.refresh(integration)

        return integration

    def unset_default_integration(
        self,
        user_id: int,
        integration_type: str,
        config_key: str
    ) -> Integration:
        """取消默认集成配置"""
        integration = self.get_integration(user_id, integration_type, config_key)
        if not integration:
            raise ValueError(f"配置 '{config_key}' 不存在")

        integration.is_default = False
        self.db.commit()
        self.db.refresh(integration)

        return integration

    def _clear_default_flag(self, user_id: int, integration_type: str) -> None:
        """清除指定类型的默认标志"""
        self.db.query(Integration).filter(
            and_(
                Integration.user_id == user_id,
                Integration.integration_type == integration_type,
                Integration.is_default == True
            )
        ).update({"is_default": False})

    def test_integration(
        self,
        user_id: int,
        integration_type: str,
        config_key: str
    ) -> Tuple[bool, str]:
        """测试集成配置是否有效

        Returns:
            (是否成功, 消息)
        """
        integration = self.get_integration(user_id, integration_type, config_key, decrypt=True)
        if not integration:
            return False, "配置不存在"

        # 根据类型调用相应的验证方法
        if integration_type == 'llm':
            return self._test_llm_integration(integration)
        elif integration_type == 'storage':
            return self._test_storage_integration(integration)
        else:
            return False, f"不支持测试的类型: {integration_type}"

    def _test_llm_integration(self, integration: Integration) -> Tuple[bool, str]:
        """测试 LLM 集成"""
        try:
            from ..services.llm.factory import ProviderRegistry

            provider = ProviderRegistry.create_provider(
                integration.provider,
                integration.config
            )

            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                valid, message = loop.run_until_complete(provider.validate_config())
                return valid, message
            finally:
                loop.close()
        except Exception as e:
            return False, str(e)

    def test_llm_config_temp(
        self,
        provider: str,
        config: Dict[str, Any]
    ) -> IntegrationTestResponse:
        """测试临时 LLM 配置（无需保存）"""
        try:
            from ..services.llm.factory import ProviderRegistry

            llm_provider = ProviderRegistry.create_provider(provider, config)

            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                valid, message = loop.run_until_complete(llm_provider.validate_config())
                return IntegrationTestResponse(success=valid, message=message)
            finally:
                loop.close()
        except Exception as e:
            return IntegrationTestResponse(success=False, message=str(e))

    def test_storage_config_temp(
        self,
        provider: str,
        config: Dict[str, Any]
    ) -> IntegrationTestResponse:
        """测试临时存储配置（无需保存）"""
        try:
            from ..services.image_storage.factory import ImageStorageRegistry

            storage_provider = ImageStorageRegistry.create_provider(provider, config)

            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                valid, message = loop.run_until_complete(storage_provider.validate_config())
                return IntegrationTestResponse(success=valid, message=message)
            finally:
                loop.close()
        except Exception as e:
            return IntegrationTestResponse(success=False, message=str(e))

    def _test_storage_integration(self, integration: Integration) -> Tuple[bool, str]:
        """测试存储集成"""
        try:
            from ..services.image_storage.factory import ImageStorageRegistry

            provider = ImageStorageRegistry.create_provider(
                integration.provider,
                integration.config
            )

            # 测试连接
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                valid, message = loop.run_until_complete(provider.validate_config())
                return valid, message
            finally:
                loop.close()
        except Exception as e:
            return False, str(e)


class FeatureSettingService:
    """场景配置服务"""

    def __init__(self, db: Session):
        self.db = db
        self.integration_service = IntegrationService(db)

    def get_setting(
        self,
        user_id: int,
        feature_id: str
    ) -> Optional[FeatureSetting]:
        """获取场景配置"""
        return self.db.query(FeatureSetting).filter(
            and_(
                FeatureSetting.user_id == user_id,
                FeatureSetting.feature_id == feature_id
            )
        ).first()

    def get_settings(self, user_id: int) -> List[Dict[str, Any]]:
        """获取所有场景配置"""
        settings = self.db.query(FeatureSetting).filter(
            FeatureSetting.user_id == user_id
        ).all()

        return [s.to_dict() for s in settings]

    def get_or_create_setting(
        self,
        user_id: int,
        feature_id: str
    ) -> FeatureSetting:
        """获取或创建场景配置"""
        setting = self.get_setting(user_id, feature_id)
        if not setting:
            setting = FeatureSetting(
                user_id=user_id,
                feature_id=feature_id
            )
            self.db.add(setting)
            self.db.commit()
            self.db.refresh(setting)

        return setting

    def update_setting(
        self,
        user_id: int,
        feature_id: str,
        updates: Dict[str, Any]
    ) -> FeatureSetting:
        """更新场景配置"""
        setting = self.get_or_create_setting(user_id, feature_id)

        for key, value in updates.items():
            if hasattr(setting, key):
                setattr(setting, key, value)

        self.db.commit()
        self.db.refresh(setting)

        return setting

    def get_effective_integration(
        self,
        user_id: int,
        feature_id: str,
        ref_type: str
    ) -> Optional[Integration]:
        """获取场景实际使用的集成配置

        优先顺序:
        1. 场景指定的配置 (integration_refs) - 如果有明确的 config_key
        2. 用户默认配置 (user_preferences)
        3. 该类型的默认配置 (is_default=True)

        注意：use_default_llm/use_default_storage 为 True 时，
        但如果 integration_refs 中有明确的 config_key，仍然优先使用 integration_refs。
        """
        setting = self.get_setting(user_id, feature_id)

        # 1. 检查场景是否指定了配置（优先使用 integration_refs）
        config_key = None
        if setting and setting.integration_refs:
            config_key = setting.integration_refs.get(ref_type)

        if config_key:
            integration = self.integration_service.get_integration(
                user_id, ref_type, config_key
            )
            if integration and integration.is_enabled:
                return integration

        # 2. 检查是否应该使用默认配置
        use_default = True  # 默认行为
        if setting:
            if ref_type == 'llm':
                use_default = setting.use_default_llm
            elif ref_type == 'storage':
                use_default = setting.use_default_storage

        if not use_default:
            # 如果明确设置为不使用默认配置，但没有 integration_refs，返回 None
            return None

        # 2. 检查用户偏好中的默认配置
        pref = self.db.query(UserPreference).filter(
            UserPreference.user_id == user_id
        ).first()

        if pref:
            default_key = None
            if ref_type == 'llm':
                default_key = pref.default_llm_integration
            elif ref_type == 'storage':
                default_key = pref.default_storage_integration

            if default_key:
                integration = self.integration_service.get_integration(
                    user_id, ref_type, default_key
                )
                if integration and integration.is_enabled:
                    return integration

        # 3. 使用该类型的默认配置
        return self.integration_service.get_default_integration(user_id, ref_type)

    def get_effective_config(
        self,
        user_id: int,
        feature_id: str,
        feature_definition: Dict[str, Any]
    ) -> Dict[str, Any]:
        """获取场景的有效运行时配置

        合并: 功能默认值 < 用户自定义设置 < 集成配置
        """
        setting = self.get_setting(user_id, feature_id)

        result = {}

        # 1. 从功能定义获取默认值
        schema = feature_definition.get('config_schema', {})
        for key, field_def in schema.items():
            if 'default' in field_def:
                result[key] = field_def['default']

        # 2. 覆盖用户自定义设置
        if setting and setting.custom_settings:
            result.update(setting.custom_settings)

        # 3. 获取引用的集成配置
        if setting:
            for ref_type in ['llm', 'storage']:
                integration = self.get_effective_integration(user_id, feature_id, ref_type)
                if integration:
                    # 解密配置
                    config = IntegrationService._decrypt_config(integration.config or {})
                    result[f'{ref_type}_config'] = config
                    result[f'{ref_type}_provider'] = integration.provider

        return result


class UserPreferenceService:
    """用户偏好服务"""

    def __init__(self, db: Session):
        self.db = db

    def get_or_create(self, user_id: int) -> UserPreference:
        """获取或创建用户偏好"""
        pref = self.db.query(UserPreference).filter(
            UserPreference.user_id == user_id
        ).first()

        if not pref:
            pref = UserPreference(user_id=user_id)
            self.db.add(pref)
            self.db.commit()
            self.db.refresh(pref)

        return pref

    def update(self, user_id: int, updates: Dict[str, Any]) -> UserPreference:
        """更新用户偏好"""
        pref = self.get_or_create(user_id)

        for key, value in updates.items():
            if hasattr(pref, key):
                setattr(pref, key, value)

        self.db.commit()
        self.db.refresh(pref)

        return pref

    def get_defaults(self, user_id: int) -> Dict[str, Any]:
        """获取用户的默认配置"""
        pref = self.get_or_create(user_id)

        return {
            'theme': pref.theme,
            'language': pref.language,
            'font_size': pref.font_size,
            'sidebar_collapsed': pref.sidebar_collapsed,
            'default_llm_integration': pref.default_llm_integration,
            'default_storage_integration': pref.default_storage_integration,
        }
