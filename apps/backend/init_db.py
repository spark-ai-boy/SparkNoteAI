# 数据库初始化脚本

import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine, Base, SessionLocal
from app.models.user import User
from app.models.task import Task
from app.models.note import Note, Tag, NoteTag
from app.models.integration import Integration, FeatureSetting, UserPreference
from app.models.image_cache import ImageCache
from app.models.knowledge_graph import GraphNode, GraphEdge
from app.utils.auth import get_password_hash


def init_database():
    """初始化数据库表结构"""
    print("创建数据库表...")
    Base.metadata.create_all(bind=engine)
    print("数据库表创建完成！")


def create_admin_user():
    """创建默认管理员用户"""
    db = SessionLocal()
    try:
        # 检查是否已存在 admin 用户
        admin = db.query(User).filter(User.username == "admin").first()
        if admin:
            print("管理员用户已存在，跳过创建")
            return

        # 创建 admin 用户
        hashed_password = get_password_hash("admin123")
        admin_user = User(
            username="admin",
            email="admin@example.com",
            password_hash=hashed_password,
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        print("管理员用户创建成功！")
        print("用户名: admin")
        print("密码: admin123")
    except Exception as e:
        db.rollback()
        print(f"创建管理员用户失败: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 50)
    print("SparkNoteAI 数据库初始化")
    print("=" * 50)

    init_database()
    create_admin_user()

    print("=" * 50)
    print("初始化完成！")
    print("=" * 50)
