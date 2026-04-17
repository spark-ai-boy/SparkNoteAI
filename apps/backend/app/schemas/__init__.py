# Schema 入口

from .user import User, UserCreate, Token, TokenData
from .task import (
    TaskCreate,
    TaskResponse,
    TaskListResponse,
    TaskProgressUpdate,
    TaskStatusEnum,
    TaskTypeEnum,
)
from .integration import (
    IntegrationCreate,
    IntegrationUpdate,
    IntegrationResponse,
    IntegrationDetailResponse,
    IntegrationTestResponse,
)
from .feature_setting import (
    FeatureSettingUpdate,
    FeatureSettingResponse,
    FeatureRuntimeConfigResponse,
)
from .preference import (
    UserPreferenceUpdate,
    UserPreferenceResponse,
)

__all__ = [
    "User",
    "UserCreate",
    "Token",
    "TokenData",
    "TaskCreate",
    "TaskResponse",
    "TaskListResponse",
    "TaskProgressUpdate",
    "TaskStatusEnum",
    "TaskTypeEnum",
    # 新配置系统 schema
    "IntegrationCreate",
    "IntegrationUpdate",
    "IntegrationResponse",
    "IntegrationDetailResponse",
    "IntegrationTestResponse",
    "FeatureSettingUpdate",
    "FeatureSettingResponse",
    "FeatureRuntimeConfigResponse",
    "UserPreferenceUpdate",
    "UserPreferenceResponse",
]
