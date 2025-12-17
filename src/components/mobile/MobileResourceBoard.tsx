import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  MapPin,
  Users,
  Home,
  Stethoscope,
  Filter,
  BarChart3,
  Clock
} from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import MobileLayout from './MobileLayout';
import TimelineView from './TimelineView';
import ResourceView from './ResourceView';
import clientApi from '@/services/api-client';
import type { ScheduleWithDetails, Resource, Profile as ApiProfile } from '@/types/types';
import { useIsMobile } from '@/hooks/use-mobile';
import DateRangePicker from '@/components/appointment/DateRangePicker';
import type { Schedule as ApiSchedule, Profile as ApiProfileType, Resource as ApiResource } from '@/services/api-client';
import { useMobileData, useNetworkStatus } from '@/hooks/use-mobile-data';
import '@/styles/mobile.css';

type ViewMode = 'timeline' | 'resource';
type ResourceFilterType = 'room' | 'nurse' | 'doctor';

interface MobileResourceBoardProps {
  className?: string;
  date?: Date;
  onDateChange?: (date: Date) => void;
}

export default function MobileResourceBoard({ className, date, onDateChange }: MobileResourceBoardProps) {
  const { isMobile, isTablet } = useIsMobile();
  const { isOnline, connectionType } = useNetworkStatus();
  const [internalDate, setInternalDate] = useState<Date>(new Date());

  const selectedDate = date || internalDate;
  const setSelectedDate = (newDate: Date) => {
    if (onDateChange) {
      onDateChange(newDate);
    } else {
      setInternalDate(newDate);
    }
  };
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [schedules, setSchedules] = useState<ApiSchedule[]>([]);
  const [nurses, setNurses] = useState<ApiResource[]>([]);
  const [rooms, setRooms] = useState<ApiResource[]>([]);
  const [doctors, setDoctors] = useState<ApiProfileType[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 使用移动端数据分页
  const {
    data: paginatedSchedules,
    loadMore,
    hasMore,
    isLoading: isDataLoading
  } = useMobileData(schedules, 10);
  const [resourceFilters, setResourceFilters] = useState<ResourceFilterType[]>(['room', 'nurse']);

  useEffect(() => {
    loadData();
  }, [selectedDate, selectedStoreId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const startDate = format(selectedDate, 'yyyy-MM-dd');
      const endDate = startDate;

      // 获取所有门店数据
      const storesData = await clientApi.getStores();
      setStores(storesData);

      // 获取排班数据（根据门店筛选）
      const storeFilter = selectedStoreId === 'all' ? undefined : selectedStoreId;
      const schedulesData = await clientApi.getSchedules({
        date: startDate,
        store_id: storeFilter
      });

      // 获取所有资源数据
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
      console.error('加载移动端资源看板数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取统计数据
  const getStats = () => {
    const today = format(selectedDate, 'yyyy-MM-dd');
    const todaySchedules = schedules.filter(s => s.scheduled_date === today);

    const roomCount = rooms.length;
    const nurseCount = nurses.length;
    const doctorCount = doctors.length;

    const occupiedRooms = rooms.filter(room =>
      todaySchedules.some(s => s.room_id === room.id)
    ).length;

    const occupiedNurses = nurses.filter(nurse =>
      todaySchedules.some(s => s.nurse_id === nurse.id)
    ).length;

    const occupiedDoctors = doctors.filter(doctor =>
      todaySchedules.some(s => (s as any).doctor_id === doctor.id || (s as any).appointment_doctor_id === doctor.id)
    ).length;

    return {
      totalSchedules: todaySchedules.length,
      roomCount,
      nurseCount,
      doctorCount,
      occupiedRooms,
      occupiedNurses,
      occupiedDoctors
    };
  };

  const stats = getStats();

  const handlePrevDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // 如果不是移动端，返回null或者桌面端视图
  if (!isMobile && !isTablet) {
    return null;
  }

  return (
    <MobileLayout
      title="资源看板"
      className={className}
    >
      <div className="p-4 space-y-6">
        {/* 日期选择器 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(selectedDate, 'yyyy年MM月dd日', { locale: zhCN })}
                  {isToday(selectedDate) && (
                    <Badge variant="default" className="ml-2">今天</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedStoreId === 'all' ? '所有门店' : stores.find(s => s.id === selectedStoreId)?.name}
                </CardDescription>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevDay}
                  disabled={isLoading}
                >
                  ←
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToday}
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
                  →
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                <SelectTrigger className="flex-1">
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
          </CardContent>
        </Card>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalSchedules}</div>
              <div className="text-xs text-muted-foreground">总排班</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.occupiedRooms}</div>
              <div className="text-xs text-muted-foreground">房间占用</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.occupiedNurses}</div>
              <div className="text-xs text-muted-foreground">护士排班</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.occupiedDoctors}</div>
              <div className="text-xs text-muted-foreground">医生排班</div>
            </CardContent>
          </Card>
        </div>

        {/* 视图切换 */}
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              时间轴
            </TabsTrigger>
            <TabsTrigger value="resource" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              资源视图
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4">
            <TimelineView
              schedules={paginatedSchedules as any}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              isLoading={isLoading || isDataLoading}
            />
          </TabsContent>

          <TabsContent value="resource" className="mt-4">
            <ResourceView
              schedules={paginatedSchedules as any}
              nurses={nurses as any}
              rooms={rooms as any}
              doctors={doctors}
              selectedDate={format(selectedDate, 'yyyy-MM-dd')}
              isLoading={isLoading || isDataLoading}
            />
          </TabsContent>
        </Tabs>

        {/* 使用说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">使用说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>时间轴视图按时间顺序展示排班情况</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>资源视图按资源类型展示占用情况</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>可按门店筛选查看特定门店的资源</span>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>支持多种视图模式和筛选条件</span>
              </div>
              {!isOnline && (
                <div className="flex items-center gap-2 text-red-600">
                  <span>⚠️</span>
                  <span>当前离线，数据可能不是最新的</span>
                </div>
              )}
              {connectionType !== 'unknown' && (
                <div className="flex items-center gap-2">
                  <span>📶</span>
                  <span>网络类型：{connectionType}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}