import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Home, 
  Users, 
  Stethoscope, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Grid3X3,
  List
} from 'lucide-react';
import type { ScheduleWithDetails, Resource } from '@/types/types';
import MobileScheduleCard from './MobileScheduleCard';

interface ResourceViewProps {
  schedules: ScheduleWithDetails[];
  nurses: Resource[];
  rooms: Resource[];
  doctors: any[];
  selectedDate: string;
  isLoading?: boolean;
}

type ViewMode = 'grid' | 'list';
type ResourceType = 'all' | 'room' | 'nurse' | 'doctor';

interface ResourceWithSchedules {
  resource: Resource | any;
  type: ResourceType;
  schedules: ScheduleWithDetails[];
  utilizationRate: number;
  occupiedCount: number;
}

export default function ResourceView({ 
  schedules, 
  nurses, 
  rooms, 
  doctors,
  selectedDate,
  isLoading = false 
}: ResourceViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [resourceType, setResourceType] = useState<ResourceType>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 6;

  // 计算资源统计数据
  const calculateResourceStats = (): ResourceWithSchedules[] => {
    const todaySchedules = schedules.filter(s => 
      s.scheduled_date === selectedDate
    );

    const resources: ResourceWithSchedules[] = [];

    // 房间资源统计
    if (resourceType === 'all' || resourceType === 'room') {
      rooms.forEach(room => {
        const roomSchedules = todaySchedules.filter(s => s.room_id === room.id);
        const occupiedHours = roomSchedules.reduce((total, schedule) => {
          const start = parseInt(schedule.scheduled_time_start.split(':')[0]);
          const end = parseInt(schedule.scheduled_time_end.split(':')[0]);
          return total + (end - start);
        }, 0);
        
        resources.push({
          resource: room,
          type: 'room',
          schedules: roomSchedules,
          utilizationRate: (occupiedHours / 10) * 100, // 假设工作时间为10小时
          occupiedCount: roomSchedules.length
        });
      });
    }

    // 护士资源统计
    if (resourceType === 'all' || resourceType === 'nurse') {
      nurses.forEach(nurse => {
        const nurseSchedules = todaySchedules.filter(s => s.nurse_id === nurse.id);
        const occupiedHours = nurseSchedules.reduce((total, schedule) => {
          const start = parseInt(schedule.scheduled_time_start.split(':')[0]);
          const end = parseInt(schedule.scheduled_time_end.split(':')[0]);
          return total + (end - start);
        }, 0);
        
        resources.push({
          resource: nurse,
          type: 'nurse',
          schedules: nurseSchedules,
          utilizationRate: (occupiedHours / 10) * 100,
          occupiedCount: nurseSchedules.length
        });
      });
    }

    // 医生资源统计
    if (resourceType === 'all' || resourceType === 'doctor') {
      doctors.forEach(doctor => {
        const doctorSchedules = todaySchedules.filter(s =>
          s.doctor_id === doctor.id || s.appointment_doctor_id === doctor.id
        );
        const occupiedHours = doctorSchedules.reduce((total, schedule) => {
          const start = parseInt(schedule.scheduled_time_start.split(':')[0]);
          const end = parseInt(schedule.scheduled_time_end.split(':')[0]);
          return total + (end - start);
        }, 0);
        
        resources.push({
          resource: doctor,
          type: 'doctor',
          schedules: doctorSchedules,
          utilizationRate: (occupiedHours / 10) * 100,
          occupiedCount: doctorSchedules.length
        });
      });
    }

    return resources;
  };

  const resources = calculateResourceStats();
  const totalPages = Math.ceil(resources.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const visibleResources = resources.slice(startIndex, endIndex);

  const getResourceIcon = (type: ResourceType) => {
    switch (type) {
      case 'room':
        return <Home className="h-5 w-5" />;
      case 'nurse':
        return <Users className="h-5 w-5" />;
      case 'doctor':
        return <Stethoscope className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getResourceTypeName = (type: ResourceType) => {
    switch (type) {
      case 'room':
        return '房间';
      case 'nurse':
        return '护士';
      case 'doctor':
        return '医生';
      default:
        return '';
    }
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  // 重置页码当筛选条件改变时
  React.useEffect(() => {
    setCurrentPage(0);
  }, [resourceType]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">加载中...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5" />
              资源视图
            </CardTitle>
            <CardDescription>
              {selectedDate} 的资源占用情况
            </CardDescription>
          </div>
          
          {/* 视图模式切换 */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* 资源类型筛选 */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={resourceType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setResourceType('all')}
          >
            <Filter className="h-4 w-4 mr-1" />
            全部
          </Button>
          <Button
            variant={resourceType === 'room' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setResourceType('room')}
          >
            <Home className="h-4 w-4 mr-1" />
            房间 ({rooms.length})
          </Button>
          <Button
            variant={resourceType === 'nurse' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setResourceType('nurse')}
          >
            <Users className="h-4 w-4 mr-1" />
            护士 ({nurses.length})
          </Button>
          <Button
            variant={resourceType === 'doctor' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setResourceType('doctor')}
          >
            <Stethoscope className="h-4 w-4 mr-1" />
            医生 ({doctors.length})
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {visibleResources.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">
              {resourceType === 'all' ? '暂无资源数据' : `暂无${getResourceTypeName(resourceType)}数据`}
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              /* 网格视图 */
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {visibleResources.map((item, index) => (
                  <Card key={`${item.type}-${item.resource.id}-${index}`} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getResourceIcon(item.type)}
                          <CardTitle className="text-base">
                            {item.resource.name || item.resource.full_name}
                          </CardTitle>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {getResourceTypeName(item.type)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* 统计信息 */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="font-semibold">{item.occupiedCount}</div>
                          <div className="text-xs text-muted-foreground">排班数</div>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <div className={`font-semibold ${getUtilizationColor(item.utilizationRate)}`}>
                            {Math.round(item.utilizationRate)}%
                          </div>
                          <div className="text-xs text-muted-foreground">利用率</div>
                        </div>
                      </div>
                      
                      {/* 排班列表 */}
                      {item.schedules.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">今日排班</div>
                          <ScrollArea className="h-32 w-full">
                            <div className="space-y-1">
                              {item.schedules.map(schedule => (
                                <MobileScheduleCard
                                  key={schedule.id}
                                  schedule={schedule}
                                  compact={true}
                                />
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                      
                      {item.schedules.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-4 border-2 border-dashed rounded-lg">
                          今日空闲
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* 列表视图 */
              <div className="space-y-4">
                {visibleResources.map((item, index) => (
                  <Card key={`${item.type}-${item.resource.id}-${index}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getResourceIcon(item.type)}
                          <div>
                            <h3 className="font-semibold">
                              {item.resource.name || item.resource.full_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {getResourceTypeName(item.type)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-semibold">{item.occupiedCount}</div>
                            <div className="text-xs text-muted-foreground">排班</div>
                          </div>
                          <div className="text-right">
                            <div className={`font-semibold ${getUtilizationColor(item.utilizationRate)}`}>
                              {Math.round(item.utilizationRate)}%
                            </div>
                            <div className="text-xs text-muted-foreground">利用率</div>
                          </div>
                        </div>
                      </div>
                      
                      {item.schedules.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">今日排班</div>
                          <div className="space-y-1">
                            {item.schedules.map(schedule => (
                              <MobileScheduleCard
                                key={schedule.id}
                                schedule={schedule}
                                compact={true}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {item.schedules.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-4 border-2 border-dashed rounded-lg">
                          今日空闲
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* 分页控制 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  显示 {startIndex + 1}-{Math.min(endIndex, resources.length)} / {resources.length} 个资源
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
          </>
        )}
      </CardContent>
    </Card>
  );
}