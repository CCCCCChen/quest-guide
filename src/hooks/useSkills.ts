import { useState, useEffect, useCallback, useMemo } from 'react';
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';
import type { ISkillNode } from '@/types/quest';
import { PRESET_SKILLS, PRESET_SKILL_POINTS } from '@/data/preset';
import { playSound } from '@/lib/sound';
import { createBackup } from '@/lib/backup';

const SKILLS_KEY = '__quest_guild_skills';
const SKILL_POINTS_KEY = '__quest_guild_skill_points';

export function useSkills() {
  const [skills, setSkills] = useState<ISkillNode[]>([]);
  const [skillPoints, setSkillPoints] = useState<number>(0);
  const [initialized, setInitialized] = useState(false);

  // 初始化：从 localStorage 读取，空则注入预设
  useEffect(() => {
    try {
      const storedSkills = scopedStorage.getItem(SKILLS_KEY);
      const storedPoints = scopedStorage.getItem(SKILL_POINTS_KEY);

      if (storedSkills) {
        setSkills(JSON.parse(storedSkills));
      } else {
        setSkills(PRESET_SKILLS);
        scopedStorage.setItem(SKILLS_KEY, JSON.stringify(PRESET_SKILLS));
      }

      if (storedPoints !== null && storedPoints !== undefined) {
        setSkillPoints(Number(storedPoints));
      } else {
        setSkillPoints(PRESET_SKILL_POINTS);
        scopedStorage.setItem(SKILL_POINTS_KEY, String(PRESET_SKILL_POINTS));
      }
    } catch (e) {
      setSkills(PRESET_SKILLS);
      setSkillPoints(PRESET_SKILL_POINTS);
    } finally {
      setInitialized(true);
    }
  }, []);

  // 持久化技能节点
  const persistSkills = useCallback((next: ISkillNode[]) => {
    setSkills(next);
    scopedStorage.setItem(SKILLS_KEY, JSON.stringify(next));
  }, []);

  // 持久化技能点
  const persistSkillPoints = useCallback((next: number) => {
    setSkillPoints(next);
    scopedStorage.setItem(SKILL_POINTS_KEY, String(next));
  }, []);

  // 判断是否可解锁
  const canUnlock = useCallback(
    (id: string): boolean => {
      const node = skills.find((s) => s.id === id);
      if (!node) return false;
      if (node.status !== 'locked') return false;
      if (skillPoints < node.requiredSkillPoints) return false;
      // 根节点（无 parentId）可直接解锁
      if (!node.parentId) return true;
      // 父节点必须已解锁或已强化
      const parent = skills.find((s) => s.id === node.parentId);
      if (!parent) return false;
      return parent.status === 'unlocked' || parent.status === 'enhanced';
    },
    [skills, skillPoints],
  );

  // 点亮技能
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
      persistSkills(next);
      persistSkillPoints(skillPoints - node.requiredSkillPoints);
      playSound('levelup');
      createBackup(`解锁技能：${node.name}`);
      return true;
    },
    [skills, canUnlock, persistSkills, persistSkillPoints, skillPoints],
  );

  // 强化技能
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
      persistSkills(next);
      persistSkillPoints(skillPoints - enhanceCost);
      playSound('levelup');
      createBackup(`强化技能：${node.name}`);
      return true;
    },
    [skills, skillPoints, persistSkills, persistSkillPoints],
  );

  // 按分类获取技能
  const getSkillsByCategory = useCallback(
    (category: string): ISkillNode[] => {
      return skills.filter((s) => s.category === category);
    },
    [skills],
  );

  // 已点亮/强化的技能数
  const getUnlockedCount = useCallback((): number => {
    return skills.filter((s) => s.status === 'unlocked' || s.status === 'enhanced').length;
  }, [skills]);

  // 增加技能点（完成史诗任务时调用）
  const addSkillPoints = useCallback(
    (amount: number) => {
      persistSkillPoints(skillPoints + amount);
    },
    [skillPoints, persistSkillPoints],
  );

  const categories = useMemo(() => {
    const set = new Set(skills.map((s) => s.category));
    return Array.from(set);
  }, [skills]);

  return {
    skills,
    skillPoints,
    initialized,
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
