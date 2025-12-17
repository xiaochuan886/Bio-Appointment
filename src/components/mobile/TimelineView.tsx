import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Clock, Users, MapPin, Calendar } from 'lucide-react';
import { format, addDays, subDays, isToday, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { ScheduleWithDetails } from '@/types/types';
import MobileScheduleCard from './MobileScheduleCard';

interface TimelineViewProps {
  schedules: ScheduleWithDetails[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  isLoading?: boolean;
}

interface TimeSlot {
  time: string;
  schedules: ScheduleWithDetails[];
}

export default function TimelineView({ 
  schedules, 
  selectedDate, 
  onDateChange,
  isLoading = false 
}: TimelineViewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(10); // 每页显示的时间段数量
  
  // 生成时间段（从8:00到20:00，每小时一个时间段）
  const generateTimeSlots = (date: Date): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const selectedDateStr = format(date, 'yyyy-MM-dd');
    
    for (let hour = 8; hour <= 20; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      const slotSchedules = schedules.filter(schedule => {
        if (format(new Date(schedule.scheduled_date), 'yyyy-MM-dd') !== selectedDateStr) {
          return false;
        }
        
        const scheduleStartHour = parseInt(schedule.scheduled_time_start.split(':')[0]);
        const scheduleEndHour = parseInt(schedule.scheduled_time_end.split(':')[0]);
        
        return scheduleStartHour <= hour && scheduleEndHour > hour;
      });
      
      slots.push({
        time: timeStr,
        schedules: slotSchedules
      });
    }
    
    return slots;
  };
  
  const timeSlots = generateTimeSlots(selectedDate);
  const totalPages = Math.ceil(timeSlots.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const visibleSlots = timeSlots.slice(startIndex, endIndex);
  
  const handlePrevDay = () => {
    onDateChange(subDays(selectedDate, 1));
    setCurrentPage(0); // 重置页码
  };
  
  const handleNextDay = () => {
    onDateChange(addDays(selectedDate, 1));
    setCurrentPage(0); // 重置页码
  };
  
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };
  
  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };
  
  // 当日期变化时重置页码
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedDate]);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              日程时间轴
            </CardTitle>
            <CardDescription>
              {format(selectedDate, 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
              {isToday(selectedDate) && (
                <Badge variant="default" className="ml-2">今天</Badge>
              )}
            </CardDescription>
          </div>
          
          {/* 日期切换按钮 */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevDay}
              disabled={isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateChange(new Date())}
              disabled={isLoading || isToday(selectedDate)}
            >
              今天
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextDay}
              disabled={isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">加载中...</div>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[600px] w-full">
              <div className="space-y-4">
                {visibleSlots.map((slot, index) => (
                  <div key={index} className="flex gap-3">
                    {/* 时间标签 */}
                    <div className="flex flex-col items-center text-sm text-muted-foreground w-16 flex-shrink-0">
                      <Clock className="h-4 w-4 mb-1" />
                      <span>{slot.time}</span>
                    </div>
                    
                    {/* 时间段内容 */}
                    <div className="flex-1 min-w-0">
                      {slot.schedules.length > 0 ? (
                        <div className="space-y-2">
                          {slot.schedules.map(schedule => (
                            <MobileScheduleCard
                              key={schedule.id}
                              schedule={schedule}
                              compact={true}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground py-4 border-2 border-dashed rounded-lg">
                          空闲时段
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {/* 分页控制 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  显示 {startIndex + 1}-{Math.min(endIndex, timeSlots.length)} / {timeSlots.length} 个时间段
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentPage + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages - 1}
                  >
                    下一页
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
            
            {/* 统计信息 */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-around text-center">
                <div className="flex flex-col items-center">
                  <div className="text-2xl font-bold text-primary">
                    {schedules.length}
                  </div>
                  <div className="text-xs text-muted-foreground">总排班</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-2xl font-bold text-pending">
                    {timeSlots.filter(slot => slot.schedules.length === 0).length}
                  </div>
                  <div className="text-xs text-muted-foreground">空闲时段</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-2xl font-bold text-confirmed">
                    {Math.round((schedules.length / timeSlots.length) * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">时间利用率</div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}