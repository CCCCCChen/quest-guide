import api from './client';
import type { ISkillNode } from '@/types/quest';

export const skillsApi = {
  getAll: () => api.get<ISkillNode[]>('/skills'),
  getSkillPoints: () => api.get<number>('/skill-points'),
  unlock: (id: string) => api.post<{ success: boolean }>(`/skills/${id}/unlock`),
  enhance: (id: string) => api.post<{ success: boolean }>(`/skills/${id}/enhance`),
  batchInit: (skills: ISkillNode[]) =>
    api.post<{ success: boolean; count: number }>('/skills/batch-init', skills),
  // 管理接口
  create: (skill: Partial<ISkillNode>) =>
    api.post<{ success: boolean; id: string }>('/skills', skill),
  update: (id: string, data: Partial<ISkillNode>) =>
    api.put<{ success: boolean }>(`/skills/${id}`, data),
  remove: (id: string) =>
    api.delete<{ success: boolean }>(`/skills/${id}`),
  import: (skills: ISkillNode[]) =>
    api.post<{ success: boolean; count: number }>('/skills/import', skills),
};

export default skillsApi;
