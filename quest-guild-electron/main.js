const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage } = require('electron');
const path = require('path');
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

// 应用配置
const APP_CONFIG = {
  mainWidth: 1280,
  mainHeight: 800,
  floatWidth: 360,
  floatHeight: 72,
  floatExpandedHeight: 500,
  mainHtmlPath: path.join(__dirname, 'renderer/app/index.html'),
};

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
  mainWindow.loadFile(APP_CONFIG.mainHtmlPath);

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
  floatWindow.loadFile(path.join(__dirname, 'renderer/float.html'));

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

// IPC 通信 - 数据存储
ipcMain.handle('store:get', (_, key) => {
  return store.get(key);
});

ipcMain.handle('store:set', (_, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('store:delete', (_, key) => {
  store.delete(key);
  return true;
});

ipcMain.handle('store:getAll', () => {
  return store.store;
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

ipcMain.handle('window:expandFloat', () => {
  if (floatWindow) {
    floatWindow.setSize(APP_CONFIG.floatWidth, APP_CONFIG.floatExpandedHeight);
  }
  return true;
});

ipcMain.handle('window:collapseFloat', () => {
  if (floatWindow) {
    floatWindow.setSize(APP_CONFIG.floatWidth, APP_CONFIG.floatHeight);
  }
  return true;
});

ipcMain.handle('app:quit', () => {
  isQuitting = true;
  app.quit();
  return true;
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
