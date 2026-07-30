const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage } = require('electron');
const path = require('path');
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');
const Store = require('electron-store');
const log = require('electron-log');

// 日志配置
log.transports.file.level = 'info';
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB
log.transports.file.fileName = 'main.log';

// 重写 console 方法，使 console.log/error 也写入日志文件
Object.assign(console, log.functions);

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
  floatWidth: 380,
  floatHeight: 64,
  floatExpandedHeight: 500,
  floatMaxExpandedHeight: 620,
  // 开发模式加载 Vite 地址，生产模式加载打包后的文件
  devUrl: 'http://localhost:5173',
  mainHtmlPath: path.join(__dirname, 'renderer/app/index.html'),
};

const isDev = !app.isPackaged;
log.transports.console.level = isDev ? 'debug' : false;
let serverPort = Number(process.env.PORT || 3001);
let serverProcess = null;

if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
  app.commandLine.appendSwitch('ignore-certificate-errors');
}

function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(preferredPort) {
  for (let p = preferredPort; p < preferredPort + 30; p += 1) {
    const ok = await checkPortAvailable(p);
    if (ok) return p;
  }
  return preferredPort;
}

async function ensureLocalServer() {
  const entryInsideApp = path.join(__dirname, 'server', 'index.js');
  const entryDev = path.join(__dirname, '..', 'server', 'index.js');
  const serverEntry = fs.existsSync(entryInsideApp) ? entryInsideApp : entryDev;

  const preferred = Number(process.env.QUEST_GUILD_SERVER_PORT || 3001);
  const freePort = await findAvailablePort(preferred);
  serverPort = freePort;
  log.info(`[Server] 使用端口 ${freePort}`);

  if (serverProcess && !serverProcess.killed) {
    return;
  }

  serverProcess = spawn(process.execPath, [serverEntry], {
    stdio: 'ignore',
    env: {
      ...process.env,
      PORT: String(serverPort),
      ELECTRON_RUN_AS_NODE: '1',
    },
    windowsHide: true,
  });

  serverProcess.on('exit', () => {
    serverProcess = null;
  });
}

function stopLocalServer() {
  if (serverProcess && !serverProcess.killed) {
    try {
      serverProcess.kill();
    } catch {}
  }
  serverProcess = null;
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
      showFloatWindowIfEnabled();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    log.info('[Window] 主窗口关闭');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    syncDataToRenderer();
  });
}

// 创建悬浮窗
function createFloatWindow() {
  const savedPosition = store.get('floatWindowPosition');
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // 默认位置：右下角，底部距任务栏 24px，右侧距边 24px
  const defaultX = width - APP_CONFIG.floatWidth - 24;
  const defaultY = height - APP_CONFIG.floatHeight - 24;
  const x = savedPosition ? savedPosition.x : defaultX;
  const y = savedPosition ? savedPosition.y : defaultY;

  floatWindow = new BrowserWindow({
    width: APP_CONFIG.floatWidth,
    height: APP_CONFIG.floatHeight,
    x,
    y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
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

  // 加载悬浮窗页面
  if (isDev) {
    floatWindow.loadURL(`${APP_CONFIG.devUrl}?mode=floating`);
  } else {
    floatWindow.loadFile(APP_CONFIG.mainHtmlPath, { query: { mode: 'floating' } });
  }

  // 保存位置
  floatWindow.on('moved', () => {
    const [x, y] = floatWindow.getPosition();
    store.set('floatWindowPosition', { x, y });
  });

  floatWindow.on('closed', () => {
    floatWindow = null;
    log.info('[Float] 悬浮窗关闭');
  });
}

// 显示悬浮窗
function showFloatWindow() {
  if (!floatWindow) {
    createFloatWindow();
  }
  floatWindow.showInactive(); // showInactive 不抢焦点
  floatWindow.setAlwaysOnTop(true, 'screen-saver');
}

// 构建托盘菜单
function buildTrayMenu() {
  const floatVisible = store.get('floatWindowVisible', true);
  return Menu.buildFromTemplate([
    {
      label: '打开主界面',
      click: () => {
        if (!mainWindow) {
          createMainWindow();
        }
        mainWindow.show();
        mainWindow.focus();
        if (floatWindow) floatWindow.hide();
      }
    },
    {
      label: '显示悬浮窗',
      type: 'checkbox',
      checked: floatVisible,
      click: (menuItem) => {
        store.set('floatWindowVisible', menuItem.checked);
        if (menuItem.checked) {
          showFloatWindow();
        } else {
          if (floatWindow) floatWindow.hide();
        }
        if (tray) tray.setContextMenu(buildTrayMenu());
      }
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
}

function hideFloatWindow() {
  if (floatWindow) {
    floatWindow.hide();
  }
}

function showFloatWindowIfEnabled() {
  const floatVisible = store.get('floatWindowVisible', true);
  if (floatVisible) {
    showFloatWindow();
  }
}

// 创建系统托盘
function createTray() {
  const iconPath16 = path.join(__dirname, 'assets', 'icon_16.png');
  const iconPath32 = path.join(__dirname, 'assets', 'icon.png');

  let trayIcon;
  if (fs.existsSync(iconPath16)) {
    trayIcon = nativeImage.createFromPath(iconPath16);
  } else if (fs.existsSync(iconPath32)) {
    trayIcon = nativeImage.createFromPath(iconPath32).resize({ width: 16, height: 16 });
  } else {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('悬赏任务公会');
  tray.setContextMenu(buildTrayMenu());

  tray.on('click', () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
      showFloatWindowIfEnabled();
    } else {
      if (!mainWindow) {
        createMainWindow();
      }
      mainWindow.show();
      mainWindow.focus();
      if (floatWindow) floatWindow.hide();
    }
  });
}

function syncDataToRenderer() {
  if (mainWindow) {
    const allData = store.store;
    mainWindow.webContents.send('data:sync', allData);
  }
}

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
  if (floatWindow) floatWindow.hide();
  return true;
});

ipcMain.handle('window:hideMain', () => {
  if (mainWindow) {
    mainWindow.hide();
    showFloatWindowIfEnabled();
  }
  return true;
});

// ========== 悬浮窗高度动画：底边锚定 ==========
// 核心逻辑：展开时 y 往上移（减小），保持底边不动；收起时 y 回到原位
function animateFloatWindowHeight(nextHeight, keepBottom = true) {
  if (!floatWindow || floatWindow.isDestroyed()) {
    return Promise.resolve();
  }

  stopFloatResizeAnimation();

  const bounds = floatWindow.getBounds();
  const startHeight = bounds.height;
  const startY = bounds.y;

  if (startHeight === nextHeight) {
    return Promise.resolve();
  }

  // 底边锚定：底边 y = startY + startHeight 固定
  // 新 y = bottom - nextHeight
  const bottom = startY + startHeight;
  const targetY = keepBottom ? bottom - nextHeight : startY;

  // 限制不超出屏幕
  const display = screen.getDisplayMatching(bounds);
  const { x: workX, y: workY, height: workHeight, width: workWidth } = display.workArea;
  const clampedY = Math.max(workY, targetY);
  const clampedX = Math.max(workX, Math.min(bounds.x, workX + workWidth - APP_CONFIG.floatWidth));
  const maxHeight = workY + workHeight - clampedY;
  const clampedHeight = Math.min(nextHeight, maxHeight);

  const duration = 220;
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
      const currentHeight = Math.round(startHeight + (clampedHeight - startHeight) * eased);
      const currentY = Math.round(startY + (clampedY - startY) * eased);

      floatWindow.setBounds({
        x: clampedX,
        y: currentY,
        width: APP_CONFIG.floatWidth,
        height: currentHeight,
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

function stopFloatResizeAnimation() {
  if (floatResizeAnimation) {
    clearInterval(floatResizeAnimation.timer);
    floatResizeAnimation.resolve();
    floatResizeAnimation = null;
  }
}

ipcMain.handle('window:expandFloat', async () => {
  if (floatWindow && !floatWindow.isDestroyed()) {
    await animateFloatWindowHeight(APP_CONFIG.floatExpandedHeight, true);
  }
  return true;
});

ipcMain.handle('window:setFloatHeight', async (_, height) => {
  if (!floatWindow || floatWindow.isDestroyed()) return false;
  const clamped = Math.min(height, APP_CONFIG.floatMaxExpandedHeight);
  await animateFloatWindowHeight(clamped, true);
  return true;
});

ipcMain.handle('window:collapseFloat', async () => {
  if (floatWindow && !floatWindow.isDestroyed()) {
    await animateFloatWindowHeight(APP_CONFIG.floatHeight, true);
  }
  return true;
});

ipcMain.on('window:getFloatPositionSync', (event) => {
  if (floatWindow && !floatWindow.isDestroyed()) {
    const [x, y] = floatWindow.getPosition();
    event.returnValue = { x, y };
  } else {
    event.returnValue = null;
  }
});

ipcMain.handle('window:setFloatPosition', (_, { x, y }) => {
  if (floatWindow && !floatWindow.isDestroyed()) {
    const { width, height } = floatWindow.getBounds();
    floatWindow.setPosition(Math.round(x), Math.round(y));
    store.set('floatWindowPosition', { x: Math.round(x), y: Math.round(y) });
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
      port: serverPort,
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
  log.info(`[App] 启动 (isDev=${isDev}, electron=${process.versions.electron}, node=${process.versions.node})`);
  ensureLocalServer().catch(() => {});
  createMainWindow();
  createTray();

  setTimeout(() => {
    showFloatWindowIfEnabled();
  }, 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 不退出，保持托盘运行
  }
});

app.on('before-quit', () => {
  log.info('[App] 退出中...');
  isQuitting = true;
  stopLocalServer();
});

process.on('uncaughtException', (err) => {
  log.error(`[Process] uncaughtException: ${err.message}`, err.stack);
});

process.on('unhandledRejection', (reason) => {
  log.error(`[Process] unhandledRejection: ${reason}`);
});
