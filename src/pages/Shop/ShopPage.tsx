import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store,
  Plus,
  Gift,
  History,
  Coins,
  Sparkles,
  ShoppingBag,
  X,
  Trash2,
  Package,
  Check,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useShop } from '@/hooks/useShop';
import { generateId, formatDateTime } from '@/lib/utils';
import type { IShopItem } from '@/types/quest';

const ICON_OPTIONS = [
  { value: '🎁', label: '礼物' },
  { value: '☕', label: '咖啡' },
  { value: '🎬', label: '电影' },
  { value: '🎮', label: '游戏' },
  { value: '📚', label: '书籍' },
  { value: '🍕', label: '美食' },
  { value: '✈️', label: '旅行' },
  { value: '🛌', label: '休息' },
  { value: '💎', label: '宝石' },
  { value: '🏆', label: '奖杯' },
  { value: '🎨', label: '艺术' },
  { value: '🎵', label: '音乐' },
  { value: '🎯', label: '目标' },
  { value: '🌟', label: '星星' },
  { value: '🔧', label: '工具' },
];

const COLOR_OPTIONS = [
  { value: 'gold', label: '金色', class: 'from-primary/20 to-primary/5 border-primary/40' },
  { value: 'purple', label: '紫色', class: 'from-accent/20 to-accent/5 border-accent/40' },
  { value: 'green', label: '绿色', class: 'from-success/20 to-success/5 border-success/40' },
  { value: 'blue', label: '蓝色', class: 'from-info/20 to-info/5 border-info/40' },
  { value: 'red', label: '红色', class: 'from-destructive/20 to-destructive/5 border-destructive/40' },
  { value: 'orange', label: '橙色', class: 'from-warning/20 to-warning/5 border-warning/40' },
];

function getColorClass(color?: string): string {
  const found = COLOR_OPTIONS.find((c) => c.value === color);
  return found?.class ?? COLOR_OPTIONS[0].class;
}

export default function ShopPage() {
  const {
    shopItems,
    reputation,
    redemptions,
    addShopItem,
    removeShopItem,
    updateShopItem,
    redeemItem,
  } = useShop();

  const [activeTab, setActiveTab] = useState<string>('shop');
  const [addOpen, setAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IShopItem | null>(null);
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('50');
  const [newIcon, setNewIcon] = useState('🎁');
  const [newColor, setNewColor] = useState('gold');
  const [newDesc, setNewDesc] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'mock' | 'user'>('all');

  const filteredItems = useMemo(() => {
    let items = [...shopItems];
    if (filterCategory !== 'all') {
      items = items.filter((i) => i.source === filterCategory);
    }
    return items.sort((a, b) => a.cost - b.cost);
  }, [shopItems, filterCategory]);

  const sortedRedemptions = useMemo(() => {
    return [...redemptions].sort((a, b) => b.redeemedAt - a.redeemedAt);
  }, [redemptions]);

  const handleAddItem = () => {
    if (!newName.trim()) {
      toast.error('请输入商品名称');
      return;
    }
    const cost = parseInt(newCost, 10);
    if (isNaN(cost) || cost <= 0) {
      toast.error('请输入有效的积分数');
      return;
    }

    if (editingItem) {
      // 编辑模式
      updateShopItem(editingItem.id, {
        name: newName.trim(),
        cost,
        icon: newIcon,
        color: newColor,
        description: newDesc.trim() || undefined,
      });
    } else {
      // 新增模式
      const item: IShopItem = {
        id: generateId('shop'),
        name: newName.trim(),
        cost,
        icon: newIcon,
        color: newColor,
        description: newDesc.trim() || undefined,
        source: 'user',
        createdAt: Date.now(),
      };
      addShopItem(item);
    }

    resetForm();
  };

  const startEdit = (item: IShopItem) => {
    setEditingItem(item);
    setNewName(item.name);
    setNewCost(String(item.cost));
    setNewIcon(item.icon);
    setNewColor(item.color || 'gold');
    setNewDesc(item.description || '');
    setAddOpen(true);
  };

  const resetForm = () => {
    setAddOpen(false);
    setEditingItem(null);
    setNewName('');
    setNewCost('50');
    setNewIcon('🎁');
    setNewColor('gold');
    setNewDesc('');
  };

  const handleRedeem = (item: IShopItem) => {
    if (reputation < item.cost) {
      toast.error('声望不足，继续完成任务吧！');
      return;
    }
    redeemItem(item.id);
  };

  const handleRemove = (item: IShopItem) => {
    removeShopItem(item.id);
    toast.info(`已删除商品「${item.name}」`);
  };

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-wide">
                公会商店
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                用声望积分兑换你心仪的奖励
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2">
            <Coins className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">当前声望</span>
            <span className="text-lg font-bold tabular-nums text-primary">
              {reputation.toLocaleString()}
            </span>
          </div>
          <Dialog open={addOpen} onOpenChange={(open) => { if (!open) resetForm(); else setAddOpen(true); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                添加商品
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {editingItem ? <Pencil className="h-5 w-5 text-primary" /> : <Gift className="h-5 w-5 text-primary" />}
                  {editingItem ? '编辑奖励' : '添加自定义奖励'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>商品名称</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="例如：看一部电影"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>所需积分</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newCost}
                      onChange={(e) => setNewCost(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>图标</Label>
                    <Select value={newIcon} onValueChange={setNewIcon}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="mr-2">{opt.value}</span>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>卡片颜色</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setNewColor(opt.value)}
                        className={`h-9 w-9 rounded-md border-2 transition-all ${
                          newColor === opt.value
                            ? 'border-primary scale-110'
                            : 'border-border/50 hover:border-border'
                        } bg-gradient-to-br ${opt.class}`}
                        title={opt.label}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>描述（可选）</Label>
                  <Input
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="简短描述这个奖励"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary" onClick={resetForm}>取消</Button>
                </DialogClose>
                <Button onClick={handleAddItem}>{editingItem ? '保存修改' : '确认添加'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 主体 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="shop" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            商品列表
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            已兑换记录
            {redemptions.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {redemptions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shop" className="mt-0">
          {/* 筛选 */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">分类：</span>
            <div className="flex gap-1">
              {[
                { value: 'all', label: '全部' },
                { value: 'mock', label: '预设' },
                { value: 'user', label: '自定义' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterCategory(opt.value as typeof filterCategory)}
                  className={`rounded-md px-3 py-1 text-xs transition-colors ${
                    filterCategory === opt.value
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 商品网格 */}
          {filteredItems.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">暂无商品</p>
                <Button
                  variant="secondary"
                  className="mt-4 gap-2"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  添加第一个奖励
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item, i) => {
                  const canAfford = reputation >= item.cost;
                  const colorClass = getColorClass(item.color);
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, delay: i * 0.03 }}
                      whileHover={{ y: -4 }}
                    >
                      <Card
                        className={`relative h-full overflow-hidden border bg-gradient-to-br ${colorClass} transition-all hover:shadow-lg hover:shadow-primary/10 group`}
                      >
                        {/* 编辑/删除按钮（仅自定义） */}
                        {item.source === 'user' && (
                          <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={(e) => { e.stopPropagation(); startEdit(item); }}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-muted-foreground hover:text-primary"
                              title="编辑"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemove(item)}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-muted-foreground hover:text-destructive"
                              title="删除"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}

                        <CardContent className="flex flex-col items-center p-6 text-center">
                          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-card/60 text-3xl shadow-inner backdrop-blur-sm border border-border/40">
                            {item.icon}
                          </div>
                          <h3 className="text-base font-semibold text-foreground mb-1">
                            {item.name}
                          </h3>
                          {item.description && (
                            <p className="mb-3 text-xs text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <div className="mt-auto flex items-center gap-1.5 pt-3">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-lg font-bold tabular-nums text-primary">
                              {item.cost}
                            </span>
                            <span className="text-xs text-muted-foreground">声望</span>
                          </div>
                          <Button
                            className="mt-4 w-full gap-1.5"
                            variant={canAfford ? 'default' : 'secondary'}
                            disabled={!canAfford}
                            onClick={() => handleRedeem(item)}
                          >
                            {canAfford ? (
                              <>
                                <Gift className="h-4 w-4" />
                                立即兑换
                              </>
                            ) : (
                              <>声望不足</>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-primary" />
                兑换记录
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {sortedRedemptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Gift className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">暂无兑换记录</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    完成任务获得声望，来兑换你喜欢的奖励吧
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {sortedRedemptions.map((r, i) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.02 }}
                      className="flex items-center gap-4 px-6 py-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg">
                        <Check className="h-4 w-4 text-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">
                          {r.itemName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(r.redeemedAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <span className="text-sm font-semibold tabular-nums text-primary">
                          -{r.cost}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
