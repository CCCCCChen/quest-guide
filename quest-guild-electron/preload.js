const { contextBridge, ipcRenderer } = require('electron');

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 数据存储
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    delete: (key) => ipcRenderer.invoke('store:delete', key),
    getAll: () => ipcRenderer.invoke('store:getAll'),
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
  }
});

// 检测是否在 Electron 环境中运行
contextBridge.exposeInMainWorld('isElectron', true);
