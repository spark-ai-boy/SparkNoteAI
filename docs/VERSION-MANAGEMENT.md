# 版本号管理指南

本文档说明 SparkNoteAI 项目的版本号管理方式。

---

## 版本号来源

### 单一事实源

项目版本号统一从 **Git Tag** 获取，格式为 `v1.2.0`。`version.sh set` 命令仅负责将版本号同步到 `package.json` 和 `app.json`（供构建工具读取），不再维护独立的 VERSION 文件。

```
Git Tag v1.2.0        # 单一事实来源
├── version.sh get → 读取并返回 1.2.0
├── build.sh        → 读取并用于 Docker 镜像标签
├── package.json    → 由 version.sh set 同步
└── app.json        → 由 version.sh set 同步
```

### 获取优先级

版本号按以下顺序获取：

1. **环境变量 `APP_VERSION`** - 最高优先级（CI/Docker 构建注入）
2. **Git Tag**（`git describe --tags --abbrev=0`）- 唯一事实来源
3. **开发版本** - `dev-{commit_hash}`（无 tag 时）

---

## 发布流程

### 1. 同步版本号到文件

```bash
# 将版本号同步到 package.json 和 app.json
./scripts/version.sh set 1.2.0
```

### 2. 提交变更

```bash
git add package.json apps/frontend/app.json
git commit -m "chore: 准备发布 v1.2.0"
```

### 3. 打 tag 并推送

```bash
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0
```

推送 tag 后会触发 CI 自动构建和部署（如已配置 CI/CD）。

### 一键发版

```bash
./scripts/version.sh set 1.2.0 && \
git add package.json apps/frontend/app.json && \
git commit -m "chore: 准备发布 v1.2.0" && \
git tag -a v1.2.0 -m "Release v1.2.0" && \
git push origin v1.2.0
```

---

## 常用命令

```bash
# 查看当前版本（来自最新 Git tag）
./scripts/version.sh get

# 查看完整版本信息
./scripts/version.sh info

# 同步版本到文件（package.json + app.json）
./scripts/version.sh set 1.2.0
```

---

## Docker 构建时的版本号

### 本地构建

```bash
# 自动从 Git tag 获取版本
npm run docker:build

# 手动指定
APP_VERSION=1.2.0 ./scripts/build.sh build 1.2.0
```

### CI/CD 构建

```yaml
# .github/workflows/release.yml
on:
  push:
    tags:
      - 'v*'

- name: Build Docker image
  run: |
    VERSION=${GITHUB_REF#refs/tags/v}
    docker build \
      --build-arg APP_VERSION=$VERSION \
      -t sparknoteai/backend:$VERSION .
```

---

## 前端版本号

前端通过以下优先级读取版本号：

1. `EXPO_PUBLIC_APP_VERSION` 环境变量（Docker 构建时注入）
2. `package.json.version`（本地开发，由 `version.sh set` 同步）
3. 默认值 `0.0.0`

---

## 版本兼容性

### 后端 API 兼容性

后端 `/api/system/info` 端点返回 `compatible_client_versions` 字段，指明兼容的客户端版本。

### 前端兼容性检查

```typescript
import { isVersionCompatible, APP_VERSION } from './utils/version';

const compatible = isVersionCompatible(
  APP_VERSION,
  serverInfo.compatible_client_versions
);
```

---

## 故障排查

### Q: 版本号不更新？

```bash
# 检查最新 tag
git describe --tags --abbrev=0

# 检查是否有未推送的 tag
git tag -l

# 推送 tag
git push origin v1.2.0
```

### Q: Docker 镜像版本不对？

确保构建时传入了正确的 `APP_VERSION`：

```bash
APP_VERSION=$(git describe --tags --abbrev=0 | sed 's/^v//') ./scripts/build.sh build
```

---

## 相关文件

| 文件 | 用途 |
|------|------|
| `Git Tag` | 统一版本号（单一事实源） |
| `scripts/version.sh` | 版本管理脚本 |
| `scripts/build.sh` | Docker 构建脚本（从 tag 读取版本） |
| `apps/backend/app/core/config.py` | 后端版本配置 |
| `apps/frontend/src/utils/version.ts` | 前端版本工具 |
| `apps/backend/Dockerfile` | 后端 Docker 版本注入 |
| `apps/frontend/Dockerfile` | 前端 Docker 版本注入 |

---

最后更新：2026-04-16
