# 代码风格规范

## 通用规范

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 变量/函数 | camelCase | `getUserById`, `isLoading` |
| 类/接口 | PascalCase | `UserService`, `NoteProps` |
| 常量 | UPPER_SNAKE_CASE | `API_BASE_URL`, `MAX_RETRY` |
| 文件/目录 | kebab-case | `user-service.ts`, `note-card.tsx` |
| 私有属性 | _前缀 | `_privateMethod`, `_internalState` |

### Python 特有规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 函数/变量 | snake_case | `get_user_by_id`, `is_loading` |
| 类 | PascalCase | `UserService`, `DatabaseManager` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| 模块 | 小写 | `auth.py`, `database.py` |
| 私有方法 | _前缀 | `_validate_input` |

## 导入规范

### TypeScript/React

```tsx
// 1. React 导入
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 2. 第三方库
import { useNavigation } from '@react-navigation/native';
import { create } from 'zustand';

// 3. 绝对路径项目导入
import { colors } from '@/theme';
import { Button } from '@/components/common';

// 4. 相对路径导入
import { LocalComponent } from './LocalComponent';
```

### Python

```python
# 1. 标准库
import json
from datetime import datetime
from typing import Optional

# 2. 第三方库
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# 3. 项目内部导入
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
```

## 注释规范

### 文件头注释

```tsx
/**
 * 组件名称
 * @description 简要描述组件用途
 */
```

### Python 文档字符串

```python
def get_user_by_id(db: Session, user_id: int) -> User | None:
    """
    根据 ID 获取用户

    Args:
        db: 数据库会话
        user_id: 用户 ID

    Returns:
        用户对象，不存在则返回 None
    """
```

## 代码组织

### 组件文件结构

```tsx
// 1. 导入
import React from 'react';

// 2. 类型定义
interface Props { }

// 3. 组件定义
export const Component: React.FC<Props> = () => {
  // 3.1 hooks
  // 3.2 状态
  // 3.3 副作用
  // 3.4 事件处理
  // 3.5 渲染
};

// 4. 样式
const styles = StyleSheet.create({ });

// 5. 默认导出
export default Component;
```

## Git 提交规范

### Commit Message 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档
- `style`: 代码格式（不影响代码运行）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试
- `chore`: 构建/工具改动

### Scope 范围

- `frontend`: 前端
- `backend`: 后端
- `shared`: 共享包
- `api`: API 接口
- `ui`: UI 组件
- `db`: 数据库
- `auth`: 认证

### 示例

```
feat(frontend): 添加笔记编辑器组件

- 支持 Markdown 预览
- 添加实时保存功能

Closes #123
```

```
fix(backend): 修复用户登录时密码校验失败问题

使用 bcrypt 替代 passlib 的默认实现
```

```
refactor(api): 重构导入任务接口

提取公共逻辑到 service 层
```
