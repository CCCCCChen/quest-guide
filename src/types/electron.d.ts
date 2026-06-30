/**
 * Electron preload 暴露的全局 API 类型声明
 */

interface ElectronStoreAPI {
  get(key: string): string | null;
  set(key: string, value: string): void;
  delete(key: string): void;
  getAll(): Record<string, string>;
  clear(): void;
}

interface ElectronWindowAPI {
  showMain(): void;
  hideMain(): void;
  minimizeToFloat(): void;
  expandFloat(): void;
  collapseFloat(): void;
  quit(): void;
}

interface StorageChangeEvent {
  key: string;
  value: unknown;
  timestamp: number;
}

interface ElectronAPI {
  store: ElectronStoreAPI;
  window: ElectronWindowAPI;
  api: {
    proxy(method: string, path: string, body?: unknown): Promise<{ status: number; body: unknown; error?: string }>;
  };
  onDataSync(callback: (data: unknown) => void): void;
  onStorageChanged(callback: (data: StorageChangeEvent) => void): () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    isElectron?: boolean;
  }
}

export {};
