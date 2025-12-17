import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, Calendar as CalendarIcon, Filter, MoreHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { LeaveManagementDialog } from '@/components/head-nurse/LeaveManagementDialog';
import { ScheduleTransferDialog } from '@/components/head-nurse/ScheduleTransferDialog';
import clientApi from '@/services/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';

export default function NurseLeaveManagementPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [leaves, setLeaves] = useState<any[]>([]);

    // Dialog controls
    const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
    const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState<any>(null);

    // Transfer context
    const [transferSourceId, setTransferSourceId] = useState('');
    const [transferSourceName, setTransferSourceName] = useState('');
    const [transferDateRange, setTransferDateRange] = useState<{ from: Date, to: Date } | undefined>(undefined);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadLeaves();
    }, [user]);

    const loadLeaves = async () => {
        try {
            setLoading(true);
            const storeId = user?.store_id;
            // API supports filters, here we fetch recent/upcoming ones primarily
            // Or all for simplicity as pagination is inside result if backend supported it, but our backend sends all
            const result: any = await clientApi.getNurseLeaves({
                store_id: storeId,
                // Optional: date_from: format(new Date(), 'yyyy-MM-01') 
            });
            setLeaves(result);
        } catch (error) {
            console.error('Failed to load leaves:', error);
            toast.error('加载休假记录失败');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateLeave = () => {
        setSelectedLeave(null);
        setIsLeaveDialogOpen(true);
    };

    const handleEditLeave = (leave: any) => {
        setSelectedLeave(leave);
        setIsLeaveDialogOpen(true);
    };

    const handleDeleteLeave = async (id: string) => {
        if (!confirm('确定要删除这条休假记录吗？')) return;

        try {
            await clientApi.deleteNurseLeave(id);
            toast.success('休假记录已删除');
            loadLeaves();
        } catch (error: any) {
            console.error('Failed to delete leave:', error);
            toast.error(error.message || '删除失败');
        }
    };

    const handleInitiateTransfer = (leave: any) => {
        setTransferSourceId(leave.nurse_id);
        setTransferSourceName(leave.nurse_name || '护士');
        setTransferDateRange({
            from: new Date(leave.leave_date),
            to: new Date(leave.leave_date)
        });
        setIsTransferDialogOpen(true);
    };

    const getLeavePeriodLabel = (period: string) => {
        switch (period) {
            case 'morning': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">上午</Badge>;
            case 'afternoon': return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">下午</Badge>;
            case 'full_day': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">全天</Badge>;
            default: return period;
        }
    };

    const filteredLeaves = leaves.filter(leave =>
        !searchTerm ||
        leave.nurse_name?.includes(searchTerm) ||
        leave.reason?.includes(searchTerm)
    );

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">护士休假管理</h1>
                    <p className="text-muted-foreground mt-1">
                        管理护士休假申请，处理排班交接
                    </p>
                </div>
                <Button onClick={handleCreateLeave}>
                    <Plus className="mr-2 h-4 w-4" /> 安排休假
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                        <CardTitle>休假记录</CardTitle>
                        <div className="flex items-center gap-2 w-64">
                            <div className="relative w-full">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="搜索护士或原因..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>护士姓名</TableHead>
                                <TableHead>日期</TableHead>
                                <TableHead>时段</TableHead>
                                <TableHead>原因</TableHead>
                                <TableHead>创建人</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        加载中...
                                    </TableCell>
                                </TableRow>
                            ) : filteredLeaves.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        暂无休假记录
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLeaves.map((leave) => (
                                    <TableRow key={leave.id}>
                                        <TableCell className="font-medium">{leave.nurse_name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                                {format(new Date(leave.leave_date), 'yyyy-MM-dd')}
                                            </div>
                                        </TableCell>
                                        <TableCell>{getLeavePeriodLabel(leave.leave_period)}</TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={leave.reason}>
                                            {leave.reason}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {leave.created_by_name || '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">打开菜单</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>操作</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleEditLeave(leave)}>
                                                        编辑记录
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleInitiateTransfer(leave)}>
                                                        交接排班
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-red-600"
                                                        onClick={() => handleDeleteLeave(leave.id)}
                                                    >
                                                        删除记录
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Dialogs */}
            <LeaveManagementDialog
                isOpen={isLeaveDialogOpen}
                onClose={() => setIsLeaveDialogOpen(false)}
                onSuccess={loadLeaves}
                leaveToEdit={selectedLeave}
                storeId={user?.store_id}
            />

            <ScheduleTransferDialog
                isOpen={isTransferDialogOpen}
                onClose={() => setIsTransferDialogOpen(false)}
                onSuccess={() => toast.success('交接完成')}
                sourceNurseId={transferSourceId}
                sourceNurseName={transferSourceName}
                storeId={user?.store_id}
                dateRange={transferDateRange}
            />
        </div>
    );
}
