import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit-lite';
import type { IQuestTask, IActiveTrack, IFocusLog, TaskType, TaskDifficulty } from '@/types/quest';
import { PRESET_TASKS, PRESET_FOCUS_LOGS } from '@/data/preset';
import { playSound } from '@/lib/sound';
import { createBackup, validateData, getLatestBackup, restoreBackup } from '@/lib/backup';

const STORAGE_KEY_TASKS = '__quest_guild_tasks';
const STORAGE_KEY_TRACK = '__quest_guild_active_track';
const STORAGE_KEY_FOCUS_LOG = '__quest_guild_focus_log';

function loadTasks(): IQuestTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    if (raw) {
      const parsed = JSON.parse(raw) as IQuestTask[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    logger.error('Failed to load tasks:', String(e));
  }
  // 校验失败时尝试从备份恢复
  const latest = getLatestBackup();
  if (latest && latest.data[STORAGE_KEY_TASKS]) {
    try {
      const restored = JSON.parse(latest.data[STORAGE_KEY_TASKS]) as IQuestTask[];
      if (Array.isArray(restored) && restored.length > 0) {
        logger.info('Tasks restored from backup');
        localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(restored));
        toast.info('数据已从备份恢复', { description: '任务数据损坏，已自动恢复到最近备份' });
        return restored;
      }
    } catch {
      // ignore
    }
  }
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(PRESET_TASKS));
  return PRESET_TASKS;
}

function loadActiveTrack(): IActiveTrack | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRACK);
    if (raw) return JSON.parse(raw) as IActiveTrack;
  } catch (e) {
    logger.error('Failed to load track:', String(e));
  }
  return null;
}

function loadFocusLogs(): IFocusLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FOCUS_LOG);
    if (raw) return JSON.parse(raw) as IFocusLog[];
  } catch (e) {
    logger.error('Failed to load focus logs:', String(e));
  }
  localStorage.setItem(STORAGE_KEY_FOCUS_LOG, JSON.stringify(PRESET_FOCUS_LOGS));
  return PRESET_FOCUS_LOGS;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

let globalTick = 0;
const listeners = new Set<() => void>();

function notifyAll() {
  listeners.forEach((fn) => fn());
}

// 单例状态（跨组件共享）
let tasksState: IQuestTask[] = loadTasks();
let trackState: IActiveTrack | null = loadActiveTrack();
let focusLogsState: IFocusLog[] = loadFocusLogs();

// 计时 tick：每秒更新一次追踪任务累计时长
let timerId: number | null = null;
function ensureTimer() {
  if (timerId !== null) return;
  timerId = window.setInterval(() => {
    globalTick++;
    if (trackState?.isRunning && trackState.lastStartTime) {
      // 累积到 accumulatedSeconds，但不直接持久化（避免每秒写一次）
      // 仅通知 UI 重渲染
    }
    notifyAll();
  }, 1000);
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasksState));
}

function triggerBackup(reason: string) {
  try {
    createBackup(reason);
  } catch (e) {
    logger.error('Backup failed:', String(e));
  }
}

function saveTrack() {
  if (trackState) {
    localStorage.setItem(STORAGE_KEY_TRACK, JSON.stringify(trackState));
  } else {
    localStorage.removeItem(STORAGE_KEY_TRACK);
  }
}

function saveFocusLogs() {
  localStorage.setItem(STORAGE_KEY_FOCUS_LOG, JSON.stringify(focusLogsState));
}

function genId(prefix = 't'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function calcReputation(difficulty: TaskDifficulty, estimatedMinutes: number): number {
  const base = { easy: 5, normal: 10, hard: 25, epic: 80 }[difficulty];
  return base + Math.floor(estimatedMinutes / 10) * 2;
}

function calcSkillPoints(difficulty: TaskDifficulty): number {
  return { easy: 0, normal: 0, hard: 1, epic: 3 }[difficulty];
}

export function useTasks() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    ensureTimer();
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const tasks = tasksState;
  const activeTrack = trackState;
  const focusLogs = focusLogsState;

  // 计算当前追踪任务的实时秒数
  const currentTrackSeconds = useMemo(() => {
    if (!activeTrack) return 0;
    let secs = activeTrack.accumulatedSeconds;
    if (activeTrack.isRunning && activeTrack.lastStartTime) {
      secs += Math.floor((Date.now() - activeTrack.lastStartTime) / 1000);
    }
    return secs;
  }, [activeTrack, globalTick]);

  const trackingTask = useMemo(() => {
    if (!activeTrack) return null;
    return tasks.find((t) => t.id === activeTrack.taskId) || null;
  }, [tasks, activeTrack]);

  const activeAttentionTasks = useMemo(
    () => tasks.filter((t) => t.isAttention && t.status !== 'completed'),
    [tasks],
  );

  const epicTasks = useMemo(
    () => tasks.filter((t) => t.type === 'epic' && !t.parentId),
    [tasks],
  );

  const dailyTasks = useMemo(
    () => tasks.filter((t) => t.type === 'daily'),
    [tasks],
  );

  const focusTodaySeconds = useMemo(() => {
    const today = todayStr();
    const minutes = focusLogs
      .filter((l) => l.date === today)
      .reduce((sum, l) => sum + l.durationMinutes, 0);
    // 加上当前正在计时的
    return minutes * 60 + (activeTrack?.isRunning ? currentTrackSeconds : 0);
  }, [focusLogs, activeTrack, currentTrackSeconds]);

  // ========== 操作 ==========

  const addTask = useCallback(
    (data: {
      name: string;
      description?: string;
      type: TaskType;
      difficulty: TaskDifficulty;
      estimatedMinutes: number;
      relatedSkillId?: string;
      bossName?: string;
      parentId?: string;
      tags?: string[];
    }) => {
      const rewardReputation = calcReputation(data.difficulty, data.estimatedMinutes);
      const rewardSkillPoints = calcSkillPoints(data.difficulty);
      const newTask: IQuestTask = {
        id: genId(data.type === 'epic' ? 'ep' : 'dy'),
        name: data.name,
        description: data.description || '',
        type: data.type,
        difficulty: data.difficulty,
        estimatedMinutes: data.estimatedMinutes,
        actualMinutes: 0,
        relatedSkillId: data.relatedSkillId,
        bossName: data.bossName,
        bossProgress: 0,
        parentId: data.parentId,
        status: 'pending',
        isTracking: false,
        isAttention: false,
        rewardReputation,
        rewardSkillPoints,
        createdAt: Date.now(),
        source: 'user',
        tags: data.tags || [],
      };
      tasksState = [...tasksState, newTask];
      saveTasks();
      notifyAll();
      triggerBackup(`新增任务：${data.name}`);
      toast.success(`任务「${data.name}」已加入悬赏池`);
      return newTask;
    },
    [],
  );

  const updateTask = useCallback((id: string, patch: Partial<IQuestTask>) => {
    const task = tasksState.find((t) => t.id === id);
    tasksState = tasksState.map((t) => (t.id === id ? { ...t, ...patch } : t));
    saveTasks();
    notifyAll();
    if (task) triggerBackup(`更新任务：${task.name}`);
  }, []);

  const deleteTask = useCallback((id: string) => {
    const task = tasksState.find((t) => t.id === id);
    // 同时删除子任务
    tasksState = tasksState.filter((t) => t.id !== id && t.parentId !== id);
    // 如果是追踪任务，停止追踪
    if (trackState?.taskId === id) {
      trackState = null;
      saveTrack();
    }
    saveTasks();
    notifyAll();
    triggerBackup(`删除任务：${task?.name || ''}`);
    toast.success(`任务「${task?.name || ''}」已移除`);
  }, []);

  // 设为追踪任务
  const setTrackingTask = useCallback(
    (taskId: string | null) => {
      // 先把旧的 isTracking 取消
      tasksState = tasksState.map((t) => ({ ...t, isTracking: false }));

      if (!taskId) {
        // 暂停并保存
        if (trackState?.isRunning && trackState.lastStartTime) {
          const elapsed = Math.floor((Date.now() - trackState.lastStartTime) / 1000);
          trackState = { ...trackState, accumulatedSeconds: trackState.accumulatedSeconds + elapsed, isRunning: false, lastStartTime: undefined };
        }
        trackState = null;
        saveTrack();
        saveTasks();
        notifyAll();
        return;
      }

      const task = tasksState.find((t) => t.id === taskId);
      if (!task) return;

      // 如果任务在注意力列表中，移除
      if (task.isAttention) {
        tasksState = tasksState.map((t) =>
          t.id === taskId ? { ...t, isAttention: false, isTracking: true, status: 'active' } : t,
        );
      } else {
        tasksState = tasksState.map((t) =>
          t.id === taskId ? { ...t, isTracking: true, status: 'active' } : t,
        );
      }

      // 如果已有追踪任务，先保存累计
      let accumulatedSeconds = 0;
      if (trackState?.taskId === taskId) {
        accumulatedSeconds = trackState.accumulatedSeconds;
        if (trackState.isRunning && trackState.lastStartTime) {
          accumulatedSeconds += Math.floor((Date.now() - trackState.lastStartTime) / 1000);
        }
      }

      trackState = {
        taskId,
        accumulatedSeconds,
        isRunning: false,
      };
      saveTrack();
      saveTasks();
      notifyAll();
      triggerBackup(`设为追踪：${task.name}`);
      toast.success(`「${task.name}」已设为主线追踪任务`);
    },
    [],
  );

  const startTracking = useCallback(() => {
    if (!trackState) return;
    if (trackState.isRunning) return;
    trackState = { ...trackState, isRunning: true, lastStartTime: Date.now() };
    saveTrack();
    notifyAll();
  }, []);

  const pauseTracking = useCallback(() => {
    if (!trackState || !trackState.isRunning) return;
    const elapsed = Math.floor((Date.now() - (trackState.lastStartTime || Date.now())) / 1000);
    trackState = {
      ...trackState,
      accumulatedSeconds: trackState.accumulatedSeconds + elapsed,
      isRunning: false,
      lastStartTime: undefined,
    };
    saveTrack();
    notifyAll();
  }, []);

  // 添加到注意力任务
  const addAttentionTask = useCallback(
    (taskId: string, maxAttention: number): boolean => {
      const task = tasksState.find((t) => t.id === taskId);
      if (!task) return false;
      if (task.isTracking) {
        toast.error('追踪任务不能同时作为注意力任务');
        return false;
      }
      const currentCount = tasksState.filter((t) => t.isAttention && t.status !== 'completed').length;
      if (currentCount >= maxAttention) {
        toast.error(`法力水晶不足！最多激活 ${maxAttention} 个注意力任务`);
        return false;
      }
      tasksState = tasksState.map((t) =>
        t.id === taskId ? { ...t, isAttention: true, status: 'active' } : t,
      );
      saveTasks();
      notifyAll();
      triggerBackup(`激活注意力任务：${task.name}`);
      toast.success(`「${task.name}」已加入注意力任务`);
      return true;
    },
    [],
  );

  const removeAttentionTask = useCallback((taskId: string) => {
    tasksState = tasksState.map((t) =>
      t.id === taskId ? { ...t, isAttention: false } : t,
    );
    saveTasks();
    notifyAll();
  }, []);

  // 完成任务
  const completeTask = useCallback(
    (taskId: string) => {
      const task = tasksState.find((t) => t.id === taskId);
      if (!task) return;

      let actualSeconds = 0;
      // 如果是追踪任务，结算时间
      if (task.isTracking && trackState?.taskId === taskId) {
        actualSeconds = trackState.accumulatedSeconds;
        if (trackState.isRunning && trackState.lastStartTime) {
          actualSeconds += Math.floor((Date.now() - trackState.lastStartTime) / 1000);
        }
        // 记录专注日志
        const log: IFocusLog = {
          id: genId('fl'),
          taskId,
          date: todayStr(),
          durationMinutes: Math.max(1, Math.round(actualSeconds / 60)),
          completedAt: Date.now(),
        };
        focusLogsState = [...focusLogsState, log];
        saveFocusLogs();
        trackState = null;
        saveTrack();
      }

      const actualMinutes = actualSeconds > 0 ? Math.round(actualSeconds / 60) : task.actualMinutes;

      tasksState = tasksState.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'completed',
              isTracking: false,
              isAttention: false,
              actualMinutes,
              bossProgress: t.type === 'epic' ? 100 : t.bossProgress,
              completedAt: Date.now(),
            }
          : t,
      );

      playSound(task.difficulty === 'epic' ? 'levelup' : 'complete');

      // 史诗任务：检查是否所有子任务都完成，若是则父任务也完成
      if (task.parentId) {
        const siblings = tasksState.filter((t) => t.parentId === task.parentId && t.id !== taskId);
        const allDone = siblings.every((t) => t.status === 'completed');
        if (allDone) {
          tasksState = tasksState.map((t) =>
            t.id === task.parentId
              ? { ...t, status: 'completed', bossProgress: 100, completedAt: Date.now() }
              : t,
          );
        } else {
          // 更新父任务进度
          const total = siblings.length + 1;
          const done = siblings.filter((t) => t.status === 'completed').length + 1;
          const progress = Math.round((done / total) * 100);
          tasksState = tasksState.map((t) =>
            t.id === task.parentId ? { ...t, bossProgress: progress } : t,
          );
        }
      }

      saveTasks();
      notifyAll();
      triggerBackup(`完成任务：${task.name}`);
      toast.success(`🎉 任务完成！获得 ${task.rewardReputation} 声望${task.rewardSkillPoints > 0 ? ` + ${task.rewardSkillPoints} 技能点` : ''}`);

      // 返回奖励数据供外部使用
      return {
        reputation: task.rewardReputation,
        skillPoints: task.rewardSkillPoints,
        skillId: task.relatedSkillId,
      };
    },
    [],
  );

  // 更新 Boss 进度
  const updateBossProgress = useCallback((taskId: string, progress: number) => {
    tasksState = tasksState.map((t) =>
      t.id === taskId ? { ...t, bossProgress: Math.max(0, Math.min(100, progress)) } : t,
    );
    saveTasks();
    notifyAll();
  }, []);

  // 获取子任务
  const getSubTasks = useCallback(
    (parentId: string) => tasksState.filter((t) => t.parentId === parentId),
    [tasksState],
  );

  return {
    tasks,
    activeTrack,
    focusLogs,
    trackingTask,
    activeAttentionTasks,
    epicTasks,
    dailyTasks,
    currentTrackSeconds,
    focusTodaySeconds,
    addTask,
    updateTask,
    deleteTask,
    setTrackingTask,
    startTracking,
    pauseTracking,
    addAttentionTask,
    removeAttentionTask,
    completeTask,
    updateBossProgress,
    getSubTasks,
  };
}
