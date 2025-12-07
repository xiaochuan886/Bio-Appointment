import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CheckCircle, XCircle, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import clientApi from '@/services/api-client';
import type { Appointment } from '@/services/api-client';
import StatusBadge from '@/components/appointment/StatusBadge';
import { canViewStoreSchedule, canAccessDoctorPendingAppointments, getWorkflowStatusDisplayName, getWorkflowStatusColor } from '@/utils/permissions';
import { handleApiError } from '@/utils/validation';

const rejectFormSchema = z.object({
  doctor_note: z.string().min(1, '请填写拒绝原因或建议时间'),
  suggested_date: z.date().optional(),
});

type RejectFormValues = z.infer<typeof rejectFormSchema>;

export default function DoctorAppointmentPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RejectFormValues>({
    resolver: zodResolver(rejectFormSchema),
  });

  useEffect(() => {
    if (user) {
      loadAppointments();
      const interval = setInterval(loadAppointments, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadAppointments = async () => {
    try {
      if (!user) return;
      
      // 检查是否有权限访问医生待处理预约
      if (!canAccessDoctorPendingAppointments(user.profile)) {
        toast.error('您没有权限访问医生预约');
        return;
      }
      
      // 获取当前用户的门店ID
      const userStoreId = user.profile?.store_id;
      
      // 使用新的API获取医生待处理预约
      const data = await clientApi.getDoctorPendingAppointments({
        store_id: userStoreId
      });
      
      setAppointments(data);
    } catch (error) {
      console.error('加载预约失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error(`加载预约失败: ${errorMessage}`);
    }
  };

  const handleAccept = async (appointment: Appointment) => {
    if (!user || !user.id) return;
    
    try {
      // 使用新的工作流API确认预约
      await clientApi.doctorConfirmAppointment(appointment.id, {
        doctor_id: user.id,
        doctor_note: '医生已确认预约'
      });

      toast.success('预约已确认');
      loadAppointments();
    } catch (error: any) {
      const errorMessage = handleApiError(error, '确认预约');
      toast.error(errorMessage);
    }
  };

  const handleReject = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    form.reset({ doctor_note: '', suggested_date: undefined });
    setIsRejectDialogOpen(true);
  };

  const onRejectSubmit = async (values: RejectFormValues) => {
    if (!selectedAppointment || !user || !user.id) return;
    
    setIsLoading(true);
    try {
      let note = values.doctor_note;
      if (values.suggested_date) {
        const suggestedDateStr = format(values.suggested_date, 'yyyy年MM月dd日', { locale: zhCN });
        note += `\n建议改期至：${suggestedDateStr}`;
      }

      // 使用新的工作流API拒绝预约
      await clientApi.doctorRejectAppointment(selectedAppointment.id, {
        doctor_id: user.id,
        doctor_note: note
      });

      toast.success('预约已拒绝，系统将通知销售人员');
      setIsRejectDialogOpen(false);
      loadAppointments();
    } catch (error: any) {
      const errorMessage = handleApiError(error, '拒绝预约');
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 根据工作流状态过滤预约
  const pendingAppointments = appointments.filter(a => a.workflow_status === 'pending_doctor_confirmation');
  const acceptedAppointments = appointments.filter(a =>
    a.workflow_status === 'doctor_confirmed' || a.workflow_status === 'doctor_completed'
  );
  const rejectedAppointments = appointments.filter(a => a.workflow_status === 'doctor_rejected');

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">医生服务管理</h1>
        <p className="text-muted-foreground">处理医生服务预约（确认后直接完成，无需护士长排班）</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待确认</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pending">{pendingAppointments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">等待处理</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已完成</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-confirmed">{acceptedAppointments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">已完成预约</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已拒绝</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{rejectedAppointments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">已拒绝预约</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {pendingAppointments.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">待确认预约</h2>
            <div className="grid gap-4 xl:grid-cols-2">
              {pendingAppointments.map(appointment => (
                <Card key={appointment.id} className="border-pending">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{appointment.customer_name}</CardTitle>
                      <div className="flex items-center gap-2">
                        {/* 显示工作流状态 */}
                        {appointment.workflow_status && (
                          <div className="px-2 py-1 bg-blue/10 text-blue rounded text-xs">
                            {getWorkflowStatusDisplayName(appointment.workflow_status)}
                          </div>
                        )}
                        <StatusBadge status="pending" />
                      </div>
                    </div>
                    <CardDescription>{appointment.service?.name}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">预约日期：</span>
                        <span className="font-medium">
                          {format(new Date(appointment.requested_date), 'yyyy-MM-dd')}
                        </span>
                      </div>
                      {appointment.requested_time_start && (
                        <div>
                          <span className="text-muted-foreground">期望时间：</span>
                          <span className="font-medium">
                            {appointment.requested_time_start.substring(0, 5)}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">人数：</span>
                        <span className="font-medium">{appointment.total_people} 人</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">预估时长：</span>
                        <span className="font-medium">{appointment.estimated_duration} 分钟</span>
                      </div>
                      {appointment.store && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">门店：</span>
                          <span className="font-medium">{appointment.store.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => handleAccept(appointment)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        确认
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleReject(appointment)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        拒绝
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {acceptedAppointments.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">已完成预约</h2>
            <div className="grid gap-4 xl:grid-cols-2">
              {acceptedAppointments.map(appointment => (
                <Card key={appointment.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{appointment.customer_name}</CardTitle>
                      <div className="flex items-center gap-2">
                        {/* 显示工作流状态 */}
                        {appointment.workflow_status && (
                          <div className={`px-2 py-1 rounded text-xs ${
                            appointment.workflow_status === 'doctor_completed'
                              ? 'bg-blue/10 text-blue'
                              : 'bg-green/10 text-green'
                          }`}>
                            {getWorkflowStatusDisplayName(appointment.workflow_status)}
                          </div>
                        )}
                        <StatusBadge status="confirmed" />
                      </div>
                    </div>
                    <CardDescription>{appointment.service?.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">预约日期：</span>
                        <span className="font-medium">
                          {format(new Date(appointment.requested_date), 'yyyy-MM-dd')}
                        </span>
                      </div>
                      {appointment.requested_time_start && (
                        <div>
                          <span className="text-muted-foreground">时间：</span>
                          <span className="font-medium">
                            {appointment.requested_time_start.substring(0, 5)}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">状态：</span>
                        <StatusBadge status={appointment.workflow_status === 'doctor_completed' ? 'completed' : (appointment.status as any)} />
                      </div>
                      {appointment.doctor_confirmed_at && (
                        <div>
                          <span className="text-muted-foreground">确认时间：</span>
                          <span className="font-medium">
                            {format(new Date(appointment.doctor_confirmed_at), 'yyyy-MM-dd HH:mm')}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {rejectedAppointments.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">已拒绝预约</h2>
            <div className="grid gap-4 xl:grid-cols-2">
              {rejectedAppointments.map(appointment => (
                <Card key={appointment.id} className="opacity-75">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{appointment.customer_name}</CardTitle>
                      <div className="flex items-center gap-2">
                        {/* 显示工作流状态 */}
                        {appointment.workflow_status && (
                          <div className="px-2 py-1 bg-red/10 text-red rounded text-xs">
                            {getWorkflowStatusDisplayName(appointment.workflow_status)}
                          </div>
                        )}
                        <StatusBadge status="cancelled" />
                      </div>
                    </div>
                    <CardDescription>{appointment.service?.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">预约日期：</span>
                        <span className="font-medium">
                          {format(new Date(appointment.requested_date), 'yyyy-MM-dd')}
                        </span>
                      </div>
                      {appointment.doctor_note && (
                        <div>
                          <span className="text-muted-foreground">拒绝原因：</span>
                          <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
                            {appointment.doctor_note}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {appointments.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">暂无预约待办</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒绝预约</DialogTitle>
            <DialogDescription>
              拒绝 {selectedAppointment?.customer_name} 的预约申请
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onRejectSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="doctor_note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>拒绝原因 *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="请说明拒绝原因或提供建议"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      请填写拒绝原因，系统将通知销售人员
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="suggested_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>建议改期日期（可选）</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full pl-3 text-left font-normal"
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: zhCN })
                            ) : (
                              <span>选择建议日期</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      如有合适的时间，可以建议客户改期
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button type="submit" variant="destructive" className="flex-1" disabled={isLoading}>
                  {isLoading ? '提交中...' : '确认拒绝'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRejectDialogOpen(false)}
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
