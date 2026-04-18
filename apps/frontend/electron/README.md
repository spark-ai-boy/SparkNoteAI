# SparkNoteAI macOS 应用打包指南

本文档介绍如何将 SparkNoteAI 前端项目打包为 macOS 桌面应用。

## 前提条件

1. **Node.js**: 确保已安装 Node.js 18+ 
   ```bash
   node --version  # 建议 v18 或更高
   ```

2. **安装依赖**
   ```bash
   # 在项目根目录执行
   npm install
   ```

## 方法一：使用 Electron（推荐）

### 开发模式

在开发模式下运行 Electron 应用（需要同时启动后端）：

```bash
# 终端 1: 启动后端
npm run dev:backend

# 终端 2: 启动 Electron（会自动启动前端 Web 服务器）
npm run electron:dev
```

### 生产环境打包

打包为 macOS 应用（.dmg 和.zip）：

```bash
# macOS 打包（需要先构建 Web 版本）
npm run electron:build:mac

# Windows 打包
npm run electron:build:win

# 或者只打包目录（用于测试）
npm run electron:build:dir
```

打包完成后，应用会在 `release/` 目录下：
- `release/SparkNoteAI-1.0.0.dmg` - 安装文件
- `release/SparkNoteAI-1.0.0-mac.zip` - 压缩包
- `release/mac/SparkNoteAI.app` - 应用程序包

### 注意事项

1. **后端 API**: Electron 应用需要连接后端 API。生产环境需要：
   - 将后端 API 地址配置为实际服务器地址
   - 或者在 Electron 中集成后端服务

2. **代码签名**: 如果要分发给他人，需要进行代码签名：
   ```bash
   # 获取开发者证书名称
   security find-identity -v -p codesigning
   
   # 在 package.json 的 build.mac 中添加:
   "identity": "Your Developer ID Application Name"
   ```

3. **公证**: 在 macOS Catalina 及以上系统分发需要公证：
   ```bash
   # 在 package.json 的 build.mac 中添加:
   "notarize": true
   ```

## 方法二：使用 react-native-macos

如果需要原生 macOS 体验（非 Web 包装）：

### 1. 安装 react-native-macos

```bash
cd apps/frontend
npx expo install react-native-macos
```

### 2. 初始化 macOS 项目

```bash
npx react-native-macos-init
```

### 3. 运行 macOS 应用

```bash
npx react-native run-macos
```

**注意**: 此方法需要大量修改代码，因为 Expo 不直接支持 react-native-macos。

## 方法三：使用 Native Wind + Tauri

使用 Tauri（基于 Rust）包装 Web 应用，更小的包体积：

### 1. 安装 Tauri

```bash
cd apps/frontend
npm install @tauri-apps/cli @tauri-apps/api
```

### 2. 初始化 Tauri

```bash
npx tauri init
```

### 3. 构建

```bash
npx tauri build
```

## 推荐的 Electron 配置调整

### 配置后端 API 地址

Electron 桌面端首次启动时默认连接 `http://localhost:8000`。用户可以在设置页面的"服务器信息"中修改服务器地址。

### 添加自动更新

在 `apps/frontend/electron/main.js` 中添加：

```javascript
const { autoUpdater } = require('electron-updater');

// 检查更新
app.whenReady().then(() => {
  autoUpdater.checkForUpdatesAndNotify();
});
```

## 常见问题

### Q: 打包后应用无法连接后端 API
**A**: 确保后端 API 地址正确，并且允许跨域请求。

### Q: 应用打开后显示空白
**A**: 检查 Web 构建是否成功，查看 `apps/frontend/dist` 目录是否存在。

### Q: macOS 提示"无法打开，因为开发者无法验证"
**A**: 右键点击应用，选择"打开"，然后确认。或进行代码签名和公证。

### Q: 如何修改应用图标？
**A**: 将 `apps/frontend/build/icon.icns` 替换为你的图标文件（需要 1024x1024 PNG 转换）。

## 快速开始（最简单的方式）

```bash
# 1. 安装依赖
npm install

# 2. 开发模式测试
npm run electron:dev

# 3. 打包为桌面应用
npm run electron:build:mac

# 4. 在 release/ 目录找到打包好的应用
open release/SparkNoteAI-1.0.0.dmg
```
