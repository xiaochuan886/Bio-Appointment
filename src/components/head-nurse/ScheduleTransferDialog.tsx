import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ArrowRight } from 'lucide-react';
import clientApi from '@/services/api-client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ScheduleTransferDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    sourceNurseId: string;
    sourceNurseName: string;
    schedulesToTransfer?: any[]; // If pre-filled
    storeId?: string;
    dateRange?: { from: Date; to: Date }; // Optional range to filter schedules
}

export function ScheduleTransferDialog({
    isOpen,
    onClose,
    onSuccess,
    sourceNurseId,
    sourceNurseName,
    schedulesToTransfer,
    storeId,
    dateRange,
}: ScheduleTransferDialogProps) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [targetNurseId, setTargetNurseId] = useState('');
    const [availableNurses, setAvailableNurses] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen && sourceNurseId) {
            loadData();
        }
    }, [isOpen, sourceNurseId]);

    const loadData = async () => {
        try {
            setLoading(true);

            // 1. Load available target nurses (excluding source nurse)
            if (storeId) {
                console.log('🔍 [DEBUG] ScheduleTransferDialog - 使用getStoreStaff，storeId:', storeId);
                const nurses = await clientApi.getStoreStaff(storeId, 'nurse');
                setAvailableNurses(nurses.filter((n: any) => n.id !== sourceNurseId && n.status === 'active'));
            } else {
                console.log('⚠️ [WARN] ScheduleTransferDialog - storeId为空，使用profiles API');
                const allProfiles = await clientApi.getProfiles();
                const nurses = allProfiles.filter((p: any) =>
                    (p.role === 'nurse' || p.role === 'head_nurse') &&
                    p.status === 'active'
                );
                setAvailableNurses(nurses.filter((n: any) => n.id !== sourceNurseId));
            }

            // 2. Load schedules if not provided
            if (schedulesToTransfer && schedulesToTransfer.length > 0) {
                setSchedules(schedulesToTransfer);
                setSelectedScheduleIds(schedulesToTransfer.map(s => s.id));
            } else {
                // Fetch future schedules for source nurse
                const filters: any = {
                    nurse_id: sourceNurseId,
                    start_date: dateRange ? format(dateRange.from, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                    status: 'scheduled' // Only active schedules
                };
                if (dateRange) {
                    filters.end_date = format(dateRange.to, 'yyyy-MM-dd');
                }

                const fetchedSchedules = await clientApi.getSchedules(filters);
                setSchedules(fetchedSchedules);
                // Default select all
                setSelectedScheduleIds(fetchedSchedules.map(s => s.id));
            }
        } catch (error) {
            console.error('❌ Failed to load transfer data:', error);
            toast.error('加载排班数据失败');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSchedule = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedScheduleIds(prev => [...prev, id]);
        } else {
            setSelectedScheduleIds(prev => prev.filter(sid => sid !== id));
        }
    };

    const handleToggleAll = (checked: boolean) => {
        if (checked) {
            setSelectedScheduleIds(schedules.map(s => s.id));
        } else {
            setSelectedScheduleIds([]);
        }
    };

    const handleSubmit = async () => {
        if (!targetNurseId) {
            toast.error('请选择接班护士');
            return;
        }
        if (selectedScheduleIds.length === 0) {
            toast.error('请选择要交接的排班');
            return;
        }

        try {
            setSubmitting(true);
            const result: any = await clientApi.transferSchedules({
                from_nurse_id: sourceNurseId,
                to_nurse_id: targetNurseId,
                schedule_ids: selectedScheduleIds,
            });

            toast.success(result.message || '排班交接成功');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Transfer failed:', error);
            toast.error(error.message || '交接失败');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>排班交接</DialogTitle>
                    <DialogDescription>
                        将 {sourceNurseName} 的排班交接给其他护士
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex items-center gap-4">
                        <Label className="w-20 text-right">接班护士</Label>
                        <Select value={targetNurseId} onValueChange={setTargetNurseId}>
                            <SelectTrigger className="flex-1">
                                <SelectValue placeholder="选择接班护士" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableNurses.map(nurse => (
                                    <SelectItem key={nurse.id} value={nurse.id}>{nurse.full_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b">
                            <Label>待交接排班 ({selectedScheduleIds.length}/{schedules.length})</Label>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="select-all"
                                    checked={schedules.length > 0 && selectedScheduleIds.length === schedules.length}
                                    onCheckedChange={(checked) => handleToggleAll(checked === true)}
                                />
                                <label htmlFor="select-all" className="text-sm cursor-pointer">全选</label>
                            </div>
                        </div>

                        <ScrollArea className="h-[300px] border rounded-md p-2">
                            {loading ? (
                                <div className="flex justify-center items-center h-full">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : schedules.length === 0 ? (
                                <div className="flex justify-center items-center h-full text-muted-foreground">
                                    无待交接排班
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {schedules.map(schedule => (
                                        <div key={schedule.id} className="flex items-start space-x-3 p-2 hover:bg-slate-50 rounded-md border border-transparent hover:border-slate-200">
                                            <Checkbox
                                                id={`sch-${schedule.id}`}
                                                checked={selectedScheduleIds.includes(schedule.id)}
                                                onCheckedChange={(checked) => handleToggleSchedule(schedule.id, checked === true)}
                                                className="mt-1"
                                            />
                                            <label htmlFor={`sch-${schedule.id}`} className="flex-1 grid gap-1 cursor-pointer">
                                                <div className="font-medium flex items-center justify-between">
                                                    <span>{format(new Date(schedule.scheduled_date), 'MM月dd日', { locale: zhCN })} {schedule.scheduled_time_start.slice(0, 5)}-{schedule.scheduled_time_end.slice(0, 5)}</span>
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                                        {schedule.appointment?.service?.name || '未知服务'}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-slate-500">
                                                    客户: {schedule.appointment?.customer_name || '未知'}
                                                </div>
                                                {schedule.room && (
                                                    <div className="text-xs text-slate-400">
                                                        房间: {schedule.room.name}
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={submitting}>
                        取消
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || !targetNurseId || selectedScheduleIds.length === 0}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        确认交接
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
