import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, Target, Sparkles, Gem, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTasks } from '@/hooks/useTasks';
import { useSettings } from '@/hooks/useSettings';
import { formatDuration, cn } from '@/lib/utils';
import TodayPage from '@/pages/Today/TodayPage';
import type { CSSProperties } from 'react';

export default function FloatingTodayPage({ isWindowMode = false }: { isWindowMode?: boolean }) {
  const { trackingTask, currentTrackSeconds, activeTrack, activeAttentionTasks, tasks } =
    useTasks();
  const { settings } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTrackingRunning = activeTrack?.isRunning ?? false;

  const completedToday = (() => {
    const today = new Date().toDateString();
    return tasks.filter(
      (t) =>
        t.status === 'completed' &&
        t.completedAt &&
        new Date(t.completedAt).toDateString() === today,
    ).length;
  })();

  const totalActiveToday =
    activeAttentionTasks.length +
    (trackingTask ? 1 : 0) +
    tasks.filter((t) => t.status === 'pending' && !t.parentId).length;

  const handleExpand = useCallback(() => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    setIsExpanded(true);
    if (typeof window !== 'undefined' && (window as any).electronAPI?.window?.expandFloat) {
      (window as any).electronAPI.window.expandFloat();
    }
  }, []);

  const handleCollapse = useCallback(() => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
    }
    collapseTimerRef.current = setTimeout(() => {
      setIsExpanded(false);
      if (typeof window !== 'undefined' && (window as any).electronAPI?.window?.collapseFloat) {
        (window as any).electronAPI.window.collapseFloat();
      }
    }, 800);
  }, []);

  const handleToggle = useCallback(() => {
    if (isExpanded) {
      setIsExpanded(false);
      if (typeof window !== 'undefined' && (window as any).electronAPI?.window?.collapseFloat) {
        (window as any).electronAPI.window.collapseFloat();
      }
    } else {
      handleExpand();
    }
  }, [isExpanded, handleExpand]);

  return (
    <div
      className="select-none w-full h-full"
      onMouseEnter={handleExpand}
      onMouseLeave={handleCollapse}
    >
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ WebkitAppRegion: 'drag' } as CSSProperties}
            className={cn(
              'w-full h-[72px] rounded-xl',
              'bg-card/90 backdrop-blur-xl border border-primary/40',
              'shadow-[0_0_20px_rgba(0_0_0_0.5),0_0_40px_var(--color-primary)/15]',
              'flex items-center gap-3 px-4',
              'hover:border-primary/60 hover:shadow-[0_0_20px_rgba(0_0_0_0.5),0_0_50px_var(--color-primary)/25]',
              'transition-shadow duration-300',
            )}
          >
            {/* 左侧：追踪任务信息 */}
            <div className="flex-1 min-w-0">
              {trackingTask ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">
                      {trackingTask.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-primary tabular-nums">
                      {formatDuration(currentTrackSeconds)}
                    </span>
                    {isTrackingRunning && (
                      <span className="flex items-center gap-1 text-[10px] text-success">
                        <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                        计时中
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">暂无追踪任务</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground/60">悬停展开今日任务</div>
                </div>
              )}
            </div>

            {/* 右侧：状态指示器 */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  <ListChecks className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] tabular-nums text-foreground">
                    {completedToday}/{totalActiveToday}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Gem className="h-3 w-3 text-accent" />
                  <span className="text-[11px] tabular-nums text-accent">
                    {activeAttentionTasks.length}/{settings.manaMax}
                  </span>
                </div>
              </div>
              <div className="h-8 w-px bg-border/50" />
              <div className="h-2 w-2 rounded-full bg-primary/60 animate-pulse" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'w-full h-full rounded-xl',
              'bg-card/95 backdrop-blur-2xl border border-primary/40',
              'shadow-[0_0_30px_rgba(0_0_0_0.6),0_0_60px_var(--color-primary)/20]',
              'flex flex-col overflow-hidden',
            )}
          >
            {/* 头部栏 */}
            <div
              style={{ WebkitAppRegion: 'drag' } as CSSProperties}
              className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 shrink-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10"
            >
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="text-sm font-bold text-foreground">今日任务</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-secondary/60"
                  style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
                  onClick={handleToggle}
                  title="收起"
                >
                  <Minimize2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
            {/* 滚动内容区 */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="p-3">
                <TodayPage />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
