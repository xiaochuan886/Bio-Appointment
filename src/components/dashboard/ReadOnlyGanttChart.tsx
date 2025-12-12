import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { ScheduleWithDetails, Nurse, Room, Profile as TypeProfile } from '@/types/types';
import type { Profile as ApiProfile } from '@/services/api-client';
import { getNurseColor, getRoomColor, getCombinedGradient } from '@/utils/colorSystem';
import { MapPin, Stethoscope } from 'lucide-react';

export type ViewMode = 'day' | 'week' | 'month';

interface ReadOnlyGanttChartProps {
  schedules: ScheduleWithDetails[];
  nurses: Nurse[];
  rooms: Room[];
  doctors?: ApiProfile[];
  selectedDate: string;
  viewMode: ViewMode;
  resourceFilters?: string[];
  selectedNurseIds?: string[];
  selectedRoomIds?: string[];
  selectedDoctorIds?: string[];
}

export default function ReadOnlyGanttChart({
  schedules,
  nurses,
  rooms,
  doctors = [],
  selectedDate,
  viewMode,
  resourceFilters = [],
  selectedNurseIds = [],
  selectedRoomIds = [],
  selectedDoctorIds = []
}: ReadOnlyGanttChartProps) {

  // 确定可见的房间
  const visibleRooms = selectedRoomIds.length > 0
    ? rooms.filter(room => selectedRoomIds.includes(room.id))
    : resourceFilters.includes('room') ? rooms : [];

  // 确定可见的护士
  const visibleNurses = selectedNurseIds.length > 0
    ? nurses.filter(nurse => selectedNurseIds.includes(nurse.id))
    : resourceFilters.includes('nurse') ? nurses : [];

  // 确定可见的医生
  const visibleDoctors = selectedDoctorIds.length > 0
    ? doctors.filter(doctor => selectedDoctorIds.includes(doctor.id))
    : resourceFilters.includes('doctor') ? doctors : [];

  // 确定可见的排班
  let visibleSchedules = schedules;

  // 在周视图和月视图中，过滤掉已取消的排班
  if (viewMode === 'week' || viewMode === 'month') {
    visibleSchedules = schedules.filter(schedule => schedule.status !== 'cancelled');
  }

  // 应用筛选条件
  if (selectedNurseIds.length > 0 || selectedRoomIds.length > 0 || selectedDoctorIds.length > 0) {
    visibleSchedules = visibleSchedules.filter(schedule => {
      const nurseMatch = selectedNurseIds.length === 0 || (schedule.nurse_id && selectedNurseIds.includes(schedule.nurse_id));
      const roomMatch = selectedRoomIds.length === 0 || (schedule.room_id && selectedRoomIds.includes(schedule.room_id));
      const doctorMatch = selectedDoctorIds.length === 0 || (
        schedule.appointment?.doctor_id && selectedDoctorIds.includes(schedule.appointment.doctor_id)
      );
      return nurseMatch && roomMatch && doctorMatch;
    });
  }

  const hours = Array.from({ length: 11 }, (_, i) => i + 8);
  const timeSlots = hours.flatMap(h => [`${h}:00`, `${h}:30`]);

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
    const nurseColor = getNurseColor(schedule.nurse_id || '', nurses);
    const roomColor = getRoomColor(schedule.room_id || '', rooms);
    
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
    if (schedule.status === 'completed') {
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

  // 获取排班卡片的样式类名（只读模式）
  const getScheduleCardClassName = () => {
    return 'absolute top-2 h-10 rounded px-2 py-1 cursor-default transition-all overflow-hidden';
  };

  // 渲染排班卡片（仅显示人数，不显示姓名）
  const renderScheduleCard = (schedule: ScheduleWithDetails, position: { left: string; width: string }) => {
    const nurseColor = getNurseColor(schedule.nurse_id || '', nurses);
    const roomColor = getRoomColor(schedule.room_id || '', rooms);
    const nurse = nurses.find(n => n.id === schedule.nurse_id);
    const room = rooms.find(r => r.id === schedule.room_id);
    
    // 计算总人数
    const totalPeople = (() => {
      const totalPeopleFromAppointment = schedule.appointment?.total_people;
      const companionNames = schedule.appointment?.companion_names;
      const companionCount = companionNames?.length || 0;
      return totalPeopleFromAppointment || (1 + companionCount);
    })();
    
    return (
      <TooltipProvider key={schedule.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={getScheduleCardClassName()}
              style={{
                left: position.left,
                width: position.width,
                ...getScheduleCardStyle(schedule),
                color: 'white',
              }}
            >
              <div className="text-xs font-medium truncate drop-shadow-sm">
                {totalPeople}人
              </div>
              <div className="text-xs truncate opacity-90 drop-shadow-sm">
                {schedule.appointment?.service?.name || ''}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <div>
                <p className="font-semibold">
                  客户人数: {totalPeople}人
                </p>
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
                  护士: {nurse?.full_name || nurse?.name || '未分配'}
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
                  房间: {room?.name || '未分配'}
                </span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const getSchedulesForResource = (resourceId: string, resourceType: 'room' | 'nurse' | 'doctor', dateFilter?: string) => {
    const filtered = visibleSchedules.filter(schedule => {
      // 日期过滤（日视图需要）
      if (dateFilter) {
        let scheduleDate: string;
        if (typeof schedule.scheduled_date === 'string') {
          const scheduleDateObj = new Date(schedule.scheduled_date);
          scheduleDate = format(scheduleDateObj, 'yyyy-MM-dd');
        } else {
          scheduleDate = format(schedule.scheduled_date, 'yyyy-MM-dd');
        }
        
        if (scheduleDate !== dateFilter) {
          return false;
        }
      }
      
      // 资源过滤
      if (resourceType === 'room') {
        const currentRoom = rooms.find(r => r.id === resourceId);
        if (!currentRoom) {
          return false;
        }
        
        let isMatch = false;
        if (schedule.room_id && resourceId) {
          isMatch = schedule.room_id === resourceId;
        }
        
        if (!isMatch && schedule.room?.name && currentRoom.name) {
          isMatch = schedule.room.name === currentRoom.name;
        }
        
        return isMatch;
      }
      
      if (resourceType === 'nurse') {
        return schedule.nurse_id === resourceId;
      }
      
      if (resourceType === 'doctor') {
        // 优先检查schedule.doctor_id，备选检查appointment.doctor_id
        return schedule.doctor_id === resourceId || schedule.appointment?.doctor_id === resourceId;
      }
      
      return false;
    });

    return filtered;
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

  // 日视图渲染
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
                const roomSchedules = getSchedulesForResource(room.id, 'room', selectedDate);
                const scheduleRows = arrangeSchedulesInRows(roomSchedules);
                const rowHeight = 48;
                const totalHeight = Math.max(scheduleRows.length * rowHeight, rowHeight);
                const roomColor = getRoomColor(room.id, rooms);

                return (
                  <div key={room.id} className="flex border-b py-4 relative">
                    <div className="w-32 flex-shrink-0 font-medium">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: roomColor.bg }}
                        ></span>
                        <div>
                          {room.name}
                          <div className="text-xs text-muted-foreground font-normal">{getRoomTypeLabel(room.room_type)}</div>
                          {scheduleRows.length > 1 && (
                            <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                              ⚠️ {scheduleRows.length}个重叠排班
                            </div>
                          )}
                        </div>
                      </div>
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
                const nurseSchedules = getSchedulesForResource(nurse.id, 'nurse', selectedDate);
                const scheduleRows = arrangeSchedulesInRows(nurseSchedules);
                const rowHeight = 48;
                const totalHeight = Math.max(scheduleRows.length * rowHeight, rowHeight);
                const nurseColor = getNurseColor(nurse.id, nurses);

                return (
                  <div key={nurse.id} className="flex border-b py-4 relative">
                    <div className="w-32 flex-shrink-0 font-medium">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: nurseColor.bg }}
                        ></span>
                        <div>
                          {nurse.full_name || nurse.name}
                          {scheduleRows.length > 1 && (
                            <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                              ⚠️ {scheduleRows.length}个重叠排班
                            </div>
                          )}
                        </div>
                      </div>
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

      {/* 医生排班 */}
      {visibleDoctors.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">医生排班</h3>
          <Card className="p-4">
            <ScrollArea className="w-full">
              <div className="min-w-[1200px]">
                <div className="flex border-b pb-2 mb-4">
                  <div className="w-32 flex-shrink-0 font-medium">医生</div>
                  <div className="flex-1 flex">
                    {hours.map(hour => (
                      <div key={hour} className="flex-1 text-center text-sm text-muted-foreground border-l">
                        {hour}:00
                      </div>
                    ))}
                  </div>
                </div>

                {visibleDoctors.map(doctor => {
                const doctorSchedules = getSchedulesForResource(doctor.id, 'doctor', selectedDate);
                const scheduleRows = arrangeSchedulesInRows(doctorSchedules);
                const rowHeight = 48;
                const totalHeight = Math.max(scheduleRows.length * rowHeight, rowHeight);

                return (
                  <div key={doctor.id} className="flex border-b py-4 relative">
                    <div className="w-32 flex-shrink-0 font-medium">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-2.5 h-2.5 text-blue-600 flex-shrink-0" />
                        <div>
                          {doctor.full_name}
                          {scheduleRows.length > 1 && (
                            <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                              ⚠️ {scheduleRows.length}个重叠排班
                            </div>
                          )}
                        </div>
                      </div>
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
      {visibleRooms.length === 0 && visibleNurses.length === 0 && visibleDoctors.length === 0 && (
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
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>💡 此为只读视图，仅显示人数信息</span>
        </div>
      </div>
    </div>
  );
}