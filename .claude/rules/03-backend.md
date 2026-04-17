# 后端开发规范

## 技术栈

- FastAPI + Uvicorn
- SQLAlchemy 2.0+ (ORM)
- PostgreSQL 数据库
- Redis 缓存
- Pydantic v2 数据验证

## 项目结构

```
app/
├── main.py              # FastAPI 应用入口
├── core/
│   ├── config.py        # Pydantic Settings 配置
│   └── database.py      # SQLAlchemy 引擎与会话
├── api/
│   ├── __init__.py      # 路由注册
│   └── [module].py      # API 路由模块
├── models/
│   └── [model].py       # SQLAlchemy 模型
├── schemas/
│   └── [schema].py      # Pydantic Schema
├── services/
│   └── [service].py     # 业务逻辑层
└── utils/
    └── [util].py        # 工具函数
```

## API 路由规范

### 路由注册

```python
# app/api/__init__.py
from fastapi import APIRouter
from . import auth, notes

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router, prefix="/auth", tags=["认证"])
api_router.include_router(notes.router, prefix="/notes", tags=["笔记"])
```

### 路由定义

```python
# app/api/notes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..schemas.note import NoteCreate, NoteResponse
from ..services.note import create_note

router = APIRouter()

@router.post("/", response_model=NoteResponse)
def create_note_endpoint(
    data: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_note(db, data, current_user.id)
```

## 模型定义

```python
# app/models/note.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..core.database import Base

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notes")
```

## Schema 定义

```python
# app/schemas/note.py
from pydantic import BaseModel, Field
from datetime import datetime

class NoteBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str | None = None

class NoteCreate(NoteBase):
    pass

class NoteResponse(NoteBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
```

## 依赖注入

- 使用 FastAPI 的 `Depends` 进行依赖注入
- 数据库会话通过 `get_db` 注入
- 当前用户通过 `get_current_user` 注入

## 错误处理

- 使用 `HTTPException` 抛出 HTTP 错误
- 业务错误使用自定义异常类
- 全局异常处理器统一返回标准错误格式

```python
from fastapi import HTTPException

raise HTTPException(status_code=404, detail="资源不存在")
```

## 数据库操作

- 使用 SQLAlchemy 2.0 风格（`select()` 语法）
- 复杂查询封装到 Service 层
- 使用事务保证数据一致性

```python
from sqlalchemy import select
from sqlalchemy.orm import Session

def get_note_by_id(db: Session, note_id: int) -> Note | None:
    stmt = select(Note).where(Note.id == note_id)
    return db.execute(stmt).scalar_one_or_none()
```

## 环境配置

- 使用 `pydantic-settings` 管理配置
- 敏感信息通过环境变量传入
- `.env` 文件仅用于本地开发

```python
# app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    redis_url: str
    secret_key: str
    debug: bool = False

    class Config:
        env_file = ".env"
```

## API 响应规范

- 成功响应直接返回数据对象
- 列表响应使用分页格式：

```json
{
  "items": [],
  "total": 100,
  "page": 1,
  "size": 20,
  "pages": 5
}
```

## 测试规范

- 使用 pytest 进行单元测试
- 测试文件存放于 `tests/` 目录
- 使用 `TestClient` 测试 API 端点
- 数据库测试使用独立测试数据库
