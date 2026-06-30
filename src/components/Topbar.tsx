import { useMemo } from 'react';
import { Gem, Star, Timer, ScrollText, Minimize2 } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useShop } from '@/hooks/useShop';
import { useSettings } from '@/hooks/useSettings';
import { useFloatingMode } from '@/hooks/useFloatingMode';
import { formatDuration } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Topbar() {
  const { activeAttentionTasks, focusTodaySeconds } = useTasks();
  const { reputation } = useShop();
  const { settings } = useSettings();

  const manaUsed = activeAttentionTasks.length;
  const manaMax = settings.manaMax;

  const { setFloatingMode } = useFloatingMode();

  const handleMinimize = () => {
    setFloatingMode();
    toast.success('已最小化到悬浮窗', {
      description: '鼠标悬停悬浮条可展开完整功能',
    });
  };

  const manaCrystals = useMemo(() => {
    const crystals = [];
    for (let i = 0; i < manaMax; i++) {
      crystals.push(i < manaUsed);
    }
    return crystals;
  }, [manaUsed, manaMax]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-card/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <ScrollText className="h-6 w-6 text-primary" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground tracking-wide">悬赏任务公会</span>
            <span className="text-[10px] text-muted-foreground tracking-widest">QUEST GUILD</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* 最小化到悬浮窗 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMinimize}
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
            title="最小化到悬浮窗"
          >
            <Minimize2 className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* 法力水晶 */}
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/40 px-3 py-1.5">
            <Gem className="h-4 w-4 text-accent" />
            <span className="text-xs text-muted-foreground">法力水晶</span>
            <div className="flex items-center gap-1">
              {manaCrystals.map((filled, i) => (
                <div
                  key={i}
                  className={`h-3 w-3 rotate-45 border ${
                    filled
                      ? 'border-accent bg-accent shadow-[0_0_8px_var(--color-accent)]'
                      : 'border-muted-foreground/40 bg-transparent'
                  }`}
                />
              ))}
            </div>
            <span className="ml-1 text-xs font-semibold tabular-nums text-foreground">
              {manaUsed}/{manaMax}
            </span>
          </div>

          {/* 公会声望 */}
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/40 px-3 py-1.5">
            <Star className="h-4 w-4 text-primary fill-primary/30" />
            <span className="text-xs text-muted-foreground">公会声望</span>
            <span className="text-sm font-bold tabular-nums text-primary">
              {reputation.toLocaleString()}
            </span>
          </div>

          {/* 今日专注 */}
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/40 px-3 py-1.5">
            <Timer className="h-4 w-4 text-success" />
            <span className="text-xs text-muted-foreground">今日专注</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {formatDuration(focusTodaySeconds)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
