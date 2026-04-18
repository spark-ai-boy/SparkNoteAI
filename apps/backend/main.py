# FastAPI 应用入口

import os
import asyncio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.api import router
from app.core.config import settings
from app.core.logger import setup_logging, get_logger
from app.core.database import engine, Base, SessionLocal
# 导入所有模型，确保注册到 SQLAlchemy Base
from app.models import User, UserSession, Task, Note, Tag, NoteTag, ImageCache, GraphNode, GraphEdge, Integration, FeatureSetting, UserPreference
from app.services.task_scheduler import TaskScheduler
from app.utils.auth import get_password_hash

logger = get_logger(__name__)

# 初始化日志（在应用启动最早期）
setup_logging(level="DEBUG" if settings.DEBUG else "INFO")

app = FastAPI(
    title="SparkNoteAI API",
    description="知识整理与管理系统API",
    version=settings.APP_VERSION,
)


@app.on_event("startup")
async def startup_event():
    """启动时初始化"""
    logger.info("应用启动中...")

    # 自动创建数据库表（首次启动）
    # 多进程环境下需先检查表是否已存在，避免并发创建冲突
    from sqlalchemy import inspect
    inspector = inspect(engine)
    try:
        if not inspector.has_table("users"):
            Base.metadata.create_all(bind=engine)
            logger.info("数据库表创建完成")
        else:
            logger.info("数据库表已存在，跳过创建")
    except Exception as e:
        logger.warning(f"数据库表创建时发生竞态冲突（可忽略）: {e}")
        logger.info("数据库表已由另一进程创建")

    # 创建默认管理员用户
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == settings.ADMIN_USERNAME).first()
        if not admin:
            admin_user = User(
                username=settings.ADMIN_USERNAME,
                email=settings.ADMIN_EMAIL,
                password_hash=get_password_hash(settings.ADMIN_PASSWORD),
                is_active=True,
            )
            db.add(admin_user)
            db.commit()
            logger.info(f"管理员用户创建成功: {settings.ADMIN_USERNAME}")
        else:
            logger.info("管理员用户已存在，跳过创建")
    except Exception as e:
        db.rollback()
        logger.error(f"创建管理员用户失败: {e}")
    finally:
        db.close()

    # 启动后台任务调度器
    scheduler = TaskScheduler.get_instance(poll_interval=2.0)
    asyncio.create_task(scheduler.start())
    logger.info("后台任务调度器已启动")


@app.on_event("shutdown")
async def shutdown_event():
    """关闭时清理"""
    logger.info("应用关闭中...")
    scheduler = TaskScheduler.get_instance()
    await scheduler.stop()

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局异常处理器 - 捕获请求验证错误
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"请求验证错误: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )

# 本地上传目录
upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "uploads", "images")
os.makedirs(upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

# 注册路由
app.include_router(router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "SparkNoteAI API"}
