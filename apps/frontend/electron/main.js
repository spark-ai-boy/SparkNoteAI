// Electron 主进程
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// 开发环境检测：NODE_ENV 为 development 或者从命令行参数判断
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// 后端 API 地址
const API_BASE_URL = 'http://localhost:8000';

let mainWindow = null;

function createWindow() {
  // 检查生产环境的构建文件是否存在
  const wwwPath = path.join(__dirname, '..', 'dist', 'index.html');
  const hasBuildFiles = fs.existsSync(wwwPath);

  console.log('[Electron] isDev:', isDev);
  console.log('[Electron] app.isPackaged:', app.isPackaged);
  console.log('[Electron] wwwPath:', wwwPath);
  console.log('[Electron] hasBuildFiles:', hasBuildFiles);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    minWidth: 1400,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDev, // 开发环境禁用 webSecurity 以便调试
    },
    titleBarStyle: 'hiddenInset', // macOS 风格标题栏
    trafficLightPosition: { x: 16, y: 6 },
    backgroundColor: '#f5f5f5',
  });

  // 注入 CSS 以支持窗口拖拽和避免内容被红绿灯按钮遮挡
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      /* 顶部可拖拽区域 - 覆盖整个顶部区域（左侧红绿灯区域除外）*/
      .window-drag-region {
        position: fixed;
        top: 0;
        left: 70px;
        right: 0;
        height: 40px;
        -webkit-app-region: drag;
        z-index: 10000;
        pointer-events: none;
      }
    `);
  });

  // 注入 HTML 元素以支持拖拽
  mainWindow.webContents.on('dom-ready', () => {
    mainWindow.webContents.executeJavaScript(`
      (function() {
        if (document.querySelector('.window-drag-region')) return;
        const dragRegion = document.createElement('div');
        dragRegion.className = 'window-drag-region';
        dragRegion.setAttribute('aria-hidden', 'true');
        document.body.insertBefore(dragRegion, document.body.firstChild);
      })();
    `);
  });

  // 开发环境加载 Expo 服务器，生产环境加载构建文件
  if (isDev) {
    console.log('[Electron] 开发模式：加载 Expo 服务器 http://localhost:8081');
    mainWindow.loadURL('http://localhost:8081');
    mainWindow.webContents.openDevTools();
  } else if (hasBuildFiles) {
    console.log('[Electron] 生产模式：加载构建文件', wwwPath);
    mainWindow.loadFile(wwwPath);
  } else {
    console.log('[Electron] 生产模式但构建文件不存在');
    // 如果没有构建文件，显示错误页面
    mainWindow.loadURL('about:blank');
    mainWindow.webContents.executeJavaScript(`
      document.body.innerHTML = \`
        <div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;text-align:center;">
          <div>
            <h1>⚠️ 构建文件不存在</h1>
            <p>请先运行：<code>npm run build:frontend</code></p>
            <p style="color:#666;font-size:14px;margin-top:10px;">或者开发模式下运行：<code>npm run electron:dev</code></p>
          </div>
        \`;
    `);
  }

  // 创建菜单栏
  const template = [
    {
      label: 'SparkNoteAI',
      submenu: [
        {
          label: '关于 SparkNoteAI',
          click: () => {
            const version = app.getVersion();
            app.showAboutPanel();
          }
        },
        { type: 'separator' },
        {
          label: '退出 SparkNoteAI',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '刷新' },
        { role: 'toggleDevTools', label: '切换开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '切换全屏' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '缩放' },
        { type: 'separator' },
        { role: 'front', label: '前置' },
        { type: 'separator' },
        { role: 'window', label: '窗口' },
      ],
    },
    {
      role: 'help',
      label: '帮助',
      submenu: [
        {
          label: '查看文档',
          click: () => {
            shell.openExternal('https://github.com/sparknoteai');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 处理外部链接（在默认浏览器中打开）
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // 阻止导航到外部链接
  mainWindow.webContents.on('will-navigate', (event, navigationContext) => {
    if (!navigationContext.url || typeof navigationContext.url !== 'string') return;
    if (!navigationContext.url.startsWith('http://') &&
        !navigationContext.url.startsWith('https://') &&
        !navigationContext.url.startsWith('file://')) {
      return;
    }

    try {
      const parsedUrl = new URL(navigationContext.url);
      const allowedOrigins = ['http://localhost:8081', 'file://'];

      if (!allowedOrigins.some(origin => parsedUrl.href.startsWith(origin))) {
        event.preventDefault();
        shell.openExternal(navigationContext.url);
      }
    } catch (error) {
      console.error('解析 URL 失败:', error);
    }
  });
}

// 等待 app 准备好
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 阻止导航到外部链接
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationContext) => {
    if (!navigationContext.url || typeof navigationContext.url !== 'string') return;
    if (!navigationContext.url.startsWith('http://') &&
        !navigationContext.url.startsWith('https://') &&
        !navigationContext.url.startsWith('file://')) {
      return;
    }

    try {
      const parsedUrl = new URL(navigationContext.url);
      const allowedOrigins = ['http://localhost:8081', 'file://'];

      if (!allowedOrigins.some(origin => parsedUrl.href.startsWith(origin))) {
        event.preventDefault();
        shell.openExternal(navigationContext.url);
      }
    } catch (error) {
      console.error('解析 URL 失败:', error);
      // URL 无效时不做处理
    }
  });
});

// 应用退出前清理
app.on('will-quit', () => {
  mainWindow = null;
});
