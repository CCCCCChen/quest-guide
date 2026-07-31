import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { IQuestTask, IActiveTrack, IFocusLog, TaskType, TaskDifficulty } from '@/types/quest';
import { PRESET_TASKS, PRESET_FOCUS_LOGS } from '@/data/preset';
import { playSound } from '@/lib/sound';
import { store, subscribeStorageChange } from '@/lib/storage';
import { appLogger } from '@/lib/runtime';
import { tasksApi } from '@/api';
import { grantCapabilityExperience } from '@/hooks/useSkills';

const STORAGE_KEY_TASKS = '__quest_guild_tasks';
const STORAGE_KEY_TRACK = '__quest_guild_active_track';
const STORAGE_KEY_FOCUS_LOG = '__quest_guild_focus_log';

function loadTasksFromCache(): IQuestTask[] {
  try {
    const raw = store.getItem(STORAGE_KEY_TASKS);
    if (raw) {
      const parsed = JSON.parse(raw) as IQuestTask[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return PRESET_TASKS;
}

function loadTrackFromCache(): IActiveTrack | null {
  try {
    const raw = store.getItem(STORAGE_KEY_TRACK);
    if (raw) return JSON.parse(raw) as IActiveTrack;
  } catch { /* ignore */ }
  return null;
}

function loadFocusLogsFromCache(): IFocusLog[] {
  try {
    const raw = store.getItem(STORAGE_KEY_FOCUS_LOG);
    if (raw) return JSON.parse(raw) as IFocusLog[];
  } catch { /* ignore */ }
  return PRESET_FOCUS_LOGS;
}

function saveTasksCache(tasks: IQuestTask[]) {
  try { store.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks)); } catch { /* ignore */ }
}

function saveTrackCache(track: IActiveTrack | null) {
  try {
    if (track) store.setItem(STORAGE_KEY_TRACK, JSON.stringify(track));
    else store.removeItem(STORAGE_KEY_TRACK);
  } catch { /* ignore */ }
}

function saveFocusLogsCache(logs: IFocusLog[]) {
  try { store.setItem(STORAGE_KEY_FOCUS_LOG, JSON.stringify(logs)); } catch { /* ignore */ }
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
let tasksState: IQuestTask[] = loadTasksFromCache();
let trackState: IActiveTrack | null = loadTrackFromCache();
let focusLogsState: IFocusLog[] = loadFocusLogsFromCache();
let initialized = false;

// 计时 tick：每秒更新一次追踪任务累计时长
let timerId: number | null = null;
function ensureTimer() {
  if (timerId !== null) return;
  timerId = window.setInterval(() => {
    globalTick++;
    notifyAll();
  }, 1000);
}

function calcReputation(difficulty: TaskDifficulty, estimatedMinutes: number): number {
  const base = { easy: 5, normal: 10, hard: 25, epic: 80 }[difficulty];
  return base + Math.floor(estimatedMinutes / 10) * 2;
}

function calcSkillPoints(difficulty: TaskDifficulty): number {
  return { easy: 0, normal: 0, hard: 1, epic: 3 }[difficulty];
}

function genId(prefix = 't'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// 从服务端拉取最新数据
async function syncFromServer() {
  try {
    const [tasks, track, logs] = await Promise.all([
      tasksApi.getAll(),
      tasksApi.getActiveTrack(),
      tasksApi.getFocusLogs(),
    ]);
    tasksState = tasks;
    trackState = track;
    focusLogsState = logs;
    saveTasksCache(tasks);
    saveTrackCache(track);
    saveFocusLogsCache(logs);
    notifyAll();
  } catch (e) {
    appLogger.error('同步服务端数据失败，使用本地缓存', String(e));
  } finally {
    initialized = true;
  }
}

// ========== 跨窗口同步 ==========
// 订阅存储变更事件：其他窗口修改数据时，本窗口自动从 electron-store 重载
subscribeStorageChange((event) => {
  if (event.key === STORAGE_KEY_TASKS) {
    tasksState = loadTasksFromCache();
    notifyAll();
  } else if (event.key === STORAGE_KEY_TRACK) {
    trackState = loadTrackFromCache();
    notifyAll();
  } else if (event.key === STORAGE_KEY_FOCUS_LOG) {
    focusLogsState = loadFocusLogsFromCache();
    notifyAll();
  }
});

export function useTasks() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    ensureTimer();

    if (!initialized) {
      initialized = true;
      syncFromServer();
    }

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
  }, [activeTrack]);

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
      goalId?: string;
      projectId?: string;
      capabilityIds?: string[];
      bossName?: string;
      parentId?: string;
      stage?: number;
      tags?: string[];
    }) => {
      const rewardReputation = calcReputation(data.difficulty, data.estimatedMinutes);
      const rewardSkillPoints = calcSkillPoints(data.difficulty);

      // 计算 stage：传入时优先使用；否则每日悬赏为 0，史诗父任务为 1，史诗子任务编号递增
      let stage: number;
      if (data.stage !== undefined) {
        stage = data.stage;
      } else if (data.type === 'epic') {
        if (data.parentId) {
          const siblings = tasksState.filter((t) => t.parentId === data.parentId);
          stage = siblings.length + 1;
        } else {
          stage = 1;
        }
      } else {
        stage = 0;
      }

      const newTask: IQuestTask = {
        id: genId(data.type === 'epic' ? 'ep' : 'dy'),
        name: data.name,
        description: data.description || '',
        type: data.type,
        difficulty: data.difficulty,
        estimatedMinutes: data.estimatedMinutes,
        actualMinutes: 0,
        relatedSkillId: data.relatedSkillId,
        goalId: data.goalId,
        projectId: data.projectId,
        capabilityIds: data.capabilityIds || (data.relatedSkillId ? [data.relatedSkillId] : []),
        bossName: data.bossName,
        bossProgress: 0,
        parentId: data.parentId,
        stage,
        status: 'pending',
        isTracking: false,
        isAttention: false,
        rewardReputation,
        rewardSkillPoints,
        createdAt: Date.now(),
        source: 'user',
        tags: data.tags || [],
      };

      // 乐观更新
      tasksState = [...tasksState, newTask];
      saveTasksCache(tasksState);
      notifyAll();

      // 异步同步到服务端（传前端生成的 id，保持父子关系一致）
      tasksApi.create({ ...data, id: newTask.id, stage }).catch((e) => {
        toast.error('任务同步失败', { description: String(e) });
      });

      toast.success(`任务「${data.name}」已加入悬赏池`);
      return newTask;
    },
    [],
  );

  const updateTask = useCallback((id: string, patch: Partial<IQuestTask>) => {
    tasksState = tasksState.map((t) => (t.id === id ? { ...t, ...patch } : t));
    saveTasksCache(tasksState);
    notifyAll();
    tasksApi.update(id, patch).catch(() => {/* 静默失败 */});
  }, []);

  const deleteTask = useCallback((id: string) => {
    const task = tasksState.find((t) => t.id === id);
    tasksState = tasksState.filter((t) => t.id !== id && t.parentId !== id);
    if (trackState?.taskId === id) {
      trackState = null;
      saveTrackCache(null);
    }
    saveTasksCache(tasksState);
    notifyAll();
    tasksApi.remove(id).catch(() => {/* 静默失败 */});
    toast.success(`任务「${task?.name || ''}」已移除`);
  }, []);

  // 设为追踪任务
  const setTrackingTask = useCallback(
    (taskId: string | null) => {
      tasksState = tasksState.map((t) => ({ ...t, isTracking: false }));

      if (!taskId) {
        if (trackState?.isRunning && trackState.lastStartTime) {
          const elapsed = Math.floor((Date.now() - trackState.lastStartTime) / 1000);
          trackState = { ...trackState, accumulatedSeconds: trackState.accumulatedSeconds + elapsed, isRunning: false, lastStartTime: undefined };
        }
        trackState = null;
        saveTrackCache(null);
        saveTasksCache(tasksState);
        notifyAll();
        tasksApi.setActiveTrack(null).catch(() => {});
        return;
      }

      const task = tasksState.find((t) => t.id === taskId);
      if (!task) return;

      if (task.isAttention) {
        tasksState = tasksState.map((t) =>
          t.id === taskId ? { ...t, isAttention: false, isTracking: true, status: 'active' } : t,
        );
      } else {
        tasksState = tasksState.map((t) =>
          t.id === taskId ? { ...t, isTracking: true, status: 'active' } : t,
        );
      }

      let accumulatedSeconds = 0;
      if (trackState?.taskId === taskId) {
        accumulatedSeconds = trackState.accumulatedSeconds;
        if (trackState.isRunning && trackState.lastStartTime) {
          accumulatedSeconds += Math.floor((Date.now() - trackState.lastStartTime) / 1000);
        }
      }

      trackState = { taskId, accumulatedSeconds, isRunning: false };
      saveTrackCache(trackState);
      saveTasksCache(tasksState);
      notifyAll();
      tasksApi.setActiveTrack(taskId).catch(() => {});
      toast.success(`「${task.name}」已设为主线追踪任务`);
    },
    [],
  );

  const startTracking = useCallback(() => {
    if (!trackState) return;
    if (trackState.isRunning) return;
    trackState = { ...trackState, isRunning: true, lastStartTime: Date.now() };
    saveTrackCache(trackState);
    notifyAll();
    tasksApi.startTracking().catch(() => {});
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
    saveTrackCache(trackState);
    notifyAll();
    tasksApi.pauseTracking().catch(() => {});
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
      saveTasksCache(tasksState);
      notifyAll();
      tasksApi.addAttention(taskId, maxAttention).catch(() => {});
      toast.success(`「${task.name}」已加入注意力任务`);
      return true;
    },
    [],
  );

  const removeAttentionTask = useCallback((taskId: string) => {
    tasksState = tasksState.map((t) =>
      t.id === taskId ? { ...t, isAttention: false } : t,
    );
    saveTasksCache(tasksState);
    notifyAll();
    tasksApi.removeAttention(taskId).catch(() => {});
  }, []);

  // 完成任务
  const completeTask = useCallback(
    (taskId: string) => {
      const task = tasksState.find((t) => t.id === taskId);
      if (!task) return;

      let actualSeconds = 0;
      if (task.isTracking && trackState?.taskId === taskId) {
        actualSeconds = trackState.accumulatedSeconds;
        if (trackState.isRunning && trackState.lastStartTime) {
          actualSeconds += Math.floor((Date.now() - trackState.lastStartTime) / 1000);
        }
        const log: IFocusLog = {
          id: genId('fl'),
          taskId,
          date: todayStr(),
          durationMinutes: Math.max(1, Math.round(actualSeconds / 60)),
          completedAt: Date.now(),
        };
        focusLogsState = [...focusLogsState, log];
        saveFocusLogsCache(focusLogsState);
        trackState = null;
        saveTrackCache(null);
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

      // 史诗任务：检查子任务
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
          const total = siblings.length + 1;
          const done = siblings.filter((t) => t.status === 'completed').length + 1;
          const progress = Math.round((done / total) * 100);
          tasksState = tasksState.map((t) =>
            t.id === task.parentId ? { ...t, bossProgress: progress } : t,
          );
        }
      }

      saveTasksCache(tasksState);
      notifyAll();

      tasksApi.complete(taskId).catch(() => {});

      if (task.relatedSkillId) {
        const minutes = actualMinutes > 0 ? actualMinutes : task.estimatedMinutes;
        grantCapabilityExperience(task.relatedSkillId, minutes);
      }

      toast.success(`🎉 任务完成！获得 ${task.rewardReputation} 声望${task.rewardSkillPoints > 0 ? ` + ${task.rewardSkillPoints} 能力点` : ''}`);

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
    saveTasksCache(tasksState);
    notifyAll();
    tasksApi.update(taskId, { bossProgress: Math.max(0, Math.min(100, progress)) }).catch(() => {});
  }, []);

  // 获取子任务
  const getSubTasks = useCallback(
    (parentId: string) => tasksState.filter((t) => t.parentId === parentId),
    [],
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
