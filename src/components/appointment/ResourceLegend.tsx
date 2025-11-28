/**
 * 资源图例组件
 * 展示护士和房间的颜色编码系统
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { User, Home, Info } from 'lucide-react';
import { getNurseColor, getRoomColor } from '@/utils/colorSystem';
import type { Nurse, Room } from '@/types/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ResourceLegendProps {
  nurses: Nurse[];
  rooms: Room[];
  compact?: boolean;
}

export default function ResourceLegend({ nurses, rooms, compact = false }: ResourceLegendProps) {
  if (compact) {
    return (
      <div className="flex gap-4 items-start">
        {/* 护士图例 - 紧凑模式 */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">护士</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {nurses.map((nurse) => {
              const color = getNurseColor(nurse.id, nurses);
              return (
                <TooltipProvider key={nurse.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="w-8 h-8 rounded-md border-2 border-white shadow-sm cursor-help transition-transform hover:scale-110"
                        style={{ backgroundColor: color.bg }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-medium">{nurse.name}</p>
                        <p className="text-xs text-muted-foreground">
                          级别: {nurse.skill_level || '未设置'}
                        </p>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: color.bg }}
                          />
                          <span className="text-xs">{color.name}</span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>

        {/* 房间图例 - 紧凑模式 */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Home className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">房间</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {rooms.map((room) => {
              const color = getRoomColor(room.id, rooms);
              return (
                <TooltipProvider key={room.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="w-8 h-8 rounded-md border-2 shadow-sm cursor-help transition-transform hover:scale-110"
                        style={{
                          backgroundColor: color.bg,
                          borderColor: color.border,
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-medium">{room.name}</p>
                        <p className="text-xs text-muted-foreground">
                          类型: {room.room_type}
                        </p>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded border"
                            style={{
                              backgroundColor: color.bg,
                              borderColor: color.border,
                            }}
                          />
                          <span className="text-xs">{color.name}</span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 完整模式
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            资源颜色图例
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            色盲友好设计
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 护士图例 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">护士团队</h3>
              <span className="text-xs text-muted-foreground">
                ({nurses.length}人)
              </span>
            </div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2 pr-4">
                {nurses.map((nurse) => {
                  const color = getNurseColor(nurse.id, nurses);
                  return (
                    <div
                      key={nurse.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className="w-12 h-12 rounded-lg border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: color.bg }}
                      >
                        {nurse.name.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {nurse.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {nurse.skill_level || '未设置'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {color.name}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div
                          className="w-6 h-6 rounded border border-white/20"
                          style={{ backgroundColor: color.bg }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* 房间图例 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Home className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">房间资源</h3>
              <span className="text-xs text-muted-foreground">
                ({rooms.length}间)
              </span>
            </div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2 pr-4">
                {rooms.map((room) => {
                  const color = getRoomColor(room.id, rooms);
                  return (
                    <div
                      key={room.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className="w-12 h-12 rounded-lg shadow-md flex items-center justify-center text-white font-bold text-sm border-2"
                        style={{
                          backgroundColor: color.bg,
                          borderColor: color.border,
                        }}
                      >
                        {room.name.slice(-2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {room.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {room.room_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {color.name}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div
                          className="w-6 h-6 rounded border-2"
                          style={{
                            backgroundColor: color.bg,
                            borderColor: color.border,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* 说明文字 */}
          <div className="pt-4 border-t">
            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="flex items-start gap-2">
                <span className="text-primary">💡</span>
                <span>
                  排班卡片使用护士和房间的组合颜色，左侧为护士颜色，右侧为房间颜色
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary">♿</span>
                <span>
                  为色盲用户提供辅助识别：每个资源都有独特的图案纹理
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary">🎨</span>
                <span>
                  悬停在排班卡片上可查看详细的护士和房间信息
                </span>
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
