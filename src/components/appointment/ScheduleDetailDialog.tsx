import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { ScheduleWithDetails } from '@/types/types';
import { Calendar, Clock, User, FileText, AlertCircle } from 'lucide-react';

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
            {format(new Date(date), 'yyyy年M月d日 EEEE', { locale: zhCN })}
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

                  {/* 时间信息 */}
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">时间:</span>
                      <span className="font-medium">
                        {schedule.scheduled_time_start?.slice(0, 5)} - {schedule.scheduled_time_end?.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">时长:</span>
                      <span className="font-medium">
                        {schedule.appointment?.estimated_duration || 0} 分钟
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

                    {schedule.appointment?.companion_names && (
                      <div className="flex items-start gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="text-muted-foreground">同行客户:</span>
                          <span className="ml-2 font-medium">
                            {schedule.appointment.companion_names}
                          </span>
                        </div>
                      </div>
                    )}
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
                        {schedule.nurse?.name || '未分配'}
                      </span>
                    </div>
                  </div>

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
