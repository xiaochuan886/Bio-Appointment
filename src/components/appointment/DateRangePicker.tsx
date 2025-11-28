import { useState } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, getWeek, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ViewMode } from './GanttChart';

interface DateRangePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: ViewMode;
}

export default function DateRangePicker({ selectedDate, onDateChange, viewMode }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 获取日期范围文本
  const getDateRangeText = () => {
    switch (viewMode) {
      case 'day':
        return format(selectedDate, 'yyyy年M月d日 EEEE', { locale: zhCN });
      case 'week': {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekNumber = getWeek(selectedDate, { weekStartsOn: 1, firstWeekContainsDate: 4 });
        return `第${weekNumber}周（${format(weekStart, 'M月d日', { locale: zhCN })} - ${format(weekEnd, 'M月d日', { locale: zhCN })}）`;
      }
      case 'month':
        return format(selectedDate, 'yyyy年M月', { locale: zhCN });
      default:
        return '';
    }
  };

  // 获取简短的日期文本（用于按钮）
  const getShortDateText = () => {
    switch (viewMode) {
      case 'day':
        return format(selectedDate, 'M月d日', { locale: zhCN });
      case 'week': {
        const weekNumber = getWeek(selectedDate, { weekStartsOn: 1, firstWeekContainsDate: 4 });
        return `第${weekNumber}周`;
      }
      case 'month':
        return format(selectedDate, 'yyyy年M月', { locale: zhCN });
      default:
        return '';
    }
  };

  // 上一个时间段
  const handlePrevious = () => {
    switch (viewMode) {
      case 'day':
        onDateChange(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000));
        break;
      case 'week':
        onDateChange(subWeeks(selectedDate, 1));
        break;
      case 'month':
        onDateChange(subMonths(selectedDate, 1));
        break;
    }
  };

  // 下一个时间段
  const handleNext = () => {
    switch (viewMode) {
      case 'day':
        onDateChange(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000));
        break;
      case 'week':
        onDateChange(addWeeks(selectedDate, 1));
        break;
      case 'month':
        onDateChange(addMonths(selectedDate, 1));
        break;
    }
  };

  // 回到今天
  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex items-center gap-2">
      {/* 时间范围提示文字 */}
      <div className="text-sm text-muted-foreground hidden xl:block">
        {getDateRangeText()}
      </div>

      {/* 快速导航按钮 */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={handlePrevious}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* 日期选择器 */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {getShortDateText()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            {viewMode === 'day' && (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    onDateChange(date);
                    setIsOpen(false);
                  }
                }}
                initialFocus
              />
            )}
            {viewMode === 'week' && (
              <div className="p-4 space-y-4">
                <div className="text-sm font-medium">选择周</div>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      onDateChange(date);
                      setIsOpen(false);
                    }
                  }}
                  initialFocus
                  showWeekNumber
                />
                <div className="text-xs text-muted-foreground">
                  点击任意日期选择该周
                </div>
              </div>
            )}
            {viewMode === 'month' && (
              <div className="p-4 space-y-4">
                <div className="text-sm font-medium">选择月份</div>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={selectedDate.getFullYear().toString()}
                    onValueChange={(year) => {
                      const newDate = new Date(selectedDate);
                      newDate.setFullYear(parseInt(year));
                      onDateChange(newDate);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() - 2 + i;
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}年
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Select
                    value={(selectedDate.getMonth() + 1).toString()}
                    onValueChange={(month) => {
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(parseInt(month) - 1);
                      onDateChange(newDate);
                      setIsOpen(false);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {i + 1}月
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={handleNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 今天按钮 */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8"
        onClick={handleToday}
      >
        今天
      </Button>
    </div>
  );
}
