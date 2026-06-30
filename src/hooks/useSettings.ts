import { useCallback } from 'react';
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';
import type { IAppSettings } from '@/types/quest';
import { createBackup } from '@/lib/backup';

const STORAGE_KEY = '__quest_guild_settings';

const DEFAULT_SETTINGS: IAppSettings = {
  manaMax: 5,
  resetTime: '06:00',
  soundEnabled: true,
  floatingPosition: { x: -24, y: -24 },
  floatingOpacity: 0.8,
  floatingCollapseDelay: 1000,
};

function loadSettings(): IAppSettings {
  try {
    const raw = scopedStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<IAppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: IAppSettings) {
  try {
    scopedStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function useSettings() {
  const settings = loadSettings();

  const updateSettings = useCallback((patch: Partial<IAppSettings>) => {
    const next = { ...loadSettings(), ...patch };
    saveSettings(next);
    window.dispatchEvent(new CustomEvent('quest-guild:settings-updated'));
    createBackup('更新设置');
  }, []);

  const resetSettings = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
    window.dispatchEvent(new CustomEvent('quest-guild:settings-updated'));
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}
