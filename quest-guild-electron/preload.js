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
    setHeight: (height) => ipcRenderer.invoke('window:setFloatHeight', height),
    quit: () => ipcRenderer.invoke('app:quit')
  },

  // 通用事件监听
  on: (channel, callback) => {
    const allowedChannels = ['data:sync', 'data:storage-changed', 'float:auto-collapse'];
    if (!allowedChannels.includes(channel)) return;
    const handler = (_, data) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  // 数据同步监听（兼容旧代码）
  onDataSync: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('data:sync', handler);
    return () => ipcRenderer.removeListener('data:sync', handler);
  },
  onStorageChanged: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('data:storage-changed', handler);
    return () => ipcRenderer.removeListener('data:storage-changed', handler);
  },

  // API 代理：将渲染进程的 HTTP 请求通过主进程转发到本地后端
  api: {
    proxy: (method, path, body) => ipcRenderer.invoke('api:proxy', { method, path, body }),
  },
});

// 检测是否在 Electron 环境中运行
contextBridge.exposeInMainWorld('isElectron', true);
