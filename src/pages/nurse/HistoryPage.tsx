import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, subDays, subMonths, startOfDay, endOfDay, isWithinInterval, parseISO, differenceInMinutes, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  PlayCircle, 
  AlertCircle, 
  Search, 
  Filter, 
  User, 
  MapPin, 
  Timer,
  Download,
  BarChart3,
  TrendingUp,
  FileText,
  RefreshCw,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import clientApi from '@/services/api-client';
import type { Schedule, Appointment } from '@/services/api-client';
import StatusBadge from '@/components/appointment/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { canViewStoreSchedule, getAccessibleStoreIds } from '@/utils/permissions';
import { handleApiError } from '@/utils/validation';

// 扩展Schedule接口以包含完整的预约信息
interface ScheduleWithAppointment extends Schedule {
  fullAppointment?: Appointment;
}

interface TaskDetail {
  schedule: ScheduleWithAppointment;
  customerName: string;
  serviceName: string;
  roomName: string;
  storeName?: string;
  timeStart: string;
  timeEnd: string;
  status: string;
  actualDuration?: number;
  overtimeMinutes?: number;
}

interface StatisticsData {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  averageDuration: number;
  totalOvertime: number;
  tasksByStatus: Array<{ name: string; value: number; color: string }>;
  tasksByService: Array<{ name: string; value: number }>;
  dailyCompletion: Array<{ date: string; completed: number; total: number }>;
  monthlyTrend: Array<{ month: string; tasks: number; completionRate: number }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function NurseHistoryPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ScheduleWithAppointment[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<ScheduleWithAppointment[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [activeTab, setActiveTab] = useState('list');

  // 默认显示最近30天的数据
  useEffect(() => {
    const end = new Date();
    const start = subDays(end, 30);
    setDateRange({ start, end });
  }, []);

  useEffect(() => {
    if (dateRange) {
      loadTasks();
    }
  }, [dateRange, user]);

  // 过滤和排序任务
  useEffect(() => {
    let filtered = [...tasks];
    
    // 搜索过滤
    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.appointment_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.room?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.appointment?.store?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.fullAppointment?.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // 状态过滤
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }
    
    // 服务类型过滤
    if (serviceFilter !== 'all') {
      filtered = filtered.filter(task => 
        task.fullAppointment?.service?.name === serviceFilter
      );
    }
    
    // 门店过滤
    if (storeFilter !== 'all') {
      filtered = filtered.filter(task => 
        task.appointment?.store?.name === storeFilter || task.store_id === storeFilter
      );
    }
    
    // 排序
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime();
      } else if (sortBy === 'status') {
        const statusOrder = { 'completed': 0, 'in_progress': 1, 'confirmed': 2, 'scheduled': 3 };
        const aStatus = statusOrder[a.status as keyof typeof statusOrder] || 999;
        const bStatus = statusOrder[b.status as keyof typeof statusOrder] || 999;
        return aStatus - bStatus;
      } else if (sortBy === 'duration') {
        const aDuration = calculateTaskDuration(a);
        const bDuration = calculateTaskDuration(b);
        return bDuration - aDuration;
      }
      return 0;
    });
    
    setFilteredTasks(filtered);
  }, [tasks, searchQuery, statusFilter, serviceFilter, storeFilter, sortBy]);

  // 计算统计数据
  useEffect(() => {
    if (filteredTasks.length > 0) {
      calculateStatistics();
    }
  }, [filteredTasks]);

  const loadTasks = async () => {
    if (!dateRange || !user) return;

    setIsLoading(true);
    try {
      // 使用权限工具函数获取可访问的门店ID
      const storeFilter = getAccessibleStoreIds(user?.profile || null);
      
      const params: any = {
        start_date: format(dateRange.start, 'yyyy-MM-dd'),
        end_date: format(dateRange.end, 'yyyy-MM-dd'),
        store_id: storeFilter || undefined
      };

      // 获取当前护士的排班
      if (user.profile?.id) {
        params.nurse_id = user.profile.id;
      }

      const schedulesData = await clientApi.getSchedules(params);
      
      // 获取每个排班的完整预约信息
      const schedulesWithAppointment: ScheduleWithAppointment[] = await Promise.all(
        schedulesData.map(async (schedule) => {
          let fullAppointment: Appointment | undefined;
          
          if (schedule.appointment_id) {
            try {
              const appointments = await clientApi.getAppointments({ id: schedule.appointment_id });
              fullAppointment = appointments.find(app => app.id === schedule.appointment_id);
            } catch (error) {
              console.warn('获取预约详情失败:', error);
            }
          }
          
          return {
            ...schedule,
            fullAppointment
          };
        })
      );
      
      // 过滤并验证排班数据
      const validSchedules = schedulesWithAppointment.filter(schedule => {
        // 使用权限工具函数验证是否可以查看该排班
        const taskStoreId = schedule.store_id || schedule.appointment?.store_id;
        if (!canViewStoreSchedule(user?.profile || null, taskStoreId)) {
          return false;
        }
        
        // 确保排班有关联的预约
        if (!schedule.appointment_id) {
          console.warn('排班缺少关联预约:', schedule.id);
          return false;
        }
        
        return true;
      });
      
      setTasks(validSchedules);
    } catch (error) {
      const errorMessage = handleApiError(error, '加载历史任务');
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTaskDuration = (task: ScheduleWithAppointment): number => {
    if (!task.scheduled_time_start || !task.scheduled_time_end) return 0;
    const start = new Date(`2000-01-01T${task.scheduled_time_start}`);
    const end = new Date(`2000-01-01T${task.scheduled_time_end}`);
    return differenceInMinutes(end, start);
  };

  const calculateStatistics = () => {
    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(t => t.status === 'completed').length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    // 计算平均执行时间
    const completedTasksWithDuration = filteredTasks.filter(t => 
      t.status === 'completed' && t.scheduled_time_start && t.scheduled_time_end
    );
    const totalDuration = completedTasksWithDuration.reduce((sum, task) => 
      sum + calculateTaskDuration(task), 0
    );
    const averageDuration = completedTasksWithDuration.length > 0 
      ? totalDuration / completedTasksWithDuration.length 
      : 0;

    // 计算总超时时间
    const totalOvertime = completedTasksWithDuration.reduce((sum, task) => {
      const duration = calculateTaskDuration(task);
      const expectedDuration = task.fullAppointment?.estimated_duration || 60;
      return sum + Math.max(0, duration - expectedDuration);
    }, 0);

    // 按状态分组
    const statusCounts = filteredTasks.reduce((acc, task) => {
      const status = task.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tasksByStatus = Object.entries(statusCounts).map(([name, value]) => ({
      name: getStatusDisplayName(name),
      value,
      color: getStatusColor(name)
    }));

    // 按服务类型分组
    const serviceCounts = filteredTasks.reduce((acc, task) => {
      const serviceName = task.fullAppointment?.service?.name || '未知服务';
      acc[serviceName] = (acc[serviceName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tasksByService = Object.entries(serviceCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    // 按日期分组（最近7天）
    const dailyCompletion = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dateStr = format(date, 'MM/dd');
      const dayTasks = filteredTasks.filter(task => {
        const taskDate = parseISO(task.scheduled_date);
        return format(taskDate, 'MM/dd') === dateStr;
      });
      const dayCompleted = dayTasks.filter(t => t.status === 'completed').length;
      
      return {
        date: dateStr,
        completed: dayCompleted,
        total: dayTasks.length
      };
    });

    // 按月分组（最近6个月）
    const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      const monthStr = format(date, 'yyyy/MM');
      const monthTasks = filteredTasks.filter(task => {
        const taskDate = parseISO(task.scheduled_date);
        return format(taskDate, 'yyyy/MM') === monthStr;
      });
      const monthCompleted = monthTasks.filter(t => t.status === 'completed').length;
      const monthCompletionRate = monthTasks.length > 0 ? (monthCompleted / monthTasks.length) * 100 : 0;
      
      return {
        month: monthStr,
        tasks: monthTasks.length,
        completionRate: Math.round(monthCompletionRate)
      };
    });

    setStatistics({
      totalTasks,
      completedTasks,
      completionRate: Math.round(completionRate),
      averageDuration: Math.round(averageDuration),
      totalOvertime: Math.round(totalOvertime),
      tasksByStatus,
      tasksByService,
      dailyCompletion,
      monthlyTrend
    });
  };

  const getStatusDisplayName = (status: string): string => {
    const statusNames: Record<string, string> = {
      'completed': '已完成',
      'in_progress': '进行中',
      'confirmed': '已确认',
      'scheduled': '已排班',
      'cancelled': '已取消',
      'unknown': '未知'
    };
    return statusNames[status] || status;
  };

  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      'completed': '#10b981',
      'in_progress': '#3b82f6',
      'confirmed': '#f59e0b',
      'scheduled': '#6b7280',
      'cancelled': '#ef4444',
      'unknown': '#9ca3af'
    };
    return statusColors[status] || '#9ca3af';
  };

  const handleTaskClick = (task: ScheduleWithAppointment) => {
    const detail: TaskDetail = {
      schedule: task,
      customerName: task.appointment?.customer_name || task.fullAppointment?.customer_name || '未知客户',
      serviceName: task.fullAppointment?.service?.name || '未知服务',
      roomName: task.room?.name || '未分配房间',
      storeName: task.appointment?.store?.name || task.fullAppointment?.store?.name,
      timeStart: task.scheduled_time_start,
      timeEnd: task.scheduled_time_end,
      status: task.status || 'scheduled',
      actualDuration: calculateTaskDuration(task),
      overtimeMinutes: Math.max(0, calculateTaskDuration(task) - (task.fullAppointment?.estimated_duration || 60))
    };
    setSelectedTask(detail);
    setIsDetailDialogOpen(true);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadTasks();
      toast.success('数据已刷新');
    } catch (error) {
      toast.error('刷新失败');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = () => {
    if (filteredTasks.length === 0) {
      toast.error('没有可导出的数据');
      return;
    }

    // 准备CSV数据
    const headers = [
      '日期', '客户姓名', '服务项目', '房间', '门店', 
      '开始时间', '结束时间', '状态', '实际时长(分钟)', '超时(分钟)'
    ];
    
    const csvData = filteredTasks.map(task => [
      task.scheduled_date,
      task.appointment?.customer_name || task.fullAppointment?.customer_name || '未知客户',
      task.fullAppointment?.service?.name || '未知服务',
      task.room?.name || '未分配房间',
      task.appointment?.store?.name || task.fullAppointment?.store?.name || '',
      task.scheduled_time_start,
      task.scheduled_time_end,
      getStatusDisplayName(task.status || ''),
      calculateTaskDuration(task).toString(),
      Math.max(0, calculateTaskDuration(task) - (task.fullAppointment?.estimated_duration || 60)).toString()
    ]);

    // 创建CSV内容
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // 下载文件
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `任务历史_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('导出成功');
  };

  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      setDateRange({ start: range.from, end: range.to });
      setIsCalendarOpen(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setServiceFilter('all');
    setStoreFilter('all');
    setSortBy('date');
  };

  // 获取筛选选项
  const serviceOptions = useMemo(() => {
    const services = new Set<string>();
    tasks.forEach(task => {
      if (task.fullAppointment?.service?.name) {
        services.add(task.fullAppointment.service.name);
      }
    });
    return Array.from(services);
  }, [tasks]);

  const storeOptions = useMemo(() => {
    const stores = new Set<string>();
    tasks.forEach(task => {
      if (task.appointment?.store?.name) {
        stores.add(task.appointment.store.name);
      }
    });
    return Array.from(stores);
  }, [tasks]);

  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">任务历史</h1>
            <p className="text-muted-foreground">
              查看和分析您的历史任务记录
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
          </div>
        </div>

        {/* 筛选栏 */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* 日期范围选择 */}
              <div className="flex items-center gap-2">
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      {dateRange 
                        ? `${format(dateRange.start, 'MM/dd')} - ${format(dateRange.end, 'MM/dd')}`
                        : '选择日期范围'
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="range"
                      selected={dateRange ? { from: dateRange.start, to: dateRange.end } : undefined}
                      onSelect={handleDateRangeSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {dateRange && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const end = new Date();
                      const start = subDays(end, 30);
                      setDateRange({ start, end });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* 搜索框 */}
              <div className="relative flex-1 lg:max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索客户、房间或门店..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* 筛选选项 */}
              <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="in_progress">进行中</SelectItem>
                    <SelectItem value="confirmed">已确认</SelectItem>
                    <SelectItem value="scheduled">已排班</SelectItem>
                    <SelectItem value="cancelled">已取消</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="服务类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部服务</SelectItem>
                    {serviceOptions.map(service => (
                      <SelectItem key={service} value={service}>{service}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={storeFilter} onValueChange={setStoreFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="门店" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部门店</SelectItem>
                    {storeOptions.map(store => (
                      <SelectItem key={store} value={store}>{store}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="排序" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">按日期</SelectItem>
                    <SelectItem value="status">按状态</SelectItem>
                    <SelectItem value="duration">按时长</SelectItem>
                  </SelectContent>
                </Select>

                {(searchQuery || statusFilter !== 'all' || serviceFilter !== 'all' || storeFilter !== 'all') && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    清除筛选
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 统计卡片 */}
        {statistics && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总任务数</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.totalTasks}</div>
                <p className="text-xs text-muted-foreground mt-1">选定时间段内</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">已完成</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{statistics.completedTasks}</div>
                <p className="text-xs text-muted-foreground mt-1">完成率 {statistics.completionRate}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均时长</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.averageDuration}</div>
                <p className="text-xs text-muted-foreground mt-1">分钟</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总超时</CardTitle>
                <Timer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{statistics.totalOvertime}</div>
                <p className="text-xs text-muted-foreground mt-1">分钟</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">完成率</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.completionRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">任务完成率</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 主要内容区域 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              任务列表
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              数据分析
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {isLoading ? (
              <Card>
                <CardContent className="py-12">
                  <p className="text-center text-muted-foreground">加载中...</p>
                </CardContent>
              </Card>
            ) : filteredTasks.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">
                      {searchQuery || statusFilter !== 'all' || serviceFilter !== 'all' || storeFilter !== 'all' 
                        ? '没有找到匹配的任务记录' 
                        : '暂无任务记录'
                      }
                    </p>
                    {(searchQuery || statusFilter !== 'all' || serviceFilter !== 'all' || storeFilter !== 'all') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                      >
                        清除筛选条件
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>任务记录 ({filteredTasks.length})</CardTitle>
                  <CardDescription>
                    {dateRange && `${format(dateRange.start, 'yyyy年MM月dd日')} - ${format(dateRange.end, 'yyyy年MM月dd日')}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>日期</TableHead>
                          <TableHead>客户</TableHead>
                          <TableHead>服务项目</TableHead>
                          <TableHead>房间</TableHead>
                          <TableHead>门店</TableHead>
                          <TableHead>时间</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTasks.map((task) => (
                          <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell>{task.scheduled_date}</TableCell>
                            <TableCell className="font-medium">
                              {task.appointment?.customer_name || task.fullAppointment?.customer_name || '未知客户'}
                            </TableCell>
                            <TableCell>{task.fullAppointment?.service?.name || '未知服务'}</TableCell>
                            <TableCell>{task.room?.name || '未分配'}</TableCell>
                            <TableCell>{task.appointment?.store?.name || task.fullAppointment?.store?.name || '-'}</TableCell>
                            <TableCell>
                              {task.scheduled_time_start?.substring(0, 5)} - {task.scheduled_time_end?.substring(0, 5)}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={task.status as any} />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTaskClick(task)}
                              >
                                查看详情
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="charts" className="space-y-4">
            {statistics ? (
              <div className="grid gap-6 md:grid-cols-2">
                {/* 任务状态分布 */}
                <Card>
                  <CardHeader>
                    <CardTitle>任务状态分布</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        completed: { label: '已完成', color: '#10b981' },
                        in_progress: { label: '进行中', color: '#3b82f6' },
                        confirmed: { label: '已确认', color: '#f59e0b' },
                        scheduled: { label: '已排班', color: '#6b7280' },
                        cancelled: { label: '已取消', color: '#ef4444' },
                      }}
                      className="h-[300px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statistics.tasksByStatus}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {statistics.tasksByStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* 服务类型分布 */}
                <Card>
                  <CardHeader>
                    <CardTitle>服务类型分布 (TOP 5)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        value: { label: '任务数量', color: '#8884d8' },
                      }}
                      className="h-[300px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statistics.tasksByService}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="value" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* 每日完成情况 */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>最近7天任务完成情况</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        completed: { label: '已完成', color: '#10b981' },
                        total: { label: '总任务', color: '#3b82f6' },
                      }}
                      className="h-[300px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={statistics.dailyCompletion}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} />
                          <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* 月度趋势 */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>最近6个月任务趋势</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        tasks: { label: '任务数量', color: '#8884d8' },
                        completionRate: { label: '完成率(%)', color: '#10b981' },
                      }}
                      className="h-[300px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statistics.monthlyTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar yAxisId="left" dataKey="tasks" fill="#8884d8" />
                          <Line yAxisId="right" type="monotone" dataKey="completionRate" stroke="#10b981" strokeWidth={2} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <p className="text-center text-muted-foreground">暂无统计数据</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 任务详情对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>任务详情</DialogTitle>
            <DialogDescription>
              {selectedTask && format(parseISO(selectedTask.schedule.scheduled_date), 'yyyy年MM月dd日', { locale: zhCN })}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">客户姓名</span>
                  <p className="font-medium">{selectedTask.customerName}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">服务项目</span>
                  <p className="font-medium">{selectedTask.serviceName}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">服务时间</span>
                  <p className="font-medium">
                    {selectedTask.timeStart.substring(0, 5)} - {selectedTask.timeEnd.substring(0, 5)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">服务房间</span>
                  <p className="font-medium">{selectedTask.roomName}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">状态</span>
                  <div className="mt-1">
                    <StatusBadge status={selectedTask.status as any} />
                  </div>
                </div>
                {selectedTask.storeName && (
                  <div>
                    <span className="text-sm text-muted-foreground">门店</span>
                    <p className="font-medium">{selectedTask.storeName}</p>
                  </div>
                )}
                {selectedTask.actualDuration && (
                  <div>
                    <span className="text-sm text-muted-foreground">实际时长</span>
                    <p className="font-medium">{selectedTask.actualDuration} 分钟</p>
                  </div>
                )}
                {selectedTask.overtimeMinutes && selectedTask.overtimeMinutes > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">超时时间</span>
                    <p className="font-medium text-orange-600">{selectedTask.overtimeMinutes} 分钟</p>
                  </div>
                )}
              </div>
              
              {selectedTask.schedule.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">备注</span>
                  <p className="font-medium mt-1">{selectedTask.schedule.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}