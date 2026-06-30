const { contextBridge, ipcRenderer } = require('electron');

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 数据存储（get 使用同步 IPC 保证返回值，set/delete 异步即可）
  store: {
    get: (key) => ipcRenderer.sendSync('store:get-sync', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    delete: (key) => ipcRenderer.invoke('store:delete', key),
    getAll: () => ipcRenderer.sendSync('store:getAll-sync'),
    clear: () => ipcRenderer.invoke('store:clear')
  },

  // 窗口控制
  window: {
    showMain: () => ipcRenderer.invoke('window:showMain'),
    hideMain: () => ipcRenderer.invoke('window:hideMain'),
    minimizeToFloat: () => ipcRenderer.invoke('window:minimizeToFloat'),
    expandFloat: () => ipcRenderer.invoke('window:expandFloat'),
    collapseFloat: () => ipcRenderer.invoke('window:collapseFloat'),
    quit: () => ipcRenderer.invoke('app:quit')
  },

  // 数据同步监听
  onDataSync: (callback) => {
    ipcRenderer.on('data:sync', (_, data) => callback(data));
  },
  onStorageChanged: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('data:storage-changed', handler);
    // 返回取消订阅函数
    return () => ipcRenderer.removeListener('data:storage-changed', handler);
  },

  // API 代理：将渲染进程的 HTTP 请求通过主进程转发到本地后端
  api: {
    proxy: (method, path, body) => ipcRenderer.invoke('api:proxy', { method, path, body }),
  },
});

// 检测是否在 Electron 环境中运行
contextBridge.exposeInMainWorld('isElectron', true);
