import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { IShopItem, IRedemption } from '@/types/quest';
import { PRESET_SHOP_ITEMS, INITIAL_REPUTATION } from '@/data/preset';
import { playSound } from '@/lib/sound';
import { createBackup } from '@/lib/backup';

const REPUTATION_KEY = '__quest_guild_reputation';
const SHOP_ITEMS_KEY = '__quest_guild_shop_items';
const REDEMPTIONS_KEY = '__quest_guild_redemptions';

function loadReputation(): number {
  try {
    const raw = localStorage.getItem(REPUTATION_KEY);
    if (raw === null) return INITIAL_REPUTATION;
    const v = parseInt(raw, 10);
    return Number.isFinite(v) ? v : INITIAL_REPUTATION;
  } catch {
    return INITIAL_REPUTATION;
  }
}

function loadShopItems(): IShopItem[] {
  try {
    const raw = localStorage.getItem(SHOP_ITEMS_KEY);
    if (!raw) {
      localStorage.setItem(SHOP_ITEMS_KEY, JSON.stringify(PRESET_SHOP_ITEMS));
      return PRESET_SHOP_ITEMS;
    }
    const parsed = JSON.parse(raw) as IShopItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(SHOP_ITEMS_KEY, JSON.stringify(PRESET_SHOP_ITEMS));
      return PRESET_SHOP_ITEMS;
    }
    return parsed;
  } catch {
    return PRESET_SHOP_ITEMS;
  }
}

function loadRedemptions(): IRedemption[] {
  try {
    const raw = localStorage.getItem(REDEMPTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as IRedemption[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let reputationCache: number | null = null;
let shopItemsCache: IShopItem[] | null = null;
let redemptionsCache: IRedemption[] | null = null;
const reputationListeners = new Set<(v: number) => void>();
const shopItemsListeners = new Set<(v: IShopItem[]) => void>();
const redemptionsListeners = new Set<(v: IRedemption[]) => void>();

function setReputationValue(v: number) {
  reputationCache = v;
  localStorage.setItem(REPUTATION_KEY, String(v));
  reputationListeners.forEach((fn) => fn(v));
}

function triggerBackup(reason: string) {
  try {
    createBackup(reason);
  } catch {
    // ignore
  }
}

function setShopItemsValue(items: IShopItem[]) {
  shopItemsCache = items;
  localStorage.setItem(SHOP_ITEMS_KEY, JSON.stringify(items));
  shopItemsListeners.forEach((fn) => fn(items));
}

function setRedemptionsValue(items: IRedemption[]) {
  redemptionsCache = items;
  localStorage.setItem(REDEMPTIONS_KEY, JSON.stringify(items));
  redemptionsListeners.forEach((fn) => fn(items));
}

export function useShop() {
  const [reputation, setReputationState] = useState<number>(
    () => reputationCache ?? loadReputation()
  );
  const [shopItems, setShopItemsState] = useState<IShopItem[]>(
    () => shopItemsCache ?? loadShopItems()
  );
  const [redemptions, setRedemptionsState] = useState<IRedemption[]>(
    () => redemptionsCache ?? loadRedemptions()
  );

  useEffect(() => {
    if (reputationCache === null) reputationCache = reputation;
    const fn = (v: number) => setReputationState(v);
    reputationListeners.add(fn);
    return () => {
      reputationListeners.delete(fn);
    };
  }, [reputation]);

  useEffect(() => {
    if (shopItemsCache === null) shopItemsCache = shopItems;
    const fn = (v: IShopItem[]) => setShopItemsState(v);
    shopItemsListeners.add(fn);
    return () => {
      shopItemsListeners.delete(fn);
    };
  }, [shopItems]);

  useEffect(() => {
    if (redemptionsCache === null) redemptionsCache = redemptions;
    const fn = (v: IRedemption[]) => setRedemptionsState(v);
    redemptionsListeners.add(fn);
    return () => {
      redemptionsListeners.delete(fn);
    };
  }, [redemptions]);

  const addReputation = useCallback((amount: number, reason?: string) => {
    const next = Math.max(0, (reputationCache ?? 0) + amount);
    setReputationValue(next);
    if (amount > 0) {
      toast.success(`获得 ${amount} 声望${reason ? ` · ${reason}` : ''}`, {
        description: '公会声望 +' + amount,
      });
    }
  }, []);

  const addShopItem = useCallback(
    (item: Omit<IShopItem, 'id' | 'createdAt' | 'source'>) => {
      const newItem: IShopItem = {
        ...item,
        id: `shop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: Date.now(),
        source: 'user',
      };
      const next = [...(shopItemsCache ?? []), newItem];
      setShopItemsValue(next);
      triggerBackup(`新增商品：${item.name}`);
      toast.success('商品已上架', { description: item.name });
      return newItem;
    },
    []
  );

  const deleteShopItem = useCallback((itemId: string) => {
    const list = shopItemsCache ?? [];
    const target = list.find((i) => i.id === itemId);
    if (!target) return;
    if (target.source === 'mock') {
      toast.error('预设商品不可删除');
      return;
    }
    const next = list.filter((i) => i.id !== itemId);
    setShopItemsValue(next);
    triggerBackup(`删除商品：${target.name}`);
    toast.success('商品已下架', { description: target.name });
  }, []);

  const redeemItem = useCallback(
    (itemId: string) => {
      const list = shopItemsCache ?? [];
      const item = list.find((i) => i.id === itemId);
      if (!item) {
        toast.error('商品不存在');
        return false;
      }
      const current = reputationCache ?? 0;
      if (current < item.cost) {
        toast.error('声望不足', {
          description: `还需 ${item.cost - current} 声望`,
        });
        return false;
      }
      setReputationValue(current - item.cost);
      const redemption: IRedemption = {
        id: `red_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        itemId: item.id,
        itemName: item.name,
        cost: item.cost,
        redeemedAt: Date.now(),
      };
      const nextRedemptions = [redemption, ...(redemptionsCache ?? [])];
      setRedemptionsValue(nextRedemptions);
      triggerBackup(`兑换：${item.name}`);
      toast.success('兑换成功！', {
        description: `${item.icon} ${item.name} · 消耗 ${item.cost} 声望`,
      });
      playSound('redeem');
      return true;
    },
    []
  );

  const resetShop = useCallback(() => {
    setShopItemsValue(PRESET_SHOP_ITEMS);
    setRedemptionsValue([]);
    toast.info('商店已重置');
  }, []);

  // 累计获得的声望 = 当前声望 + 已消耗（兑换总额）
  const totalEarnedReputation = useMemo(() => {
    const spent = (redemptionsCache ?? []).reduce((sum, r) => sum + r.cost, 0);
    return (reputationCache ?? 0) + spent;
  }, [reputation, redemptions]);

  return {
    reputation,
    shopItems,
    redemptions,
    totalEarnedReputation,
    addReputation,
    addShopItem,
    deleteShopItem,
    redeemItem,
    resetShop,
    setReputationValue,
  };
}
