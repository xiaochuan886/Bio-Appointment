import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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

    useEffect(() => {
        if (isOpen) {
            loadNurses();
            if (leaveToEdit) {
                setNurseId(leaveToEdit.nurse_id);
                setLeaveDate(new Date(leaveToEdit.leave_date));
                setLeavePeriod(leaveToEdit.leave_period);
                setReason(leaveToEdit.reason || '');
            } else {
                // Reset form
                setNurseId('');
                setLeaveDate(undefined);
                setLeavePeriod('full_day');
                setReason('');
                setConflicts([]);
                setShowConflicts(false);
            }
        }
    }, [isOpen, leaveToEdit, storeId]);

    const loadNurses = async () => {
        try {
            setLoading(true);
            // Fetch all nurses for the store to populate the select
            // We use the basic profiles endpoint or available nurses endpoint
            // Here we want ALL nurses, not just available ones, so we might need a general fetch
            // Assuming getAvailableNurses can return all if we don't filter by date/time, 
            // OR we use getStoreStaff if available.
            // Let's use getStoreStaff for now if storeId is present, or fallback to getAvailableNurses without date filter

            let fetchedNurses = [];
            if (storeId) {
                fetchedNurses = await clientApi.getStoreStaff(storeId, 'nurse');
            } else {
                // Fallback or for super admin without specific store context selected yet (though UI usually enforces it)
                fetchedNurses = await clientApi.getAvailableNurses(storeId);
            }
            setNurses(fetchedNurses);
        } catch (error) {
            console.error('Failed to load nurses:', error);
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
                // Create new
                const response: any = await clientApi.createNurseLeave(payload);

                if (response.has_conflicts) {
                    setConflicts(response.conflicting_schedules);
                    setShowConflicts(true);
                    toast.warning('存在排班冲突，请处理');
                    // In a real flow, we might want to prevent closing or prompt for transfer here
                    // For now, we show the conflicts and the user can decide to transfer schedules separately or we can integrate it.
                    // Since the leave is actually created despite conflicts (based on backend implementation returning 201 with conflicts),
                    // we should probably let the user know. 
                    // WAIT: The backend creates the leave and returns conflicts. So the leave IS created.
                    // We can close this dialog and perhaps open the transfer dialog or just show success with warning.
                    // Let's keep the dialog open if there are conflicts so user can see them, OR close it and trigger a transfer flow.
                    // For MVP: Success but warn.

                    onSuccess(); // Refresh list
                    // Don't close immediately if we want to show conflicts? 
                    // Actually, if leave is created, we should probably close and maybe let parent handle transfer prompting
                    // or show a specific "Transfer needed" UI.
                    // Let's just close and show success for now, as the requirement says "require head nurses to reassign".
                    // The parent page can detect conflicts or we can have a button in the list.
                    onClose();
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

                    {showConflicts && conflicts.length > 0 && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>排班冲突警告</AlertTitle>
                            <AlertDescription>
                                该护士在休假期间有 {conflicts.length} 个已有排班。请在休假创建后使用"交接排班"功能分配给其他护士。
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={submitting}>
                        取消
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || loading}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {leaveToEdit ? '保存修改' : '确认休假'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
