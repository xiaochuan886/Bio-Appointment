import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ResourceConflict {
  type: 'room' | 'nurse';
  resourceName: string;
  conflictingSchedules: Array<{
    customerName: string;
    timeStart: string;
    timeEnd: string;
    serviceName: string;
  }>;
}

interface ResourceConflictDialogProps {
  open: boolean;
  conflicts: ResourceConflict[];
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ResourceConflictDialog({
  open,
  conflicts,
  onConfirm,
  onCancel,
}: ResourceConflictDialogProps) {
  if (conflicts.length === 0) return null;

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>资源冲突警告</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left space-y-4 pt-4">
            <p className="text-base font-medium">
              检测到以下资源在所选时间段已被占用，是否强制排班？
            </p>

            {conflicts.map((conflict, index) => (
              <div key={index} className="border rounded-lg p-4 bg-muted/50">
                <div className="font-semibold text-foreground mb-2">
                  {conflict.type === 'room' ? '🏥 房间冲突' : '👩‍⚕️ 护士冲突'}: {conflict.resourceName}
                </div>
                <div className="space-y-2">
                  {conflict.conflictingSchedules.map((schedule, idx) => (
                    <div key={idx} className="text-sm pl-4 border-l-2 border-destructive">
                      <div className="font-medium text-foreground">{schedule.customerName}</div>
                      <div className="text-muted-foreground">
                        {schedule.serviceName}
                      </div>
                      <div className="text-muted-foreground">
                        时间: {schedule.timeStart.slice(0, 5)} - {schedule.timeEnd.slice(0, 5)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ⚠️ <strong>注意：</strong>强制排班将导致资源重叠使用，请确保线下已协调好相关安排。
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>取消排班</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            强制排班
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
