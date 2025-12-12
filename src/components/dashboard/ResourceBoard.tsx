import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, MapPin, Users, Home, Stethoscope, Filter } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import ReadOnlyGanttChart from '@/components/dashboard/ReadOnlyGanttChart';
import ViewSwitcher, { type ViewMode } from '@/components/appointment/ViewSwitcher';
import DateRangePicker from '@/components/appointment/DateRangePicker';
import ResourceFilter, { type ResourceFilterType } from '@/components/appointment/ResourceFilter';
import clientApi from '@/services/api-client';
import type { ScheduleWithDetails, Nurse, Room, Profile as TypeProfile } from '@/types/types';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile as ApiProfile } from '@/services/api-client';

// 扩展ResourceFilterType以包含doctor
type ExtendedResourceFilterType = ResourceFilterType | 'doctor';

interface ResourceBoardProps {
  className?: string;
}

export default function ResourceBoard({ className }: ResourceBoardProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [resourceFilters, setResourceFilters] = useState<ExtendedResourceFilterType[]>(['room', 'nurse']);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [nurses, setNurses] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<ApiProfile[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedDate, viewMode, selectedStoreId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 根据视图模式计算日期范围
      let startDate: string;
      let endDate: string;

      switch (viewMode) {
        case 'day':
          startDate = endDate = format(selectedDate, 'yyyy-MM-dd');
          break;
        case 'week': {
          const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
          startDate = format(weekStart, 'yyyy-MM-dd');
          endDate = format(weekEnd, 'yyyy-MM-dd');
          break;
        }
        case 'month': {
          const monthStart = startOfMonth(selectedDate);
          const monthEnd = endOfMonth(selectedDate);
          startDate = format(monthStart, 'yyyy-MM-dd');
          endDate = format(monthEnd, 'yyyy-MM-dd');
          break;
        }
        default:
          startDate = endDate = format(selectedDate, 'yyyy-MM-dd');
      }

      // 获取所有门店数据（用于筛选）
      const storesData = await clientApi.getStores();
      setStores(storesData);

      // 获取排班数据（根据门店筛选）
      const storeFilter = selectedStoreId === 'all' ? undefined : selectedStoreId;
      const schedulesData = await clientApi.getSchedules({
        date: viewMode === 'day' ? startDate : undefined,
        start_date: viewMode !== 'day' ? startDate : undefined,
        end_date: viewMode !== 'day' ? endDate : undefined,
        store_id: storeFilter
      });

      // 获取所有资源数据（不限制门店，因为要展示全部资源占用情况）
      const [nursesData, roomsData, profilesData] = await Promise.all([
        clientApi.getAvailableNurses(),
        clientApi.getAvailableRooms(),
        clientApi.getProfiles()
      ]);

      // 从profiles中筛选出医生
      const doctorsData = profilesData.filter(profile => profile.role === 'doctor');

      setSchedules(schedulesData);
      setNurses(nursesData);
      setRooms(roomsData);
      setDoctors(doctorsData);
    } catch (error) {
      console.error('加载资源看板数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取资源统计信息
  const getResourceStats = () => {
    const today = format(selectedDate, 'yyyy-MM-dd');
    const todaySchedules = schedules.filter(s => 
      format(new Date(s.scheduled_date), 'yyyy-MM-dd') === today
    );

    const roomStats = rooms.map(room => {
      const roomSchedules = todaySchedules.filter(s => s.room_id === room.id);
      const occupiedHours = roomSchedules.reduce((total, schedule) => {
        const start = parseInt(schedule.scheduled_time_start.split(':')[0]);
        const end = parseInt(schedule.scheduled_time_end.split(':')[0]);
        return total + (end - start);
      }, 0);
      
      return {
        ...room,
        occupiedCount: roomSchedules.length,
        occupiedHours,
        utilizationRate: rooms.length > 0 ? (occupiedHours / 10) * 100 : 0 // 假设工作时间为10小时
      };
    });

    const nurseStats = nurses.map(nurse => {
      const nurseSchedules = todaySchedules.filter(s => s.nurse_id === nurse.id);
      const occupiedHours = nurseSchedules.reduce((total, schedule) => {
        const start = parseInt(schedule.scheduled_time_start.split(':')[0]);
        const end = parseInt(schedule.scheduled_time_end.split(':')[0]);
        return total + (end - start);
      }, 0);
      
      return {
        ...nurse,
        occupiedCount: nurseSchedules.length,
        occupiedHours,
        utilizationRate: nurses.length > 0 ? (occupiedHours / 10) * 100 : 0
      };
    });

    const doctorStats = doctors.map(doctor => {
      const doctorSchedules = todaySchedules.filter(s =>
        s.appointment?.doctor_id === doctor.id
      );
      const occupiedHours = doctorSchedules.reduce((total, schedule) => {
        const start = parseInt(schedule.scheduled_time_start.split(':')[0]);
        const end = parseInt(schedule.scheduled_time_end.split(':')[0]);
        return total + (end - start);
      }, 0);
      
      return {
        ...doctor,
        occupiedCount: doctorSchedules.length,
        occupiedHours,
        utilizationRate: doctors.length > 0 ? (occupiedHours / 10) * 100 : 0
      };
    });

    return { roomStats, nurseStats, doctorStats };
  };

  const { roomStats, nurseStats, doctorStats } = getResourceStats();


  return (
    <div className={`space-y-6 ${className}`}>
      {/* 标题和筛选区域 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                资源看板
              </CardTitle>
              <CardDescription>
                全局资源占用情况概览（所有用户可见，仅查看模式）
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {/* 门店筛选 */}
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="选择门店" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有门店</SelectItem>
                    {stores.map(store => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* 资源类型筛选 - 自定义实现以支持医生 */}
              <Card className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">资源筛选</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="filter-room"
                        checked={resourceFilters.includes('room')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setResourceFilters([...resourceFilters, 'room']);
                          } else {
                            setResourceFilters(resourceFilters.filter(f => f !== 'room'));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="filter-room" className="text-sm font-normal cursor-pointer">
                        房间资源
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="filter-nurse"
                        checked={resourceFilters.includes('nurse')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setResourceFilters([...resourceFilters, 'nurse']);
                          } else {
                            setResourceFilters(resourceFilters.filter(f => f !== 'nurse'));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="filter-nurse" className="text-sm font-normal cursor-pointer">
                        护士资源
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="filter-doctor"
                        checked={resourceFilters.includes('doctor')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setResourceFilters([...resourceFilters, 'doctor']);
                          } else {
                            setResourceFilters(resourceFilters.filter(f => f !== 'doctor'));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="filter-doctor" className="text-sm font-normal cursor-pointer">
                        医生资源
                      </label>
                    </div>
                  </div>
                </div>
              </Card>
              
              {/* 视图切换 */}
              <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />
              
              {/* 日期选择 */}
              <DateRangePicker
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                viewMode={viewMode}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 资源统计卡片 */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* 房间资源统计 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="h-4 w-4" />
              房间资源
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">总房间数</span>
                <Badge variant="secondary">{rooms.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">已占用</span>
                <Badge variant="default">
                  {roomStats.filter(r => r.occupiedCount > 0).length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">平均利用率</span>
                <Badge variant="outline">
                  {rooms.length > 0 
                    ? Math.round(roomStats.reduce((sum, r) => sum + r.utilizationRate, 0) / rooms.length)
                    : 0}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 护士资源统计 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              护士资源
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">总护士数</span>
                <Badge variant="secondary">{nurses.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">已排班</span>
                <Badge variant="default">
                  {nurseStats.filter(n => n.occupiedCount > 0).length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">平均利用率</span>
                <Badge variant="outline">
                  {nurses.length > 0 
                    ? Math.round(nurseStats.reduce((sum, n) => sum + n.utilizationRate, 0) / nurses.length)
                    : 0}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 医生资源统计 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              医生资源
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">总医生数</span>
                <Badge variant="secondary">{doctors.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">已排班</span>
                <Badge variant="default">
                  {doctorStats.filter(d => d.occupiedCount > 0).length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">平均利用率</span>
                <Badge variant="outline">
                  {doctors.length > 0 
                    ? Math.round(doctorStats.reduce((sum, d) => sum + d.utilizationRate, 0) / doctors.length)
                    : 0}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 资源甘特图 */}
      <Card>
        <CardHeader>
          <CardTitle>资源占用甘特图</CardTitle>
          <CardDescription>
            {selectedStoreId === 'all' ? '所有门店' : stores.find(s => s.id === selectedStoreId)?.name} - 
            视图：{viewMode === 'day' ? '日' : viewMode === 'week' ? '周' : '月'}视图
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">加载中...</div>
            </div>
          ) : (
            <ReadOnlyGanttChart
              schedules={schedules}
              nurses={nurses}
              rooms={rooms}
              doctors={doctors}
              selectedDate={format(selectedDate, 'yyyy-MM-dd')}
              viewMode={viewMode}
              resourceFilters={resourceFilters}
            />
          )}
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>可通过门店筛选查看特定门店的资源占用情况</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>当前仅支持日视图模式</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>客户信息仅展示人数，保护隐私</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>所有用户均可查看，但仅能查看整体情况，无法操作详情</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}