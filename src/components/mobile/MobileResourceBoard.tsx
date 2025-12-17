import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin } from 'lucide-react';
import { format } from 'date-fns';
import TimelineView from './TimelineView';
import clientApi from '@/services/api-client';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Schedule as ApiSchedule, Profile as ApiProfileType, Resource as ApiResource } from '@/services/api-client';
import { useMobileData, useNetworkStatus } from '@/hooks/use-mobile-data';
import '@/styles/mobile.css';



interface MobileResourceBoardProps {
  className?: string;
  date?: Date;
  onDateChange?: (date: Date) => void;
}

export default function MobileResourceBoard({ className, date, onDateChange }: MobileResourceBoardProps) {
  const { isMobile, isTablet } = useIsMobile();
  const { isOnline } = useNetworkStatus();
  // 使用父组件传入的日期，如果没有传入则默认为今天
  const selectedDate = date || new Date();
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
    isLoading: isDataLoading
  } = useMobileData(schedules, 10);
  useEffect(() => {
    loadData();
  }, [selectedDate, selectedStoreId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const startDate = format(selectedDate, 'yyyy-MM-dd');

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

  // 如果不是移动端，返回null或者桌面端视图
  if (!isMobile && !isTablet) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 标题和筛选区域 */}
      <div className="flex items-center justify-between px-1">
        <h3 className="font-semibold text-lg">资源看板</h3>
        <div className="flex items-center gap-2">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
            <SelectTrigger className="h-8 text-xs w-[120px]">
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
      </div>



      {/* 时间轴视图 */}
      <TimelineView
        schedules={paginatedSchedules as any}
        selectedDate={selectedDate}
        onDateChange={onDateChange || (() => { })}
        isLoading={isLoading || isDataLoading}
        nurses={nurses}
        rooms={rooms}
        selectedStoreId={selectedStoreId}
      />

      {/* 底部信息 (仅保留网络状态) */}
      <div className="text-xs text-center text-muted-foreground py-2">
        {!isOnline && (
          <div className="flex items-center justify-center gap-1 text-red-500 mb-1">
            <span>⚠️</span>
            <span>当前离线，数据可能不是最新的</span>
          </div>
        )}
      </div>
    </div>
  );
}