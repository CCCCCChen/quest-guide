import { useMemo, useState } from 'react';
import { Plus, Flag, Edit2, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { useGoals } from '@/hooks/useGoals';
import type { IGoal } from '@/types/quest';

const formSchema = z.object({
  name: z.string().min(1, '请输入目标名称').max(50, '名称过长'),
  description: z.string().max(500, '描述过长').optional(),
  deadline: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function formatDate(ts?: number) {
  if (!ts) return '';
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function GoalsPage() {
  const { goals, addGoal, updateGoal, deleteGoal } = useGoals();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IGoal | null>(null);
  const [deleting, setDeleting] = useState<IGoal | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      deadline: '',
    },
  });

  const orderedGoals = useMemo(() => {
    return [...goals].sort((a, b) => b.createdAt - a.createdAt);
  }, [goals]);

  function resetForm(nextEditing: IGoal | null) {
    setEditing(nextEditing);
    form.reset({
      name: nextEditing?.name ?? '',
      description: nextEditing?.description ?? '',
      deadline: formatDate(nextEditing?.deadline),
    });
  }

  async function onSubmit(values: FormValues) {
    const deadline = values.deadline ? new Date(values.deadline).getTime() : undefined;
    if (editing) {
      await updateGoal(editing.id, {
        name: values.name,
        description: values.description || '',
        deadline,
      });
    } else {
      await addGoal({
        name: values.name,
        description: values.description || '',
        deadline,
      });
    }
    setOpen(false);
    resetForm(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Flag className="size-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">目标</div>
            <div className="text-sm text-muted-foreground">用更少的目标，统领更多的项目与任务</div>
          </div>
        </div>

        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) resetForm(null);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => resetForm(null)}>
              <Plus className="size-4 mr-2" />
              新增目标
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? '编辑目标' : '新增目标'}</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>名称</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：打造个人成长系统" {...field} />
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
                      <FormLabel>描述</FormLabel>
                      <FormControl>
                        <Textarea placeholder="为什么重要？成功标准是什么？" className="min-h-20" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>截止日期</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit">{editing ? '保存' : '创建'}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {orderedGoals.map((goal) => (
          <Card key={goal.id} className="border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="text-lg truncate">{goal.name}</CardTitle>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <Badge variant={goal.status === 'archived' ? 'secondary' : 'default'}>
                      {goal.status === 'archived' ? '已归档' : '进行中'}
                    </Badge>
                    {goal.deadline ? (
                      <Badge variant="outline">截止 {formatDate(goal.deadline)}</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOpen(true);
                      resetForm(goal);
                    }}
                  >
                    <Edit2 className="size-4 mr-1" />
                    编辑
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleting(goal)}
                  >
                    <Trash2 className="size-4 mr-1" />
                    删除
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {goal.description || '（暂无描述）'}
              </div>
            </CardContent>
          </Card>
        ))}

        {orderedGoals.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-muted-foreground">
              还没有目标，先创建一个 “北极星”。
            </CardContent>
          </Card>
        ) : null}
      </div>

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除目标？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后无法恢复。目标下关联的项目/任务暂不会自动处理，需要你手动调整关联关系。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return;
                await deleteGoal(deleting.id);
                setDeleting(null);
              }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

