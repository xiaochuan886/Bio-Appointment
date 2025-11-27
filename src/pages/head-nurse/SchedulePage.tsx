import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getAppointments, getSchedules, getResources, createSchedule, updateSchedule, updateAppointment } from '@/db/api';
import type { AppointmentWithDetails, ScheduleWithDetails, Resource } from '@/types/types';
import StatusBadge from '@/components/appointment/StatusBadge';
import GanttChart from '@/components/appointment/GanttChart';

const scheduleFormSchema = z.object({
  scheduled_time_start: z.string().min(1, '请选择开始时间'),
  scheduled_time_end: z.string().min(1, '请选择结束时间'),
  room_id: z.string().min(1, '请选择房间'),
  nurse_id: z.string().min(1, '请选择护士'),
  adjusted_duration: z.string().optional(),
  adjustment_reason: z.string().optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

export default function HeadNurseSchedulePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [pendingAppointments, setPendingAppointments] = useState<AppointmentWithDetails[]>([]);
  const [schedules, setSchedules] = useState<ScheduleWithDetails[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleWithDetails | null>(null);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
  });

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const [appointmentsData, schedulesData, resourcesData] = await Promise.all([
        getAppointments({ status: 'pending' }),
        getSchedules({ date: dateStr }),
        getResources(),
      ]);

      setPendingAppointments(appointmentsData);
      setSchedules(schedulesData);
      setResources(resourcesData);
    } catch (error) {
      toast.error('加载数据失败');
    }
  };

  const handleCreateSchedule = (appointment: AppointmentWithDetails) => {
    setSelectedAppointment(appointment);
    setSelectedSchedule(null);
    
    const estimatedDuration = appointment.estimated_duration || 60;
    const startTime = appointment.requested_time_start || '09:00:00';
    const [hour, minute] = startTime.split(':').map(Number);
    const endMinutes = hour * 60 + minute + estimatedDuration;
    const endHour = Math.floor(endMinutes / 60);
    const endMinute = endMinutes % 60;
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`;

    form.reset({
      scheduled_time_start: startTime,
      scheduled_time_end: endTime,
      room_id: '',
      nurse_id: '',
      adjusted_duration: estimatedDuration.toString(),
      adjustment_reason: '',
    });

    setIsScheduleDialogOpen(true);
  };

  const handleEditSchedule = (schedule: ScheduleWithDetails) => {
    setSelectedSchedule(schedule);
    setSelectedAppointment(schedule.appointment || null);

    form.reset({
      scheduled_time_start: schedule.scheduled_time_start,
      scheduled_time_end: schedule.scheduled_time_end,
      room_id: schedule.room_id || '',
      nurse_id: schedule.nurse_id || '',
      adjusted_duration: schedule.adjusted_duration?.toString() || '',
      adjustment_reason: schedule.adjustment_reason || '',
    });

    setIsScheduleDialogOpen(true);
  };

  const onSubmit = async (values: ScheduleFormValues) => {
    if (!selectedAppointment) return;

    setIsLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      if (selectedSchedule) {
        await updateSchedule(selectedSchedule.id, {
          scheduled_date: dateStr,
          scheduled_time_start: values.scheduled_time_start,
          scheduled_time_end: values.scheduled_time_end,
          room_id: values.room_id,
          nurse_id: values.nurse_id,
          adjusted_duration: values.adjusted_duration ? parseInt(values.adjusted_duration) : undefined,
          adjustment_reason: values.adjustment_reason,
          status: 'published',
        });

        toast.success('排班已更新');
      } else {
        await createSchedule({
          appointment_id: selectedAppointment.id,
          scheduled_date: dateStr,
          scheduled_time_start: values.scheduled_time_start,
          scheduled_time_end: values.scheduled_time_end,
          room_id: values.room_id,
          nurse_id: values.nurse_id,
          adjusted_duration: values.adjusted_duration ? parseInt(values.adjusted_duration) : undefined,
          adjustment_reason: values.adjustment_reason,
        });

        await updateAppointment(selectedAppointment.id, {
          status: 'scheduled',
        });

        toast.success('排班已创建');
      }

      setIsScheduleDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishSchedule = async (scheduleId: string) => {
    try {
      await updateSchedule(scheduleId, { status: 'locked' });
      toast.success('排班已锁定并发布');
      loadData();
    } catch (error: any) {
      toast.error(error.message || '发布失败');
    }
  };

  const urgentAppointments = pendingAppointments.filter(a => a.is_urgent);
  const normalAppointments = pendingAppointments.filter(a => !a.is_urgent);

  const rooms = resources.filter(r => r.type === 'room');
  const nurses = resources.filter(r => r.type === 'nurse');

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">智能排班看板</h1>
        <p className="text-muted-foreground">拖拽任务卡片到不同的房间/护士行进行排班</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3 mb-8">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>排班日历</CardTitle>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, 'PPP', { locale: zhCN })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            <GanttChart
              schedules={schedules}
              resources={resources}
              selectedDate={format(selectedDate, 'yyyy-MM-dd')}
              onScheduleClick={handleEditSchedule}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          {urgentAppointments.length > 0 && (
            <Card className="border-urgent">
              <CardHeader>
                <CardTitle className="text-urgent flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  急单预约 ({urgentAppointments.length})
                </CardTitle>
                <CardDescription>需要优先处理</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {urgentAppointments.map(appointment => (
                  <Card key={appointment.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{appointment.customer_name}</span>
                        <StatusBadge status={appointment.status} isUrgent={appointment.is_urgent} />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {appointment.service?.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        预估时长: {appointment.estimated_duration} 分钟
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleCreateSchedule(appointment)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        立即排班
                      </Button>
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>待排班预约 ({normalAppointments.length})</CardTitle>
              <CardDescription>等待分配资源</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {normalAppointments.map(appointment => (
                <Card key={appointment.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{appointment.customer_name}</span>
                      <StatusBadge status={appointment.status} />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {appointment.service?.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      预估时长: {appointment.estimated_duration} 分钟
                    </div>
                    {appointment.requested_time_start && (
                      <div className="text-sm text-muted-foreground">
                        期望时间: {appointment.requested_time_start.substring(0, 5)}
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleCreateSchedule(appointment)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      安排排班
                    </Button>
                  </div>
                </Card>
              ))}
              {normalAppointments.length === 0 && (
                <p className="text-center text-muted-foreground py-8">暂无待排班预约</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSchedule ? '编辑排班' : '创建排班'}
            </DialogTitle>
            <DialogDescription>
              为 {selectedAppointment?.customer_name} 分配资源和时间
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">客户姓名：</span>
                  <span className="font-medium">{selectedAppointment.customer_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">服务项目：</span>
                  <span className="font-medium">{selectedAppointment.service?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">总人数：</span>
                  <span className="font-medium">{selectedAppointment.total_people} 人</span>
                </div>
                <div>
                  <span className="text-muted-foreground">标准时长：</span>
                  <span className="font-medium">{selectedAppointment.estimated_duration} 分钟</span>
                </div>
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="scheduled_time_start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>开始时间 *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduled_time_end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>结束时间 *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="room_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>房间 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择房间" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rooms.map(room => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.name} - {room.category}
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
                  name="nurse_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>护士 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择护士" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {nurses.map(nurse => (
                            <SelectItem key={nurse.id} value={nurse.id}>
                              {nurse.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="adjusted_duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>调整后时长（分钟）</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="如需调整时长，请输入" {...field} />
                    </FormControl>
                    <FormDescription>
                      根据客户画像和历史数据，可手动调整预估时长
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="adjustment_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>调整原因</FormLabel>
                    <FormControl>
                      <Textarea placeholder="如调整了时长，请说明原因" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? '保存中...' : selectedSchedule ? '更新排班' : '创建排班'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsScheduleDialogOpen(false)}
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
