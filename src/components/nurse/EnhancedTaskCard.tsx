import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, CheckCircle, User, MapPin, Timer, AlertTriangle } from 'lucide-react';
import StatusBadge from '@/components/appointment/StatusBadge';
import type { Schedule } from '@/services/api-client';

// 使用原始Schedule接口，通过appointment字段访问真实的后端数据
interface ExtendedSchedule extends Schedule {
  customer_name?: string;
  companion_names?: string[];
  total_people?: number;
  service_name?: string;
  estimated_duration?: number;
}

interface EnhancedTaskCardProps {
  task: ExtendedSchedule;
  timeRemaining: {
    text: string;
    variant: 'default' | 'destructive' | 'secondary';
    isOverdue: boolean;
  };
  urgent: boolean;
  onAction: (task: ExtendedSchedule) => void;
  actionLabel: string;
  actionDisabled?: boolean;
}

export default function EnhancedTaskCard({
  task,
  timeRemaining,
  urgent,
  onAction,
  actionLabel,
  actionDisabled = false
}: EnhancedTaskCardProps) {
  return (
    <Card className={`border-primary transition-all hover:shadow-md ${urgent ? 'ring-2 ring-destructive/50' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">
                {task.appointment?.customer_name || task.customer_name || `客户 #${task.appointment_id?.substring(0, 8)}`}
              </CardTitle>
              {urgent && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  紧急
                </Badge>
              )}
            </div>
            <CardDescription className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {task.room?.name || '未分配房间'}
            </CardDescription>
          </div>
          <StatusBadge status={task.status as any} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 时间信息 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {task.scheduled_time_start?.substring(0, 5)} - {task.scheduled_time_end?.substring(0, 5)}
            </span>
          </div>
          <Badge variant={timeRemaining.variant} className="text-xs">
            <Timer className="h-3 w-3 mr-1" />
            {timeRemaining.text}
          </Badge>
        </div>
        
        {/* 预约人信息 */}
        {task.appointment?.sales_name && (
          <div className="text-sm">
            <span className="text-muted-foreground">预约人：</span>
            <span className="font-medium">
              {task.appointment.sales_name}
            </span>
          </div>
        )}
        
        {/* 客户明细 */}
        <div className="text-sm space-y-1">
          <div>
            <span className="text-muted-foreground">主客户：</span>
            <span className="font-medium">
              {task.appointment?.customer_name || task.customer_name || '未知客户'}
            </span>
          </div>
          {task.companion_names && task.companion_names.length > 0 && (
            <div>
              <span className="text-muted-foreground">同行客户：</span>
              <span className="font-medium">
                {task.companion_names.join(', ')}
              </span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">总人数：</span>
            <span className="font-medium">
              {task.total_people || task.appointment?.total_people || 1} 人
            </span>
          </div>
        </div>
        
        {/* 服务信息 */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {task.estimated_duration || (task.appointment as any)?.estimated_duration || 60} 分钟
            </span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {task.service_name || task.appointment?.service?.name || '未知服务'}
            </span>
          </div>
        </div>
        
        {/* 门店信息 */}
        {(task.appointment?.store || task.store_id) && (
          <div className="text-sm">
            <span className="text-muted-foreground">门店：</span>
            <span className="font-medium">
              {task.appointment?.store?.name || `门店 #${task.store_id?.substring(0, 8)}`}
            </span>
          </div>
        )}
        
        {/* 操作按钮 */}
        <Button
          size="sm"
          onClick={() => onAction(task)}
          disabled={actionDisabled}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}