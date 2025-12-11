import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Filter, 
  Download, 
  BarChart3, 
  RefreshCw,
  Search,
  X,
  ChevronDown,
  Check
} from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { format, addDays, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface EnhancedHistoryFiltersProps {
  onFiltersChange: (filters: HistoryFilters) => void;
  onExport: () => void;
  loading?: boolean;
}

export interface HistoryFilters {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  status: string[];
  serviceTypes: string[];
  stores: string[];
  nurses: string[];
  searchText: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// 预定义的快捷日期范围
const dateRangePresets = [
  {
    label: '今天',
    value: 'today',
    getRange: () => {
      const today = new Date();
      return {
        start: today,
        end: today
      };
    }
  },
  {
    label: '昨天',
    value: 'yesterday',
    getRange: () => {
      const today = new Date();
      const yesterday = addDays(today, -1);
      return {
        start: yesterday,
        end: yesterday
      };
    }
  },
  {
    label: '最近7天',
    value: 'last7days',
    getRange: () => {
      const today = new Date();
      return {
        start: addDays(today, -6),
        end: today
      };
    }
  },
  {
    label: '最近30天',
    value: 'last30days',
    getRange: () => {
      const today = new Date();
      return {
        start: addDays(today, -29),
        end: today
      };
    }
  },
  {
    label: '本月',
    value: 'thisMonth',
    getRange: () => {
      const today = new Date();
      return {
        start: startOfMonth(today),
        end: endOfMonth(today)
      };
    }
  },
  {
    label: '上月',
    value: 'lastMonth',
    getRange: () => {
      const today = new Date();
      const lastMonth = addDays(today, -30);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth)
      };
    }
  }
];

// 状态选项
const statusOptions = [
  { value: 'completed', label: '已完成', color: 'green' },
  { value: 'cancelled', label: '已取消', color: 'red' },
  { value: 'in_progress', label: '进行中', color: 'blue' },
  { value: 'pending', label: '待执行', color: 'yellow' }
];

// 服务类型选项
const serviceTypeOptions = [
  { value: 'nursing', label: '护理服务' },
  { value: 'consultation', label: '咨询服务' },
  { value: 'report', label: '报告解读' },
  { value: 'vaccination', label: '疫苗接种' }
];

// 排序选项
const sortOptions = [
  { value: 'scheduled_date', label: '排班日期' },
  { value: 'customer_name', label: '客户姓名' },
  { value: 'service_name', label: '服务类型' },
  { value: 'duration', label: '服务时长' },
  { value: 'completion_time', label: '完成时间' }
];

export default function EnhancedHistoryFilters({ 
  onFiltersChange, 
  onExport, 
  loading = false 
}: EnhancedHistoryFiltersProps) {
  const [filters, setFilters] = useState<HistoryFilters>({
    dateRange: {
      start: null,
      end: null
    },
    status: [],
    serviceTypes: [],
    stores: [],
    nurses: [],
    searchText: '',
    sortBy: 'scheduled_date',
    sortOrder: 'desc'
  });

  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // 计算激活的筛选器数量
  const calculateActiveFilters = () => {
    let count = 0;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.status.length > 0) count++;
    if (filters.serviceTypes.length > 0) count++;
    if (filters.stores.length > 0) count++;
    if (filters.nurses.length > 0) count++;
    if (filters.searchText.trim()) count++;
    setActiveFiltersCount(count);
  };

  // 更新筛选器
  const updateFilters = (newFilters: Partial<HistoryFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
    calculateActiveFilters();
  };

  // 处理日期范围选择
  const handleDateRangeSelect = (preset: any) => {
    const range = dateRangePresets.find(p => p.value === preset);
    if (range) {
      updateFilters({
        dateRange: range.getRange()
      });
    }
  };

  // 处理自定义日期选择
  const handleCustomDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    const newDateRange = { ...filters.dateRange };
    
    if (!filters.dateRange.start || (filters.dateRange.start && filters.dateRange.end)) {
      // 选择开始日期
      newDateRange.start = date;
      newDateRange.end = null;
    } else {
      // 选择结束日期
      newDateRange.end = date;
      
      // 确保结束日期不早于开始日期
      if (newDateRange.start && date < newDateRange.start) {
        newDateRange.end = newDateRange.start;
      }
    }
    
    updateFilters({ dateRange: newDateRange });
  };

  // 处理状态选择
  const handleStatusChange = (status: string, checked: boolean) => {
    let newStatus = [...filters.status];
    if (checked) {
      if (!newStatus.includes(status)) {
        newStatus.push(status);
      }
    } else {
      newStatus = newStatus.filter(s => s !== status);
    }
    updateFilters({ status: newStatus });
  };

  // 处理服务类型选择
  const handleServiceTypeChange = (serviceType: string, checked: boolean) => {
    let newServiceTypes = [...filters.serviceTypes];
    if (checked) {
      if (!newServiceTypes.includes(serviceType)) {
        newServiceTypes.push(serviceType);
      }
    } else {
      newServiceTypes = newServiceTypes.filter(s => s !== serviceType);
    }
    updateFilters({ serviceTypes: newServiceTypes });
  };

  // 清除所有筛选器
  const clearAllFilters = () => {
    setFilters({
      dateRange: { start: null, end: null },
      status: [],
      serviceTypes: [],
      stores: [],
      nurses: [],
      searchText: '',
      sortBy: 'scheduled_date',
      sortOrder: 'desc'
    });
    setActiveFiltersCount(0);
  };

  // 格式化日期范围显示
  const formatDateRangeDisplay = () => {
    const { start, end } = filters.dateRange;
    if (start && end) {
      return `${format(start, 'MM月dd日')} - ${format(end, 'MM月dd日')}`;
    } else if (start) {
      return `从 ${format(start, 'MM月dd日')} 开始`;
    } else if (end) {
      return `至 ${format(end, 'MM月dd日')} 结束`;
    }
    return '选择日期范围';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">历史记录筛选</CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount} 个筛选条件
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-1" />
              清除筛选
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={loading}
            >
              <Download className="h-4 w-4 mr-1" />
              导出数据
            </Button>
          </div>
        </div>
        <CardDescription>
          选择筛选条件查看历史记录，支持多维度组合筛选
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索客户姓名、服务类型或备注..."
            value={filters.searchText}
            onChange={(e) => updateFilters({ searchText: e.target.value })}
            className="pl-10"
          />
        </div>

        {/* 快捷日期选择 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">时间范围</label>
          <div className="flex flex-wrap gap-2">
            {dateRangePresets.map((preset) => (
              <Button
                key={preset.value}
                variant="outline"
                size="sm"
                onClick={() => handleDateRangeSelect(preset.value)}
                className="text-xs"
              >
                {preset.label}
              </Button>
            ))}
            <Popover open={isDateRangeOpen} onOpenChange={setIsDateRangeOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  <Calendar className="h-4 w-4 mr-1" />
                  自定义日期
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-4">
                  <div className="text-sm font-medium mb-3">选择日期范围</div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground">开始日期</label>
                      <CalendarComponent
                        mode="single"
                        selected={filters.dateRange.start || undefined}
                        onSelect={handleCustomDateSelect}
                        initialFocus
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">结束日期</label>
                      <CalendarComponent
                        mode="single"
                        selected={filters.dateRange.end || undefined}
                        onSelect={handleCustomDateSelect}
                        disabled={(date) => filters.dateRange.start ? date < filters.dateRange.start : false}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2 border-t">
                    <Button size="sm" onClick={() => setIsDateRangeOpen(false)}>
                      确定
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          {filters.dateRange.start || filters.dateRange.end ? (
            <div className="mt-2 text-sm text-muted-foreground">
              {formatDateRangeDisplay()}
            </div>
          ) : null}
        </div>

        {/* 高级筛选选项 */}
        <Popover open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              <Filter className="h-4 w-4 mr-2" />
              高级筛选
              <ChevronDown className="h-4 w-4 ml-auto" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="start">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">高级筛选选项</h3>
                <Button size="sm" onClick={() => setIsAdvancedOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* 状态筛选 */}
              <div className="space-y-3">
                <label className="text-sm font-medium">任务状态</label>
                <div className="grid grid-cols-2 gap-2">
                  {statusOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${option.value}`}
                        checked={filters.status.includes(option.value)}
                        onCheckedChange={(checked: boolean) => handleStatusChange(option.value, checked)}
                      />
                      <label 
                        htmlFor={`status-${option.value}`}
                        className="text-sm flex items-center gap-2 cursor-pointer"
                      >
                        <span className={`w-2 h-2 rounded-full bg-${option.color}-500`} />
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* 服务类型筛选 */}
              <div className="space-y-3">
                <label className="text-sm font-medium">服务类型</label>
                <div className="grid grid-cols-2 gap-2">
                  {serviceTypeOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`service-${option.value}`}
                        checked={filters.serviceTypes.includes(option.value)}
                        onCheckedChange={(checked: boolean) => handleServiceTypeChange(option.value, checked)}
                      />
                      <label 
                        htmlFor={`service-${option.value}`}
                        className="text-sm cursor-pointer"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* 排序选项 */}
              <div className="space-y-3">
                <label className="text-sm font-medium">排序方式</label>
                <div className="flex gap-2">
                  <Select 
                    value={filters.sortBy} 
                    onValueChange={(value) => updateFilters({ sortBy: value })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="选择排序字段" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select 
                    value={filters.sortOrder} 
                    onValueChange={(value: 'asc' | 'desc') => updateFilters({ sortOrder: value })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">升序</SelectItem>
                      <SelectItem value="desc">降序</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button size="sm" onClick={() => setIsAdvancedOpen(false)}>
                  应用筛选
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* 活跃筛选条件显示 */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.dateRange.start && (
              <Badge variant="secondary" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                日期范围
              </Badge>
            )}
            {filters.status.map((status) => (
              <Badge key={status} variant="secondary" className="text-xs">
                {statusOptions.find(s => s.value === status)?.label}
              </Badge>
            ))}
            {filters.serviceTypes.map((type) => (
              <Badge key={type} variant="secondary" className="text-xs">
                {serviceTypeOptions.find(s => s.value === type)?.label}
              </Badge>
            ))}
            {filters.searchText && (
              <Badge variant="secondary" className="text-xs">
                <Search className="h-3 w-3 mr-1" />
                搜索: {filters.searchText.substring(0, 10)}...
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}