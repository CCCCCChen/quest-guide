import api from './client';
import type { IAppSettings } from '@/types/quest';

export const settingsApi = {
  get: () => api.get<IAppSettings>('/settings'),
  update: (patch: Partial<IAppSettings>) =>
    api.patch<IAppSettings>('/settings', patch),
};

export default settingsApi;
