/**
 * 统一存储适配层
 * Electron 打包环境：通过 preload 暴露的 IPC 桥接 electron-store，数据持久化到磁盘
 * 浏览器开发环境：使用 localStorage
 */

// ========== 类型 ==========

export interface IStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** 存储变更回调类型 */
export type StorageChangeCallback = (event: { key: string; value: unknown }) => void;

// ========== Electron IPC 适配器 ==========

function createElectronAdapter(): IStorageAdapter | null {
  if (typeof window === 'undefined') return null;
  const api = (window as any).electronAPI?.store;
  if (!api) return null;

  return {
    getItem: (key: string): string | null => {
      const v = api.get(key);
      // electron-store 返回 null 表示未设置
      if (v === null || v === undefined) return null;
      return String(v);
    },
    setItem: (key: string, value: string): void => {
      api.set(key, value);
    },
    removeItem: (key: string): void => {
      api.delete(key);
    },
  };
}

// ========== localStorage 适配器 ==========

function createLocalStorageAdapter(): IStorageAdapter {
  return {
    getItem: (key: string): string | null => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: string): void => {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* quota exceeded - silently ignore */
      }
    },
    removeItem: (key: string): void => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}

// ========== 内存后备（SSR / 极端情况） ==========

let memoryFallback: Map<string, string> | null = null;
function getMemoryAdapter(): IStorageAdapter {
  if (!memoryFallback) {
    memoryFallback = new Map();
  }
  return {
    getItem: (key: string) => memoryFallback!.get(key) ?? null,
    setItem: (key: string, value: string) => { memoryFallback!.set(key, value); },
    removeItem: (key: string) => { memoryFallback!.delete(key); },
  };
}

// ========== 单例适配器 ==========

let adapter: IStorageAdapter | null = null;

function resolveAdapter(): IStorageAdapter {
  if (adapter) return adapter;

  // 1. Electron 环境优先
  const electronAdapter = createElectronAdapter();
  if (electronAdapter) {
    adapter = electronAdapter;
    return adapter;
  }

  // 2. 浏览器环境
  try {
    if (typeof localStorage !== 'undefined') {
      adapter = createLocalStorageAdapter();
      return adapter;
    }
  } catch {
    /* localStorage unavailable */
  }

  // 3. 内存后备
  adapter = getMemoryAdapter();
  return adapter;
}

export const store: IStorageAdapter = {
  getItem(key: string): string | null {
    return resolveAdapter().getItem(key);
  },
  setItem(key: string, value: string): void {
    resolveAdapter().setItem(key, value);
  },
  removeItem(key: string): void {
    resolveAdapter().removeItem(key);
  },
};

/**
 * 检测当前是否运行在 Electron 环境中
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electronAPI;
}

// ========== 跨窗口同步订阅 ==========

const storageListeners = new Set<StorageChangeCallback>();
let storageListenerInitialized = false;

/**
 * 初始化跨窗口同步订阅（幂等）
 */
function initStorageListener(): void {
  if (storageListenerInitialized) return;
  storageListenerInitialized = true;

  if (typeof window === 'undefined') return;

  const electronApi = (window as any).electronAPI;
  if (electronApi?.onStorageChanged) {
    // Electron: 监听主进程广播
    electronApi.onStorageChanged((event: { key: string; value: unknown }) => {
      // value 可能是对象（IPC 序列化后丢失类型），转换为字符串以保持与 getItem 接口一致
      const normalized = event.value === null || event.value === undefined
        ? null
        : typeof event.value === 'string' ? event.value : JSON.stringify(event.value);
      storageListeners.forEach((cb) => cb({ key: event.key, value: normalized }));
    });
  } else {
    // 浏览器: 监听原生 storage 事件
    window.addEventListener('storage', (e) => {
      if (e.key) {
        storageListeners.forEach((cb) => cb({ key: e.key!, value: e.newValue }));
      }
    });
  }
}

/**
 * 订阅存储变更（跨窗口同步核心）
 * @param callback 当任意窗口修改存储时触发
 * @returns 取消订阅函数
 */
export function subscribeStorageChange(callback: StorageChangeCallback): () => void {
  initStorageListener();
  storageListeners.add(callback);
  return () => {
    storageListeners.delete(callback);
  };
}
