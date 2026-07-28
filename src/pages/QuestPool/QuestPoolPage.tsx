import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  Swords,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Clock,
  Star,
  Skull,
  CheckCircle2,
  Circle,
  Play,
  Zap,
  Edit2,
  Trash2,
  X,
  Target,
  Sparkles,
  ArrowDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTasks } from '@/hooks/useTasks';
import { tasksApi } from '@/api/tasks';
import { useSkills } from '@/hooks/useSkills';
import { useGoals } from '@/hooks/useGoals';
import { useProjects } from '@/hooks/useProjects';
import { useShop } from '@/hooks/useShop';
import { useSettings } from '@/hooks/useSettings';
import type { IQuestTask, TaskDifficulty, TaskType } from '@/types/quest';
import { cn } from '@/lib/utils';

const DIFFICULTY_LABELS: Record<TaskDifficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
  epic: '史诗',
};

const DIFFICULTY_COLORS: Record<TaskDifficulty, string> = {
  easy: 'bg-success/15 text-success border-success/30',
  normal: 'bg-info/15 text-info border-info/30',
  hard: 'bg-warning/15 text-warning border-warning/30',
  epic: 'bg-accent/15 text-accent border-accent/30',
};

const formSchema = z.object({
  name: z.string().min(1, '请输入任务名称').max(50, '名称过长'),
  description: z.string().max(200, '描述过长').optional(),
  type: z.enum(['epic', 'daily'] as const),
  difficulty: z.enum(['easy', 'normal', 'hard', 'epic'] as const),
  estimatedMinutes: z.number().int().min(5, '至少 5 分钟').max(9999, '数值过大'),
  relatedSkillId: z.string().optional(),
  goalId: z.string().optional(),
  projectId: z.string().optional(),
  bossName: z.string().max(30, 'Boss 名称过长').optional(),
  parentId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function QuestPoolPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    setTrackingTask,
    addAttentionTask,
    trackingTask,
    activeAttentionTasks,
  } = useTasks();
  const { skills, addSkillPoints } = useSkills();
  const { goals } = useGoals();
  const { projects } = useProjects();
  const { addReputation } = useShop();
  const { settings } = useSettings();

  const [activeTab, setActiveTab] = useState<'epic' | 'daily'>('epic');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IQuestTask | null>(null);
  const [editingTask, setEditingTask] = useState<IQuestTask | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'daily',
      difficulty: 'normal',
      estimatedMinutes: 30,
      relatedSkillId: '',
      goalId: '',
      projectId: '',
      bossName: '',
      parentId: '',
    },
  });

  const watchType = form.watch('type');
  const watchGoalId = form.watch('goalId');
  const watchProjectId = form.watch('projectId');

  const projectFilterId = searchParams.get('projectId') || '';
  const projectFilter = useMemo(() => {
    if (!projectFilterId) return null;
    return projects.find((p) => p.id === projectFilterId) || null;
  }, [projects, projectFilterId]);

  const epicRootTasks = useMemo(() => {
    return tasks.filter((t) => t.type === 'epic' && !t.parentId && (!projectFilterId || t.projectId === projectFilterId));
  }, [tasks, projectFilterId]);

  const dailyTasks = useMemo(() => {
    let list = tasks.filter((t) => t.type === 'daily' && (!projectFilterId || t.projectId === projectFilterId));
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(kw) ||
          t.description.toLowerCase().includes(kw)
      );
    }
    if (difficultyFilter !== 'all') {
      list = list.filter((t) => t.difficulty === difficultyFilter);
    }
    if (statusFilter !== 'all') {
      list = list.filter((t) => t.status === statusFilter);
    }
    return list;
  }, [tasks, searchKeyword, difficultyFilter, statusFilter, projectFilterId]);

  const getChildren = (parentId: string) =>
    tasks.filter((t) => t.parentId === parentId);

  const toggleExpand = (id: string) => {
    setExpandedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openCreate = () => {
    setEditingTask(null);
    form.reset({
      name: '',
      description: '',
      type: activeTab,
      difficulty: 'normal',
      estimatedMinutes: 30,
      relatedSkillId: '',
      goalId: '',
      projectId: projectFilterId,
      bossName: '',
      parentId: '',
    });
    setCreateDialogOpen(true);
  };

  const openEdit = (task: IQuestTask) => {
    setEditingTask(task);
    form.reset({
      name: task.name,
      description: task.description,
      type: task.type,
      difficulty: task.difficulty,
      estimatedMinutes: task.estimatedMinutes,
      relatedSkillId: task.relatedSkillId || '',
      goalId: task.goalId || '',
      projectId: task.projectId || '',
      bossName: task.bossName || '',
      parentId: task.parentId || '',
    });
    setCreateDialogOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    const capabilityIds = values.relatedSkillId ? [values.relatedSkillId] : [];
    if (editingTask) {
      updateTask(editingTask.id, {
        name: values.name,
        description: values.description || '',
        type: values.type,
        difficulty: values.difficulty,
        estimatedMinutes: values.estimatedMinutes,
        relatedSkillId: values.relatedSkillId || undefined,
        goalId: values.goalId || undefined,
        projectId: values.projectId || undefined,
        capabilityIds,
        bossName: values.type === 'epic' ? values.bossName || undefined : undefined,
        parentId: values.parentId || undefined,
      });
      toast.success('任务已更新');
    } else {
      addTask({
        name: values.name,
        description: values.description || '',
        type: values.type,
        difficulty: values.difficulty,
        estimatedMinutes: values.estimatedMinutes,
        relatedSkillId: values.relatedSkillId || undefined,
        goalId: values.goalId || undefined,
        projectId: values.projectId || undefined,
        capabilityIds,
        bossName: values.type === 'epic' ? values.bossName || undefined : undefined,
        parentId: values.parentId || undefined,
      });
      toast.success('新悬赏已发布');
    }
    setCreateDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteTask(deleteTarget.id);
    toast.success('任务已删除');
    setDeleteTarget(null);
  };

  const handleSetTracking = (task: IQuestTask) => {
    setTrackingTask(task.id);
    toast.success(`已将「${task.name}」设为追踪任务`);
  };

  const handleAddAttention = (task: IQuestTask) => {
    if (activeAttentionTasks.length >= settings.manaMax) {
      toast.error('法力水晶不足，无法激活更多注意力任务');
      return;
    }
    addAttentionTask(task.id, settings.manaMax);
  };

  const handleComplete = (task: IQuestTask) => {
    updateTask(task.id, {
      status: 'completed',
      completedAt: Date.now(),
      isTracking: false,
      isAttention: false,
    });
    addReputation(task.rewardReputation);
    if (task.rewardSkillPoints > 0) {
      addSkillPoints(task.rewardSkillPoints);
    }
    toast.success(`任务完成！获得 ${task.rewardReputation} 声望`);
  };

  const skillOptions = useMemo(() => {
    return skills.filter((s) => s.level >= 1);
  }, [skills]);

  const projectOptions = useMemo(() => {
    if (!watchGoalId) return projects;
    return projects.filter((p) => p.goalId === watchGoalId);
  }, [projects, watchGoalId]);

  useEffect(() => {
    if (!watchProjectId) return;
    const ok = projectOptions.some((p) => p.id === watchProjectId);
    if (!ok) form.setValue('projectId', '');
  }, [form, projectOptions, watchProjectId]);

  const parentEpicOptions = useMemo(() => {
    return tasks.filter((t) => t.type === 'epic' && !t.parentId);
  }, [tasks]);

  return (
    <div className="space-y-6">
      {projectFilter ? (
        <Card className="border-border/50 bg-card/60">
          <CardContent className="py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">已筛选项目</Badge>
              <span className="text-sm font-medium">{projectFilter.name}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('projectId');
                setSearchParams(next, { replace: true });
              }}
            >
              清除筛选
            </Button>
          </CardContent>
        </Card>
      ) : null}
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-warning text-primary-foreground shadow-lg shadow-primary/20">
            <Swords className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-wide">
              悬赏池
            </h1>
            <p className="text-sm text-muted-foreground">
              管理所有史诗任务与每日悬赏
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          发布新悬赏
        </Button>
      </div>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as 'epic' | 'daily')}
              className="w-full md:w-auto"
            >
              <TabsList className="bg-secondary/50">
                <TabsTrigger value="epic" className="gap-2">
                  <Skull className="h-4 w-4" />
                  史诗任务
                </TabsTrigger>
                <TabsTrigger value="daily" className="gap-2">
                  <Target className="h-4 w-4" />
                  每日悬赏
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-3">
              <div className="relative w-full md:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索任务..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-9 bg-secondary/30"
                />
              </div>
              <Select
                value={difficultyFilter}
                onValueChange={setDifficultyFilter}
              >
                <SelectTrigger className="w-32 bg-secondary/30">
                  <SelectValue placeholder="难度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部难度</SelectItem>
                  <SelectItem value="easy">简单</SelectItem>
                  <SelectItem value="normal">普通</SelectItem>
                  <SelectItem value="hard">困难</SelectItem>
                  <SelectItem value="epic">史诗</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-32 bg-secondary/30">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">未完成</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <AnimatePresence mode="wait">
            {activeTab === 'epic' ? (
              <motion.div
                key="epic"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                {epicRootTasks.length === 0 ? (
                  <EmptyState type="epic" onCreate={openCreate} />
                ) : (
                  epicRootTasks.map((task, idx) => (
                    <EpicTaskNode
                      key={task.id}
                      task={task}
                      index={idx}
                      expanded={expandedEpics.has(task.id)}
                      onToggle={() => toggleExpand(task.id)}
                      getChildren={getChildren}
                      onEdit={openEdit}
                      onDelete={(t) => setDeleteTarget(t)}
                      onSetTracking={handleSetTracking}
                      onAddAttention={handleAddAttention}
                      onComplete={handleComplete}
                      isTracking={trackingTask?.id === task.id}
                      isAttention={activeAttentionTasks.some(
                        (a) => a.id === task.id
                      )}
                      manaMax={settings.manaMax}
                      attentionCount={activeAttentionTasks.length}
                    />
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div
                key="daily"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
              >
                {dailyTasks.length === 0 ? (
                  <div className="md:col-span-2 xl:col-span-3">
                    <EmptyState type="daily" onCreate={openCreate} />
                  </div>
                ) : (
                  dailyTasks.map((task, idx) => (
                    <DailyTaskCard
                      key={task.id}
                      task={task}
                      index={idx}
                      onEdit={openEdit}
                      onDelete={(t) => setDeleteTarget(t)}
                      onSetTracking={handleSetTracking}
                      onAddAttention={handleAddAttention}
                      onComplete={handleComplete}
                      isTracking={trackingTask?.id === task.id}
                      isAttention={activeAttentionTasks.some(
                        (a) => a.id === task.id
                      )}
                      manaMax={settings.manaMax}
                      attentionCount={activeAttentionTasks.length}
                    />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* 创建/编辑弹窗 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg border-border/60 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              {editingTask ? '编辑悬赏任务' : '发布新悬赏'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>任务名称</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="输入任务名称" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>任务描述</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="描述任务目标与细节"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>任务类型</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="epic">史诗任务</SelectItem>
                          <SelectItem value="daily">每日悬赏</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>难度等级</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="easy">简单</SelectItem>
                          <SelectItem value="normal">普通</SelectItem>
                          <SelectItem value="hard">困难</SelectItem>
                          <SelectItem value="epic">史诗</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="estimatedMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>预估用时（分钟）</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={5}
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="relatedSkillId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>关联能力</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择能力节点" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">无</SelectItem>
                          {skillOptions.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="goalId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>关联目标</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="可选" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">无</SelectItem>
                          {goals.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>关联项目</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="可选" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">无</SelectItem>
                          {projectOptions.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {watchType === 'epic' && (
                <FormField
                  control={form.control}
                  name="bossName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Skull className="h-4 w-4 text-destructive" />
                        Boss 名称（史诗任务特有）
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="例如：作品集上线巨龙"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchType === 'epic' && (
                <FormField
                  control={form.control}
                  name="parentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>父任务（作为子任务）</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="独立任务" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">独立任务（根节点）</SelectItem>
                          {parentEpicOptions.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  取消
                </Button>
                <Button type="submit">
                  {editingTask ? '保存修改' : '发布悬赏'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="border-border/60 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除任务？</AlertDialogTitle>
            <AlertDialogDescription>
              你将永久删除「{deleteTarget?.name}」
              {deleteTarget?.type === 'epic' && '及其所有子任务'}
              。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ========== 史诗任务节点 ==========
interface EpicTaskNodeProps {
  task: IQuestTask;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  getChildren: (id: string) => IQuestTask[];
  onEdit: (task: IQuestTask) => void;
  onDelete: (task: IQuestTask) => void;
  onSetTracking: (task: IQuestTask) => void;
  onAddAttention: (task: IQuestTask) => void;
  onComplete: (task: IQuestTask) => void;
  isTracking: boolean;
  isAttention: boolean;
  manaMax: number;
  attentionCount: number;
}

function EpicTaskNode({
  task,
  index,
  expanded,
  onToggle,
  getChildren,
  onEdit,
  onDelete,
  onSetTracking,
  onAddAttention,
  onComplete,
  isTracking,
  isAttention,
  manaMax,
  attentionCount,
}: EpicTaskNodeProps) {
  const { addTask } = useTasks();
  const children = getChildren(task.id);
  const completedChildren = children.filter((c) => c.status === 'completed').length;
  const progress =
    children.length > 0
      ? Math.round((completedChildren / children.length) * 100)
      : task.bossProgress;

  const [decomposeLoading, setDecomposeLoading] = useState(false);

  const handleDecompose = async () => {
    if (decomposeLoading) return;
    setDecomposeLoading(true);
    try {
      const res = await tasksApi.decompose({
        name: task.name,
        description: task.description,
        difficulty: task.difficulty,
        estimatedMinutes: task.estimatedMinutes,
        type: 'epic',
      });
      const subtasks = res.subtasks || [];
      // 批量创建子任务
      for (const st of subtasks) {
        await addTask({
          name: st.name || '',
          description: st.description || '',
          type: 'epic',
          difficulty: st.difficulty as TaskDifficulty || 'normal',
          estimatedMinutes: st.estimatedMinutes || 30,
          stage: st.stage || 1,
          parentId: task.id,
        });
      }
      toast.success(`AI 已拆解出 ${subtasks.length} 个子任务`);
      if (!expanded) onToggle();
    } catch (e: any) {
      toast.error('AI 拆解失败', { description: e?.message || '请检查后端 LLM 配置' });
    } finally {
      setDecomposeLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className={cn(
        'rounded-lg border transition-all',
        task.status === 'completed'
          ? 'border-success/30 bg-success/5'
          : 'border-border/50 bg-secondary/20 hover:border-primary/40 hover:bg-secondary/30'
      )}
    >
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={onToggle}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        >
          {children.length > 0 ? (
            expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          )}
        </button>

        <button
          onClick={() =>
            task.status !== 'completed' && onComplete(task)
          }
          className="shrink-0"
          disabled={task.status === 'completed'}
        >
          {task.status === 'completed' ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'font-semibold truncate',
                task.status === 'completed'
                  ? 'text-muted-foreground line-through'
                  : 'text-foreground'
              )}
            >
              {task.name}
            </span>
            <Badge
              variant="outline"
              className={cn('text-[10px]', DIFFICULTY_COLORS[task.difficulty])}
            >
              {DIFFICULTY_LABELS[task.difficulty]}
            </Badge>
            {task.bossName && (
              <Badge
                variant="outline"
                className="text-[10px] border-destructive/40 text-destructive bg-destructive/10"
              >
                <Skull className="h-3 w-3 mr-1" />
                {task.bossName}
              </Badge>
            )}
            {isTracking && (
              <Badge className="text-[10px] bg-primary/20 text-primary border-primary/40">
                <Play className="h-3 w-3 mr-1 fill-current" />
                追踪中
              </Badge>
            )}
            {isAttention && (
              <Badge className="text-[10px] bg-accent/20 text-accent border-accent/40">
                <Zap className="h-3 w-3 mr-1" />
                注意力
              </Badge>
            )}
          </div>

          <div className="mt-1.5 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              预估 {task.estimatedMinutes} 分钟
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-primary" />
              +{task.rewardReputation} 声望
            </span>
            {children.length > 0 && (
              <span>
                子任务 {completedChildren}/{children.length}
              </span>
            )}
          </div>

          {/* Boss 进度条 */}
          {task.bossName && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>Boss 血量</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/60">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={cn(
                    'h-full rounded-full',
                    task.status === 'completed'
                      ? 'bg-gradient-to-r from-success to-success/70'
                      : 'bg-gradient-to-r from-destructive to-warning'
                  )}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {task.status !== 'completed' && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSetTracking(task)}
                disabled={isTracking}
                className="h-8 text-xs"
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                追踪
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAddAttention(task)}
                disabled={isAttention || attentionCount >= manaMax}
                className="h-8 text-xs"
              >
                <Zap className="h-3.5 w-3.5 mr-1" />
                激活
              </Button>
            </>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEdit(task)}
            className="h-8 w-8"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(task)}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 子任务 */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-border/30"
          >
            <div className="p-4 pl-12 bg-background/30">
              {/* 工具栏 */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">
                  子任务 {children.length > 0 && `(${completedChildren}/${children.length})`}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs hover:bg-primary/10 hover:text-primary"
                  onClick={handleDecompose}
                  disabled={decomposeLoading}
                >
                  <Sparkles className={`h-3.5 w-3.5 ${decomposeLoading ? 'animate-spin' : ''}`} />
                  {decomposeLoading ? '拆解中...' : 'AI 拆解'}
                </Button>
              </div>

              {children.length > 0 ? (
                <div className="space-y-4">
                  {Array.from(new Set(children.map((c) => c.stage || 1)))
                    .sort((a, b) => a - b)
                    .map((stage, stageIdx, arr) => {
                      const stageTasks = children.filter((c) => (c.stage || 1) === stage);
                      return (
                        <div key={stage}>
                          {stageIdx > 0 && (
                            <div className="flex justify-center my-2">
                              <div className="flex items-center gap-2 text-muted-foreground/50">
                                <div className="h-px w-8 bg-border" />
                                <ArrowDown className="h-3 w-3" />
                                <div className="h-px w-8 bg-border" />
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                              阶段 {stage} · {stageTasks.length > 1 ? '可并行' : '顺序'}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              共 {stageTasks.reduce((s, t) => s + t.estimatedMinutes, 0)} 分钟
                            </span>
                          </div>
                          <div className="space-y-2">
                            {stageTasks.map((child, idx) => (
                              <SubTaskCard
                                key={child.id}
                                task={child}
                                index={idx}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onSetTracking={onSetTracking}
                                onAddAttention={onAddAttention}
                                onComplete={onComplete}
                                isTracking={isTracking}
                                isAttention={isAttention}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  暂无子任务，点击「AI 拆解」自动生成
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ========== 子任务卡片 ==========
interface SubTaskCardProps {
  task: IQuestTask;
  index: number;
  onEdit: (task: IQuestTask) => void;
  onDelete: (task: IQuestTask) => void;
  onSetTracking: (task: IQuestTask) => void;
  onAddAttention: (task: IQuestTask) => void;
  onComplete: (task: IQuestTask) => void;
  isTracking: boolean;
  isAttention: boolean;
}

function SubTaskCard({
  task,
  index,
  onEdit,
  onDelete,
  onSetTracking,
  onAddAttention,
  onComplete,
  isTracking,
  isAttention,
}: SubTaskCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        'flex items-center gap-3 rounded-md border p-3 transition-all',
        task.status === 'completed'
          ? 'border-success/20 bg-success/5'
          : 'border-border/40 bg-card/40 hover:border-primary/30'
      )}
    >
      <button
        onClick={() => task.status !== 'completed' && onComplete(task)}
        className="shrink-0"
      >
        {task.status === 'completed' ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-sm font-medium truncate',
              task.status === 'completed'
                ? 'text-muted-foreground line-through'
                : 'text-foreground'
            )}
          >
            {task.name}
          </span>
          <Badge
            variant="outline"
            className={cn('text-[9px]', DIFFICULTY_COLORS[task.difficulty])}
          >
            {DIFFICULTY_LABELS[task.difficulty]}
          </Badge>
          {isTracking && (
            <Badge className="text-[9px] bg-primary/20 text-primary border-primary/40">
              追踪中
            </Badge>
          )}
          {isAttention && (
            <Badge className="text-[9px] bg-accent/20 text-accent border-accent/40">
              注意力
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {task.estimatedMinutes} 分钟
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 text-primary" />
            +{task.rewardReputation}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {task.status !== 'completed' && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSetTracking(task)}
              disabled={isTracking}
              className="h-7 text-[11px]"
            >
              <Play className="h-3 w-3 mr-1" />
              追踪
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAddAttention(task)}
              disabled={isAttention}
              className="h-7 text-[11px]"
            >
              <Zap className="h-3 w-3 mr-1" />
              激活
            </Button>
          </>
        )}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onEdit(task)}
          className="h-7 w-7"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onDelete(task)}
          className="h-7 w-7 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

// ========== 每日悬赏卡片 ==========
interface DailyTaskCardProps {
  task: IQuestTask;
  index: number;
  onEdit: (task: IQuestTask) => void;
  onDelete: (task: IQuestTask) => void;
  onSetTracking: (task: IQuestTask) => void;
  onAddAttention: (task: IQuestTask) => void;
  onComplete: (task: IQuestTask) => void;
  isTracking: boolean;
  isAttention: boolean;
  manaMax: number;
  attentionCount: number;
}

function DailyTaskCard({
  task,
  index,
  onEdit,
  onDelete,
  onSetTracking,
  onAddAttention,
  onComplete,
  isTracking,
  isAttention,
  manaMax,
  attentionCount,
}: DailyTaskCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      className={cn(
        'group relative rounded-lg border p-4 transition-all',
        task.status === 'completed'
          ? 'border-success/30 bg-success/5'
          : 'border-border/50 bg-card/60 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5'
      )}
    >
      {/* 顶部装饰光效 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <button
            onClick={() =>
              task.status !== 'completed' && onComplete(task)
            }
            className="mt-0.5 shrink-0"
          >
            {task.status === 'completed' ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
            )}
          </button>
          <h3
            className={cn(
              'font-semibold text-sm leading-tight',
              task.status === 'completed'
                ? 'text-muted-foreground line-through'
                : 'text-foreground'
            )}
          >
            {task.name}
          </h3>
        </div>
        <Badge
          variant="outline"
          className={cn('shrink-0 text-[10px]', DIFFICULTY_COLORS[task.difficulty])}
        >
          {DIFFICULTY_LABELS[task.difficulty]}
        </Badge>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {task.estimatedMinutes} 分钟
        </span>
        <span className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 text-primary" />
          +{task.rewardReputation}
        </span>
      </div>

      {/* 状态标签 */}
      {(isTracking || isAttention) && (
        <div className="flex gap-1.5 mb-3">
          {isTracking && (
            <Badge className="text-[10px] bg-primary/20 text-primary border-primary/40">
              <Play className="h-3 w-3 mr-1 fill-current" />
              追踪中
            </Badge>
          )}
          {isAttention && (
            <Badge className="text-[10px] bg-accent/20 text-accent border-accent/40">
              <Zap className="h-3 w-3 mr-1" />
              注意力
            </Badge>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 pt-2 border-t border-border/30">
        {task.status !== 'completed' ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSetTracking(task)}
              disabled={isTracking}
              className="flex-1 h-8 text-xs"
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              追踪
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAddAttention(task)}
              disabled={isAttention || attentionCount >= manaMax}
              className="flex-1 h-8 text-xs"
            >
              <Zap className="h-3.5 w-3.5 mr-1" />
              激活
            </Button>
          </>
        ) : (
          <span className="flex-1 text-center text-xs text-success font-medium">
            ✓ 已完成
          </span>
        )}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onEdit(task)}
          className="h-8 w-8"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onDelete(task)}
          className="h-8 w-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

// ========== 空状态 ==========
function EmptyState({
  type,
  onCreate,
}: {
  type: 'epic' | 'daily';
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/40 mb-4">
        {type === 'epic' ? (
          <Skull className="h-8 w-8 text-muted-foreground" />
        ) : (
          <Target className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">
        {type === 'epic' ? '暂无史诗任务' : '暂无每日悬赏'}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">
        {type === 'epic'
          ? '发布你的第一个史诗任务，踏上冒险之旅'
          : '添加每日悬赏，积累声望与经验'}
      </p>
      <Button onClick={onCreate} className="gap-2">
        <Plus className="h-4 w-4" />
        发布悬赏
      </Button>
    </div>
  );
}
