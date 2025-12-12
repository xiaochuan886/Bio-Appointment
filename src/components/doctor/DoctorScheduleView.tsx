import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Clock, User, MapPin, Calendar, Phone } from 'lucide-react';
import type { ScheduleWithDetails } from '@/types/types';
import StatusBadge from '@/components/appointment/StatusBadge';

export type ViewMode = 'day' | 'week' | 'month';

interface DoctorScheduleViewProps {
  schedules: ScheduleWithDetails[];
  selectedDate: string;
  viewMode: ViewMode;
  onScheduleClick?: (schedule: ScheduleWithDetails) => void;
}

export default function DoctorScheduleView({ 
  schedules, 
  selectedDate, 
  viewMode,
  onScheduleClick 
}: DoctorScheduleViewProps) {
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleWithDetails | null>(null);

  // 根据视图模式获取日期范围
  const getDateRange = () => {
    const date = parseISO(selectedDate);
    
    switch (viewMode) {
      case 'day':
        return [date];
      case 'week':
        return eachDayOfInterval({
          start: startOfWeek(date, { weekStartsOn: 1 }),
          end: endOfWeek(date, { weekStartsOn: 1 })
        });
      case 'month':
        return eachDayOfInterval({
          start: startOfMonth(date),
          end: endOfMonth(date)
        });
      default:
        return [date];
    }
  };

  // 获取指定日期的排班
  const getSchedulesForDate = (date: Date) => {
    return schedules.filter(schedule => 
      isSameDay(parseISO(schedule.scheduled_date), date)
    ).sort((a, b) => a.scheduled_time_start.localeCompare(b.scheduled_time_start));
  };

  // 生成时间网格（用于日视图）
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 20; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  // 渲染排班卡片
  const renderScheduleCard = (schedule: ScheduleWithDetails, isCompact = false) => {
    const appointment = schedule.appointment;
    if (!appointment) return null;

    const startTime = schedule.scheduled_time_start.substring(0, 5);
    const endTime = schedule.scheduled_time_end.substring(0, 5);
    const duration = appointment.estimated_duration || 60;

    return (
      <TooltipProvider key={schedule.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
                appointment.is_urgent ? 'border-l-red-500 bg-red-50' : 'border-l-blue-500 bg-blue-50'
              } ${isCompact ? 'p-2' : 'p-3'}`}
              onClick={() => {
                setSelectedSchedule(schedule);
                onScheduleClick?.(schedule);
              }}
            >
              <CardContent className={`${isCompact ? 'p-0' : 'p-2'}`}>
                <div className="space-y-2">
                  {/* 时间和状态 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {startTime} - {endTime}
                      </span>
                    </div>
                    <StatusBadge status={schedule.status as any} />
                  </div>

                  {/* 客户信息 */}
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{appointment.customer_name}</span>
                    {appointment.total_people > 1 && (
                      <Badge variant="secondary" className="text-xs">
                        {appointment.total_people}人
                      </Badge>
                    )}
                  </div>

                  {/* 服务信息 */}
                  {appointment.service && (
                    <div className="text-sm text-muted-foreground">
                      {appointment.service.name}
                    </div>
                  )}

                  {/* 房间信息 */}
                  {schedule.room && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{schedule.room.name}</span>
                    </div>
                  )}

                  {/* 紧急标识 */}
                  {appointment.is_urgent && (
                    <Badge variant="destructive" className="text-xs">
                      紧急
                    </Badge>
                  )}

                  {/* 销售信息 */}
                  {appointment.sales_name && (
                    <div className="text-xs text-muted-foreground">
                      销售：{appointment.sales_name}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-sm">
            <div className="space-y-2">
              <div className="font-medium">{appointment.customer_name}</div>
              <div className="text-sm">
                <div>时间：{startTime} - {endTime} ({duration}分钟)</div>
                <div>服务：{appointment.service?.name}</div>
                {schedule.room && <div>房间：{schedule.room.name}</div>}
                {appointment.sales_name && <div>销售：{appointment.sales_name}</div>}
                {appointment.total_people > 1 && <div>人数：{appointment.total_people}人</div>}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // 渲染日视图
  const renderDayView = () => {
    const date = parseISO(selectedDate);
    const daySchedules = getSchedulesForDate(date);
    const timeSlots = generateTimeSlots();

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold">
            {format(date, 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
          </h3>
        </div>
        
        <ScrollArea className="h-[600px]">
          <div className="space-y-2">
            {daySchedules.length === 0 ? (
              <Card className="p-8">
                <div className="text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>今日暂无排班</p>
                </div>
              </Card>
            ) : (
              daySchedules.map(schedule => renderScheduleCard(schedule))
            )}
          </div>
        </ScrollArea>
      </div>
    );
  };

  // 渲染周视图
  const renderWeekView = () => {
    const dates = getDateRange();

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-4">
          {dates.map(date => {
            const daySchedules = getSchedulesForDate(date);
            const isToday = isSameDay(date, new Date());
            
            return (
              <Card key={date.toISOString()} className={`${isToday ? 'ring-2 ring-blue-500' : ''}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-center">
                    {format(date, 'MM/dd', { locale: zhCN })}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {format(date, 'EEEE', { locale: zhCN })}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {daySchedules.length === 0 ? (
                        <div className="text-center text-xs text-muted-foreground py-4">
                          无排班
                        </div>
                      ) : (
                        daySchedules.map(schedule => renderScheduleCard(schedule, true))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  // 渲染月视图
  const renderMonthView = () => {
    const dates = getDateRange();
    const weeks = [];
    
    // 将日期按周分组
    for (let i = 0; i < dates.length; i += 7) {
      weeks.push(dates.slice(i, i + 7));
    }

    return (
      <div className="space-y-2">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-2">
            {week.map(date => {
              const daySchedules = getSchedulesForDate(date);
              const isToday = isSameDay(date, new Date());
              const isCurrentMonth = date.getMonth() === parseISO(selectedDate).getMonth();
              
              return (
                <Card 
                  key={date.toISOString()} 
                  className={`h-24 ${isToday ? 'ring-2 ring-blue-500' : ''} ${
                    !isCurrentMonth ? 'opacity-50' : ''
                  }`}
                >
                  <CardContent className="p-1">
                    <div className="text-xs font-medium mb-1">
                      {format(date, 'd')}
                    </div>
                    <div className="space-y-1">
                      {daySchedules.slice(0, 2).map(schedule => (
                        <div 
                          key={schedule.id}
                          className={`text-xs p-1 rounded cursor-pointer ${
                            schedule.appointment?.is_urgent ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                          }`}
                          onClick={() => {
                            setSelectedSchedule(schedule);
                            onScheduleClick?.(schedule);
                          }}
                        >
                          {schedule.scheduled_time_start.substring(0, 5)} {schedule.appointment?.customer_name}
                        </div>
                      ))}
                      {daySchedules.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{daySchedules.length - 2} 更多
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // 根据视图模式渲染内容
  const renderContent = () => {
    switch (viewMode) {
      case 'day':
        return renderDayView();
      case 'week':
        return renderWeekView();
      case 'month':
        return renderMonthView();
      default:
        return renderDayView();
    }
  };

  return (
    <div className="space-y-4">
      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{schedules.length}</div>
                <div className="text-sm text-muted-foreground">总排班数</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {schedules.filter(s => s.status === 'scheduled').length}
                </div>
                <div className="text-sm text-muted-foreground">已安排</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">
                  {schedules.filter(s => s.appointment?.is_urgent).length}
                </div>
                <div className="text-sm text-muted-foreground">紧急预约</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 排班视图 */}
      {renderContent()}
    </div>
  );
}