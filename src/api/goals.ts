import api from './client';
import type { IGoal } from '@/types/quest';

export const goalsApi = {
  getAll: () => api.get<IGoal[]>('/goals'),
  create: (goal: Partial<IGoal> & { name: string }) =>
    api.post<IGoal>('/goals', goal),
  update: (id: string, patch: Partial<IGoal>) =>
    api.put<IGoal>(`/goals/${id}`, patch),
  remove: (id: string) =>
    api.delete<{ success: boolean }>(`/goals/${id}`),
};

export default goalsApi;
