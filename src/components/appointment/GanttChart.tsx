import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { ScheduleWithDetails, Nurse, Room } from '@/types/types';
import ScheduleDetailDialog from './ScheduleDetailDialog';
import type { ResourceFilterType } from './ResourceFilter';
import { getNurseColor, getRoomColor, getCombinedGradient } from '@/utils/colorSystem';


export type ViewMode = 'day' | 'week' | 'month';

interface GanttChartProps {
  schedules: ScheduleWithDetails[];
  nurses: Nurse[];
  rooms: Room[];
  selectedDate: string;
  viewMode: ViewMode;
  resourceFilters?: ResourceFilterType[];
  selectedNurseIds?: string[];
  selectedRoomIds?: string[];
  onScheduleClick?: (schedule: ScheduleWithDetails) => void;
}

export default function GanttChart({ 
  schedules, 
  nurses, 
  rooms, 
  selectedDate, 
  viewMode,
  resourceFilters = [],
  selectedNurseIds = [],
  selectedRoomIds = [],
  onScheduleClick 
}: GanttChartProps) {
  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSchedules, setSelectedSchedules] = useState<ScheduleWithDetails[]>([]);
  const [dialogDate, setDialogDate] = useState('');
  const [selectedResourceName, setSelectedResourceName] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState<'room' | 'nurse'>('room');

  // 根据筛选条件过滤资源
  const shouldShowResource = (resourceType: 'room' | 'nurse') => {
    // 如果没有选择任何筛选条件，显示所有资源
    if (resourceFilters.length === 0) {
      return true;
    }
    // 如果选择了两个筛选条件，显示所有资源
    if (resourceFilters.length === 2) {
      return true;
    }
    // 根据筛选条件判断
    if (resourceType === 'room') {
      return resourceFilters.includes('room');
    }
    if (resourceType === 'nurse') {
      return resourceFilters.includes('nurse');
    }
    return false;
  };

  // 过滤后的资源列表
  const filteredRooms = shouldShowResource('room') ? rooms : [];
  const filteredNurses = shouldShowResource('nurse') ? nurses : [];

  // 判断排班是否完全匹配筛选条件（用于高亮显示）
  const isScheduleHighlighted = (schedule: ScheduleWithDetails) => {
    const matchNurse = selectedNurseIds.length > 0 
      ? selectedNurseIds.includes(schedule.nurse_id) 
      : false;
    
    const matchRoom = selectedRoomIds.length > 0 
      ? selectedRoomIds.includes(schedule.room_id) 
      : false;
    
    // 如果两个条件都选了，必须都匹配
    if (selectedNurseIds.length > 0 && selectedRoomIds.length > 0) {
      return matchNurse && matchRoom;
    }
    
    // 如果只选了一个条件，匹配该条件即可
    return matchNurse || matchRoom;
  };

  // 确定可见的资源和排班
  let visibleRooms = filteredRooms;
  let visibleNurses = filteredNurses;
  let visibleSchedules = schedules;

  // 如果有筛选条件，应用关联展示逻辑
  if (selectedNurseIds.length > 0 || selectedRoomIds.length > 0) {
    // 收集所有相关的资源ID
    const relatedRoomIds = new Set<string>();
    const relatedNurseIds = new Set<string>();

    // 1. 如果只选择了护士（没有选择房间），显示所有房间
    if (selectedNurseIds.length > 0 && selectedRoomIds.length === 0) {
      // 添加选中的护士
      selectedNurseIds.forEach(id => relatedNurseIds.add(id));
      // 添加所有房间
      filteredRooms.forEach(room => relatedRoomIds.add(room.id));
      // 找出在这些房间工作的所有护士（用于显示关联排班）
      schedules
        .filter(s => relatedRoomIds.has(s.room_id))
        .forEach(s => relatedNurseIds.add(s.nurse_id));
    }
    // 2. 如果只选择了房间（没有选择护士），显示所有护士
    else if (selectedRoomIds.length > 0 && selectedNurseIds.length === 0) {
      // 添加选中的房间
      selectedRoomIds.forEach(id => relatedRoomIds.add(id));
      // 添加所有护士
      filteredNurses.forEach(nurse => relatedNurseIds.add(nurse.id));
      // 找出使用这些护士的所有房间（用于显示关联排班）
      schedules
        .filter(s => relatedNurseIds.has(s.nurse_id))
        .forEach(s => relatedRoomIds.add(s.room_id));
    }
    // 3. 如果同时选择了护士和房间，只显示相关的资源
    else {
      // 添加直接选中的资源
      selectedRoomIds.forEach(id => relatedRoomIds.add(id));
      selectedNurseIds.forEach(id => relatedNurseIds.add(id));
      
      // 找出选中护士使用的所有房间
      schedules
        .filter(s => selectedNurseIds.includes(s.nurse_id))
        .forEach(s => relatedRoomIds.add(s.room_id));
      
      // 找出在选中房间工作的所有护士
      schedules
        .filter(s => selectedRoomIds.includes(s.room_id))
        .forEach(s => relatedNurseIds.add(s.nurse_id));
    }

    // 4. 过滤可见资源
    visibleRooms = filteredRooms.filter(room => relatedRoomIds.has(room.id));
    visibleNurses = filteredNurses.filter(nurse => relatedNurseIds.has(nurse.id));

    // 5. 显示这些资源的所有排班（不仅是匹配的排班）
    visibleSchedules = schedules.filter(schedule => 
      relatedRoomIds.has(schedule.room_id) || relatedNurseIds.has(schedule.nurse_id)
    );
  }

  const hours = Array.from({ length: 11 }, (_, i) => i + 8);
  const timeSlots = hours.flatMap(h => [`${h}:00`, `${h}:30`]);

  // 打开详情对话框
  const handleCellClick = (
    date: string,
    resourceId: string,
    resourceName: string,
    resourceType: 'room' | 'nurse'
  ) => {
    const cellSchedules = visibleSchedules.filter(
      s => s.scheduled_date === date && 
      (resourceType === 'room' ? s.room_id === resourceId : s.nurse_id === resourceId)
    );
    
    if (cellSchedules.length > 0) {
      setSelectedSchedules(cellSchedules);
      setDialogDate(date);
      setSelectedResourceName(resourceName);
      setSelectedResourceType(resourceType);
      setDialogOpen(true);
    }
  };

  // 月视图点击处理（不区分资源）
  const handleMonthCellClick = (date: string) => {
    const cellSchedules = visibleSchedules.filter(s => s.scheduled_date === date);
    
    if (cellSchedules.length > 0) {
      setSelectedSchedules(cellSchedules);
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

  // 获取排班卡片的组合颜色样式
  const getScheduleCardStyle = (schedule: ScheduleWithDetails) => {
    const nurseColor = getNurseColor(schedule.nurse_id, nurses);
    const roomColor = getRoomColor(schedule.room_id, rooms);
    
    // 使用渐变色展示护士-房间组合
    const gradient = getCombinedGradient(nurseColor.bg, roomColor.bg);
    
    // 如果是急单，添加红色边框
    if (schedule.appointment?.is_urgent) {
      return {
        background: gradient,
        borderColor: '#EF4444',
        borderWidth: '2px',
        borderStyle: 'solid',
      };
    }
    
    // 如果已锁定，添加绿色边框
    if (schedule.status === 'locked') {
      return {
        background: gradient,
        borderColor: '#10B981',
        borderWidth: '2px',
        borderStyle: 'solid',
      };
    }
    
    return {
      background: gradient,
    };
  };

  // 获取排班卡片的样式类名
  const getScheduleCardClassName = (schedule: ScheduleWithDetails) => {
    const baseClasses = 'absolute top-2 h-10 rounded px-2 py-1 cursor-pointer hover:opacity-90 hover:shadow-lg transition-all overflow-hidden';
    const highlightClasses = isScheduleHighlighted(schedule)
      ? 'ring-2 ring-yellow-400 ring-offset-2'
      : '';
    return `${baseClasses} ${highlightClasses}`;
  };

  // 获取客户名称显示（带高亮标记）
  const getCustomerNameDisplay = (schedule: ScheduleWithDetails) => {
    const name = schedule.appointment?.customer_name || '';
    return isScheduleHighlighted(schedule) ? `${name} ⭐` : name;
  };

  // 渲染排班卡片（带颜色编码和悬停提示）
  const renderScheduleCard = (schedule: ScheduleWithDetails, position: { left: string; width: string }) => {
    const nurseColor = getNurseColor(schedule.nurse_id, nurses);
    const roomColor = getRoomColor(schedule.room_id, rooms);
    const nurse = nurses.find(n => n.id === schedule.nurse_id);
    const room = rooms.find(r => r.id === schedule.room_id);
    
    return (
      <TooltipProvider key={schedule.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={getScheduleCardClassName(schedule)}
              style={{
                left: position.left,
                width: position.width,
                ...getScheduleCardStyle(schedule),
                color: 'white',
              }}
              onClick={() => onScheduleClick?.(schedule)}
            >
              <div className="text-xs font-medium truncate drop-shadow-sm">
                {getCustomerNameDisplay(schedule)}
              </div>
              <div className="text-xs truncate opacity-90 drop-shadow-sm">
                {schedule.appointment?.service?.name}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <div>
                <p className="font-semibold">{schedule.appointment?.customer_name}</p>
                <p className="text-xs text-muted-foreground">
                  {schedule.scheduled_time_start} - {schedule.scheduled_time_end}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t">
                <div
                  className="w-4 h-4 rounded border border-white/20"
                  style={{ backgroundColor: nurseColor.bg }}
                />
                <span className="text-xs">
                  护士: {nurse?.name} ({nurse?.skill_level})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded border"
                  style={{
                    backgroundColor: roomColor.bg,
                    borderColor: roomColor.border,
                  }}
                />
                <span className="text-xs">
                  房间: {room?.name} ({room?.room_type})
                </span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const getSchedulesForResource = (resourceId: string, resourceType: 'room' | 'nurse') => {
    return visibleSchedules.filter(schedule => {
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
    return visibleSchedules.filter(s => s.scheduled_date === dateStr).length;
  };

  // 周视图渲染
  if (viewMode === 'week') {
    const currentDate = parseISO(selectedDate);
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // 周一开始
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="space-y-6">
        {/* 房间排班 */}
        {visibleRooms.length > 0 && (
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
                {visibleRooms.map(room => (
                <div key={room.id} className="contents">
                  <div className="border-t py-3 px-2 font-medium">
                    {room.name}
                    <div className="text-xs text-muted-foreground">{getRoomTypeLabel(room.room_type)}</div>
                  </div>
                  {weekDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const daySchedules = visibleSchedules.filter(
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
                                    {getCustomerNameDisplay(schedule)} - {schedule.scheduled_time_start?.slice(0, 5)}
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
        )}

        {/* 护士排班 */}
        {visibleNurses.length > 0 && (
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
                {visibleNurses.map(nurse => (
                <div key={nurse.id} className="contents">
                  <div className="border-t py-3 px-2 font-medium">{nurse.name}</div>
                  {weekDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const daySchedules = visibleSchedules.filter(
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
                                    {getCustomerNameDisplay(schedule)} - {schedule.scheduled_time_start?.slice(0, 5)}
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
        )}

        {/* 无筛选结果提示 */}
        {visibleRooms.length === 0 && visibleNurses.length === 0 && (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">暂无符合筛选条件的资源</p>
              <p className="text-sm">请调整筛选条件或清除筛选</p>
            </div>
          </Card>
        )}

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

    // 月视图显示所有排班的汇总，不区分资源类型
    const hasActiveFilter = resourceFilters.length > 0 && resourceFilters.length < 2;

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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              月视图 - {format(currentDate, 'yyyy年M月', { locale: zhCN })}
            </h3>
            {hasActiveFilter && (
              <div className="text-sm text-muted-foreground">
                注意：月视图显示所有排班汇总，不区分资源类型
              </div>
            )}
          </div>
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
                    const daySchedules = isValid ? visibleSchedules.filter(s => s.scheduled_date === dateStr) : [];
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
                                    {getCustomerNameDisplay(schedule)} - {schedule.scheduled_time_start?.slice(0, 5)}
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
      {/* 房间排班 */}
      {visibleRooms.length > 0 && (
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

                {visibleRooms.map(room => {
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
                            return renderScheduleCard(schedule, position);
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
      )}

      {/* 护士排班 */}
      {visibleNurses.length > 0 && (
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

                {visibleNurses.map(nurse => {
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
                            return renderScheduleCard(schedule, position);
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
      )}

      {/* 无筛选结果提示 */}
      {visibleRooms.length === 0 && visibleNurses.length === 0 && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <p className="text-lg mb-2">暂无符合筛选条件的资源</p>
            <p className="text-sm">请调整筛选条件或清除筛选</p>
          </div>
        </Card>
      )}

      {/* 图例 */}
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
