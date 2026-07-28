import { useCallback, useEffect, useState } from 'react';
import type { IReflection } from '@/types/quest';
import { store, subscribeStorageChange } from '@/lib/storage';
import { reflectionsApi } from '@/api';

const REFLECTIONS_KEY = '__quest_guild_reflections';

let reflectionsCache: IReflection[] | null = null;
const listeners = new Set<(v: IReflection[]) => void>();
let initialized = false;

function loadReflections(): IReflection[] {
  try {
    const raw = store.getItem(REFLECTIONS_KEY);
    if (raw) return JSON.parse(raw) as IReflection[];
  } catch { /* ignore */ }
  return [];
}

function setReflectionsValue(v: IReflection[]) {
  reflectionsCache = v;
  store.setItem(REFLECTIONS_KEY, JSON.stringify(v));
  listeners.forEach((fn) => fn(v));
}

async function syncFromServer() {
  try {
    const reflections = await reflectionsApi.getAll();
    setReflectionsValue(reflections);
  } catch {
    // ignore
  }
}

export function useReflections() {
  const [reflections, setReflections] = useState<IReflection[]>(() => reflectionsCache ?? loadReflections());

  useEffect(() => {
    if (reflectionsCache === null) reflectionsCache = reflections;
    const fn = (v: IReflection[]) => setReflections(v);
    listeners.add(fn);

    if (!initialized) {
      initialized = true;
      syncFromServer();
    }

    const unsubscribe = subscribeStorageChange(({ key }) => {
      if (key === REFLECTIONS_KEY) {
        const next = loadReflections();
        reflectionsCache = next;
        listeners.forEach((l) => l(next));
      }
    });

    return () => {
      listeners.delete(fn);
      unsubscribe();
    };
  }, [reflections]);

  const addReflection = useCallback(async (payload: Omit<IReflection, 'id' | 'createdAt'>) => {
    const reflection = await reflectionsApi.create(payload);
    const next = [reflection, ...(reflectionsCache ?? loadReflections())];
    setReflectionsValue(next);
    return reflection;
  }, []);

  const updateReflection = useCallback(async (id: string, patch: Partial<IReflection>) => {
    const updated = await reflectionsApi.update(id, patch);
    const base = reflectionsCache ?? loadReflections();
    const next = base.map((r) => (r.id === id ? updated : r));
    setReflectionsValue(next);
    return updated;
  }, []);

  const deleteReflection = useCallback(async (id: string) => {
    await reflectionsApi.remove(id);
    const base = reflectionsCache ?? loadReflections();
    setReflectionsValue(base.filter((r) => r.id !== id));
  }, []);

  return { reflections, addReflection, updateReflection, deleteReflection };
}

