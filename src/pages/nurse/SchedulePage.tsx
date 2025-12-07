import { useState, useEffect } from 'react';
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Calendar, CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, User, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import clientApi from '@/services/api-client';
import type { Schedule, Appointment } from '@/services/api-client';
import StatusBadge from '@/components/appointment/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { canViewStoreSchedule, getAccessibleStoreIds } from '@/utils/permissions';
import { handleApiError } from '@/utils/validation';

type ViewMode = 'day' | 'week' | 'month';

interface ScheduleDetail {
  schedule: Schedule;
  customerName: string;
  serviceName: string;
  roomName: string;
  storeName?: string;
  timeStart: string;
  timeEnd: string;
  status: string;
}

// 扩展Schedule接口以包含完整的预约信息
interface ScheduleWithAppointment extends Schedule {
  fullAppointment?: Appointment;
}

export default function NurseSchedulePage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleWithAppointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleDetail | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [isDateRangePickerOpen, setIsDateRangePickerOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState<Date | undefined>(undefined);
  const [rangeEnd, setRangeEnd] = useState<Date | undefined>(undefined);

  useEffect(() => {
    loadSchedules();
  }, [selectedDate, viewMode, dateRange]);

  const loadSchedules = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // 使用权限工具函数获取可访问的门店ID
      const storeFilter = getAccessibleStoreIds(user?.profile || null);
      
      let params: any = {
        store_id: storeFilter || undefined
      };

      // 根据视图模式设置日期范围
      if (dateRange) {
        params.start_date = format(dateRange.start, 'yyyy-MM-dd');
        params.end_date = format(dateRange.end, 'yyyy-MM-dd');
      } else {
        switch (viewMode) {
          case 'day':
            params.date = format(selectedDate, 'yyyy-MM-dd');
            break;
          case 'week':
            const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
            params.start_date = format(weekStart, 'yyyy-MM-dd');
            params.end_date = format(weekEnd, 'yyyy-MM-dd');
            break;
          case 'month':
            const monthStart = startOfMonth(selectedDate);
            const monthEnd = endOfMonth(selectedDate);
            params.start_date = format(monthStart, 'yyyy-MM-dd');
            params.end_date = format(monthEnd, 'yyyy-MM-dd');
            break;
        }
      }

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
      
      setSchedules(validSchedules);
    } catch (error) {
      const errorMessage = handleApiError(error, '加载排班');
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsCalendarOpen(false);
      // 清除自定义日期范围
      setDateRange(null);
      setRangeStart(undefined);
      setRangeEnd(undefined);
    }
  };

  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) return;
    
    if (range.from) {
      setRangeStart(range.from);
      setRangeEnd(range.to || undefined);
    }
  };

  const applyDateRange = () => {
    if (rangeStart && rangeEnd) {
      setDateRange({ start: rangeStart, end: rangeEnd });
      setIsDateRangePickerOpen(false);
      // 切换到周视图以更好地显示范围
      setViewMode('week');
      setSelectedDate(rangeStart);
    }
  };

  const clearDateRange = () => {
    setDateRange(null);
    setRangeStart(undefined);
    setRangeEnd(undefined);
    setIsDateRangePickerOpen(false);
  };

  const handlePrevious = () => {
    switch (viewMode) {
      case 'day':
        setSelectedDate(subDays(selectedDate, 1));
        break;
      case 'week':
        setSelectedDate(subDays(selectedDate, 7));
        break;
      case 'month':
        setSelectedDate(subDays(selectedDate, 30));
        break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case 'day':
        setSelectedDate(addDays(selectedDate, 1));
        break;
      case 'week':
        setSelectedDate(addDays(selectedDate, 7));
        break;
      case 'month':
        setSelectedDate(addDays(selectedDate, 30));
        break;
    }
  };

  const handleScheduleClick = (schedule: ScheduleWithAppointment) => {
    const detail: ScheduleDetail = {
      schedule,
      customerName: schedule.appointment?.customer_name || schedule.fullAppointment?.customer_name || '未知客户',
      serviceName: schedule.fullAppointment?.service?.name || '未知服务',
      roomName: schedule.room?.name || '未分配房间',
      storeName: schedule.appointment?.store?.name || schedule.fullAppointment?.store?.name,
      timeStart: schedule.scheduled_time_start,
      timeEnd: schedule.scheduled_time_end,
      status: schedule.status || 'scheduled'
    };
    setSelectedSchedule(detail);
    setIsDetailDialogOpen(true);
  };

  const getViewTitle = () => {
    if (dateRange) {
      return `${format(dateRange.start, 'M月d日', { locale: zhCN })} - ${format(dateRange.end, 'M月d日', { locale: zhCN })}`;
    }
    
    const dateStr = format(selectedDate, 'yyyy年M月d日', { locale: zhCN });
    switch (viewMode) {
      case 'day':
        return dateStr;
      case 'week':
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'M月d日', { locale: zhCN })} - ${format(weekEnd, 'M月d日', { locale: zhCN })}`;
      case 'month':
        return format(selectedDate, 'yyyy年M月', { locale: zhCN });
      default:
        return dateStr;
    }
  };

  const getSchedulesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedules.filter(schedule => {
      const scheduleDate = format(parseISO(schedule.scheduled_date), 'yyyy-MM-dd');
      return scheduleDate === dateStr;
    });
  };

  // 日视图渲染
  const renderDayView = () => {
    const daySchedules = getSchedulesForDate(selectedDate);
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          {format(selectedDate, 'M月d日 EEEE', { locale: zhCN })}的排班
        </h3>
        
        {daySchedules.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">当天暂无排班</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {daySchedules.map(schedule => (
              <Card key={schedule.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleScheduleClick(schedule)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {schedule.appointment?.customer_name || '未知客户'}
                    </CardTitle>
                    <StatusBadge status={schedule.status as any} />
                  </div>
                  <CardDescription>{schedule.fullAppointment?.service?.name || '未知服务'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{schedule.scheduled_time_start.substring(0, 5)} - {schedule.scheduled_time_end.substring(0, 5)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{schedule.room?.name || '未分配房间'}</span>
                    </div>
                    {schedule.appointment?.store && (
                      <div className="flex items-center gap-2 col-span-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{schedule.appointment.store.name}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 周视图渲染
  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">本周排班</h3>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {weekDays.map(day => {
            const daySchedules = getSchedulesForDate(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <Card key={day.toISOString()} className={isToday ? 'border-primary' : ''}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-center">
                    {format(day, 'EEE', { locale: zhCN })}
                  </CardTitle>
                  <CardDescription className="text-center">
                    {format(day, 'M月d日', { locale: zhCN })}
                    {isToday && <Badge className="ml-2" variant="secondary">今天</Badge>}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {daySchedules.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm">无排班</p>
                  ) : (
                    <div className="space-y-2">
                      {daySchedules.slice(0, 3).map(schedule => (
                        <div 
                          key={schedule.id} 
                          className="text-sm p-2 bg-muted rounded cursor-pointer hover:bg-muted/80"
                          onClick={() => handleScheduleClick(schedule)}
                        >
                          <div className="font-medium truncate">{schedule.appointment?.customer_name}</div>
                          <div className="text-muted-foreground text-xs">
                            {schedule.scheduled_time_start.substring(0, 5)} - {schedule.scheduled_time_end.substring(0, 5)}
                          </div>
                        </div>
                      ))}
                      {daySchedules.length > 3 && (
                        <p className="text-center text-muted-foreground text-xs">
                          还有 {daySchedules.length - 3} 个排班
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  // 月视图渲染
  const renderMonthView = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // 按周分组
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    
    monthDays.forEach((day, index) => {
      if (index === 0) {
        // 第一周，填充前面的空白
        const dayOfWeek = day.getDay();
        const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 周一为0
        for (let i = 0; i < offset; i++) {
          currentWeek.push(new Date(0)); // 使用无效日期作为占位符
        }
      }
      
      currentWeek.push(day);
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    // 最后一周，填充后面的空白
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(new Date(0));
      }
      weeks.push(currentWeek);
    }

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          {format(selectedDate, 'yyyy年M月', { locale: zhCN })}排班
        </h3>
        
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              {/* 星期表头 */}
              <div className="grid grid-cols-7 gap-2">
                {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map(day => (
                  <div key={day} className="text-center font-medium py-2 text-sm">
                    {day}
                  </div>
                ))}
              </div>

              {/* 日期网格 */}
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-2">
                  {week.map((day, dayIndex) => {
                    const isValid = day.getTime() > 0;
                    const isToday = isValid && isSameDay(day, new Date());
                    const daySchedules = isValid ? getSchedulesForDate(day) : [];
                    const scheduleCount = daySchedules.length;

                    return (
                      <div
                        key={dayIndex}
                        className={`border rounded-lg p-2 min-h-[80px] ${
                          !isValid
                            ? 'bg-muted/20'
                            : isToday
                            ? 'bg-primary/10 border-primary'
                            : scheduleCount > 0
                            ? 'hover:bg-muted/50 cursor-pointer'
                            : 'hover:bg-muted/30'
                        }`}
                        onClick={() => {
                          if (isValid && scheduleCount > 0) {
                            setSelectedDate(day);
                            setViewMode('day');
                          }
                        }}
                      >
                        {isValid && (
                          <>
                            <div className="text-sm font-medium mb-1">
                              {format(day, 'd')}
                            </div>
                            {scheduleCount > 0 && (
                              <div className="space-y-1">
                                <div className="text-xs bg-primary text-primary-foreground rounded px-1 py-0.5 text-center font-medium">
                                  {scheduleCount} 个排班
                                </div>
                                {daySchedules.slice(0, 2).map((schedule, idx) => (
                                  <div key={idx} className="text-xs truncate">
                                    {schedule.appointment?.customer_name}
                                  </div>
                                ))}
                                {scheduleCount > 2 && (
                                  <div className="text-xs text-muted-foreground">...</div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">我的排班</h1>
        <p className="text-muted-foreground">
          查看和管理您的工作安排
        </p>
      </div>

      {/* 控制栏 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {getViewTitle()}
                </Button>
                
                {isCalendarOpen && (
                  <div className="absolute top-16 left-4 z-50 bg-background border rounded-lg shadow-lg p-2">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateChange}
                      initialFocus
                    />
                  </div>
                )}
              </div>
              
              <Button variant="outline" size="sm" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Popover open={isDateRangePickerOpen} onOpenChange={setIsDateRangePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    {dateRange ? '自定义范围' : '日期范围'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-3 border-b">
                    <h4 className="font-medium">选择日期范围</h4>
                    <p className="text-sm text-muted-foreground">
                      {rangeStart && rangeEnd
                        ? `${format(rangeStart, 'M月d日')} - ${format(rangeEnd, 'M月d日')}`
                        : rangeStart
                        ? `从 ${format(rangeStart, 'M月d日')}`
                        : '选择开始日期'
                      }
                    </p>
                  </div>
                  <CalendarComponent
                    mode="range"
                    selected={rangeStart && rangeEnd ? { from: rangeStart, to: rangeEnd } : rangeStart ? { from: rangeStart } : undefined}
                    onSelect={handleDateRangeSelect}
                    initialFocus
                  />
                  <div className="flex gap-2 p-3 border-t">
                    <Button size="sm" onClick={applyDateRange} disabled={!rangeStart || !rangeEnd}>
                      应用
                    </Button>
                    <Button size="sm" variant="outline" onClick={clearDateRange}>
                      清除
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">日视图</SelectItem>
                  <SelectItem value="week">周视图</SelectItem>
                  <SelectItem value="month">月视图</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                今天
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 统计信息 */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总排班</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schedules.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {dateRange ? '选定时间段内' : viewMode === 'day' ? '当天' : viewMode === 'week' ? '本周' : '本月'}
            </p>
            {dateRange && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearDateRange}
                className="h-6 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                清除范围
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已完成</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {schedules.filter(s => s.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">已完成的服务</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待执行</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {schedules.filter(s => ['scheduled', 'confirmed'].includes(s.status || '')).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">待执行的服务</p>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区域 */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">加载中...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'day' && renderDayView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'month' && renderMonthView()}
        </>
      )}

      {/* 排班详情对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>排班详情</DialogTitle>
            <DialogDescription>
              {selectedSchedule && format(parseISO(selectedSchedule.schedule.scheduled_date), 'yyyy年M月d日', { locale: zhCN })}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSchedule && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">客户姓名</span>
                  <p className="font-medium">{selectedSchedule.customerName}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">服务项目</span>
                  <p className="font-medium">{selectedSchedule.serviceName}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">服务时间</span>
                  <p className="font-medium">
                    {selectedSchedule.timeStart.substring(0, 5)} - {selectedSchedule.timeEnd.substring(0, 5)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">服务房间</span>
                  <p className="font-medium">{selectedSchedule.roomName}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">状态</span>
                  <div className="mt-1">
                    <StatusBadge status={selectedSchedule.status as any} />
                  </div>
                </div>
                {selectedSchedule.storeName && (
                  <div>
                    <span className="text-sm text-muted-foreground">门店</span>
                    <p className="font-medium">{selectedSchedule.storeName}</p>
                  </div>
                )}
              </div>
              
              {selectedSchedule.schedule.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">备注</span>
                  <p className="font-medium mt-1">{selectedSchedule.schedule.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}