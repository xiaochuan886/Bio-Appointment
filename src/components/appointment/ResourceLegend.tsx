/**
 * 资源图例组件
 * 展示护士和房间的颜色编码系统
 * 支持折叠/展开，默认只显示有预约的资源
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { getNurseColor, getRoomColor } from '@/utils/colorSystem';
import type { Nurse, Room, ScheduleWithDetails } from '@/types/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ResourceLegendProps {
  nurses: Nurse[];
  rooms: Room[];
  schedules?: ScheduleWithDetails[]; // 用于判断哪些资源有预约
  compact?: boolean;
}

export default function ResourceLegend({ nurses, rooms, schedules = [], compact = false }: ResourceLegendProps) {
  const [showAllNurses, setShowAllNurses] = useState(false);
  const [showAllRooms, setShowAllRooms] = useState(false);

  // 获取有预约的护士ID
  const nursesWithSchedules = new Set(schedules.map(s => s.nurse_id));
  const activeNurses = nurses.filter(n => nursesWithSchedules.has(n.id));
  const displayNurses = showAllNurses ? nurses : activeNurses;

  // 获取有预约的房间ID
  const roomsWithSchedules = new Set(schedules.map(s => s.room_id));
  const activeRooms = rooms.filter(r => roomsWithSchedules.has(r.id));
  const displayRooms = showAllRooms ? rooms : activeRooms;

  // Excel风格的紧凑图例
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary"></span>
          颜色图例
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 护士图例 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">护士</span>
              <Badge variant="outline" className="text-xs h-5">
                {displayNurses.length}/{nurses.length}
              </Badge>
            </div>
            {activeNurses.length < nurses.length && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllNurses(!showAllNurses)}
                className="h-6 px-2 text-xs"
              >
                {showAllNurses ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    收起
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    全部
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {displayNurses.map((nurse) => {
              const color = getNurseColor(nurse.id, nurses);
              const hasSchedule = nursesWithSchedules.has(nurse.id);
              return (
                <TooltipProvider key={nurse.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`w-6 h-6 rounded border-2 border-white shadow-sm cursor-help transition-all hover:scale-110 ${
                          !hasSchedule ? 'opacity-50' : ''
                        }`}
                        style={{ backgroundColor: color.bg }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <div className="space-y-0.5">
                        <p className="font-medium">{nurse.name}</p>
                        <p className="text-muted-foreground">
                          {nurse.skill_level === 'senior' ? '高级' : nurse.skill_level === 'intermediate' ? '中级' : '初级'}
                        </p>
                        <p className="text-muted-foreground">{color.name}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>

        {/* 房间图例 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Home className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">房间</span>
              <Badge variant="outline" className="text-xs h-5">
                {displayRooms.length}/{rooms.length}
              </Badge>
            </div>
            {activeRooms.length < rooms.length && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllRooms(!showAllRooms)}
                className="h-6 px-2 text-xs"
              >
                {showAllRooms ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    收起
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    全部
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {displayRooms.map((room) => {
              const color = getRoomColor(room.id, rooms);
              const hasSchedule = roomsWithSchedules.has(room.id);
              return (
                <TooltipProvider key={room.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`w-6 h-6 rounded border-2 shadow-sm cursor-help transition-all hover:scale-110 ${
                          !hasSchedule ? 'opacity-50' : ''
                        }`}
                        style={{
                          backgroundColor: color.bg,
                          borderColor: color.border,
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <div className="space-y-0.5">
                        <p className="font-medium">{room.name}</p>
                        <p className="text-muted-foreground">
                          {room.room_type === 'vip' ? 'VIP室' : room.room_type === 'treatment' ? '治疗区' : '咨询室'}
                        </p>
                        <p className="text-muted-foreground">{color.name}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>

        {/* 说明文字 */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            💡 排班卡片使用护士和房间的组合颜色
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
