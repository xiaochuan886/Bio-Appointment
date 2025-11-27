import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus, AlertCircle, Clock, Users } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getAppointments, getSchedules, createSchedule, updateSchedule, updateAppointment, getAvailableNurses, getAvailableRooms } from '@/db/api';
import type { AppointmentWithDetails, ScheduleWithDetails, Nurse, Room } from '@/types/types';
import StatusBadge from '@/components/appointment/StatusBadge';
import GanttChart from '@/components/appointment/GanttChart';

const scheduleFormSchema = z.object({
  scheduled_time_start: z.string().min(1, '请选择开始时间'),
  scheduled_time_end: z.string().min(1, '请选择结束时间'),
  room_id: z.string().min(1, '请选择房间'),
  nurse_id: z.string().min(1, '请选择护士'),
  adjusted_duration: z.number().optional(),
  adjustment_reason: z.string().optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

export default function HeadNurseSchedulePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [pendingAppointments, setPendingAppointments] = useState<AppointmentWithDetails[]>([]);
  const [schedules, setSchedules] = useState<ScheduleWithDetails[]>([]);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
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
      
      const [appointmentsData, schedulesData, nursesData, roomsData] = await Promise.all([
        getAppointments({ status: 'pending' }),
        getSchedules({ date: dateStr }),
        getAvailableNurses(),
        getAvailableRooms(),
      ]);

      setPendingAppointments(appointmentsData);
      setSchedules(schedulesData);
      setNurses(nursesData);
      setRooms(roomsData);
    } catch (error) {
      console.error('加载数据失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error(`加载数据失败: ${errorMessage}`);
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
      adjusted_duration: estimatedDuration,
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
      adjusted_duration: schedule.adjusted_duration || undefined,
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
          adjusted_duration: values.adjusted_duration,
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
          adjusted_duration: values.adjusted_duration,
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
  const lockedSchedules = schedules.filter(s => s.status === 'locked');
  const todaySchedules = schedules.length;

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">智能排班看板</h1>
        <p className="text-muted-foreground">资源调度确认 (Resource Scheduling)</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 xl:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">今日总数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todaySchedules}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">待排班</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-pending">{pendingAppointments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">急单</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-urgent">{urgentAppointments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">已锁定</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-confirmed">{lockedSchedules.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3 mb-8">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>资源看板</CardTitle>
                <CardDescription>
                  视图：房间维度 (08:00 - 18:00)
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
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
            </div>
          </CardHeader>
          <CardContent>
            <GanttChart
              schedules={schedules}
              nurses={nurses}
              rooms={rooms}
              selectedDate={format(selectedDate, 'yyyy-MM-dd')}
              onScheduleClick={handleEditSchedule}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>排班待办</CardTitle>
              <CardDescription>
                <div className="flex gap-4 mt-2">
                  <span className="text-confirmed">● 已确认</span>
                  <span className="text-pending">● 待排班</span>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {urgentAppointments.map(appointment => (
                <Card key={appointment.id} className="p-4 border-l-4 border-l-urgent hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-lg">{appointment.customer_name}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {appointment.service?.name}
                        </div>
                      </div>
                      <StatusBadge status="pending" isUrgent={true} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {appointment.requested_time_start?.substring(0, 5) || '待定'} (预计{appointment.estimated_duration}m)
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-primary hover:bg-primary/90"
                      onClick={() => handleCreateSchedule(appointment)}
                    >
                      分配资源
                    </Button>
                  </div>
                </Card>
              ))}
              
              {normalAppointments.map(appointment => (
                <Card key={appointment.id} className="p-4 border-l-4 border-l-pending hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-lg">{appointment.customer_name}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {appointment.service?.name}
                        </div>
                      </div>
                      <StatusBadge status="pending" />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {appointment.requested_time_start?.substring(0, 5) || '待定'} (预计{appointment.estimated_duration}m)
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleCreateSchedule(appointment)}
                    >
                      分配资源
                    </Button>
                  </div>
                </Card>
              ))}
              
              {pendingAppointments.length === 0 && (
                <p className="text-center text-muted-foreground py-8">暂无待排班预约</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-primary" />
              资源调度确认 (Resource Scheduling)
            </DialogTitle>
            <DialogDescription>
              为 {selectedAppointment?.customer_name} 分配房间和护士资源
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <Alert className="bg-muted border-0">
              <AlertDescription>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">客户：</span>
                    <span className="font-medium ml-2">{selectedAppointment.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">服务：</span>
                    <span className="font-medium ml-2">{selectedAppointment.service?.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">人数：</span>
                    <span className="font-medium ml-2">{selectedAppointment.total_people} 人</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">标准时长：</span>
                    <span className="font-medium ml-2">{selectedAppointment.estimated_duration} 分钟</span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="scheduled_time_start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>开始时间 (Start Time)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type="time" 
                            {...field} 
                            className="text-lg font-medium"
                          />
                          <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="adjusted_duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>修正时长 (Duration)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type="number" 
                            value={field.value || ''}
                            className="text-lg font-medium pr-12"
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value ? parseInt(value) : undefined);
                            }}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            min
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="room_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>房间分配 (Room)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="选择房间" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rooms.map(room => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name}
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
                    <FormLabel>护士分配 (Nurse)</FormLabel>
                    <FormDescription className="text-xs text-muted-foreground">
                      双人复核机制
                    </FormDescription>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="选择护士" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {nurses.map(nurse => (
                          <SelectItem key={nurse.id} value={nurse.id}>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              {nurse.name}
                            </div>
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
                name="adjustment_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>调整原因（可选）</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="如调整了时长，请说明原因" 
                        {...field} 
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      根据客户画像和历史数据，可手动调整预估时长
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsScheduleDialogOpen(false)}
                  className="min-w-24"
                >
                  取消
                </Button>
                <Button 
                  type="submit" 
                  className="min-w-32 bg-primary hover:bg-primary/90" 
                  disabled={isLoading}
                >
                  {isLoading ? '保存中...' : '✓ 确认排班'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
