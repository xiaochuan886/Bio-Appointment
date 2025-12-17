import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Users,
  MapPin,
  User,
  Stethoscope,
  Home,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { ScheduleWithDetails } from '@/types/types';

interface MobileScheduleCardProps {
  schedule: ScheduleWithDetails;
  compact?: boolean;
  onViewDetails?: (schedule: ScheduleWithDetails) => void;
}

export default function MobileScheduleCard({ 
  schedule, 
  compact = false,
  onViewDetails 
}: MobileScheduleCardProps) {
  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '已排班';
      case 'in_progress':
        return '进行中';
      case 'completed':
        return '已完成';
      case 'cancelled':
        return '已取消';
      default:
        return '未知状态';
    }
  };

  // 格式化时间
  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5);
  };

  // 计算时长
  const calculateDuration = (startTime: string, endTime: string) => {
    const start = parseInt(startTime.split(':')[0]);
    const end = parseInt(endTime.split(':')[0]);
    const startMin = parseInt(startTime.split(':')[1]);
    const endMin = parseInt(endTime.split(':')[1]);
    
    const totalMinutes = (end * 60 + endMin) - (start * 60 + startMin);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return minutes > 0 ? `${hours}小时${minutes}分` : `${hours}小时`;
  };

  const handleCardClick = () => {
    if (onViewDetails) {
      onViewDetails(schedule);
    }
  };

  if (compact) {
    // 紧凑模式，用于时间轴视图
    return (
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={handleCardClick}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getStatusColor(schedule.status)}`}
                >
                  {getStatusText(schedule.status)}
                </Badge>
                <span className="text-sm font-medium truncate">
                  {schedule.appointment?.customer_name || '未知客户'}
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatTime(schedule.scheduled_time_start)} - {formatTime(schedule.scheduled_time_end)}
                  </span>
                </div>
                
                {schedule.room && (
                  <div className="flex items-center gap-1">
                    <Home className="h-3 w-3" />
                    <span>{schedule.room.name}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {schedule.nurse && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{schedule.nurse.name}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 完整模式
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* 头部信息 */}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">
                {schedule.appointment?.customer_name || '未知客户'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {schedule.appointment?.service?.name || '未知服务'}
              </p>
            </div>
            
            <Badge 
              variant="outline" 
              className={`${getStatusColor(schedule.status)}`}
            >
              {getStatusText(schedule.status)}
            </Badge>
          </div>
          
          {/* 时间信息 */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {formatTime(schedule.scheduled_time_start)} - {formatTime(schedule.scheduled_time_end)}
              </span>
              <Badge variant="secondary" className="text-xs">
                {calculateDuration(schedule.scheduled_time_start, schedule.scheduled_time_end)}
              </Badge>
            </div>
          </div>
          
          {/* 日期信息 */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(schedule.scheduled_date), 'yyyy年MM月dd日', { locale: zhCN })}
            </span>
          </div>
          
          {/* 资源信息 */}
          <div className="grid grid-cols-1 gap-2 text-sm">
            {schedule.room && (
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-muted-foreground" />
                <span>房间：{schedule.room.name}</span>
              </div>
            )}
            
            {schedule.nurse && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>护士：{schedule.nurse.name}</span>
              </div>
            )}
            
            {schedule.doctor_name && (
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                <span>医生：{schedule.doctor_name}</span>
              </div>
            )}
          </div>
          
          {/* 客户信息 */}
          {schedule.appointment && (
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">客户信息</span>
              </div>
              
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">主客户：</span>
                  <span className="font-medium">{schedule.appointment.customer_name}</span>
                </div>
                
                {schedule.appointment.companion_names && schedule.appointment.companion_names.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">同行：</span>
                    <span className="font-medium">
                      {schedule.appointment.companion_names.join(', ')}
                    </span>
                  </div>
                )}
                
                {schedule.appointment.store?.name && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">门店：</span>
                    <span className="font-medium">{schedule.appointment.store.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 操作按钮 */}
          <div className="pt-2">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
            >
              查看详情
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}