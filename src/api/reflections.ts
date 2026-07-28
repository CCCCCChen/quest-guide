import api from './client';
import type { IReflection } from '@/types/quest';

export const reflectionsApi = {
  getAll: (params?: { taskId?: string }) => {
    const qs = params?.taskId ? `?taskId=${encodeURIComponent(params.taskId)}` : '';
    return api.get<IReflection[]>(`/reflections${qs}`);
  },
  create: (reflection: Partial<IReflection> & { taskId: string }) =>
    api.post<IReflection>('/reflections', reflection),
  update: (id: string, patch: Partial<IReflection>) =>
    api.put<IReflection>(`/reflections/${id}`, patch),
  remove: (id: string) =>
    api.delete<{ success: boolean }>(`/reflections/${id}`),
};

export default reflectionsApi;
