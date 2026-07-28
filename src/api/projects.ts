import api from './client';
import type { IProject } from '@/types/quest';

export const projectsApi = {
  getAll: (params?: { goalId?: string }) => {
    const qs = params?.goalId ? `?goalId=${encodeURIComponent(params.goalId)}` : '';
    return api.get<IProject[]>(`/projects${qs}`);
  },
  create: (project: Partial<IProject> & { name: string }) =>
    api.post<IProject>('/projects', project),
  update: (id: string, patch: Partial<IProject>) =>
    api.put<IProject>(`/projects/${id}`, patch),
  remove: (id: string) =>
    api.delete<{ success: boolean }>(`/projects/${id}`),
};

export default projectsApi;
