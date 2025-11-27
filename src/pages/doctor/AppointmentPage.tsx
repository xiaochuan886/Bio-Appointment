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
import { getAppointments, updateAppointment } from '@/db/api';
import type { AppointmentWithDetails } from '@/types/types';
import StatusBadge from '@/components/appointment/StatusBadge';

const rejectFormSchema = z.object({
  doctor_note: z.string().min(1, '请填写拒绝原因或建议时间'),
  suggested_date: z.date().optional(),
});

type RejectFormValues = z.infer<typeof rejectFormSchema>;

export default function DoctorAppointmentPage() {
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RejectFormValues>({
    resolver: zodResolver(rejectFormSchema),
  });

  useEffect(() => {
    loadAppointments();
    const interval = setInterval(loadAppointments, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAppointments = async () => {
    try {
      const data = await getAppointments({});
      const doctorAppointments = data.filter(
        a => a.doctor_id && (a.doctor_status === 'pending' || a.doctor_status === 'accepted' || a.doctor_status === 'rejected')
      );
      setAppointments(doctorAppointments);
    } catch (error) {
      console.error('加载预约失败:', error);
    }
  };

  const handleAccept = async (appointment: AppointmentWithDetails) => {
    try {
      await updateAppointment(appointment.id, {
        doctor_status: 'accepted',
        status: 'confirmed',
      });

      toast.success('预约已接受');
      loadAppointments();
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    }
  };

  const handleReject = (appointment: AppointmentWithDetails) => {
    setSelectedAppointment(appointment);
    form.reset({ doctor_note: '', suggested_date: undefined });
    setIsRejectDialogOpen(true);
  };

  const onRejectSubmit = async (values: RejectFormValues) => {
    if (!selectedAppointment) return;

    setIsLoading(true);
    try {
      let note = values.doctor_note;
      if (values.suggested_date) {
        const suggestedDateStr = format(values.suggested_date, 'yyyy年MM月dd日', { locale: zhCN });
        note += `\n建议改期至：${suggestedDateStr}`;
      }

      await updateAppointment(selectedAppointment.id, {
        doctor_status: 'rejected',
        doctor_note: note,
        status: 'cancelled',
      });

      toast.success('预约已拒绝，系统将通知销售人员');
      setIsRejectDialogOpen(false);
      loadAppointments();
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    } finally {
      setIsLoading(false);
    }
  };

  const pendingAppointments = appointments.filter(a => a.doctor_status === 'pending');
  const acceptedAppointments = appointments.filter(a => a.doctor_status === 'accepted');
  const rejectedAppointments = appointments.filter(a => a.doctor_status === 'rejected');

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">预约待办</h1>
        <p className="text-muted-foreground">处理需要医生确认的预约申请</p>
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
            <CardTitle className="text-sm font-medium">已接受</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-confirmed">{acceptedAppointments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">已确认预约</p>
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
                      <StatusBadge status={appointment.doctor_status || 'pending'} />
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
                      {appointment.sales && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">销售：</span>
                          <span className="font-medium">{appointment.sales.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => handleAccept(appointment)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        接受
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
            <h2 className="text-xl font-bold mb-4">已接受预约</h2>
            <div className="grid gap-4 xl:grid-cols-2">
              {acceptedAppointments.map(appointment => (
                <Card key={appointment.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{appointment.customer_name}</CardTitle>
                      <StatusBadge status={appointment.doctor_status || 'accepted'} />
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
                        <StatusBadge status={appointment.status} />
                      </div>
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
                      <StatusBadge status={appointment.doctor_status || 'rejected'} />
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
