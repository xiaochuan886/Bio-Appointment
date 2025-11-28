/**
 * 紧凑筛选栏组件
 * 横向布局，放置在资源看板上方
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Filter, X, Users, Home } from 'lucide-react';
import type { Nurse, Room } from '@/types/types';
import type { ResourceFilterType } from '@/components/appointment/ResourceFilter';

interface CompactFilterBarProps {
  // 护士筛选
  nurses: Nurse[];
  selectedNurseIds: string[];
  onNurseChange: (nurseIds: string[]) => void;
  
  // 房间筛选
  rooms: Room[];
  selectedRoomIds: string[];
  onRoomChange: (roomIds: string[]) => void;
  
  // 资源类型筛选
  resourceFilters: ResourceFilterType[];
  onResourceFilterChange: (filters: ResourceFilterType[]) => void;
  
  // 清除筛选
  onClearFilters: () => void;
}

export default function CompactFilterBar({
  nurses,
  selectedNurseIds,
  onNurseChange,
  rooms,
  selectedRoomIds,
  onRoomChange,
  resourceFilters,
  onResourceFilterChange,
  onClearFilters,
}: CompactFilterBarProps) {
  const hasActiveFilters = selectedNurseIds.length > 0 || selectedRoomIds.length > 0;

  // 处理护士复选框变化
  const handleNurseToggle = (nurseId: string) => {
    if (selectedNurseIds.includes(nurseId)) {
      onNurseChange(selectedNurseIds.filter(id => id !== nurseId));
    } else {
      onNurseChange([...selectedNurseIds, nurseId]);
    }
  };

  // 处理房间复选框变化
  const handleRoomToggle = (roomId: string) => {
    if (selectedRoomIds.includes(roomId)) {
      onRoomChange(selectedRoomIds.filter(id => id !== roomId));
    } else {
      onRoomChange([...selectedRoomIds, roomId]);
    }
  };

  // 处理资源类型筛选
  const handleResourceTypeChange = (value: string) => {
    if (value === 'all') {
      onResourceFilterChange([]);
    } else if (value === 'room') {
      onResourceFilterChange(['room']);
    } else if (value === 'nurse') {
      onResourceFilterChange(['nurse']);
    }
  };

  const getResourceTypeValue = () => {
    if (resourceFilters.length === 0 || resourceFilters.length === 2) {
      return 'all';
    }
    return resourceFilters[0] || 'all';
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="py-3">
        <div className="flex items-center gap-4 flex-wrap">
          {/* 筛选标题 */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">资源筛选</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs">
                已启用
              </Badge>
            )}
          </div>

          {/* 护士筛选 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Users className="h-3.5 w-3.5 mr-2" />
                护士
                {selectedNurseIds.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs h-5">
                    {selectedNurseIds.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">选择护士</Label>
                  {selectedNurseIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNurseChange([])}
                      className="h-6 px-2 text-xs"
                    >
                      清除
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {nurses.map((nurse) => (
                      <div key={nurse.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`nurse-${nurse.id}`}
                          checked={selectedNurseIds.includes(nurse.id)}
                          onCheckedChange={() => handleNurseToggle(nurse.id)}
                        />
                        <Label
                          htmlFor={`nurse-${nurse.id}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {nurse.name}
                          <span className="text-xs text-muted-foreground ml-2">
                            ({nurse.skill_level === 'senior' ? '高级' : nurse.skill_level === 'intermediate' ? '中级' : '初级'})
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>

          {/* 房间筛选 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Home className="h-3.5 w-3.5 mr-2" />
                房间
                {selectedRoomIds.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs h-5">
                    {selectedRoomIds.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">选择房间</Label>
                  {selectedRoomIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRoomChange([])}
                      className="h-6 px-2 text-xs"
                    >
                      清除
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {rooms.map((room) => (
                      <div key={room.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`room-${room.id}`}
                          checked={selectedRoomIds.includes(room.id)}
                          onCheckedChange={() => handleRoomToggle(room.id)}
                        />
                        <Label
                          htmlFor={`room-${room.id}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {room.name}
                          <span className="text-xs text-muted-foreground ml-2">
                            ({room.room_type === 'vip' ? 'VIP室' : room.room_type === 'treatment' ? '治疗区' : '咨询室'})
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>

          {/* 资源类型筛选 */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">视图:</Label>
            <Select value={getResourceTypeValue()} onValueChange={handleResourceTypeChange}>
              <SelectTrigger className="h-8 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部资源</SelectItem>
                <SelectItem value="room">按房间</SelectItem>
                <SelectItem value="nurse">按护士</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 清除按钮 */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-8 ml-auto"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              清除筛选
            </Button>
          )}

          {/* 筛选说明 */}
          {hasActiveFilters && (
            <div className="w-full pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                🔍 严格筛选模式：仅显示选中的资源及其相关排班
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
