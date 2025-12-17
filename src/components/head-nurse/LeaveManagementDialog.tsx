import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarIcon, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import clientApi from '@/services/api-client';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface LeaveManagementDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    leaveToEdit?: any; // If provided, we are in edit mode
    storeId?: string; // Current store ID context
}

export function LeaveManagementDialog({
    isOpen,
    onClose,
    onSuccess,
    leaveToEdit,
    storeId,
}: LeaveManagementDialogProps) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [nurses, setNurses] = useState<any[]>([]);

    // Form state
    const [nurseId, setNurseId] = useState('');
    const [leaveDate, setLeaveDate] = useState<Date | undefined>(undefined);
    const [leavePeriod, setLeavePeriod] = useState<'morning' | 'afternoon' | 'full_day'>('full_day');
    const [reason, setReason] = useState('');

    // Conflict state
    const [conflicts, setConflicts] = useState<any[]>([]);
    const [showConflicts, setShowConflicts] = useState(false);
    const [conflictChecked, setConflictChecked] = useState(false); // 跟踪是否已检查过冲突

    useEffect(() => {
        if (isOpen) {
            loadNurses();
            if (leaveToEdit) {
                setNurseId(leaveToEdit.nurse_id);
                setLeaveDate(new Date(leaveToEdit.leave_date));
                setLeavePeriod(leaveToEdit.leave_period);
                setReason(leaveToEdit.reason || '');
                setConflictChecked(true); // 编辑模式不需要检查冲突
            } else {
                // Reset form
                setNurseId('');
                setLeaveDate(undefined);
                setLeavePeriod('full_day');
                setReason('');
                setConflicts([]);
                setShowConflicts(false);
                setConflictChecked(false); // 重置检查状态
            }
        }
    }, [isOpen, leaveToEdit, storeId]);

    const loadNurses = async () => {
        try {
            setLoading(true);

            // 如果有storeId，优先使用getStoreStaff
            if (storeId) {
                console.log('🔍 [DEBUG] 使用getStoreStaff加载护士，storeId:', storeId);
                const staffList = await clientApi.getStoreStaff(storeId, 'nurse');
                console.log('🔍 [DEBUG] getStoreStaff返回护士数:', staffList.length);
                setNurses(staffList);
            } else {
                console.log('⚠️ [WARN] storeId为空，使用profiles API加载所有护士');
                // 否则使用profiles API并过滤
                const allProfiles = await clientApi.getProfiles();
                let nurseProfiles = allProfiles.filter(p =>
                    (p.role === 'nurse' || p.role === 'head_nurse') &&
                    p.status === 'active'
                );

                // 如果有storeId但是为空字符串，仍然需要过滤
                // 如果是head_nurse，应该从 user context 获取 storeId
                console.log('🔍 [DEBUG] profiles API返回护士数:', nurseProfiles.length);
                setNurses(nurseProfiles);
            }
        } catch (error) {
            console.error('❌ Failed to load nurses:', error);
            toast.error('加载护士列表失败');
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        if (!nurseId) {
            toast.error('请选择护士');
            return false;
        }
        if (!leaveDate) {
            toast.error('请选择休假日期');
            return false;
        }
        if (!reason.trim()) {
            toast.error('请输入休假原因');
            return false;
        }
        return true;
    };

    const handleCheckConflicts = async () => {
        if (!nurseId || !leaveDate) {
            toast.error('请先选择护士和日期');
            return;
        }

        try {
            setLoading(true);
            const formattedDate = format(leaveDate!, 'yyyy-MM-dd');

            // 获取该护士在该日期的排班
            const filters: any = {
                nurse_id: nurseId,
                start_date: formattedDate,
                end_date: formattedDate,
            };

            const schedules = await clientApi.getSchedules(filters);

            // 根据休假时段筛选冲突的排班
            const conflictingSchedules = schedules.filter(schedule => {
                if (schedule.status === 'cancelled' || schedule.status === 'completed') {
                    return false;
                }

                const scheduleStartTime = schedule.scheduled_time_start;
                const isMorning = scheduleStartTime < '12:00:00';

                if (leavePeriod === 'full_day') {
                    return true;
                } else if (leavePeriod === 'morning' && isMorning) {
                    return true;
                } else if (leavePeriod === 'afternoon' && !isMorning) {
                    return true;
                }

                return false;
            });

            setConflicts(conflictingSchedules);
            setConflictChecked(true); // 标记已检查

            if (conflictingSchedules.length > 0) {
                setShowConflicts(true);
                toast.warning(`检测到 ${conflictingSchedules.length} 个排班冲突，请先交接排班`);
            } else {
                setShowConflicts(false);
                toast.success('无排班冲突，可以安排休假');
            }
        } catch (error) {
            console.error('Failed to check conflicts:', error);
            toast.error('检查排班冲突失败');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            setSubmitting(true);
            const formattedDate = format(leaveDate!, 'yyyy-MM-dd');

            const payload = {
                nurse_id: nurseId,
                leave_date: formattedDate,
                leave_period: leavePeriod,
                reason: reason,
            };

            if (leaveToEdit) {
                await clientApi.updateNurseLeave(leaveToEdit.id, payload);
                toast.success('休假记录更新成功');
                onSuccess();
                onClose();
            } else {
                // 对于新建休假，先检查是否需要处理冲突
                const response: any = await clientApi.createNurseLeave(payload);

                if (response.has_conflicts && response.conflicting_schedules?.length > 0) {
                    // 休假已创建，但有冲突需要处理
                    setConflicts(response.conflicting_schedules);
                    setShowConflicts(true);
                    toast.warning(`休假已创建，但有 ${response.conflicting_schedules.length} 个排班需要交接`);
                    onSuccess(); // 刷新列表
                    // 不关闭对话框，让用户看到冲突信息
                } else {
                    toast.success('休假记录创建成功');
                    onSuccess();
                    onClose();
                }
            }
        } catch (error: any) {
            console.error('Failed to submit leave:', error);
            if (error.response?.status === 409) {
                toast.error('该护士在此时段已有休假记录');
            } else {
                toast.error(error.message || '操作失败');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{leaveToEdit ? '编辑休假' : '安排休假'}</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="nurse" className="text-right">
                            护士
                        </Label>
                        <Select
                            value={nurseId}
                            onValueChange={setNurseId}
                            disabled={!!leaveToEdit || loading}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="选择护士" />
                            </SelectTrigger>
                            <SelectContent>
                                {nurses.map((nurse) => (
                                    <SelectItem key={nurse.id} value={nurse.id}>
                                        {nurse.full_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">日期</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "col-span-3 justify-start text-left font-normal",
                                        !leaveDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {leaveDate ? format(leaveDate, "yyyy年MM月dd日", { locale: zhCN }) : <span>选择日期</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={leaveDate}
                                    onSelect={setLeaveDate}
                                    initialFocus
                                    locale={zhCN}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="period" className="text-right">
                            时段
                        </Label>
                        <Select
                            value={leavePeriod}
                            onValueChange={(val: any) => setLeavePeriod(val)}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="morning">上午</SelectItem>
                                <SelectItem value="afternoon">下午</SelectItem>
                                <SelectItem value="full_day">全天</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="reason" className="text-right">
                            原因
                        </Label>
                        <Textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="col-span-3"
                            placeholder="请输入休假原因"
                        />
                    </div>

                    {!leaveToEdit && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <div className="col-span-1"></div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCheckConflicts}
                                disabled={!nurseId || !leaveDate || loading}
                                className="col-span-3"
                            >
                                {conflictChecked ? '重新检查排班冲突' : '检查排班冲突'}
                            </Button>
                        </div>
                    )}

                    {!conflictChecked && !leaveToEdit && (
                        <div className="text-center text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                            ⚠️ 请先点击"检查排班冲突"按钮，确认无冲突或知晓需要交接后才能确认休假
                        </div>
                    )}

                    {showConflicts && conflicts.length > 0 && (
                        <Alert variant="destructive" className="mt-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>排班冲突警告</AlertTitle>
                            <AlertDescription>
                                该护士在休假期间有 {conflicts.length} 个已有排班，需要交接：
                                <ul className="mt-2 ml-4 list-disc text-sm space-y-1">
                                    {conflicts.slice(0, 3).map((conflict: any, idx: number) => (
                                        <li key={idx}>
                                            {conflict.scheduled_time_start?.slice(0, 5)} - {conflict.scheduled_time_end?.slice(0, 5)}
                                            {conflict.customer_name && ` (${conflict.customer_name})`}
                                        </li>
                                    ))}
                                    {conflicts.length > 3 && <li>...还有 {conflicts.length - 3} 个</li>}
                                </ul>
                                <p className="mt-2 text-sm font-medium">
                                    ⚠️ 请先在休假管理列表中使用"交接排班"功能处理这些排班
                                </p>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={submitting}>
                        取消
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || loading || (!leaveToEdit && !conflictChecked)}
                        title={!conflictChecked && !leaveToEdit ? '请先检查排班冲突' : ''}
                    >
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {leaveToEdit ? '保存修改' : '确认休假'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
