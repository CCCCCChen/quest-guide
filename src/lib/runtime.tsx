import { Fragment } from 'react';
import type { ReactNode } from 'react';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const memoryStorage = new Map<string, string>();

function getStorage(): StorageLike {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // ignore and fall back to in-memory storage
  }

  return {
    getItem: (key: string) => memoryStorage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memoryStorage.set(key, value);
    },
    removeItem: (key: string) => {
      memoryStorage.delete(key);
    },
  };
}

const storage = getStorage();

export const appStorage = {
  getItem(key: string) {
    return storage.getItem(key);
  },
  setItem(key: string, value: string) {
    storage.setItem(key, value);
  },
  removeItem(key: string) {
    storage.removeItem(key);
  },
};

export const appLogger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export function AppRuntimeContainer({ children }: { children: ReactNode }) {
  return <Fragment>{children}</Fragment>;
}

export function AppErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: unknown;
  resetErrorBoundary: () => void;
}) {
  const errorMessage =
    error instanceof Error
      ? error.stack || error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error, null, 2);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">应用遇到异常</h1>
          <p className="text-sm text-muted-foreground">
            当前已切换为本地降级错误页，不依赖飞书容器环境。
          </p>
        </div>
        <pre className="max-h-80 overflow-auto rounded-md bg-muted p-4 text-xs whitespace-pre-wrap break-all">
          {errorMessage}
        </pre>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={resetErrorBoundary}
            className="inline-flex min-h-9 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium"
          >
            重试
          </button>
        </div>
      </div>
    </div>
  );
}
