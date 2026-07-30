import api from './client';
import type { IQuestTask, IActiveTrack, IFocusLog, TaskDifficulty, TaskType } from '@/types/quest';

export const tasksApi = {
  getAll: () => api.get<IQuestTask[]>('/tasks'),

  create: (data: {
    id?: string;
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
  }) => api.post<IQuestTask>('/tasks', data),

  update: (id: string, patch: Partial<IQuestTask>) =>
    api.patch<IQuestTask>(`/tasks/${id}`, patch),

  remove: (id: string) => api.delete<{ success: boolean }>(`/tasks/${id}`),

  complete: (id: string) => api.post<IQuestTask>(`/tasks/${id}/complete`),

  addAttention: (id: string, maxAttention: number) =>
    api.post<IQuestTask>(`/tasks/${id}/attention`, { maxAttention }),

  removeAttention: (id: string) =>
    api.delete<{ success: boolean }>(`/tasks/${id}/attention`),

  decompose: (data: { name: string; description?: string; difficulty?: string; type?: string; estimatedMinutes?: number }) =>
    api.post<{ subtasks: Partial<IQuestTask>[] }>('/tasks/decompose', data),

  getActiveTrack: () => api.get<IActiveTrack | null>('/active-track'),

  setActiveTrack: (taskId: string | null) =>
    api.post<IActiveTrack | null>('/active-track', { taskId }),

  startTracking: () => api.post<{ ok: boolean }>('/active-track/start'),

  pauseTracking: () => api.post<{ ok: boolean }>('/active-track/pause'),

  getFocusLogs: () => api.get<IFocusLog[]>('/focus-logs'),

  bootstrap: (data: { tasks?: IQuestTask[]; skills?: unknown[]; shopItems?: unknown[] }) =>
    api.post<{ success: boolean }>('/bootstrap', data),
};

export default tasksApi;
