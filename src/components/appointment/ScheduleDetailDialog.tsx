import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isValid, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { ScheduleWithDetails } from '@/types/types';
import { Calendar, Clock, User, FileText, AlertCircle, MapPin } from 'lucide-react';

interface ScheduleDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedules: ScheduleWithDetails[];
  date: string;
  resourceName?: string;
  resourceType?: 'room' | 'nurse';
}

export default function ScheduleDetailDialog({
  open,
  onOpenChange,
  schedules,
  date,
  resourceName,
  resourceType,
}: ScheduleDetailDialogProps) {
  // 安全地格式化日期
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '未指定日期';
    try {
      const parsedDate = parseISO(dateStr);
      if (!isValid(parsedDate)) return '无效日期';
      return format(parsedDate, 'yyyy年M月d日 EEEE', { locale: zhCN });
    } catch {
      return '日期格式错误';
    }
  };
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: '待排班', variant: 'secondary' },
      scheduled: { label: '已排班', variant: 'default' },
      locked: { label: '已锁定', variant: 'outline' },
      completed: { label: '已完成', variant: 'outline' },
      cancelled: { label: '已取消', variant: 'destructive' },
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getUrgencyBadge = (isUrgent: boolean) => {
    if (!isUrgent) return null;
    return (
      <Badge variant="destructive" className="ml-2">
        <AlertCircle className="w-3 h-3 mr-1" />
        急单
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {formatDate(date)}
            {resourceName && (
              <span className="text-muted-foreground text-sm">
                - {resourceType === 'room' ? '房间' : '护士'}: {resourceName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              该日期暂无排班
            </div>
          ) : (
            <div className="space-y-4">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  {/* 标题行 */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-lg">
                        {schedule.appointment?.customer_name || '未知客户'}
                      </span>
                      {getUrgencyBadge(schedule.appointment?.is_urgent || false)}
                    </div>
                    {getStatusBadge(schedule.status)}
                  </div>

                  {/* 预约人信息 */}
                  <div className="mb-3 p-2 bg-muted/30 rounded-md">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">预约人:</span>
                      <span className="font-medium">
                        {schedule.sales_name || '未指定'}
                      </span>
                      {schedule.sales_role && (
                        <Badge variant="outline" className="text-xs">
                          {schedule.sales_role === 'sales' ? '销售' : schedule.sales_role}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* 客户信息 */}
                  <div className="mb-3 p-2 bg-blue-50 rounded-md">
                    <div className="flex items-start gap-2 text-sm mb-2">
                      <User className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-muted-foreground">主客户:</span>
                          <span className="font-medium text-blue-900">
                            {schedule.customer_name || schedule.appointment?.customer_name || '未知客户'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">客户数量:</span>
                          <span className="font-medium text-blue-900">
                            {(() => {
                              const totalPeople = schedule.total_people || schedule.appointment?.total_people;
                              const companionNames = schedule.companion_names || schedule.appointment?.companion_names;
                              const companionCount = companionNames?.length || 0;
                              const calculatedTotal = 1 + companionCount; // 主客户 + 同行客户
                              return totalPeople || calculatedTotal;
                            })()} 人
                          </span>
                        </div>
                      </div>
                    </div>

                    {(() => {
                      const companionNames = schedule.companion_names || schedule.appointment?.companion_names;
                      return companionNames && companionNames.length > 0 && (
                        <div className="flex items-start gap-2 text-sm">
                          <User className="w-4 h-4 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <span className="text-muted-foreground">同行客户:</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {companionNames.map((name, index) => (
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

                  {/* 时间信息 */}
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">时间:</span>
                      <span className="font-medium">
                        {(() => {
                          if (!schedule.scheduled_time_start) return '未设定';
                          const start = schedule.scheduled_time_start.slice(0, 5);
                          // 计算结束时间：开始时间 + 时长
                          const duration = schedule.adjusted_duration || schedule.appointment?.estimated_duration || 0;
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
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">时长:</span>
                      <span className="font-medium">
                        {schedule.adjusted_duration || schedule.appointment?.estimated_duration || 0} 分钟
                      </span>
                    </div>
                  </div>

                  {/* 服务信息 */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2 text-sm">
                      <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="text-muted-foreground">服务项目:</span>
                        <span className="ml-2 font-medium">
                          {schedule.appointment?.service?.name || '未指定'}
                        </span>
                      </div>
                    </div>


                  </div>

                  {/* 资源信息 */}
                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">房间:</span>
                      <span className="ml-2 font-medium">
                        {schedule.room?.name || '未分配'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">护士:</span>
                      <span className="ml-2 font-medium">
                        {schedule.nurse?.full_name || schedule.nurse?.name || '未分配'}
                      </span>
                    </div>
                  </div>

                  {/* 门店信息 */}
                  {schedule.appointment?.store && (
                    <div className="mb-3 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">门店:</span>
                        <span className="font-medium">
                          {schedule.appointment.store.name}
                        </span>
                      </div>
                      {schedule.appointment.store.address && (
                        <div className="ml-6 text-xs text-muted-foreground">
                          {schedule.appointment.store.address}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 调整原因 */}
                  {schedule.adjustment_reason && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm">
                        <span className="text-muted-foreground">调整原因:</span>
                        <p className="mt-1 text-muted-foreground">{schedule.adjustment_reason}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
