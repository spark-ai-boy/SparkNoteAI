# API 路由

from fastapi import APIRouter
from .auth import router as auth_router
from .note import router as note_router
from .knowledge_graph import router as knowledge_graph_router
from .tasks import router as tasks_router

# 新配置系统路由
from .integrations import router as integrations_router
from .feature_settings import router as feature_settings_router
from .preferences import router as preferences_router
from .ai_assistant import router as ai_assistant_router

# 系统状态路由
from .system import router as system_router

# 用户会话路由
from .user_session import router as user_session_router

# 图片上传路由
from .images import router as images_router

router = APIRouter()

# 注册子路由
router.include_router(auth_router, prefix="/auth", tags=["认证"])
router.include_router(note_router, tags=["笔记"])

# 新统一配置 API
router.include_router(integrations_router, tags=["集成配置"])
router.include_router(feature_settings_router, tags=["场景配置"])
router.include_router(preferences_router, prefix="/preferences", tags=["用户偏好"])
router.include_router(ai_assistant_router, tags=["AI 助手"])

# 系统状态（健康检查、版本信息）
router.include_router(system_router, tags=["系统状态"])

# 用户会话管理
router.include_router(user_session_router, prefix="/auth", tags=["用户会话"])

router.include_router(knowledge_graph_router, tags=["知识图谱"])
router.include_router(tasks_router, tags=["任务管理"])
router.include_router(images_router, tags=["图片"])
