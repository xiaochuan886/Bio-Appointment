import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import StatusBadge from './StatusBadge';
import type { ScheduleWithDetails, Nurse, Room } from '@/types/types';

interface GanttChartProps {
  schedules: ScheduleWithDetails[];
  nurses: Nurse[];
  rooms: Room[];
  selectedDate: string;
  onScheduleClick?: (schedule: ScheduleWithDetails) => void;
}

export default function GanttChart({ schedules, nurses, rooms, selectedDate, onScheduleClick }: GanttChartProps) {
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

  const getSchedulesForResource = (resourceId: string, resourceType: 'room' | 'nurse') => {
    return schedules.filter(schedule => {
      if (resourceType === 'room') {
        return schedule.room_id === resourceId;
      }
      return schedule.nurse_id === resourceId;
    });
  };

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
                return (
                  <div key={room.id} className="flex items-center border-b py-4 relative">
                    <div className="w-32 flex-shrink-0 font-medium">
                      {room.name}
                      <div className="text-xs text-muted-foreground">{getRoomTypeLabel(room.room_type)}</div>
                    </div>
                    <div className="flex-1 relative h-16">
                      <div className="absolute inset-0 flex">
                        {timeSlots.map((slot, idx) => (
                          <div
                            key={slot}
                            className={`flex-1 border-l ${idx % 2 === 0 ? 'bg-muted/20' : 'bg-background'}`}
                          />
                        ))}
                      </div>
                      {roomSchedules.map(schedule => {
                        const position = getSchedulePosition(
                          schedule.scheduled_time_start,
                          schedule.scheduled_time_end
                        );
                        return (
                          <div
                            key={schedule.id}
                            className="absolute top-2 h-12 rounded px-2 py-1 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
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
                return (
                  <div key={nurse.id} className="flex items-center border-b py-4 relative">
                    <div className="w-32 flex-shrink-0 font-medium">
                      {nurse.name}
                    </div>
                    <div className="flex-1 relative h-16">
                      <div className="absolute inset-0 flex">
                        {timeSlots.map((slot, idx) => (
                          <div
                            key={slot}
                            className={`flex-1 border-l ${idx % 2 === 0 ? 'bg-muted/20' : 'bg-background'}`}
                          />
                        ))}
                      </div>
                      {nurseSchedules.map(schedule => {
                        const position = getSchedulePosition(
                          schedule.scheduled_time_start,
                          schedule.scheduled_time_end
                        );
                        return (
                          <div
                            key={schedule.id}
                            className="absolute top-2 h-12 rounded px-2 py-1 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
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
