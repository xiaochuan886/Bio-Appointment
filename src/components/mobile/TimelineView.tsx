import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Calendar } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { ScheduleWithDetails } from '@/types/types';
import type { Resource } from '@/services/api-client';
import MobileScheduleCard from './MobileScheduleCard';

interface TimelineViewProps {
  schedules: ScheduleWithDetails[];
  selectedDate: Date;
  onDateChange?: (date: Date) => void;
  isLoading?: boolean;
  nurses: Resource[];
  rooms: Resource[];
  selectedStoreId: string;
}

interface TimeSlot {
  time: string;
  schedules: ScheduleWithDetails[];
  hasAvailability: boolean; // 是否有空闲资源（同一门店的护士+房间）
}

export default function TimelineView({
  schedules,
  selectedDate,
  isLoading = false,
  nurses,
  rooms,
  selectedStoreId
}: TimelineViewProps) {
  // 检查某个时间段是否有可用资源（同一门店的护士和房间都空闲）
  const checkAvailability = (hour: number, selectedDateStr: string): boolean => {
    // 获取该时段已被占用的护士和房间
    const occupiedNurseIds = new Set<string>();
    const occupiedRoomIds = new Set<string>();

    schedules.forEach(schedule => {
      if (format(new Date(schedule.scheduled_date), 'yyyy-MM-dd') !== selectedDateStr) {
        return;
      }

      const scheduleStartHour = parseInt(schedule.scheduled_time_start.split(':')[0]);
      const scheduleEndHour = parseInt(schedule.scheduled_time_end.split(':')[0]);

      if (scheduleStartHour <= hour && scheduleEndHour > hour) {
        if (schedule.nurse_id) occupiedNurseIds.add(schedule.nurse_id);
        if (schedule.room_id) occupiedRoomIds.add(schedule.room_id);
      }
    });

    // 根据门店筛选条件过滤护士和房间
    const filteredNurses = selectedStoreId === 'all'
      ? nurses
      : nurses.filter(n => n.store_id === selectedStoreId);

    const filteredRooms = selectedStoreId === 'all'
      ? rooms
      : rooms.filter(r => r.store_id === selectedStoreId);

    // 按门店分组
    const nursesByStore = new Map<string, Resource[]>();
    const roomsByStore = new Map<string, Resource[]>();

    filteredNurses.forEach(nurse => {
      if (!occupiedNurseIds.has(nurse.id) && nurse.store_id) {
        const storeNurses = nursesByStore.get(nurse.store_id) || [];
        storeNurses.push(nurse);
        nursesByStore.set(nurse.store_id, storeNurses);
      }
    });

    filteredRooms.forEach(room => {
      if (!occupiedRoomIds.has(room.id) && room.store_id) {
        const storeRooms = roomsByStore.get(room.store_id) || [];
        storeRooms.push(room);
        roomsByStore.set(room.store_id, storeRooms);
      }
    });

    // 检查是否至少有一个门店同时有空闲护士和空闲房间
    for (const [storeId, storeNurses] of nursesByStore) {
      const storeRooms = roomsByStore.get(storeId);
      if (storeNurses.length > 0 && storeRooms && storeRooms.length > 0) {
        return true; // 找到至少一个门店同时有空闲护士和房间
      }
    }

    return false;
  };

  // 生成时间段（从9:00到18:00，每小时一个时间段）
  const generateTimeSlots = (date: Date): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const selectedDateStr = format(date, 'yyyy-MM-dd');

    for (let hour = 9; hour <= 18; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      const slotSchedules = schedules.filter(schedule => {
        if (format(new Date(schedule.scheduled_date), 'yyyy-MM-dd') !== selectedDateStr) {
          return false;
        }

        // 只在排班开始时间显示，避免跨时段重复显示
        const scheduleStartHour = parseInt(schedule.scheduled_time_start.split(':')[0]);
        return scheduleStartHour === hour;
      });

      const hasAvailability = checkAvailability(hour, selectedDateStr);

      slots.push({
        time: timeStr,
        schedules: slotSchedules,
        hasAvailability
      });
    }

    return slots;
  };

  const timeSlots = generateTimeSlots(selectedDate);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" />
          日程时间轴
        </CardTitle>
        <CardDescription className="text-xs">
          {format(selectedDate, 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
          {isToday(selectedDate) && (
            <Badge variant="default" className="ml-2 text-[10px] px-1.5 py-0">今天</Badge>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">加载中...</div>
          </div>
        ) : (
          <ScrollArea className="h-[400px] w-full pr-2">
            <div className="space-y-2">
              {timeSlots.map((slot, index) => (
                <div key={index} className="flex gap-3">
                  {/* 时间标签 */}
                  <div className="flex flex-col items-center text-xs text-muted-foreground w-12 flex-shrink-0 pt-1">
                    <Clock className="h-3 w-3 mb-0.5" />
                    <span>{slot.time}</span>
                  </div>

                  {/* 时间段内容 */}
                  <div className="flex-1 min-w-0">
                    {slot.schedules.length > 0 ? (
                      <div className="space-y-1">
                        {slot.schedules.map(schedule => (
                          <MobileScheduleCard
                            key={schedule.id}
                            schedule={schedule}
                            compact={true}
                          />
                        ))}
                      </div>
                    ) : slot.hasAvailability ? (
                      <div className="text-center text-xs text-muted-foreground py-3 border border-dashed rounded-lg bg-muted/20">
                        空闲时段
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}