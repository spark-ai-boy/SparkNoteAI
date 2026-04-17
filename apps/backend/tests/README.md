# 后端 API 测试

使用 pytest + SQLite 内存数据库进行单元测试。

## 运行测试

```bash
cd apps/backend
source .venv/bin/activate

# 运行所有测试
python -m pytest tests/ -v

# 运行特定模块
python -m pytest tests/test_auth.py -v
python -m pytest tests/test_notes.py -v
python -m pytest tests/test_integrations.py -v

# 运行特定测试类
python -m pytest tests/test_auth.py::TestAuthRegister -v

# 运行特定测试方法
python -m pytest tests/test_auth.py::TestAuthRegister::test_register_success -v

# 生成测试报告
python -m pytest tests/ -v --tb=short

# 生成覆盖率报告
python -m pytest tests/ --cov=app/api --cov-report=term-missing
```

## 测试文件结构

```
tests/
├── __init__.py
├── conftest.py              # 测试 fixtures 和配置
├── test_auth.py             # 认证 API 测试
├── test_notes.py            # 笔记 API 测试
├── test_integrations.py     # 集成配置 API 测试
├── test_feature_settings.py # 场景配置 API 测试
├── test_preferences.py      # 用户偏好 API 测试
├── test_tasks.py            # 任务系统 API 测试
├── test_knowledge_graph.py  # 知识图谱 API 测试
└── test_ai_assistant.py     # AI 助手 API 测试
```

## 测试覆盖率

截至 2026-04-08，API 模块测试覆盖率：

| 模块 | 语句数 | 未覆盖 | 覆盖率 |
|------|--------|--------|--------|
| `api/__init__.py` | 18 | 0 | 100% |
| `api/feature_settings.py` | 54 | 0 | 100% |
| `api/preferences.py` | 25 | 0 | 100% |
| `api/ai_assistant.py` | 78 | 6 | 92% |
| `api/auth.py` | 71 | 6 | 92% |
| `api/integrations.py` | 81 | 6 | 93% |
| `api/knowledge_graph.py` | 64 | 12 | 81% |
| `api/note.py` | 180 | 29 | 84% |
| `api/tasks.py` | 76 | 24 | 68% |
| **总计** | **647** | **83** | **87%** |

## 测试覆盖

### 认证 API (`test_auth.py`)

- `TestAuthRegister`: 用户注册
  - 成功注册
  - 重复用户名
  - 重复邮箱
  - 密码太短
  - 无效邮箱格式

- `TestAuthLogin`: 用户登录
  - 成功登录
  - 密码错误
  - 用户不存在

- `TestAuthMe`: 用户信息
  - 获取用户信息
  - 未授权访问
  - 更新用户信息
  - 更新为重复邮箱

- `TestAuthPassword`: 密码修改
  - 成功修改
  - 旧密码错误
  - 新密码太短

### 笔记 API (`test_notes.py`)

- `TestNoteCRUD`: 笔记 CRUD
  - 创建笔记
  - 获取笔记列表（分页）
  - 获取笔记详情
  - 更新笔记
  - 删除笔记
  - 访问其他用户笔记

- `TestNoteTags`: 标签管理
  - 创建标签
  - 获取标签列表
  - 删除标签
  - 笔记关联标签

- `TestNoteUnauthorized`: 未授权访问

### 集成配置 API (`test_integrations.py`)

- `TestIntegrationProviders`: 提供商管理
  - 获取所有提供商
  - 按类型过滤
  - 获取提供商 Schema

- `TestIntegrationCRUD`: 集成配置 CRUD
  - 创建 LLM/存储配置
  - 重复 config_key
  - 获取列表/详情
  - 更新配置
  - 删除配置

- `TestIntegrationSetDefault`: 设置默认配置
  - 设置默认配置
  - 设置其他用户配置（失败）

- `TestIntegrationTestEndpoint`: 测试集成配置
  - 测试集成配置
  - 测试不存在的配置
  - 测试其他用户配置

- `TestIntegrationUnauthorized`: 未授权访问

### 场景配置 API (`test_feature_settings.py`)

- `TestFeatureDefinitions`: 功能定义
  - 获取所有功能定义
  - 获取功能 Schema

- `TestFeatureSetting`: 场景配置
  - 获取配置
  - 更新配置
  - 重置配置
  - 使用默认配置

- `TestFeatureRuntimeConfig`: 运行时配置
  - 获取合并后的配置
  - 包含集成配置

- `TestFeatureSettingUnauthorized`: 未授权访问

### 用户偏好 API (`test_preferences.py`)

- `TestPreferenceGet`: 获取偏好
- `TestPreferenceUpdate`: 更新偏好
- `TestPreferenceDefaults`: 获取默认集成
- `TestPreferenceThemes`: 主题设置
- `TestPreferenceLanguages`: 语言设置
- `TestPreferenceFontSizes`: 字体大小
- `TestPreferenceUnauthorized`: 未授权访问

### 任务系统 API (`test_tasks.py`)

- `TestTaskGet`: 获取任务
  - 获取任务列表
  - 分页查询
  - 按状态过滤
  - 按类型过滤
  - 获取任务详情
  - 获取不存在的任务
  - 获取其他用户任务

- `TestTaskCancel`: 取消任务
  - 取消待处理任务
  - 取消运行中任务
  - 取消已完成任务（失败）
  - 取消不存在的任务

- `TestTaskTypes`: 任务类型
  - 获取所有任务类型

- `TestTaskUnauthorized`: 未授权访问

### 知识图谱 API (`test_knowledge_graph.py`)

- `TestKnowledgeGraphStatus`: 图谱状态
- `TestKnowledgeGraphData`: 图谱数据
- `TestKnowledgeGraphClear`: 清空图谱
- `TestKnowledgeGraphNodes`: 节点操作
- `TestKnowledgeGraphEdges`: 边操作
- `TestKnowledgeGraphUnauthorized`: 未授权访问

### AI 助手 API (`test_ai_assistant.py`)

- `TestAIAssistantConfig`: AI 助手配置
  - 获取配置
  - 没有 LLM 配置时
  - 禁用的 AI 助手

- `TestAIAssistantChat`: AI 聊天
  - 流式聊天
  - 非流式聊天
  - 自定义系统提示词
  - 功能禁用时
  - 没有配置 LLM 时
  - LLM 配置无效模型

- `TestAIAssistantMultiTurn`: 多轮对话
  - 多轮对话

- `TestAIAssistantUnauthorized`: 未授权访问

## Fixtures

### conftest.py 提供的 fixtures

- `engine`: SQLAlchemy 引擎（session 级别）
- `db_session`: 数据库会话（function 级别，自动回滚）
- `client`: FastAPI 测试客户端
- `test_user`: 测试用户
- `auth_headers`: 认证头（包含 JWT token）

### 模块级 fixtures

各测试模块提供的 fixtures：

- `sample_notes`: 测试笔记列表
- `sample_tags`: 测试标签列表
- `sample_llm_integration`: 测试 LLM 配置
- `sample_storage_integration`: 测试存储配置
- `sample_feature_setting`: 测试场景配置
- `sample_preference`: 测试用户偏好
- `sample_llm_for_ai`: AI 助手用 LLM 配置
- `sample_ai_assistant_setting`: AI 助手场景配置

## 测试数据库

使用 SQLite 内存数据库 (`:memory:`)，特点：

1. 每个测试 session 创建新的数据库
2. 每个测试 function 在事务中运行，自动回滚
3. 测试之间完全隔离，不会互相影响
4. 速度快，无需配置外部数据库

## 添加新测试

参考现有测试模式：

```python
# tests/test_new_feature.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


class TestNewFeature:
    """测试新功能"""

    def test_something(self, client: TestClient, auth_headers: dict):
        """测试某个功能"""
        response = client.get(
            "/api/new-feature",
            headers=auth_headers
        )
        assert response.status_code == 200
```
