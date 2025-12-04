import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { AlertCircle, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import clientApi from '@/services/api-client';
import StatusBadge from '@/components/appointment/StatusBadge';
import GanttChart from '@/components/appointment/GanttChart';
import ViewSwitcher, { type ViewMode } from '@/components/appointment/ViewSwitcher';
import DateRangePicker from '@/components/appointment/DateRangePicker';
import ResourceConflictDialog from '@/components/appointment/ResourceConflictDialog';
import ResourceFilter, { type ResourceFilterType } from '@/components/appointment/ResourceFilter';
import CompactFilterBar from '@/components/appointment/CompactFilterBar';
import { detectResourceConflicts, type ResourceConflict } from '@/utils/scheduleUtils';

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
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [resourceFilters, setResourceFilters] = useState<ResourceFilterType[]>([]);
  const [selectedNurseIds, setSelectedNurseIds] = useState<string[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [nurses, setNurses] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resourceConflicts, setResourceConflicts] = useState<ResourceConflict[]>([]);
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [pendingScheduleData, setPendingScheduleData] = useState<ScheduleFormValues | null>(null);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
  });

  useEffect(() => {
    loadData();
  }, [selectedDate, viewMode]);

  const loadData = async () => {
    try {
      // 根据视图模式计算日期范围
      let startDate: string;
      let endDate: string;

      switch (viewMode) {
        case 'day':
          startDate = endDate = format(selectedDate, 'yyyy-MM-dd');
          break;
        case 'week': {
          const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
          startDate = format(weekStart, 'yyyy-MM-dd');
          endDate = format(weekEnd, 'yyyy-MM-dd');
          break;
        }
        case 'month': {
          const monthStart = startOfMonth(selectedDate);
          const monthEnd = endOfMonth(selectedDate);
          startDate = format(monthStart, 'yyyy-MM-dd');
          endDate = format(monthEnd, 'yyyy-MM-dd');
          break;
        }
        default:
          startDate = endDate = format(selectedDate, 'yyyy-MM-dd');
      }


      
      const [appointmentsData, schedulesData, nursesData, roomsData] = await Promise.all([
        clientApi.getAppointments({ status: 'pending', requested_date_from: startDate, requested_date_to: endDate }),
        clientApi.getSchedules({
          date: viewMode === 'day' ? startDate : undefined,
          start_date: viewMode !== 'day' ? startDate : undefined,
          end_date: viewMode !== 'day' ? endDate : undefined
        }),
        clientApi.getAvailableNurses(),
        clientApi.getAvailableRooms(),
      ]);



      // 调试信息：打印获取的预约数据结构
      console.log('=== 调试：获取的预约数据 ===');
      console.log('数据数量:', appointmentsData.length);
      if (appointmentsData.length > 0) {
        console.log('第一条数据:', appointmentsData[0]);
        console.log('第一条数据的服务信息:', appointmentsData[0].service);
        console.log('第一条数据的服务名称:', appointmentsData[0].service?.name);
      }
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

  const handleClearFilters = () => {
    setSelectedNurseIds([]);
    setSelectedRoomIds([]);
  };

  const handleCreateSchedule = (appointment: any) => {
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

  const handleEditSchedule = (schedule: any) => {
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

    // 检测资源冲突
    const conflicts = detectResourceConflicts(
      schedules,
      {
        scheduled_time_start: values.scheduled_time_start,
        scheduled_time_end: values.scheduled_time_end,
        room_id: values.room_id,
        nurse_id: values.nurse_id,
      },
      selectedSchedule?.id
    );

    // 如果有冲突，显示确认对话框
    if (conflicts.length > 0) {
      setResourceConflicts(conflicts);
      setPendingScheduleData(values);
      setIsConflictDialogOpen(true);
      return;
    }

    // 没有冲突，直接保存
    await saveSchedule(values);
  };

  const saveSchedule = async (values: ScheduleFormValues, forceOverride = false) => {
    if (!selectedAppointment) return;

    setIsLoading(true);
    try {
      // 使用预约的requested_date作为排班日期，而不是甘特图当前选中的日期
      const dateStr = selectedAppointment.requested_date 
        ? format(new Date(selectedAppointment.requested_date), 'yyyy-MM-dd')
        : format(selectedDate, 'yyyy-MM-dd'); // 备用方案：如果没有requested_date才使用selectedDate

      if (selectedSchedule) {
        await clientApi.updateSchedule(selectedSchedule.id, {
          scheduled_date: dateStr,
          scheduled_time_start: values.scheduled_time_start,
          scheduled_time_end: values.scheduled_time_end,
          room_id: values.room_id,
          nurse_id: values.nurse_id,
          status: 'published',
        });

        toast.success(forceOverride ? '排班已强制更新（存在资源冲突）' : '排班已更新');
      } else {
        await clientApi.createSchedule({
          appointment_id: selectedAppointment.id,
          scheduled_date: dateStr,
          scheduled_time_start: values.scheduled_time_start,
          scheduled_time_end: values.scheduled_time_end,
          room_id: values.room_id,
          nurse_id: values.nurse_id,
        });

        await clientApi.updateAppointment(selectedAppointment.id, {
          status: 'scheduled',
        });

        toast.success(forceOverride ? '排班已强制创建（存在资源冲突）' : '排班已创建');
      }

      setIsScheduleDialogOpen(false);
      setIsConflictDialogOpen(false);
      setPendingScheduleData(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConflictConfirm = () => {
    if (pendingScheduleData) {
      saveSchedule(pendingScheduleData, true);
    }
  };

  const handleConflictCancel = () => {
    setIsConflictDialogOpen(false);
    setResourceConflicts([]);
    setPendingScheduleData(null);
  };

  const handleRejectAppointment = async () => {
    if (!selectedAppointment) return;

    setIsLoading(true);
    try {
      const updatedAppointment = await clientApi.updateAppointment(selectedAppointment.id, {
        status: 'rejected',
      });

      toast.success('预约已拒绝');
      setIsScheduleDialogOpen(false);
      
      // 延迟一下再刷新数据，确保数据库更新完成
      setTimeout(() => {
        loadData();
      }, 500);
    } catch (error: any) {
      toast.error(error.message || '拒绝预约失败');
    } finally {
      setIsLoading(false);
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

      {/* 筛选栏 - 放在资源看板上方 */}
      <div className="mb-4">
        <CompactFilterBar
          nurses={nurses}
          selectedNurseIds={selectedNurseIds}
          onNurseChange={setSelectedNurseIds}
          rooms={rooms}
          selectedRoomIds={selectedRoomIds}
          onRoomChange={setSelectedRoomIds}
          resourceFilters={resourceFilters}
          onResourceFilterChange={setResourceFilters}
          onClearFilters={handleClearFilters}
        />
      </div>

      {/* 排班待办 + 图例 - 横向布局，放在资源看板上方 */}
      <div className="grid gap-4 xl:grid-cols-[1fr_auto] mb-4">
        {/* 排班待办 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">排班待办</CardTitle>
              <div className="flex gap-3 text-xs">
                <span className="text-confirmed">● 已确认</span>
                <span className="text-pending">● 待排班</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {urgentAppointments.map(appointment => (
                <Card key={appointment.id} className="min-w-[240px] p-3 border-l-4 border-l-urgent hover:shadow-md transition-shadow">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{appointment.customer_name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {appointment.service?.name}
                        </div>
                        {appointment.requested_date && (
                          <div className="text-xs text-primary font-medium mt-1">
                            📅 {format(new Date(appointment.requested_date), 'yyyy-MM-dd')}
                          </div>
                        )}
                      </div>
                      <StatusBadge status="pending" isUrgent={true} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {appointment.requested_time_start?.substring(0, 5) || '待定'} (预计{appointment.estimated_duration}m)
                    </div>
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => handleCreateSchedule(appointment)}
                    >
                      分配资源
                    </Button>
                  </div>
                </Card>
              ))}
              {normalAppointments.map(appointment => (
                <Card key={appointment.id} className="min-w-[240px] p-3 hover:shadow-md transition-shadow">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{appointment.customer_name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {appointment.service?.name}
                        </div>
                        {appointment.requested_date && (
                          <div className="text-xs text-primary font-medium mt-1">
                            📅 {format(new Date(appointment.requested_date), 'yyyy-MM-dd')}
                          </div>
                        )}
                      </div>
                      <StatusBadge status="pending" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {appointment.requested_time_start?.substring(0, 5) || '待定'} (预计{appointment.estimated_duration}m)
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-8 text-xs"
                      onClick={() => handleCreateSchedule(appointment)}
                    >
                      分配资源
                    </Button>
                  </div>
                </Card>
              ))}
              {pendingAppointments.length === 0 && (
                <div className="flex items-center justify-center py-6 text-muted-foreground min-w-[240px]">
                  <div className="text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无待排班预约</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 图例说明 - 紧凑横向显示 */}
        <Card className="xl:w-[280px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">图例说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full bg-confirmed"></span>
                <span className="text-muted-foreground">已确认</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full bg-pending"></span>
                <span className="text-muted-foreground">待排班</span>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  💡 资源名称前的圆点表示该资源的颜色标识
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主内容区域 - 资源看板（全宽） */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>资源看板</CardTitle>
              <CardDescription>
                视图：房间维度 (08:00 - 18:00)
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />
              <DateRangePicker
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                viewMode={viewMode}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <GanttChart
            schedules={schedules}
            nurses={nurses}
            rooms={rooms}
            selectedDate={format(selectedDate, 'yyyy-MM-dd')}
            viewMode={viewMode}
            resourceFilters={resourceFilters}
            selectedNurseIds={selectedNurseIds}
            selectedRoomIds={selectedRoomIds}
            onScheduleClick={handleEditSchedule}
          />
        </CardContent>
      </Card>

      {/* 排班编辑对话框 */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSchedule ? '编辑排班' : '创建排班'}
            </DialogTitle>
            <DialogDescription>
              为预约分配医疗资源并确认时间
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <Alert>
              <AlertDescription>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">客户：</span>
                    <span className="font-medium ml-2">{selectedAppointment.customer_name}</span>
                    {selectedAppointment.companion_names && selectedAppointment.companion_names.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1 ml-2">
                        同行: {selectedAppointment.companion_names.join(', ')}
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">服务：</span>
                    <span className="font-medium ml-2">{selectedAppointment.service?.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">预约日期：</span>
                    <span className="font-medium ml-2">
                      {selectedAppointment.requested_date 
                        ? format(new Date(selectedAppointment.requested_date), 'yyyy-MM-dd')
                        : '未指定'
                      }
                    </span>
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
                  type="button"
                  variant="destructive"
                  onClick={handleRejectAppointment}
                  className="min-w-24"
                  disabled={isLoading}
                >
                  {isLoading ? '处理中...' : '✗ 拒绝预约'}
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

      {/* 资源冲突确认对话框 */}
      <ResourceConflictDialog
        open={isConflictDialogOpen}
        conflicts={resourceConflicts}
        onConfirm={handleConflictConfirm}
        onCancel={handleConflictCancel}
      />
    </div>
  );
}
