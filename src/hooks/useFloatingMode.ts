import { useCallback, useState, useEffect } from 'react';
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';

export type DisplayMode = 'full' | 'floating';

const STORAGE_KEY = '__quest_guild_display_mode';
const EVENT_NAME = 'quest-guild:mode-changed';

function loadMode(): DisplayMode {
  try {
    const raw = scopedStorage.getItem(STORAGE_KEY);
    if (raw === 'full' || raw === 'floating') return raw;
    return 'full';
  } catch {
    return 'full';
  }
}

function saveMode(mode: DisplayMode) {
  try {
    scopedStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function useFloatingMode() {
  const [mode, setMode] = useState<DisplayMode>(() => loadMode());

  useEffect(() => {
    const handler = () => setMode(loadMode());
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const changeMode = useCallback((next: DisplayMode) => {
    saveMode(next);
    setMode(next);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
  }, []);

  const setFullMode = useCallback(() => {
    changeMode('full');
  }, [changeMode]);

  const setFloatingMode = useCallback(() => {
    changeMode('floating');
  }, [changeMode]);

  const toggleMode = useCallback(() => {
    changeMode(mode === 'full' ? 'floating' : 'full');
  }, [mode, changeMode]);

  return {
    mode,
    isFull: mode === 'full',
    isFloating: mode === 'floating',
    setFullMode,
    setFloatingMode,
    toggleMode,
  };
}
