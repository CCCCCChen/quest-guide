import api from './client';
import type { IShopItem, IRedemption } from '@/types/quest';

export const shopApi = {
  getItems: () => api.get<IShopItem[]>('/shop/items'),
  addItem: (item: Omit<IShopItem, 'id' | 'createdAt' | 'source'>) =>
    api.post<IShopItem>('/shop/items', item),
  deleteItem: (id: string) => api.delete<{ success: boolean }>(`/shop/items/${id}`),

  getReputation: () => api.get<number>('/shop/reputation'),
  addReputation: (amount: number) =>
    api.post<number>('/shop/reputation', { amount }),

  getRedemptions: () => api.get<IRedemption[]>('/shop/redemptions'),
  redeem: (itemId: string) =>
    api.post<IRedemption>(`/shop/redeem/${itemId}`),
};

export default shopApi;
