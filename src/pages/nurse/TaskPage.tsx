import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Clock, CheckCircle, PlayCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import clientApi from '@/services/api-client';
import type { Schedule, TaskExecution } from '@/services/api-client';
import StatusBadge from '@/components/appointment/StatusBadge';

const finishFormSchema = z.object({
  overtime_note: z.string().optional(),
});

type FinishFormValues = z.infer<typeof finishFormSchema>;

export default function NurseTaskPage() {
  const [tasks, setTasks] = useState<Schedule[]>([]);
  const [selectedTask, setSelectedTask] = useState<Schedule | null>(null);
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FinishFormValues>({
    resolver: zodResolver(finishFormSchema),
  });

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadTasks = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const schedulesData = await clientApi.getSchedules({ date: today });

      const lockedSchedules = await clientApi.getSchedules({ date: today });
      
      setTasks([...schedulesData, ...lockedSchedules]);
    } catch (error) {
      console.error('加载任务失败:', error);
    }
  };

  const handleCheckIn = async (task: Schedule) => {
    if (!task.appointment_id) return;

    try {
      await clientApi.updateSchedule(task.id, {
        status: 'in_progress',
      });

      toast.success('客户已到达，服务开始');
      loadTasks();
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    }
  };

  const handleStart = async (task: Schedule) => {
    if (!task.appointment_id) return;

    try {
      await clientApi.updateSchedule(task.id, {
        status: 'in_progress',
      });

      toast.success('服务已开始');
      loadTasks();
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    }
  };

  const handleFinish = (task: Schedule) => {
    setSelectedTask(task);
    form.reset({ overtime_note: '' });
    setIsFinishDialogOpen(true);
  };

  const onFinishSubmit = async (values: FinishFormValues) => {
    if (!selectedTask?.appointment_id) return;

    setIsLoading(true);
    try {
      await clientApi.updateSchedule(selectedTask.id, {
        status: 'completed',
        notes: values.overtime_note,
      });

      toast.success('服务已完成');
      setIsFinishDialogOpen(false);
      loadTasks();
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    } finally {
      setIsLoading(false);
    }
  };

  const getTaskStatus = (task: Schedule) => {
    return task.status || 'pending';
  };

  const getTaskActions = (task: Schedule) => {
    const status = getTaskStatus(task);

    if (status === 'scheduled' || status === 'confirmed') {
      return (
        <Button size="sm" onClick={() => handleCheckIn(task)}>
          <CheckCircle className="h-4 w-4 mr-2" />
          客户到达
        </Button>
      );
    }

    if (status === 'in_progress') {
      return (
        <Button size="sm" onClick={() => handleFinish(task)}>
          <CheckCircle className="h-4 w-4 mr-2" />
          完成服务
        </Button>
      );
    }

    if (status === 'completed') {
      return (
        <Button size="sm" variant="outline" disabled>
          已完成
        </Button>
      );
    }

    return null;
  };

  const pendingTasks = tasks.filter(t => {
    const status = getTaskStatus(t);
    return status === 'scheduled' || status === 'confirmed';
  });

  const inProgressTasks = tasks.filter(t => getTaskStatus(t) === 'in_progress');
  const completedTasks = tasks.filter(t => getTaskStatus(t) === 'completed');

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">我的任务</h1>
        <p className="text-muted-foreground">
          {format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待执行</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pending">{pendingTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">等待客户到达</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">进行中</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{inProgressTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">正在服务</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已完成</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-completed">{completedTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">今日完成</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {inProgressTasks.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">进行中的任务</h2>
            <div className="grid gap-4 xl:grid-cols-2">
              {inProgressTasks.map(task => (
                <Card key={task.id} className="border-primary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">客户 #{task.appointment_id?.substring(0, 8)}</CardTitle>
                      <StatusBadge status={getTaskStatus(task)}  />
                    </div>
                    <CardDescription>服务项目</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">房间：</span>
                        <span className="font-medium">{task.room?.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">时间：</span>
                        <span className="font-medium">
                          {task.scheduled_time_start.substring(0, 5)} - {task.scheduled_time_end.substring(0, 5)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">人数：</span>
                        <span className="font-medium">1 人</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">预估时长：</span>
                        <span className="font-medium">
                          60 分钟
                        </span>
                      </div>
                    </div>
                    {getTaskActions(task)}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {pendingTasks.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">待执行任务</h2>
            <div className="grid gap-4 xl:grid-cols-2">
              {pendingTasks.map(task => (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">客户 #{task.appointment_id?.substring(0, 8)}</CardTitle>
                      <StatusBadge status={getTaskStatus(task)}  />
                    </div>
                    <CardDescription>服务项目</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">房间：</span>
                        <span className="font-medium">{task.room?.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">时间：</span>
                        <span className="font-medium">
                          {task.scheduled_time_start.substring(0, 5)} - {task.scheduled_time_end.substring(0, 5)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">人数：</span>
                        <span className="font-medium">1 人</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">预估时长：</span>
                        <span className="font-medium">
                          60 分钟
                        </span>
                      </div>
                    </div>
                    {getTaskActions(task)}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {completedTasks.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">已完成任务</h2>
            <div className="grid gap-4 xl:grid-cols-2">
              {completedTasks.map(task => (
                <Card key={task.id} className="opacity-75">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">客户 #{task.appointment_id?.substring(0, 8)}</CardTitle>
                      <StatusBadge status={getTaskStatus(task)} />
                    </div>
                    <CardDescription>服务项目</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">房间：</span>
                        <span className="font-medium">{task.room?.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">时间：</span>
                        <span className="font-medium">
                          {task.scheduled_time_start.substring(0, 5)} - {task.scheduled_time_end.substring(0, 5)}
                        </span>
                      </div>
                    </div>
                    {getTaskActions(task)}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {tasks.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">今日暂无任务</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isFinishDialogOpen} onOpenChange={setIsFinishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>完成服务</DialogTitle>
            <DialogDescription>
              确认完成 {selectedTask?.appointment?.customer_name} 的服务
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                若实际执行时间超过预约时间20%，请填写备注说明原因
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFinishSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="overtime_note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>备注</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="如有超时或其他特殊情况，请说明"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      记录服务过程中的特殊情况
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? '提交中...' : '确认完成'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFinishDialogOpen(false)}
                >
                  取消
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
