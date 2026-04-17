# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

SparkNoteAI 是一个知识整理与管理系统，支持笔记管理、碎片化内容采集（微信公众号、小红书、B 站、YouTube）、大模型智能总结、知识图谱可视化、思维导图和智能搜索。

## 技术架构

```
SparkNode/
├── apps/
│   ├── backend/          # FastAPI (Python 3.11)
│   └── frontend/         # React Native + Expo (TypeScript)，支持 Web/桌面端
├── packages/
│   └── shared/           # 共享类型和常量 (TypeScript)
├── docker/
│   ├── docker-compose.dev.yml   # 开发环境: DB + Redis + Neo4j（仅基础设施）
│   └── docker-compose.prod.yml  # 生产环境: 前端 + 后端 + 完整基础设施
└── scripts/
    └── build.sh          # Docker 构建/推送/部署脚本
```

### 后端 (apps/backend)
- **框架**: FastAPI + Uvicorn
- **数据库**: PostgreSQL (SQLAlchemy ORM)
- **缓存**: Redis
- **知识图谱**: Neo4j
- **认证**: OAuth2 + JWT (python-jose)
- **密码加密**: bcrypt
- **任务调度**: Redis-backed 后台任务队列

### 前端 (apps/frontend)
- **框架**: React Native (Expo SDK 55)，支持 Web、iOS、Android、Electron 桌面
- **导航**: React Navigation v7
- **状态管理**: Zustand
- **HTTP**: Axios（自动处理 token 拦截）
- **语言**: TypeScript
- **图标**: lucide-react-native（统一通过 `src/components/icons/` 导入）
- **Markdown 编辑器**: md-editor-rt（Web 端）

### 共享包 (packages/shared)
- 共享类型定义 (`src/types.ts`)
- 共享常量 (`src/constants.ts`)
- 输出：`dist/index.js` + `dist/index.d.ts`

## 开发工作流

### 安装依赖

```bash
npm run install:all   # 安装所有依赖（含 shared 包编译）
```

### 开发环境

**基础设施**（Docker 运行）：

```bash
npm run docker:dev:up       # 启动 DB + Redis + Neo4j
npm run docker:dev:logs     # 查看基础设施日志
npm run docker:dev:down     # 停止基础设施
```

**后端**（本地运行）：

```bash
cd apps/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# 或直接
npm run dev:backend   # uvicorn --reload
```

后端 `config.py` 有完整的默认值（`localhost` + `sparknoteai123`），无需额外配置即可连接 Docker 基础设施。启动时自动创建数据库表和默认 admin 用户（`admin/admin123`）。

**前端**（本地运行）：

```bash
npm run dev:frontend  # Expo Metro（支持 Web/iOS/Android）
```

**Electron 桌面端**：

```bash
npm run electron:dev  # 启动 Expo Metro + Electron
npm run electron:build:mac   # 构建 macOS 应用
npm run electron:build:dir   # 仅构建目录（用于调试）
```

### 常用命令

```bash
# 开发
npm run dev:backend      # 仅后端（热重载）
npm run dev:frontend     # 仅前端（Expo）

# 基础设施
npm run docker:dev:up        # 启动 DB + Redis + Neo4j
npm run docker:dev:down      # 停止基础设施
npm run docker:dev:logs      # 查看基础设施日志

# 生产 Docker
npm run docker:prod:up       # 启动完整生产栈
npm run docker:prod:down     # 停止生产栈
npm run docker:prod:logs     # 查看生产日志

# 构建
npm run build:frontend   # 前端 Web 导出
npm run docker:build     # 构建 Docker 镜像（带版本标签）
npm run docker:push      # 推送镜像到 Docker Hub
npm run docker:deploy    # 构建 + 推送 + 部署

# 测试 / 检查
npm run test:backend     # 后端测试 (pytest)
npm run lint             # TypeScript 检查 (tsc --noEmit)

# 依赖
npm run install:all      # 安装所有依赖（含 shared 包编译）
```

## 服务地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 后端 API | http://localhost:8000 | FastAPI |
| Swagger UI | http://localhost:8000/docs | |
| ReDoc | http://localhost:8000/redoc | |
| Expo Metro | http://localhost:19000 | |
| Neo4j Browser | http://localhost:7474 | 开发环境 |

## 后端结构

```
apps/backend/
├── main.py               # FastAPI 应用入口（启动时自动建表 + 创建 admin + 启动任务调度器）
├── app/
│   ├── core/
│   │   ├── config.py     # Pydantic settings（环境变量配置，含完整默认值）
│   │   ├── database.py   # SQLAlchemy engine + SessionLocal
│   │   └── logger.py     # 统一日志配置
│   ├── api/
│   │   ├── __init__.py   # 路由注册
│   │   ├── auth.py       # 认证路由（登录/注册/me）
│   │   ├── note.py       # 笔记管理（CRUD + 导出）
│   │   ├── knowledge_graph.py
│   │   ├── ai_assistant.py
│   │   ├── tasks.py      # 导入任务
│   │   ├── integrations.py      # 集成配置管理（LLM + 图床）
│   │   ├── feature_settings.py  # 场景配置管理
│   │   ├── preferences.py       # 用户偏好设置
│   │   ├── system.py            # 系统状态（健康检查、版本）
│   │   └── user_session.py
│   ├── models/           # SQLAlchemy 模型
│   │   ├── user.py
│   │   ├── user_session.py
│   │   ├── task.py       # 含 TaskStatus, TaskType 枚举
│   │   ├── note.py       # Note, Tag, NoteTag
│   │   ├── integration.py      # Integration, FeatureSetting, UserPreference
│   │   ├── knowledge_graph.py  # GraphNode, GraphEdge
│   │   └── image_cache.py
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # 业务逻辑层
│   │   ├── task_scheduler.py    # 后台任务调度器
│   │   ├── task_runner.py       # 任务执行器
│   │   ├── llm/          # 多 LLM 提供商（OpenAI/Anthropic/Azure/阿里云）
│   │   ├── importers/    # 多平台导入器（微信/小红书/B站/YouTube）
│   │   ├── image_storage/       # 图片存储（本地/兰空图床）
│   │   └── feature_config/      # 场景配置管理
│   └── utils/            # 工具函数（含 auth.py）
├── tests/                # 单元测试
├── Dockerfile            # 生产环境 Docker 镜像
└── requirements.txt      # Python 依赖
```

**认证流程**:
- POST `/api/auth/register` - 用户注册
- POST `/api/auth/login` - OAuth2PasswordRequestForm, 返回 JWT token
- GET `/api/auth/me` - 获取当前用户 (需 Bearer token)

**默认测试账号**: `admin` / `admin123`（后端启动时自动创建）

**配置系统**:
- `Integration` 模型统一管理第三方集成（LLM 提供商、图床等）
- `FeatureSetting` 管理各场景的功能配置（如知识图谱使用哪个 LLM）
- `UserPreference` 存储用户偏好设置
- 配置通过 `/api/integrations` 和 `/api/feature-settings` 路由管理

## 前端结构

```
apps/frontend/
├── src/
│   ├── api/              # Axios 客户端 + API 模块
│   │   ├── client.ts     # Axios 实例（自动处理 token 拦截，Web 用 localStorage/原生用 SecureStore）
│   │   ├── config.ts     # API 配置
│   │   ├── note.ts       # 笔记 API
│   │   ├── llmConfig.ts  # LLM 配置 API
│   │   ├── imageStorage.ts    # 图床配置 API
│   │   ├── featureConfig.ts   # 场景配置 API
│   │   ├── knowledgeGraph.ts  # 知识图谱 API
│   │   ├── importTask.ts      # 导入任务 API
│   │   ├── aiAssistant.ts     # AI 助手 API
│   │   ├── preferences.ts     # 用户偏好 API
│   │   └── auth.ts       # 认证 API
│   ├── components/       # UI 组件
│   │   ├── common/       # 通用基础组件
│   │   ├── layout/       # 布局组件（含 LLMConfigManager, ImageStorageConfigManager 等）
│   │   └── icons/        # 图标统一入口（lucide-react-native）
│   ├── navigation/       # React Navigation 配置
│   ├── screens/
│   │   ├── auth/         # 登录/注册
│   │   └── main/         # 主功能页面
│   ├── stores/           # Zustand stores
│   │   ├── authStore.ts          # 认证状态
│   │   ├── noteStore.ts          # 笔记状态
│   │   ├── llmConfigStore.ts     # LLM 配置
│   │   ├── imageStorageStore.ts  # 图床配置
│   │   ├── featureConfigStore.ts # 场景配置
│   │   ├── knowledgeGraphStore.ts # 知识图谱
│   │   ├── importTaskStore.ts    # 导入任务
│   │   ├── interfaceSettingsStore.ts # 界面设置
│   │   ├── serverConfigStore.ts  # 服务器配置
│   │   └── toastStore.ts         # Toast 通知
│   ├── theme/            # 主题配置
│   └── types/            # TypeScript 类型
├── App.tsx
├── app.json
└── electron/             # Electron 桌面端
    └── main.js           # Electron 主进程
```

**底部导航**: 笔记 | 碎片 | 图谱 | 导图 | 任务 | 设置

**前端存储**：Web 端使用 localStorage，原生端使用 expo-secure-store，通过 `client.ts` 中的统一 storage 接口抽象。

## 环境变量 (后端)

**开发环境**：后端本地运行，使用 `config.py` 中的默认值（`localhost` + `sparknoteai123`），无需额外配置。

**生产环境**：通过 `docker/.env.production` 配置，由 docker-compose 注入容器。

统一变量格式（`docker/.env.example` 为模板）：

| 变量名 | 说明 | 必填（生产） |
|--------|------|-------------|
| `POSTGRES_USER` | 数据库用户名 | 否 |
| `POSTGRES_PASSWORD` | 数据库密码 | 是 |
| `POSTGRES_DB` | 数据库名 | 否 |
| `REDIS_PASSWORD` | Redis 密码 | 是 |
| `NEO4J_PASSWORD` | Neo4j 密码 | 是 |
| `SECRET_KEY` | JWT 密钥 | 是 |
| `ENCRYPTION_KEY` | 加密密钥 | 是 |
| `CORS_ORIGINS` | 允许的前端域名 | 是 |
| `ADMIN_USERNAME` | 管理员用户名 | 否 |
| `ADMIN_PASSWORD` | 管理员密码 | 是 |

## Docker 部署

### 开发环境

仅运行基础设施（DB + Redis + Neo4j），后端本地运行。

### 生产环境

使用 Docker Hub 镜像部署，构建与部署分离：

```bash
# 构建并推送镜像（本地或 CI）
npm run docker:deploy 1.1.0

# 生产服务器启动
./docker/deploy.sh start
```

生产 compose 使用 `image: sparknoteai/backend:${APP_VERSION}` 和 `image: sparknoteai/frontend:${APP_VERSION}`，不再从源码构建。

Nginx 反向代理部署在宿主机上，代理到 `127.0.0.1:80`（前端）和 `127.0.0.1:8000`（后端）。

## API 规范

- 基础路径: `/api`
- 认证使用 OAuth2 Bearer token
- 分页响应包含 `items`, `total`, `page`, `size`, `pages` 字段

## 图标规范

**所有图标必须使用 `lucide-react-native`**，禁止直接使用其他图标库。图标统一从 `src/components/icons/index.tsx` 导入。

```tsx
import { SparklesIcon, SettingsIcon } from '@/components/icons';
<SparklesIcon size={24} color={colors.primary} />
```

## 开发规范

### Git 提交

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <subject>

feat(frontend): 添加笔记编辑器组件
fix(backend): 修复用户登录时密码校验失败问题
refactor(api): 重构导入任务接口
```

Type: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`
Scope: `frontend`, `backend`, `shared`, `api`, `ui`, `db`, `auth`

### 命名规范

| 类型 | 前端 (TypeScript) | 后端 (Python) |
|------|-------------------|---------------|
| 变量/函数 | camelCase | snake_case |
| 类/接口 | PascalCase | PascalCase |
| 常量 | UPPER_SNAKE_CASE | UPPER_SNAKE_CASE |
| 文件 | kebab-case | snake_case |

### 代码风格

- 前端：使用 `React.FC` 定义组件，`StyleSheet.create` 创建样式，优先使用主题色
- 后端：SQLAlchemy 2.0 `select()` 语法，Pydantic v2，复杂查询封装到 Service 层
- 错误处理：前端 try-catch + Toast/Alert；后端 HTTPException + 全局异常处理器
