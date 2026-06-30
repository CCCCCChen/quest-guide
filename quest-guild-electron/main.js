const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage } = require('electron');
const path = require('path');
const http = require('http');
const Store = require('electron-store');

// 初始化本地存储
const store = new Store({
  name: 'quest-guild-data',
  encryptionKey: 'quest-guild-2024'
});

let mainWindow = null;
let floatWindow = null;
let tray = null;
let isQuitting = false;
let floatResizeAnimation = null;

// 应用配置
const APP_CONFIG = {
  mainWidth: 1280,
  mainHeight: 800,
  floatWidth: 360,
  floatHeight: 72,
  floatExpandedHeight: 500,
  // 开发模式加载 Vite 地址，生产模式加载打包后的文件
  devUrl: 'http://localhost:5173',
  mainHtmlPath: path.join(__dirname, 'renderer/app/index.html'),
};

const isDev = !app.isPackaged;

if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
  app.commandLine.appendSwitch('ignore-certificate-errors');
}

// 创建主窗口
function createMainWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: APP_CONFIG.mainWidth,
    height: APP_CONFIG.mainHeight,
    minWidth: 1024,
    minHeight: 680,
    frame: true,
    backgroundColor: '#1a1a2e',
    title: '悬赏任务公会',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // 加载应用
  if (isDev) {
    mainWindow.loadURL(APP_CONFIG.devUrl);
  } else {
    mainWindow.loadFile(APP_CONFIG.mainHtmlPath);
  }

  // 窗口关闭事件 - 最小化到托盘而不是退出
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      showFloatWindow();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 页面加载完成后注入存储桥接
  mainWindow.webContents.on('did-finish-load', () => {
    syncDataToRenderer();
  });
}

// 创建悬浮窗
function createFloatWindow() {
  const savedPosition = store.get('floatWindowPosition');
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  const x = savedPosition ? savedPosition.x : width - APP_CONFIG.floatWidth - 20;
  const y = savedPosition ? savedPosition.y : height - APP_CONFIG.floatHeight - 80;

  floatWindow = new BrowserWindow({
    width: APP_CONFIG.floatWidth,
    height: APP_CONFIG.floatHeight,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: true,
    minWidth: APP_CONFIG.floatWidth,
    maxWidth: APP_CONFIG.floatWidth,
    minHeight: APP_CONFIG.floatHeight,
    maxHeight: APP_CONFIG.floatExpandedHeight,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // 加载悬浮窗页面（同一前端地址，通过 mode 参数区分）
  if (isDev) {
    floatWindow.loadURL(`${APP_CONFIG.devUrl}?mode=floating`);
  } else {
    floatWindow.loadFile(path.join(__dirname, 'renderer/float.html'));
  }

  // 初始收起状态，限制点击区域为顶部条
  floatWindow.setShape([{
    x: 0,
    y: 0,
    width: APP_CONFIG.floatWidth,
    height: APP_CONFIG.floatHeight,
  }]);

  // 悬浮窗拖动
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  floatWindow.on('will-move', (e) => {
    // 允许拖动
  });

  floatWindow.on('moved', () => {
    const [x, y] = floatWindow.getPosition();
    store.set('floatWindowPosition', { x, y });
  });

  floatWindow.on('closed', () => {
    floatWindow = null;
  });
}

// 显示悬浮窗
function showFloatWindow() {
  if (!floatWindow) {
    createFloatWindow();
  }
  floatWindow.show();
}

// 隐藏悬浮窗
function hideFloatWindow() {
  if (floatWindow) {
    floatWindow.hide();
  }
}

// 创建系统托盘
function createTray() {
  const fs = require('fs');
  const iconPath = path.join(__dirname, 'assets/icon.png');
  
  let trayIcon;
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } else {
    // 如果没有图标文件，创建一个空的透明图标
    trayIcon = nativeImage.createEmpty();
  }
  
  tray = new Tray(trayIcon);
  tray.setToolTip('悬赏任务公会');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开主界面',
      click: () => {
        if (!mainWindow) {
          createMainWindow();
        }
        mainWindow.show();
        mainWindow.focus();
        hideFloatWindow();
      }
    },
    {
      label: '显示悬浮窗',
      click: () => {
        showFloatWindow();
      }
    },
    { type: 'separator' },
    {
      label: '今日任务概览',
      enabled: false
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
      showFloatWindow();
    } else {
      if (!mainWindow) {
        createMainWindow();
      }
      mainWindow.show();
      mainWindow.focus();
      hideFloatWindow();
    }
  });
}

// 同步数据到渲染进程
function syncDataToRenderer() {
  if (mainWindow) {
    const allData = store.store;
    mainWindow.webContents.send('data:sync', allData);
  }
}

// 广播数据变更到所有渲染进程窗口
function broadcastStorageChange(key, value) {
  const payload = { key, value, timestamp: Date.now() };
  const windows = BrowserWindow.getAllWindows();
  windows.forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send('data:storage-changed', payload);
    }
  });
}

// IPC 通信 - 数据存储
ipcMain.handle('store:get', (_, key) => {
  return store.get(key);
});

// 同步版 get（preload 使用 sendSync）
ipcMain.on('store:get-sync', (event, key) => {
  event.returnValue = store.get(key);
});

ipcMain.handle('store:set', (_, key, value) => {
  store.set(key, value);
  broadcastStorageChange(key, value);
  return true;
});

ipcMain.handle('store:delete', (_, key) => {
  store.delete(key);
  broadcastStorageChange(key, undefined);
  return true;
});

ipcMain.handle('store:getAll', () => {
  return store.store;
});

// 同步版 getAll
ipcMain.on('store:getAll-sync', (event) => {
  event.returnValue = store.store;
});

ipcMain.handle('store:clear', () => {
  store.clear();
  return true;
});

// IPC 通信 - 窗口控制
ipcMain.handle('window:showMain', () => {
  if (!mainWindow) {
    createMainWindow();
  }
  mainWindow.show();
  mainWindow.focus();
  hideFloatWindow();
  return true;
});

ipcMain.handle('window:hideMain', () => {
  if (mainWindow) {
    mainWindow.hide();
    showFloatWindow();
  }
  return true;
});

ipcMain.handle('window:minimizeToFloat', () => {
  if (mainWindow) {
    mainWindow.hide();
    showFloatWindow();
  }
  return true;
});

function resizeFloatWindowAnchored(nextHeight) {
  if (!floatWindow) {
    return;
  }

  const [x, y] = floatWindow.getPosition();
  const [, currentHeight] = floatWindow.getSize();
  const bottom = y + currentHeight;
  const display = screen.getDisplayMatching(floatWindow.getBounds());
  const { x: workX, y: workY, width: workWidth } = display.workArea;
  const nextY = Math.max(workY, bottom - nextHeight);
  const nextX = Math.min(
    Math.max(x, workX),
    workX + workWidth - APP_CONFIG.floatWidth
  );

  floatWindow.setBounds({
    x: nextX,
    y: nextY,
    width: APP_CONFIG.floatWidth,
    height: nextHeight
  });
}

function stopFloatResizeAnimation() {
  if (floatResizeAnimation) {
    clearInterval(floatResizeAnimation.timer);
    floatResizeAnimation.resolve();
    floatResizeAnimation = null;
  }
}

function animateFloatWindowHeight(nextHeight) {
  if (!floatWindow) {
    return Promise.resolve();
  }

  stopFloatResizeAnimation();

  const startBounds = floatWindow.getBounds();
  const startHeight = startBounds.height;

  if (startHeight === nextHeight) {
    resizeFloatWindowAnchored(nextHeight);
    return Promise.resolve();
  }

  const bottom = startBounds.y + startBounds.height;
  const display = screen.getDisplayMatching(startBounds);
  const { x: workX, y: workY, width: workWidth } = display.workArea;
  const targetY = Math.max(workY, bottom - nextHeight);
  const targetX = Math.min(
    Math.max(startBounds.x, workX),
    workX + workWidth - APP_CONFIG.floatWidth
  );
  const duration = 180;
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const timer = setInterval(() => {
      if (!floatWindow || floatWindow.isDestroyed()) {
        clearInterval(timer);
        floatResizeAnimation = null;
        resolve();
        return;
      }

      const progress = Math.min(1, (Date.now() - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);

      floatWindow.setBounds({
        x: Math.round(startBounds.x + (targetX - startBounds.x) * eased),
        y: Math.round(startBounds.y + (targetY - startBounds.y) * eased),
        width: APP_CONFIG.floatWidth,
        height: Math.round(startHeight + (nextHeight - startHeight) * eased)
      });

      if (progress >= 1) {
        clearInterval(timer);
        floatResizeAnimation = null;
        resolve();
      }
    }, 1000 / 60);

    floatResizeAnimation = { timer, resolve };
  });
}

ipcMain.handle('window:expandFloat', async () => {
  if (floatWindow) {
    // 展开时恢复完整矩形区域
    floatWindow.setShape([{
      x: 0,
      y: 0,
      width: APP_CONFIG.floatWidth,
      height: APP_CONFIG.floatExpandedHeight,
    }]);
    await animateFloatWindowHeight(APP_CONFIG.floatExpandedHeight);
  }
  return true;
});

ipcMain.handle('window:collapseFloat', async () => {
  if (floatWindow) {
    await animateFloatWindowHeight(APP_CONFIG.floatHeight);
    // 收起时只保留顶部条区域，其余完全穿透
    floatWindow.setShape([{
      x: 0,
      y: 0,
      width: APP_CONFIG.floatWidth,
      height: APP_CONFIG.floatHeight,
    }]);
  }
  return true;
});

ipcMain.handle('app:quit', () => {
  isQuitting = true;
  app.quit();
  return true;
});

// IPC 通信 - API 代理转发到本地后端
ipcMain.handle('api:proxy', async (_, { method, path, body }) => {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api' + path,
      method: method || 'GET',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', (err) => resolve({ status: 0, error: err.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
});

// 应用就绪
app.whenReady().then(() => {
  createMainWindow();
  createTray();
  
  // 默认显示悬浮窗
  setTimeout(() => {
    showFloatWindow();
  }, 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// 所有窗口关闭时
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 不退出，保持托盘运行
  }
});

// 应用退出前
app.on('before-quit', () => {
  isQuitting = true;
});

// 开机自启（可选）
// app.setLoginItemSettings({
//   openAtLogin: true,
//   path: process.execPath
// });
