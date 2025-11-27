import { Badge } from '@/components/ui/badge';
import type { AppointmentStatus, ScheduleStatus, TaskExecutionStatus, DoctorStatus } from '@/types/types';

interface StatusBadgeProps {
  status: AppointmentStatus | ScheduleStatus | TaskExecutionStatus | DoctorStatus;
  isUrgent?: boolean;
}

const statusConfig: Record<string, { label: string; variant: string; className?: string }> = {
  // 预约状态
  pending: { label: '待排班', variant: 'default', className: 'bg-pending text-pending-foreground' },
  scheduled: { label: '已排班', variant: 'default', className: 'bg-scheduled text-scheduled-foreground' },
  confirmed: { label: '已确认', variant: 'default', className: 'bg-confirmed text-confirmed-foreground' },
  in_progress: { label: '进行中', variant: 'default', className: 'bg-primary text-primary-foreground' },
  completed: { label: '已完成', variant: 'default', className: 'bg-completed text-completed-foreground' },
  cancelled: { label: '已取消', variant: 'default', className: 'bg-muted text-muted-foreground' },
  
  // 排班状态
  draft: { label: '草稿', variant: 'outline' },
  published: { label: '已发布', variant: 'default', className: 'bg-scheduled text-scheduled-foreground' },
  locked: { label: '已锁定', variant: 'default', className: 'bg-confirmed text-confirmed-foreground' },
  
  // 任务执行状态
  checked_in: { label: '已到达', variant: 'default', className: 'bg-scheduled text-scheduled-foreground' },
  
  // 医生状态
  accepted: { label: '已接受', variant: 'default', className: 'bg-confirmed text-confirmed-foreground' },
  rejected: { label: '已拒绝', variant: 'destructive' },
};

export default function StatusBadge({ status, isUrgent }: StatusBadgeProps) {
  if (isUrgent) {
    return (
      <Badge className="bg-urgent text-urgent-foreground">
        🔥 急单
      </Badge>
    );
  }

  const config = statusConfig[status] || { label: status, variant: 'default' };
  
  return (
    <Badge 
      variant={config.variant as any}
      className={config.className}
    >
      {config.label}
    </Badge>
  );
}
