import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { formatDate } from '@/utils/dateFormat';
import { AlertCircle, Clock, Users, Calendar, MapPin, Pencil, X, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { useAuth } from '@/contexts/AuthContext';
import { canManageStoreSchedule, canViewStoreSchedule, getAccessibleStoreIds, getWorkflowStatusDisplayName, getWorkflowStatusColor, canUpdateWorkflowStatus } from '@/utils/permissions';
import { validateStoreAccess, validateScheduleData, validateAppointmentData, handleApiError, hasTimeConflict } from '@/utils/validation';

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
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [resourceFilters, setResourceFilters] = useState<ResourceFilterType[]>([]);
  const [selectedNurseIds, setSelectedNurseIds] = useState<string[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<any[]>([]);
  const [cancelledAppointments, setCancelledAppointments] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [nurses, setNurses] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // 控制查看/编辑模式
  const [isLoading, setIsLoading] = useState(false);
  const [resourceConflicts, setResourceConflicts] = useState<ResourceConflict[]>([]);
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [pendingScheduleData, setPendingScheduleData] = useState<ScheduleFormValues | null>(null);
  const [availableNursesForDialog, setAvailableNursesForDialog] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'cancelled'>('pending');
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      scheduled_time_start: '',
      scheduled_time_end: '',
      room_id: '',
      nurse_id: '',
      adjusted_duration: 60,
      adjustment_reason: '',
    },
  });

  // 监听排班表单时间变化，更新可用护士列表
  useEffect(() => {
    if (isScheduleDialogOpen) {
      const startTime = form.getValues('scheduled_time_start');
      // 如果有选中预约，使用预约日期，否则使用选中的日期
      const dateStr = selectedAppointment?.requested_date
        ? format(new Date(selectedAppointment.requested_date), 'yyyy-MM-dd')
        : format(selectedDate, 'yyyy-MM-dd');

      if (dateStr && startTime) {
        // 获取该时段可用的护士
        const fetchAvailableNurses = async () => {
          try {
            const storeFilter = getAccessibleStoreIds(user?.profile || null);
            const available = await clientApi.getAvailableNurses(
              storeFilter || undefined,
              dateStr,
              startTime
            );
            // 将当前编辑选中的护士（即使不可用）也加入列表，避免显示空白，但可以标出警告
            const currentNurseId = form.getValues('nurse_id');
            if (currentNurseId && !available.find((n: any) => n.id === currentNurseId)) {
              const currentNurse = nurses.find(n => n.id === currentNurseId);
              if (currentNurse) {
                // 标记为不可用但保留在列表中以便显示? 或者直接不加，让用户重选
                // 这里简单起见，如果是在编辑且原来就是这个护士，暂时加进去，但用户一旦改了就选不回去了
                // 或者，我们在Select渲染时处理
              }
            }
            setAvailableNursesForDialog(available);
          } catch (error) {
            console.error('Failed to fetch available nurses for slot:', error);
          }
        };
        fetchAvailableNurses();
      } else {
        // 如果没有时间，显示所有护士
        setAvailableNursesForDialog(nurses);
      }
    }
  }, [isScheduleDialogOpen, form.watch('scheduled_time_start')]); // Watch time changes

  // ... existing code ...



  useEffect(() => {
    loadData();
  }, [selectedDate, viewMode, activeTab]);

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

      // 使用权限工具函数获取可访问的门店ID
      const storeFilter = getAccessibleStoreIds(user?.profile || null);

      if (activeTab === 'pending') {
        const [appointmentsData, schedulesData, nursesData, roomsData] = await Promise.all([
          clientApi.getNursePendingAppointments({
            requested_date_from: startDate,
            requested_date_to: endDate,
            store_id: storeFilter || undefined // 根据权限过滤门店
          }).catch(error => {
            return [];
          }),
          clientApi.getSchedules({
            date: viewMode === 'day' ? startDate : undefined,
            start_date: viewMode !== 'day' ? startDate : undefined,
            end_date: viewMode !== 'day' ? endDate : undefined,
            store_id: storeFilter || undefined // 根据权限过滤门店
          }),
          clientApi.getAvailableNurses(user?.profile?.store_id || undefined), // 使用用户门店ID过滤护士
          clientApi.getAvailableRooms(user?.profile?.store_id || undefined), // 使用用户门店ID过滤房间
        ]);

        // 按工作流状态分组显示，并确保只显示护理服务
        const pendingNurseAssignment = appointmentsData.filter(a =>
          a.workflow_status === 'pending_nurse_assignment' && a.service?.category === 'nursing'
        );
        const doctorConfirmed = appointmentsData.filter(a =>
          a.workflow_status === 'doctor_confirmed' && a.service?.category === 'nursing'
        );

        setPendingAppointments([...pendingNurseAssignment, ...doctorConfirmed]);
        setSchedules(schedulesData);
        setNurses(nursesData);
        setRooms(roomsData);
      } else if (activeTab === 'cancelled') {
        // 加载已取消的预约
        const [cancelledAppointmentsData, nursesData, roomsData] = await Promise.all([
          clientApi.getCancelledAppointments({
            requested_date_from: startDate,
            requested_date_to: endDate,
            store_id: storeFilter || undefined // 根据权限过滤门店
          }).catch(error => {
            return [];
          }),
          clientApi.getAvailableNurses(user?.profile?.store_id || undefined), // 使用用户门店ID过滤护士
          clientApi.getAvailableRooms(user?.profile?.store_id || undefined), // 使用用户门店ID过滤房间
        ]);

        setCancelledAppointments(cancelledAppointmentsData);
        setSchedules([]); // 已取消预约不需要显示排班
        setNurses(nursesData);
        setRooms(roomsData);
      }
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
    // 使用验证工具函数验证
    const accessValidation = validateStoreAccess(user?.profile || null, appointment.store_id, 'manage');
    if (!accessValidation.valid) {
      toast.error(accessValidation.message || '权限不足');
      return;
    }

    // 验证预约数据
    const appointmentValidation = validateAppointmentData(appointment);
    if (!appointmentValidation.valid) {
      toast.error(appointmentValidation.message || '预约数据无效');
      return;
    }

    setSelectedAppointment(appointment);
    setSelectedSchedule(null);
    setIsEditing(true); // 新建时默认为编辑模式

    const estimatedDuration = appointment.estimated_duration || 60;
    const startTime = appointment.requested_time_start || '09:00:00';
    // 处理时间计算 - 使用estimated_duration作为初始adjusted_duration
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
      adjusted_duration: estimatedDuration, // 设置初始调整时长
      adjustment_reason: '',
    });

    setIsScheduleDialogOpen(true);
  };

  const handleEditSchedule = (schedule: any) => {
    // 使用验证工具函数验证
    const scheduleStoreId = schedule.appointment?.store_id || schedule.store_id;
    const accessValidation = validateStoreAccess(user?.profile || null, scheduleStoreId, 'manage');
    if (!accessValidation.valid) {
      toast.error(accessValidation.message || '权限不足');
      return;
    }

    // 验证排班数据
    const scheduleValidation = validateScheduleData(schedule);
    if (!scheduleValidation.valid) {
      toast.error(scheduleValidation.message || '排班数据无效');
      return;
    }

    setSelectedSchedule(schedule);
    setSelectedAppointment(schedule.appointment || null);
    setIsEditing(false); // 查看现有排班时默认为查看详情模式

    // 尝试匹配正确的房间ID
    let roomId = schedule.room_id || '';
    // 检查当前房间ID是否存在于房间列表中
    const roomExists = rooms.some(r => r.id === roomId);
    if (!roomExists) {
      // 如果ID不匹配，尝试用名称匹配
      // schedule.room 可能是后端关联查询返回的对象，或者我们尝试从其他属性获取
      const roomName = schedule.room?.name || schedule.room_name;
      if (roomName) {
        const matchedRoom = rooms.find(r => r.name === roomName);
        if (matchedRoom) {
          roomId = matchedRoom.id;
        }
      }
    }

    form.reset({
      scheduled_time_start: schedule.scheduled_time_start,
      scheduled_time_end: schedule.scheduled_time_end,
      room_id: roomId,
      nurse_id: schedule.nurse_id || '',
      adjusted_duration: schedule.adjusted_duration || schedule.appointment?.estimated_duration || 60,
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

    // 使用验证工具函数验证
    const accessValidation = validateStoreAccess(user?.profile || null, selectedAppointment.store_id, 'manage');
    if (!accessValidation.valid) {
      toast.error(accessValidation.message || '权限不足');
      return;
    }

    setIsLoading(true);
    try {
      // 使用预约的requested_date作为排班日期
      const dateStr = selectedAppointment.requested_date
        ? format(new Date(selectedAppointment.requested_date), 'yyyy-MM-dd')
        : format(selectedDate, 'yyyy-MM-dd');

      // 创建临时排班对象用于验证
      const tempSchedule = {
        id: selectedSchedule?.id,
        scheduled_date: dateStr,
        scheduled_time_start: values.scheduled_time_start,
        scheduled_time_end: values.scheduled_time_end,
        room_id: values.room_id,
        nurse_id: values.nurse_id,
        appointment_id: selectedAppointment.id,
      };

      // 验证排班数据
      const scheduleValidation = validateScheduleData(tempSchedule);
      if (!scheduleValidation.valid) {
        toast.error(scheduleValidation.message || '排班数据无效');
        return;
      }

      // 检查时间冲突（除非强制覆盖）
      if (!forceOverride && hasTimeConflict(schedules, tempSchedule)) {
        setResourceConflicts([{
          type: 'room' as any,
          message: '时间段与现有排班冲突',
          resourceId: values.room_id || values.nurse_id,
          resourceName: rooms.find(r => r.id === values.room_id)?.name || nurses.find(n => n.id === values.nurse_id)?.name,
          conflictingSchedules: []
        }]);
        setPendingScheduleData(values);
        setIsConflictDialogOpen(true);
        return;
      }

      if (selectedSchedule) {
        await clientApi.updateSchedule(selectedSchedule.id, {
          scheduled_date: dateStr,
          scheduled_time_start: values.scheduled_time_start,
          scheduled_time_end: values.scheduled_time_end,
          room_id: values.room_id,
          nurse_id: values.nurse_id,
          status: 'scheduled',
          // 包含调整时长信息
          ...(values.adjusted_duration && { adjusted_duration: values.adjusted_duration }),
          ...(values.adjustment_reason && { adjustment_reason: values.adjustment_reason }),
        });
        toast.success(forceOverride ? '排班已强制更新（存在资源冲突）' : '排班已更新');
      } else {
        // 根据调整后的时长重新计算结束时间
        const finalDuration = values.adjusted_duration || selectedAppointment.estimated_duration || 60;
        const [startHour, startMinute] = values.scheduled_time_start.split(':').map(Number);
        const endMinutes = startHour * 60 + startMinute + finalDuration;
        const endHour = Math.floor(endMinutes / 60);
        const endMinute = endMinutes % 60;
        const finalEndTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`;

        await clientApi.createSchedule({
          appointment_id: selectedAppointment.id,
          scheduled_date: dateStr,
          scheduled_time_start: values.scheduled_time_start,
          scheduled_time_end: finalEndTime, // 使用重新计算的结束时间
          room_id: values.room_id,
          nurse_id: values.nurse_id,
          // 包含调整时长信息
          ...(values.adjusted_duration && { adjusted_duration: values.adjusted_duration }),
          ...(values.adjustment_reason && { adjustment_reason: values.adjustment_reason }),
        });
        // 使用新的工作流API更新状态
        await clientApi.updateAppointmentWorkflow(selectedAppointment.id, {
          workflow_status: 'nurse_scheduled',
          note: '护士长已排班'
        });
        toast.success(forceOverride ? '排班已强制创建（存在资源冲突）' : '排班已创建');
      }

      setIsScheduleDialogOpen(false);
      setIsConflictDialogOpen(false);
      setPendingScheduleData(null);
      loadData();
    } catch (error: any) {
      const errorMessage = handleApiError(error, '保存排班');
      toast.error(errorMessage);
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

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    setIsLoading(true);
    try {
      // 1. 如果是已排班的预约，先删除排班记录
      if (selectedSchedule) {
        await clientApi.deleteSchedule(selectedSchedule.id);
      }

      // 2. 更新预约状态为 'cancelled'
      await clientApi.updateAppointment(selectedAppointment.id, {
        status: 'cancelled',
      });

      toast.success('预约已手动取消');
      setIsCancelDialogOpen(false);
      setIsScheduleDialogOpen(false);

      setTimeout(() => {
        loadData();
      }, 500);
    } catch (error: any) {
      console.error('取消预约失败:', error);
      toast.error(error.message || '取消预约失败');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoomDetails = (roomId: string) => {
    // 首先尝试通过ID匹配
    let room = rooms.find(r => r.id === roomId);

    // 如果ID匹配失败，尝试通过排班数据中的room_name来匹配
    if (!room) {
      // 从排班数据中查找该房间ID对应的房间名称
      const scheduleWithRoom = schedules.find(s => s.room_id === roomId);
      if (scheduleWithRoom && scheduleWithRoom.room_name) {
        room = rooms.find(r => r.name === scheduleWithRoom.room_name);
        if (room) {
        }
      }
    }

    if (!room) return '未知房间';
    const typeMap: Record<string, string> = {
      'vip': 'VIP室',
      'treatment': '治疗室',
      'consultation': '咨询室',
    };
    const roomTypeLabel = typeMap[room.room_type] || room.room_type;
    // 只有当房间类型存在且不为undefined时才显示
    if (roomTypeLabel && roomTypeLabel !== 'undefined') {
      return `${room.name} (${roomTypeLabel})`;
    }
    return room.name;
  };

  const getNurseName = (nurseId: string) => {
    const nurse = nurses.find(n => n.id === nurseId);
    return nurse ? (nurse.full_name || nurse.name) : '未分配';
  };

  const urgentAppointments = pendingAppointments.filter(a => a.is_urgent);
  const normalAppointments = pendingAppointments.filter(a => !a.is_urgent);
  const lockedSchedules = schedules.filter(s => s.status === 'locked');
  // 排除已取消的排班，避免误导护士长
  const todaySchedules = schedules.filter(s => s.status !== 'cancelled').length;

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">护理服务排班看板</h1>
        <p className="text-muted-foreground">护理服务资源调度确认 (Nursing Service Scheduling)</p>
        {user?.profile?.store_name && (
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>当前门店: {user.profile.store_name}</span>
          </div>
        )}
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

      {/* 筛选栏 */}
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

      {/* 标签页切换 */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              待排班预约
              {pendingAppointments.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2.5 rounded-full text-xs">
                  {pendingAppointments.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'cancelled'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              已取消预约
              {cancelledAppointments.length > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2.5 rounded-full text-xs">
                  {cancelledAppointments.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* 排班待办 - 只在待排班标签页显示 */}
      {activeTab === 'pending' && (
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] mb-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">护理服务排班待办</CardTitle>
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
                          {/* 显示预约人信息 */}
                          <div className="text-xs text-gray-600 mt-1">
                            预约人: {appointment.sales_name || '未指定'}
                          </div>
                          {appointment.requested_date && (
                            <div className="text-xs text-primary font-medium mt-1">
                              📅 {format(new Date(appointment.requested_date), 'yyyy-MM-dd')}
                            </div>
                          )}
                          {/* 显示工作流状态 */}
                          {appointment.workflow_status && (
                            <div className="mt-1">
                              <Badge variant="outline" className={`text-xs bg-${getWorkflowStatusColor(appointment.workflow_status)}/10 text-${getWorkflowStatusColor(appointment.workflow_status)}`}>
                                {getWorkflowStatusDisplayName(appointment.workflow_status)}
                              </Badge>
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
                          {/* 显示预约人信息 */}
                          <div className="text-xs text-gray-600 mt-1">
                            预约人: {appointment.sales_name || '未指定'}
                          </div>
                          {appointment.requested_date && (
                            <div className="text-xs text-primary font-medium mt-1">
                              📅 {format(new Date(appointment.requested_date), 'yyyy-MM-dd')}
                            </div>
                          )}
                          {/* 显示工作流状态 */}
                          {appointment.workflow_status && (
                            <div className="mt-1">
                              <Badge variant="outline" className={`text-xs bg-${getWorkflowStatusColor(appointment.workflow_status)}/10 text-${getWorkflowStatusColor(appointment.workflow_status)}`}>
                                {getWorkflowStatusDisplayName(appointment.workflow_status)}
                              </Badge>
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
      )}

      {/* 已取消预约列表 - 只在已取消标签页显示 */}
      {activeTab === 'cancelled' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">已取消预约记录</CardTitle>
          </CardHeader>
          <CardContent>
            {cancelledAppointments.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无已取消预约</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {cancelledAppointments.map(appointment => (
                  <Card key={appointment.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-gray-900">{appointment.customer_name}</span>
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                            已取消
                          </span>
                          {appointment.is_urgent && (
                            <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                              紧急
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>预约人: {appointment.sales_name || '未指定'}</div>
                          <div>服务: {appointment.service_name}</div>
                          <div>预约时间: {formatDate(appointment.requested_date)} {appointment.requested_time_start}</div>
                          <div>预计时长: {appointment.estimated_duration || appointment.service_duration || 30}分钟</div>
                          <div>客户数量: {appointment.total_people || (appointment.companion_names?.length ? appointment.companion_names.length + 1 : 1)}人</div>
                          {appointment.companion_names && appointment.companion_names.length > 0 && (
                            <div>
                              同行客户: {appointment.companion_names.map((name: string, index: number) => (
                                <span key={index} className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mr-1 mb-1">
                                  {name}
                                </span>
                              ))}
                            </div>
                          )}
                          {appointment.cancelled_reason && (
                            <div className="text-red-600">取消原因: {appointment.cancelled_reason}</div>
                          )}
                          {appointment.cancelled_at && (
                            <div>取消时间: {new Date(appointment.cancelled_at).toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 资源看板 - 只在待排班标签页显示 */}
      {activeTab === 'pending' && (
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
              schedules={schedules.filter(s => s.status !== 'cancelled')}
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
      )}

      {/* 排班详情/编辑对话框 */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? (selectedSchedule ? '编辑排班' : '创建排班') : '排班详情'}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? '为预约分配医疗资源并确认时间' : '查看预约及资源分配详情'}
            </DialogDescription>
          </DialogHeader>

          {/* 查看模式 - 详情展示 */}
          {!isEditing && selectedSchedule && selectedAppointment && (
            <div className="space-y-6">
              <div className="border rounded-lg p-6 bg-card text-card-foreground shadow-sm">
                {/* Title Row */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-primary" />
                    <span className="font-bold text-xl">
                      {selectedAppointment.customer_name}
                    </span>
                    <StatusBadge status={selectedSchedule.status} />
                  </div>
                </div>

                {/* 预约人信息 */}
                <div className="mb-6 p-3 bg-muted/30 rounded-md">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">预约人:</span>
                    <span className="font-medium">
                      {selectedSchedule.sales_name || '未指定'}
                    </span>
                    {selectedSchedule.sales_role && (
                      <Badge variant="outline" className="text-xs">
                        {selectedSchedule.sales_role === 'sales' ? '销售' : selectedSchedule.sales_role}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 客户信息 */}
                <div className="mb-6 p-3 bg-blue-50 rounded-md">
                  <div className="flex items-start gap-2 text-sm mb-2">
                    <Users className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-muted-foreground">主客户:</span>
                        <span className="font-medium text-blue-900">
                          {selectedSchedule.customer_name || selectedAppointment.customer_name || '未知客户'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">客户数量:</span>
                        <span className="font-medium text-blue-900">
                          {(() => {
                            const totalPeople = selectedSchedule.total_people || selectedAppointment.total_people;
                            const companionNames = selectedSchedule.companion_names || selectedAppointment.companion_names;
                            const companionCount = companionNames?.length || 0;
                            const calculatedTotal = 1 + companionCount; // 主客户 + 同行客户
                            return totalPeople || calculatedTotal;
                          })()} 人
                        </span>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const companionNames = selectedSchedule.companion_names || selectedAppointment.companion_names;
                    return companionNames && companionNames.length > 0 && (
                      <div className="flex items-start gap-2 text-sm">
                        <Users className="w-4 h-4 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <span className="text-muted-foreground">同行客户:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {companionNames.map((name: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Time Info */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <span className="text-muted-foreground text-base">时间:</span>
                    <span className="font-medium text-lg">
                      {(() => {
                        if (!selectedSchedule.scheduled_time_start) return '未设定';
                        const start = selectedSchedule.scheduled_time_start.slice(0, 5);
                        const duration = selectedSchedule.adjusted_duration || selectedAppointment.estimated_duration || 0;
                        const [startH, startM] = start.split(':').map(Number);
                        const endMinutes = startH * 60 + startM + duration;
                        const endH = Math.floor(endMinutes / 60) % 24;
                        const endM = endMinutes % 60;
                        const end = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
                        return `${start} - ${end}`;
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <span className="text-muted-foreground text-base">时长:</span>
                    <span className="font-medium text-lg">
                      {selectedSchedule.adjusted_duration || selectedAppointment.estimated_duration} 分钟
                    </span>
                  </div>
                </div>

                {/* Service Info */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-2 text-sm">
                    <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-muted-foreground text-base">服务项目:</span>
                      <span className="ml-2 font-medium text-lg">
                        {selectedAppointment.service?.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resource Info */}
                <div className="grid grid-cols-2 gap-6 text-sm pt-4 border-t">
                  <div className="space-y-2">
                    <span className="text-muted-foreground text-base block">房间:</span>
                    <span className="font-medium text-lg block">
                      {getRoomDetails(selectedSchedule.room_id)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <span className="text-muted-foreground text-base block">护士:</span>
                    <span className="font-medium text-lg block">
                      {getNurseName(selectedSchedule.nurse_id)}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {selectedSchedule.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm">
                      <span className="text-muted-foreground">备注:</span>
                      <p className="mt-1 text-muted-foreground p-2 bg-muted rounded">{selectedSchedule.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setIsCancelDialogOpen(true)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  手动取消
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
                    关闭
                  </Button>
                  <Button onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    编辑排班
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}

          {/* 编辑模式 - 表单 */}
          {isEditing && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* 预约基本信息摘要 */}
                {selectedAppointment && (
                  <Alert className="bg-muted/50">
                    <AlertDescription>
                      <div className="space-y-3">
                        {/* 预约人信息 */}
                        <div className="p-3 bg-gray-50 rounded-md">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">预约人:</span>
                            <span className="font-medium">
                              {selectedAppointment.sales_name || '未指定'}
                            </span>
                            {selectedAppointment.sales_role && (
                              <Badge variant="outline" className="text-xs">
                                {selectedAppointment.sales_role === 'sales' ? '销售' : selectedAppointment.sales_role}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* 客户信息 */}
                        <div className="p-3 bg-blue-50 rounded-md">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="w-4 h-4 text-blue-600" />
                              <span className="text-muted-foreground">主客户:</span>
                              <span className="font-medium text-blue-900">
                                {selectedAppointment.customer_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground ml-6">客户数量:</span>
                              <span className="font-medium text-blue-900">
                                {selectedAppointment.total_people || (selectedAppointment.companion_names?.length ? selectedAppointment.companion_names.length + 1 : 1)} 人
                              </span>
                            </div>
                            {selectedAppointment.companion_names && selectedAppointment.companion_names.length > 0 && (
                              <div className="flex items-start gap-2 text-sm">
                                <span className="text-muted-foreground ml-6">同行客户:</span>
                                <div className="flex flex-wrap gap-1">
                                  {selectedAppointment.companion_names.map((name: string, index: number) => (
                                    <Badge key={index} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                      {name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 服务和门店信息 */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-muted-foreground">服务：</span> {selectedAppointment.service?.name}</div>
                          <div><span className="text-muted-foreground">标准：</span> {selectedAppointment.estimated_duration}分钟</div>
                          {selectedAppointment.store && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">门店：</span> {selectedAppointment.store.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="scheduled_time_start"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>开始时间 (Start)</FormLabel>
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
                        只显示当前时段未休假的护士
                      </FormDescription>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="选择护士" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableNursesForDialog.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              当前时段无可用护士
                            </div>
                          ) : (
                            availableNursesForDialog.map(nurse => (
                              <SelectItem key={nurse.id} value={nurse.id}>
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  {nurse.name || nurse.full_name}
                                </div>
                              </SelectItem>
                            ))
                          )}
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // 如果是新建模式取消，直接关闭；如果是编辑现有，返回查看模式
                      if (selectedSchedule && !isEditing) {
                        setIsEditing(false);
                      } else if (selectedSchedule && isEditing) {
                        setIsEditing(false);
                      } else {
                        setIsScheduleDialogOpen(false);
                      }
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    type="submit"
                    className="min-w-32 bg-primary hover:bg-primary/90"
                    disabled={isLoading}
                  >
                    {isLoading ? '保存中...' : '✓ 保存排班'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* 取消预约二次确认对话框 */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认取消预约？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将取消该预约申请{selectedSchedule ? '并释放已分配的资源' : ''}。
              <br />
              <span className="text-destructive font-medium mt-2 block">
                此操作无法撤销。
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelAppointment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认取消
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
