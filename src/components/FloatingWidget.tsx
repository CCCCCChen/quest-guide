import { useState, useRef, useCallback, useEffect, useMemo, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Check,
  Plus,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
  Gem,
  Target,
  ListChecks,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTasks } from '@/hooks/useTasks';
import { useShop } from '@/hooks/useShop';
import { useSettings } from '@/hooks/useSettings';
import { useFloatingMode } from '@/hooks/useFloatingMode';
import { formatDuration, cn } from '@/lib/utils';
import type { IQuestTask, TaskDifficulty } from '@/types/quest';
import { toast } from 'sonner';
import { Trophy } from 'lucide-react';

const DIFFICULTY_COLORS: Record<TaskDifficulty, string> = {
  easy: 'bg-success/15 text-success border-success/30',
  normal: 'bg-info/15 text-info border-info/30',
  hard: 'bg-warning/15 text-warning border-warning/30',
  epic: 'bg-accent/15 text-accent border-accent/30',
};

const DIFFICULTY_LABELS: Record<TaskDifficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
  epic: '史诗',
};

export default function FloatingWidget({ isWindowMode = false }: { isWindowMode?: boolean }) {
  const {
    tasks,
    trackingTask,
    activeAttentionTasks,
    activeTrack,
    currentTrackSeconds,
    startTracking,
    pauseTracking,
    completeTask,
    addTask,
    setTrackingTask,
    addAttentionTask,
  } = useTasks();
  const { addReputation } = useShop();
  const { settings, updateSettings } = useSettings();
  const { setFullMode } = useFloatingMode();

  const [isPinned, setIsPinned] = useState(false);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickMinutes, setQuickMinutes] = useState('25');
  const [quickDifficulty, setQuickDifficulty] = useState<TaskDifficulty>('normal');
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  });

  const isTrackingRunning = activeTrack?.isRunning ?? false;

  const completedToday = useMemo(() => {
    const today = new Date().toDateString();
    return tasks.filter(
      (t) =>
        t.status === 'completed' &&
        t.completedAt &&
        new Date(t.completedAt).toDateString() === today,
    ).length;
  }, [tasks]);

  const totalActiveToday = useMemo(() => {
    return (
      activeAttentionTasks.length +
      (trackingTask ? 1 : 0) +
      tasks.filter((t) => t.status === 'pending' && !t.parentId).length
    );
  }, [activeAttentionTasks, trackingTask, tasks]);

  const position = settings.floatingPosition;
  const opacity = settings.floatingOpacity;
  const collapseDelay = settings.floatingCollapseDelay;

  const handleExpand = useCallback(() => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    setIsExpanded(true);
    // Electron 环境下通知主进程展开窗口（取消鼠标穿透）
    if (typeof window !== 'undefined' && (window as any).electronAPI?.window?.expandFloat) {
      (window as any).electronAPI.window.expandFloat();
    }
  }, []);

  const handleCollapse = useCallback(() => {
    if (isPinned) return;
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
    }
    collapseTimerRef.current = setTimeout(() => {
      setIsExpanded(false);
      // Electron 环境下通知主进程收起窗口（开启鼠标穿透）
      if (typeof window !== 'undefined' && (window as any).electronAPI?.window?.collapseFloat) {
        (window as any).electronAPI.window.collapseFloat();
      }
    }, collapseDelay);
  }, [collapseDelay, isPinned]);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (isExpanded) return;
      e.preventDefault();
      setIsDragging(true);
      dragStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: position.x,
        originY: position.y,
        moved: false,
      };
    },
    [isExpanded, position.x, position.y],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStateRef.current.startX;
      const dy = e.clientY - dragStateRef.current.startY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        dragStateRef.current.moved = true;
      }
      const newX = dragStateRef.current.originX + dx;
      const newY = dragStateRef.current.originY + dy;
      updateSettings({
        floatingPosition: { x: newX, y: newY },
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, updateSettings]);

  const handleComplete = useCallback(
    (task: IQuestTask) => {
      completeTask(task.id);
      addReputation(task.rewardReputation);
      toast.success(`任务完成！获得 ${task.rewardReputation} 声望`, {
        description: task.name,
        icon: <Trophy className="h-4 w-4 text-primary" />,
      });
    },
    [completeTask, addReputation],
  );

  const handleQuickSubmit = useCallback(() => {
    if (!quickName.trim()) return;
    const mins = parseInt(quickMinutes, 10) || 25;
    const newTask = addTask({
      name: quickName.trim(),
      description: '',
      type: 'daily',
      difficulty: quickDifficulty,
      estimatedMinutes: mins,
      tags: [],
    });
    if (activeAttentionTasks.length < settings.manaMax) {
      addAttentionTask(newTask.id, settings.manaMax);
    }
    setQuickOpen(false);
    setQuickName('');
    setQuickMinutes('25');
    toast.success('悬赏已发布', { description: newTask.name });
  }, [
    quickName,
    quickMinutes,
    quickDifficulty,
    addTask,
    activeAttentionTasks.length,
    settings.manaMax,
    addAttentionTask,
  ]);

  const handleSetTracking = useCallback(
    (taskId: string) => {
      setTrackingTask(taskId);
      toast.success('已设为追踪任务');
    },
    [setTrackingTask],
  );

  const handleExpandMain = useCallback(() => {
    setFullMode();
    // Electron 环境下通知主进程显示主窗口
    if (typeof window !== 'undefined' && (window as any).electronAPI?.window?.showMain) {
      (window as any).electronAPI.window.showMain();
    } else {
      toast.success('已展开主界面');
    }
  }, [setFullMode]);

  const widgetStyle: React.CSSProperties = isWindowMode
    ? { width: '100%', height: '100%' }
    : {
        position: 'fixed',
        right: position.x < 0 ? `${Math.abs(position.x)}px` : 'auto',
        left: position.x >= 0 ? `${position.x}px` : 'auto',
        bottom: position.y < 0 ? `${Math.abs(position.y)}px` : 'auto',
        top: position.y >= 0 ? `${position.y}px` : 'auto',
        zIndex: 9999,
      };

  return (
    <div
      ref={widgetRef}
      style={widgetStyle}
      className="select-none"
      onMouseEnter={handleExpand}
      onMouseLeave={handleCollapse}
    >
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{
              opacity: isDragging ? opacity * 0.6 : opacity,
              scale: isDragging ? 0.95 : 1,
              y: 0,
            }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={!isWindowMode ? handleDragStart : undefined}
            style={isWindowMode ? ({ WebkitAppRegion: 'drag', width: '100%' } as CSSProperties) : undefined}
            className={cn(
              isWindowMode ? 'w-full h-[72px] rounded-xl' : 'w-[360px] h-[72px] rounded-xl cursor-move',
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
                  <div className="text-[10px] text-muted-foreground/60">
                    悬停展开 · 拖拽移动
                  </div>
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
              isWindowMode ? 'w-full rounded-xl overflow-hidden' : 'w-[400px] rounded-xl overflow-hidden',
              'bg-card/95 backdrop-blur-2xl border border-primary/40',
              'shadow-[0_0_30px_rgba(0_0_0_0.6),0_0_60px_var(--color-primary)/20]',
            )}
          >
            {/* 头部 */}
            <div
              style={isWindowMode ? ({ WebkitAppRegion: 'drag' } as CSSProperties) : undefined}
              className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-gradient-to-r from-primary/10 via-transparent to-accent/10"
            >
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">悬赏任务公会</div>
                  <div className="text-[10px] text-muted-foreground">悬浮控制台</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-7 w-7 hover:bg-secondary/60',
                    isPinned && 'text-primary',
                  )}
                  style={isWindowMode ? ({ WebkitAppRegion: 'no-drag' } as CSSProperties) : undefined}
                  onClick={() => setIsPinned(!isPinned)}
                  title={isPinned ? '取消置顶' : '置顶'}
                >
                  {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-secondary/60"
                  style={isWindowMode ? ({ WebkitAppRegion: 'no-drag' } as CSSProperties) : undefined}
                  onClick={() => setIsExpanded(false)}
                  title="收起"
                >
                  <Minimize2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-secondary/60"
                  style={isWindowMode ? ({ WebkitAppRegion: 'no-drag' } as CSSProperties) : undefined}
                  onClick={handleExpandMain}
                  title="展开主界面"
                >
                  <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>

            {/* 内容区 */}
            <div className="max-h-[420px] overflow-y-auto p-4 space-y-4">
              {/* 追踪任务卡 */}
              {trackingTask ? (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 border-primary/40 text-primary bg-primary/10"
                        >
                          追踪中
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] h-5',
                            DIFFICULTY_COLORS[trackingTask.difficulty],
                          )}
                        >
                          {DIFFICULTY_LABELS[trackingTask.difficulty]}
                        </Badge>
                      </div>
                      <div className="text-sm font-semibold text-foreground truncate">
                        {trackingTask.name}
                      </div>
                      {trackingTask.bossName && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Boss: {trackingTask.bossName}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-xl font-bold text-primary tabular-nums">
                        {formatDuration(currentTrackSeconds)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        预估 {trackingTask.estimatedMinutes} 分钟
                      </div>
                    </div>
                  </div>

                  {trackingTask.bossName && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Boss 血量</span>
                        <span>{trackingTask.bossProgress}%</span>
                      </div>
                      <Progress
                        value={trackingTask.bossProgress}
                        className="h-1.5 bg-secondary/60"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {isTrackingRunning ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={pauseTracking}
                        className="flex-1 gap-1.5"
                      >
                        <Pause className="h-3.5 w-3.5" />
                        暂停
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={startTracking}
                        className="flex-1 gap-1.5 bg-gradient-to-r from-primary to-warning text-primary-foreground"
                      >
                        <Play className="h-3.5 w-3.5" />
                        开始专注
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleComplete(trackingTask)}
                      className="gap-1.5 border-success/40 text-success hover:bg-success/10 hover:text-success"
                    >
                      <Check className="h-3.5 w-3.5" />
                      完成
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/50 bg-secondary/20 p-4 text-center">
                  <Target className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <div className="text-sm text-muted-foreground">暂无追踪任务</div>
                  <div className="text-[11px] text-muted-foreground/60 mt-1">
                    从下方注意力任务中选择一个开始追踪
                  </div>
                </div>
              )}

              {/* 注意力任务列表 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Gem className="h-3.5 w-3.5 text-accent" />
                    <span className="text-xs font-semibold text-foreground">注意力任务</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {activeAttentionTasks.length}/{settings.manaMax}
                  </span>
                </div>

                {activeAttentionTasks.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border/40 bg-secondary/10 p-3 text-center">
                    <div className="text-xs text-muted-foreground">暂无激活的注意力任务</div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {activeAttentionTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          'group flex items-center gap-2 p-2 rounded-md',
                          'border border-border/40 bg-secondary/30',
                          'hover:border-accent/40 hover:bg-accent/10',
                          'transition-colors',
                        )}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 hover:bg-success/20 hover:text-success transition-opacity"
                          onClick={() => handleComplete(task)}
                          title="完成任务"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-foreground truncate">{task.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {task.estimatedMinutes} 分钟
                          </div>
                        </div>
                        {!trackingTask && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 hover:bg-primary/20 hover:text-primary transition-opacity"
                            onClick={() => handleSetTracking(task.id)}
                            title="设为追踪"
                          >
                            <Target className="h-3 w-3" />
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* 快速悬赏 */}
              <div className="space-y-2">
                {!quickOpen ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 border-dashed border-border/50 hover:border-primary/40 hover:bg-primary/5"
                    onClick={() => setQuickOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    快速发布悬赏
                  </Button>
                ) : (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">快速悬赏</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 hover:bg-secondary/60"
                        onClick={() => setQuickOpen(false)}
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <Input
                      value={quickName}
                      onChange={(e) => setQuickName(e.target.value)}
                      placeholder="任务名称..."
                      className="h-8 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuickSubmit();
                      }}
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={quickMinutes}
                        onChange={(e) => setQuickMinutes(e.target.value)}
                        className="h-8 w-20 text-xs text-center"
                        min={5}
                      />
                      <span className="text-[11px] text-muted-foreground">分钟</span>
                      <select
                        value={quickDifficulty}
                        onChange={(e) =>
                          setQuickDifficulty(e.target.value as TaskDifficulty)
                        }
                        className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="easy">简单</option>
                        <option value="normal">普通</option>
                        <option value="hard">困难</option>
                        <option value="epic">史诗</option>
                      </select>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleQuickSubmit}
                      className="w-full gap-1.5 bg-gradient-to-r from-primary to-warning text-primary-foreground"
                      disabled={!quickName.trim()}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      发布悬赏
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* 底部提示 */}
            <div className="px-4 py-2 border-t border-border/40 bg-secondary/30 flex items-center justify-between">
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ListChecks className="h-3 w-3" />
                  今日 {completedToday}/{totalActiveToday}
                </span>
                <span className="flex items-center gap-1">
                  <Gem className="h-3 w-3 text-accent" />
                  法力 {activeAttentionTasks.length}/{settings.manaMax}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground/60">
                悬停收起条可拖拽
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
