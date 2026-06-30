import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ISkillNode } from '@/types/quest';
import { PRESET_SKILLS, PRESET_SKILL_POINTS } from '@/data/preset';
import { playSound } from '@/lib/sound';
import { store } from '@/lib/storage';
import { skillsApi } from '@/api';

const SKILLS_KEY = '__quest_guild_skills';
const SKILL_POINTS_KEY = '__quest_guild_skill_points';

let skillsCache: ISkillNode[] | null = null;
let skillPointsCache: number | null = null;
const skillsListeners = new Set<(v: ISkillNode[]) => void>();
const pointsListeners = new Set<(v: number) => void>();
let initialized = false;

function loadSkills(): ISkillNode[] {
  try {
    const raw = store.getItem(SKILLS_KEY);
    if (raw) return JSON.parse(raw) as ISkillNode[];
  } catch { /* ignore */ }
  return PRESET_SKILLS;
}

function loadPoints(): number {
  try {
    const raw = store.getItem(SKILL_POINTS_KEY);
    if (raw !== null) return Number(raw);
  } catch { /* ignore */ }
  return PRESET_SKILL_POINTS;
}

function setSkillsValue(v: ISkillNode[]) {
  skillsCache = v;
  store.setItem(SKILLS_KEY, JSON.stringify(v));
  skillsListeners.forEach((fn) => fn(v));
}

function setPointsValue(v: number) {
  skillPointsCache = v;
  store.setItem(SKILL_POINTS_KEY, String(v));
  pointsListeners.forEach((fn) => fn(v));
}

async function syncFromServer() {
  try {
    const [skills, points] = await Promise.all([
      skillsApi.getAll(),
      skillsApi.getSkillPoints(),
    ]);
    if (skills.length === 0) {
      // 服务端为空，初始化预设
      await skillsApi.batchInit(PRESET_SKILLS);
      setSkillsValue(PRESET_SKILLS);
    } else {
      setSkillsValue(skills);
    }
    setPointsValue(points);
  } catch {
    // 使用本地缓存
  }
}

export function useSkills() {
  const [skills, setSkillsState] = useState<ISkillNode[]>(
    () => skillsCache ?? loadSkills()
  );
  const [skillPoints, setSkillPointsState] = useState<number>(
    () => skillPointsCache ?? loadPoints()
  );

  useEffect(() => {
    if (skillsCache === null) skillsCache = skills;
    if (skillPointsCache === null) skillPointsCache = skillPoints;

    const sFn = (v: ISkillNode[]) => setSkillsState(v);
    const pFn = (v: number) => setSkillPointsState(v);
    skillsListeners.add(sFn);
    pointsListeners.add(pFn);

    if (!initialized) {
      initialized = true;
      syncFromServer();
    }

    return () => {
      skillsListeners.delete(sFn);
      pointsListeners.delete(pFn);
    };
  }, [skills, skillPoints]);

  const canUnlock = useCallback(
    (id: string): boolean => {
      const node = skills.find((s) => s.id === id);
      if (!node) return false;
      if (node.status !== 'locked') return false;
      if (skillPoints < node.requiredSkillPoints) return false;
      if (!node.parentId) return true;
      const parent = skills.find((s) => s.id === node.parentId);
      if (!parent) return false;
      return parent.status === 'unlocked' || parent.status === 'enhanced';
    },
    [skills, skillPoints],
  );

  const unlockSkill = useCallback(
    (id: string): boolean => {
      if (!canUnlock(id)) return false;
      const node = skills.find((s) => s.id === id);
      if (!node) return false;

      const next = skills.map((s) =>
        s.id === id
          ? { ...s, status: 'unlocked' as const, unlockedAt: Date.now() }
          : s,
      );
      setSkillsValue(next);
      setPointsValue(skillPoints - node.requiredSkillPoints);
      playSound('levelup');

      skillsApi.unlock(id).catch(() => {});
      return true;
    },
    [skills, canUnlock, skillPoints],
  );

  const enhanceSkill = useCallback(
    (id: string): boolean => {
      const node = skills.find((s) => s.id === id);
      if (!node) return false;
      if (node.status !== 'unlocked') return false;
      const enhanceCost = Math.ceil(node.requiredSkillPoints * 1.5);
      if (skillPoints < enhanceCost) return false;

      const next = skills.map((s) =>
        s.id === id ? { ...s, status: 'enhanced' as const } : s,
      );
      setSkillsValue(next);
      setPointsValue(skillPoints - enhanceCost);
      playSound('levelup');

      skillsApi.enhance(id).catch(() => {});
      return true;
    },
    [skills, skillPoints],
  );

  const getSkillsByCategory = useCallback(
    (category: string): ISkillNode[] => {
      return skills.filter((s) => s.category === category);
    },
    [skills],
  );

  const getUnlockedCount = useCallback((): number => {
    return skills.filter((s) => s.status === 'unlocked' || s.status === 'enhanced').length;
  }, [skills]);

  const addSkillPoints = useCallback(
    (amount: number) => {
      setPointsValue(skillPoints + amount);
    },
    [skillPoints],
  );

  const categories = useMemo(() => {
    const set = new Set(skills.map((s) => s.category));
    return Array.from(set);
  }, [skills]);

  return {
    skills,
    skillPoints,
    initialized: true,
    categories,
    unlockSkill,
    enhanceSkill,
    canUnlock,
    getSkillsByCategory,
    getUnlockedCount,
    addSkillPoints,
  };
}

export default useSkills;
