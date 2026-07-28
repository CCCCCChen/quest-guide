import { useState, useEffect, useCallback, useRef } from 'react';
import { appLogger, appStorage } from '@/lib/runtime';

interface UseLocalStateOptions<T> {
  key: string;
  initialValue: T | (() => T);
  version?: number;
  validator?: (value: unknown) => value is T;
}

function getInitialValue<T>(options: UseLocalStateOptions<T>): T {
  const { key, initialValue, version, validator } = options;

  try {
    const raw = appStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return typeof initialValue === 'function'
        ? (initialValue as () => T)()
        : initialValue;
    }

    const parsed = JSON.parse(raw);

    // 版本校验
    if (version !== undefined && parsed && typeof parsed === 'object' && '__v' in parsed) {
      if (parsed.__v !== version) {
        appLogger.warn(`[useLocalState] version mismatch for ${key}, resetting`);
        return typeof initialValue === 'function'
          ? (initialValue as () => T)()
          : initialValue;
      }
      const data = parsed.data;
      if (validator && !validator(data)) {
        appLogger.warn(`[useLocalState] validator failed for ${key}, resetting`);
        return typeof initialValue === 'function'
          ? (initialValue as () => T)()
          : initialValue;
      }
      return data as T;
    }

    if (validator && !validator(parsed)) {
      appLogger.warn(`[useLocalState] validator failed for ${key}, resetting`);
      return typeof initialValue === 'function'
        ? (initialValue as () => T)()
        : initialValue;
    }

    return parsed as T;
  } catch (error) {
    appLogger.error(`[useLocalState] read error for ${key}:`, String(error));
    return typeof initialValue === 'function'
      ? (initialValue as () => T)()
      : initialValue;
  }
}

export function useLocalState<T>(options: UseLocalStateOptions<T>) {
  const { key, version } = options;
  const [value, setValue] = useState<T>(() => getInitialValue(options));
  const isFirstRender = useRef(true);

  useEffect(() => {
    try {
      if (version !== undefined) {
        appStorage.setItem(key, JSON.stringify({ __v: version, data: value }));
      } else {
        appStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      appLogger.error(`[useLocalState] write error for ${key}:`, String(error));
    }
  }, [key, version, value]);

  const reset = useCallback(() => {
    const { initialValue } = options;
    const fresh = typeof initialValue === 'function'
      ? (initialValue as () => T)()
      : initialValue;
    setValue(fresh);
  }, [options]);

  const update = useCallback((updater: T | ((prev: T) => T)) => {
    setValue((prev) =>
      typeof updater === 'function' ? (updater as (prev: T) => T)(prev) : updater
    );
  }, []);

  // 跨标签页同步
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.endsWith(key) && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (version !== undefined && parsed && typeof parsed === 'object' && '__v' in parsed) {
            if (parsed.__v === version) {
              setValue(parsed.data as T);
            }
          } else {
            setValue(parsed as T);
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key, version]);

  return [value, setValue, { reset, update }] as const;
}

export default useLocalState;
