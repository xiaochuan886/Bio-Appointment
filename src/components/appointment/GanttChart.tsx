import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { ScheduleWithDetails, Nurse, Room } from '@/types/types';
import ScheduleDetailDialog from './ScheduleDetailDialog';

export type ViewMode = 'day' | 'week' | 'month';

interface GanttChartProps {
  schedules: ScheduleWithDetails[];
  nurses: Nurse[];
  rooms: Room[];
  selectedDate: string;
  viewMode: ViewMode;
  onScheduleClick?: (schedule: ScheduleWithDetails) => void;
}

export default function GanttChart({ 
  schedules, 
  nurses, 
  rooms, 
  selectedDate, 
  viewMode,
  onScheduleClick 
}: GanttChartProps) {
  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSchedules, setSelectedSchedules] = useState<ScheduleWithDetails[]>([]);
  const [dialogDate, setDialogDate] = useState('');
  const [selectedResourceName, setSelectedResourceName] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState<'room' | 'nurse'>('room');

  const hours = Array.from({ length: 11 }, (_, i) => i + 8);
  const timeSlots = hours.flatMap(h => [`${h}:00`, `${h}:30`]);

  // 打开详情对话框
  const handleCellClick = (
    date: string,
    resourceId: string,
    resourceName: string,
    resourceType: 'room' | 'nurse'
  ) => {
    const filteredSchedules = schedules.filter(
      s => s.scheduled_date === date && 
      (resourceType === 'room' ? s.room_id === resourceId : s.nurse_id === resourceId)
    );
    
    if (filteredSchedules.length > 0) {
      setSelectedSchedules(filteredSchedules);
      setDialogDate(date);
      setSelectedResourceName(resourceName);
      setSelectedResourceType(resourceType);
      setDialogOpen(true);
    }
  };

  // 月视图点击处理（不区分资源）
  const handleMonthCellClick = (date: string) => {
    const filteredSchedules = schedules.filter(s => s.scheduled_date === date);
    
    if (filteredSchedules.length > 0) {
      setSelectedSchedules(filteredSchedules);
      setDialogDate(date);
      setSelectedResourceName('');
      setSelectedResourceType('room');
      setDialogOpen(true);
    }
  };

  const getRoomTypeLabel = (roomType: string) => {
    const labels: Record<string, string> = {
      vip: 'VIP室',
      treatment: '治疗区',
      consultation: '咨询室',
    };
    return labels[roomType] || roomType;
  };

  const getSchedulePosition = (timeStart: string, timeEnd: string) => {
    const [startHour, startMinute] = timeStart.split(':').map(Number);
    const [endHour, endMinute] = timeEnd.split(':').map(Number);
    
    const startMinutes = (startHour - 8) * 60 + startMinute;
    const endMinutes = (endHour - 8) * 60 + endMinute;
    const duration = endMinutes - startMinutes;
    
    const left = (startMinutes / (11 * 60)) * 100;
    const width = (duration / (11 * 60)) * 100;
    
    return { left: `${left}%`, width: `${width}%` };
  };

  const getSchedulesForResource = (resourceId: string, resourceType: 'room' | 'nurse') => {
    return schedules.filter(schedule => {
      if (resourceType === 'room') {
        return schedule.room_id === resourceId;
      }
      return schedule.nurse_id === resourceId;
    });
  };

  // 检测时间段是否重叠
  const isTimeOverlap = (start1: string, end1: string, start2: string, end2: string) => {
    const [h1, m1] = start1.split(':').map(Number);
    const [h2, m2] = end1.split(':').map(Number);
    const [h3, m3] = start2.split(':').map(Number);
    const [h4, m4] = end2.split(':').map(Number);

    const start1Minutes = h1 * 60 + m1;
    const end1Minutes = h2 * 60 + m2;
    const start2Minutes = h3 * 60 + m3;
    const end2Minutes = h4 * 60 + m4;

    return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
  };

  // 将重叠的排班分配到不同的行
  const arrangeSchedulesInRows = (resourceSchedules: ScheduleWithDetails[]) => {
    const rows: ScheduleWithDetails[][] = [];

    resourceSchedules.forEach(schedule => {
      let placed = false;

      // 尝试将排班放入现有行
      for (const row of rows) {
        const hasOverlap = row.some(existingSchedule =>
          isTimeOverlap(
            schedule.scheduled_time_start,
            schedule.scheduled_time_end,
            existingSchedule.scheduled_time_start,
            existingSchedule.scheduled_time_end
          )
        );

        if (!hasOverlap) {
          row.push(schedule);
          placed = true;
          break;
        }
      }

      // 如果无法放入现有行，创建新行
      if (!placed) {
        rows.push([schedule]);
      }
    });

    return rows;
  };

  // 获取指定日期的排班数量
  const getScheduleCountForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedules.filter(s => s.scheduled_date === dateStr).length;
  };

  // 周视图渲染
  if (viewMode === 'week') {
    const currentDate = parseISO(selectedDate);
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // 周一开始
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">周视图 - 房间排班</h3>
          <Card className="p-4">
            <div className="grid grid-cols-8 gap-2">
              {/* 表头 */}
              <div className="font-medium text-center py-2">房间</div>
              {weekDays.map(day => (
                <div key={day.toISOString()} className="font-medium text-center py-2">
                  <div className="text-sm">{format(day, 'EEE', { locale: zhCN })}</div>
                  <div className="text-xs text-muted-foreground">{format(day, 'M/d')}</div>
                </div>
              ))}

              {/* 房间行 */}
              {rooms.map(room => (
                <div key={room.id} className="contents">
                  <div className="border-t py-3 px-2 font-medium">
                    {room.name}
                    <div className="text-xs text-muted-foreground">{getRoomTypeLabel(room.room_type)}</div>
                  </div>
                  {weekDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const daySchedules = schedules.filter(
                      s => s.scheduled_date === dateStr && s.room_id === room.id
                    );
                    const isToday = isSameDay(day, currentDate);

                    // 获取客户姓名列表
                    const customerNames = daySchedules
                      .map(s => s.appointment?.customer_name)
                      .filter(Boolean)
                      .slice(0, 2); // 最多显示2个

                    return (
                      <TooltipProvider key={day.toISOString()}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              onClick={() => daySchedules.length > 0 && handleCellClick(dateStr, room.id, room.name, 'room')}
                              className={`border-t py-2 px-2 text-center transition-all cursor-pointer ${
                                isToday ? 'bg-primary/10' : ''
                              } ${
                                daySchedules.length > 0 
                                  ? 'hover:bg-primary/20 hover:scale-105 active:scale-95' 
                                  : ''
                              }`}
                            >
                              {daySchedules.length > 0 ? (
                                <div className="space-y-1">
                                  <div className="text-lg font-semibold text-primary">
                                    {daySchedules.length}
                                  </div>
                                  <div className="text-xs text-muted-foreground">个排班</div>
                                  {customerNames.length > 0 && (
                                    <div className="text-xs font-medium text-foreground mt-1 space-y-0.5">
                                      {customerNames.map((name, idx) => (
                                        <div key={idx} className="truncate">{name}</div>
                                      ))}
                                      {daySchedules.length > 2 && (
                                        <div className="text-muted-foreground">...</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-muted-foreground">-</div>
                              )}
                            </div>
                          </TooltipTrigger>
                          {daySchedules.length > 0 && (
                            <TooltipContent>
                              <div className="space-y-1">
                                <div className="font-semibold">点击查看详情</div>
                                {daySchedules.slice(0, 3).map((schedule, idx) => (
                                  <div key={idx} className="text-xs">
                                    {schedule.appointment?.customer_name} - {schedule.scheduled_time_start?.slice(0, 5)}
                                  </div>
                                ))}
                                {daySchedules.length > 3 && (
                                  <div className="text-xs text-muted-foreground">
                                    还有 {daySchedules.length - 3} 个排班
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">周视图 - 护士排班</h3>
          <Card className="p-4">
            <div className="grid grid-cols-8 gap-2">
              {/* 表头 */}
              <div className="font-medium text-center py-2">护士</div>
              {weekDays.map(day => (
                <div key={day.toISOString()} className="font-medium text-center py-2">
                  <div className="text-sm">{format(day, 'EEE', { locale: zhCN })}</div>
                  <div className="text-xs text-muted-foreground">{format(day, 'M/d')}</div>
                </div>
              ))}

              {/* 护士行 */}
              {nurses.map(nurse => (
                <div key={nurse.id} className="contents">
                  <div className="border-t py-3 px-2 font-medium">{nurse.name}</div>
                  {weekDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const daySchedules = schedules.filter(
                      s => s.scheduled_date === dateStr && s.nurse_id === nurse.id
                    );
                    const isToday = isSameDay(day, currentDate);

                    // 获取客户姓名列表
                    const customerNames = daySchedules
                      .map(s => s.appointment?.customer_name)
                      .filter(Boolean)
                      .slice(0, 2); // 最多显示2个

                    return (
                      <TooltipProvider key={day.toISOString()}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              onClick={() => daySchedules.length > 0 && handleCellClick(dateStr, nurse.id, nurse.name, 'nurse')}
                              className={`border-t py-2 px-2 text-center transition-all cursor-pointer ${
                                isToday ? 'bg-primary/10' : ''
                              } ${
                                daySchedules.length > 0 
                                  ? 'hover:bg-primary/20 hover:scale-105 active:scale-95' 
                                  : ''
                              }`}
                            >
                              {daySchedules.length > 0 ? (
                                <div className="space-y-1">
                                  <div className="text-lg font-semibold text-primary">
                                    {daySchedules.length}
                                  </div>
                                  <div className="text-xs text-muted-foreground">个排班</div>
                                  {customerNames.length > 0 && (
                                    <div className="text-xs font-medium text-foreground mt-1 space-y-0.5">
                                      {customerNames.map((name, idx) => (
                                        <div key={idx} className="truncate">{name}</div>
                                      ))}
                                      {daySchedules.length > 2 && (
                                        <div className="text-muted-foreground">...</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-muted-foreground">-</div>
                              )}
                            </div>
                          </TooltipTrigger>
                          {daySchedules.length > 0 && (
                            <TooltipContent>
                              <div className="space-y-1">
                                <div className="font-semibold">点击查看详情</div>
                                {daySchedules.slice(0, 3).map((schedule, idx) => (
                                  <div key={idx} className="text-xs">
                                    {schedule.appointment?.customer_name} - {schedule.scheduled_time_start?.slice(0, 5)}
                                  </div>
                                ))}
                                {daySchedules.length > 3 && (
                                  <div className="text-xs text-muted-foreground">
                                    还有 {daySchedules.length - 3} 个排班
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 详情对话框 */}
        <ScheduleDetailDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          schedules={selectedSchedules}
          date={dialogDate}
          resourceName={selectedResourceName}
          resourceType={selectedResourceType}
        />
      </div>
    );
  }

  // 月视图渲染
  if (viewMode === 'month') {
    const currentDate = parseISO(selectedDate);
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
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
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">
            月视图 - {format(currentDate, 'yyyy年M月', { locale: zhCN })}
          </h3>
          <Card className="p-4">
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
                    const isToday = isValid && isSameDay(day, currentDate);
                    const dateStr = isValid ? format(day, 'yyyy-MM-dd') : '';
                    const daySchedules = isValid ? schedules.filter(s => s.scheduled_date === dateStr) : [];
                    const scheduleCount = daySchedules.length;

                    // 获取客户姓名列表
                    const customerNames = daySchedules
                      .map(s => s.appointment?.customer_name)
                      .filter(Boolean)
                      .slice(0, 2); // 最多显示2个

                    return (
                      <TooltipProvider key={dayIndex}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              onClick={() => scheduleCount > 0 && handleMonthCellClick(dateStr)}
                              className={`border rounded-lg p-3 min-h-[100px] transition-all ${
                                !isValid
                                  ? 'bg-muted/20'
                                  : isToday
                                  ? 'bg-primary/10 border-primary'
                                  : scheduleCount > 0
                                  ? 'hover:bg-muted/50 cursor-pointer hover:scale-105 active:scale-95'
                                  : 'hover:bg-muted/30'
                              }`}
                            >
                              {isValid && (
                                <>
                                  <div className="text-sm font-medium mb-2">
                                    {format(day, 'd')}
                                  </div>
                                  {scheduleCount > 0 && (
                                    <div className="space-y-1">
                                      <div className="text-xs bg-primary text-primary-foreground rounded px-2 py-1 text-center font-medium">
                                        {scheduleCount} 个排班
                                      </div>
                                      {customerNames.length > 0 && (
                                        <div className="text-xs font-medium text-foreground mt-2 space-y-0.5">
                                          {customerNames.map((name, idx) => (
                                            <div key={idx} className="truncate">{name}</div>
                                          ))}
                                          {scheduleCount > 2 && (
                                            <div className="text-muted-foreground">...</div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </TooltipTrigger>
                          {scheduleCount > 0 && (
                            <TooltipContent>
                              <div className="space-y-1">
                                <div className="font-semibold">点击查看详情</div>
                                {daySchedules.slice(0, 3).map((schedule, idx) => (
                                  <div key={idx} className="text-xs">
                                    {schedule.appointment?.customer_name} - {schedule.scheduled_time_start?.slice(0, 5)}
                                  </div>
                                ))}
                                {scheduleCount > 3 && (
                                  <div className="text-xs text-muted-foreground">
                                    还有 {scheduleCount - 3} 个排班
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 详情对话框 */}
        <ScheduleDetailDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          schedules={selectedSchedules}
          date={dialogDate}
        />
      </div>
    );
  }

  // 日视图渲染（原有逻辑）
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">房间排班</h3>
        <Card className="p-4">
          <ScrollArea className="w-full">
            <div className="min-w-[1200px]">
              <div className="flex border-b pb-2 mb-4">
                <div className="w-32 flex-shrink-0 font-medium">房间</div>
                <div className="flex-1 flex">
                  {hours.map(hour => (
                    <div key={hour} className="flex-1 text-center text-sm text-muted-foreground border-l">
                      {hour}:00
                    </div>
                  ))}
                </div>
              </div>

              {rooms.map(room => {
                const roomSchedules = getSchedulesForResource(room.id, 'room');
                const scheduleRows = arrangeSchedulesInRows(roomSchedules);
                const rowHeight = 48; // 每行高度
                const totalHeight = Math.max(scheduleRows.length * rowHeight, rowHeight);

                return (
                  <div key={room.id} className="flex border-b py-4 relative">
                    <div className="w-32 flex-shrink-0 font-medium">
                      {room.name}
                      <div className="text-xs text-muted-foreground">{getRoomTypeLabel(room.room_type)}</div>
                      {scheduleRows.length > 1 && (
                        <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          ⚠️ {scheduleRows.length}个重叠排班
                        </div>
                      )}
                    </div>
                    <div className="flex-1 relative" style={{ height: `${totalHeight}px` }}>
                      <div className="absolute inset-0 flex">
                        {timeSlots.map((slot, idx) => (
                          <div
                            key={slot}
                            className={`flex-1 border-l ${idx % 2 === 0 ? 'bg-muted/20' : 'bg-background'}`}
                          />
                        ))}
                      </div>
                      {scheduleRows.map((row, rowIndex) => (
                        <div key={rowIndex} className="absolute left-0 right-0" style={{ top: `${rowIndex * rowHeight}px`, height: `${rowHeight}px` }}>
                          {row.map(schedule => {
                            const position = getSchedulePosition(
                              schedule.scheduled_time_start,
                              schedule.scheduled_time_end
                            );
                            return (
                              <div
                                key={schedule.id}
                                className="absolute top-2 h-10 rounded px-2 py-1 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden border border-white/20"
                                style={{
                                  left: position.left,
                                  width: position.width,
                                  backgroundColor: schedule.appointment?.is_urgent 
                                    ? 'hsl(var(--urgent))' 
                                    : schedule.status === 'locked'
                                    ? 'hsl(var(--confirmed))'
                                    : 'hsl(var(--scheduled))',
                                  color: 'white',
                                }}
                                onClick={() => onScheduleClick?.(schedule)}
                              >
                                <div className="text-xs font-medium truncate">
                                  {schedule.appointment?.customer_name}
                                </div>
                                <div className="text-xs truncate opacity-90">
                                  {schedule.appointment?.service?.name}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">护士排班</h3>
        <Card className="p-4">
          <ScrollArea className="w-full">
            <div className="min-w-[1200px]">
              <div className="flex border-b pb-2 mb-4">
                <div className="w-32 flex-shrink-0 font-medium">护士</div>
                <div className="flex-1 flex">
                  {hours.map(hour => (
                    <div key={hour} className="flex-1 text-center text-sm text-muted-foreground border-l">
                      {hour}:00
                    </div>
                  ))}
                </div>
              </div>

              {nurses.map(nurse => {
                const nurseSchedules = getSchedulesForResource(nurse.id, 'nurse');
                const scheduleRows = arrangeSchedulesInRows(nurseSchedules);
                const rowHeight = 48;
                const totalHeight = Math.max(scheduleRows.length * rowHeight, rowHeight);

                return (
                  <div key={nurse.id} className="flex border-b py-4 relative">
                    <div className="w-32 flex-shrink-0 font-medium">
                      {nurse.name}
                      {scheduleRows.length > 1 && (
                        <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          ⚠️ {scheduleRows.length}个重叠排班
                        </div>
                      )}
                    </div>
                    <div className="flex-1 relative" style={{ height: `${totalHeight}px` }}>
                      <div className="absolute inset-0 flex">
                        {timeSlots.map((slot, idx) => (
                          <div
                            key={slot}
                            className={`flex-1 border-l ${idx % 2 === 0 ? 'bg-muted/20' : 'bg-background'}`}
                          />
                        ))}
                      </div>
                      {scheduleRows.map((row, rowIndex) => (
                        <div key={rowIndex} className="absolute left-0 right-0" style={{ top: `${rowIndex * rowHeight}px`, height: `${rowHeight}px` }}>
                          {row.map(schedule => {
                            const position = getSchedulePosition(
                              schedule.scheduled_time_start,
                              schedule.scheduled_time_end
                            );
                            return (
                              <div
                                key={schedule.id}
                                className="absolute top-2 h-10 rounded px-2 py-1 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden border border-white/20"
                                style={{
                                  left: position.left,
                                  width: position.width,
                                  backgroundColor: schedule.appointment?.is_urgent 
                                    ? 'hsl(var(--urgent))' 
                                    : schedule.status === 'locked'
                                    ? 'hsl(var(--confirmed))'
                                    : 'hsl(var(--scheduled))',
                                  color: 'white',
                                }}
                                onClick={() => onScheduleClick?.(schedule)}
                              >
                                <div className="text-xs font-medium truncate">
                                  {schedule.appointment?.customer_name}
                                </div>
                                <div className="text-xs truncate opacity-90">
                                  {schedule.appointment?.service?.name}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </Card>
      </div>

      <div className="flex gap-4 items-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-urgent" />
          <span>急单</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-pending" />
          <span>待排班</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-scheduled" />
          <span>已排班</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-confirmed" />
          <span>已锁定</span>
        </div>
      </div>
    </div>
  );
}
