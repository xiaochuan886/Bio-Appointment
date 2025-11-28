import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import type { Nurse, Room } from "@/types/types";

interface ResourceDetailFilterProps {
  nurses: Nurse[];
  rooms: Room[];
  selectedNurseIds: string[];
  selectedRoomIds: string[];
  onNurseChange: (nurseIds: string[]) => void;
  onRoomChange: (roomIds: string[]) => void;
  onClearFilters: () => void;
}

export default function ResourceDetailFilter({
  nurses,
  rooms,
  selectedNurseIds,
  selectedRoomIds,
  onNurseChange,
  onRoomChange,
  onClearFilters,
}: ResourceDetailFilterProps) {
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

  // 获取房间类型标签
  const getRoomTypeLabel = (roomType: string) => {
    const labels: Record<string, string> = {
      vip: 'VIP室',
      treatment: '治疗区',
      consultation: '咨询室',
    };
    return labels[roomType] || roomType;
  };

  // 获取选中的护士名称
  const getSelectedNurseNames = () => {
    return nurses
      .filter(n => selectedNurseIds.includes(n.id))
      .map(n => n.name);
  };

  // 获取选中的房间名称
  const getSelectedRoomNames = () => {
    return rooms
      .filter(r => selectedRoomIds.includes(r.id))
      .map(r => r.name);
  };

  const getFilterDescription = () => {
    if (!hasActiveFilters) {
      return "未选择筛选条件，显示所有排班";
    }

    const parts: string[] = [];
    if (selectedNurseIds.length > 0) {
      const names = getSelectedNurseNames();
      parts.push(`人员: ${names.join('、')} (${names.length}人)`);
    }
    if (selectedRoomIds.length > 0) {
      const names = getSelectedRoomNames();
      parts.push(`房间: ${names.join('、')} (${names.length}间)`);
    }

    return `筛选条件：${parts.join(' 且 ')}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-sm">
              资源筛选{hasActiveFilters && '（已筛选）'}
            </CardTitle>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-8 px-2"
            >
              <X className="h-4 w-4 mr-1" />
              清除
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 人员筛选 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">人员筛选（多选）</label>
            {selectedNurseIds.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                已选 {selectedNurseIds.length} 人
              </Badge>
            )}
          </div>
          <ScrollArea className="h-[200px] rounded-md border p-3">
            <div className="space-y-3">
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

        {/* 房间筛选 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">房间筛选（多选）</label>
            {selectedRoomIds.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                已选 {selectedRoomIds.length} 间
              </Badge>
            )}
          </div>
          <ScrollArea className="h-[200px] rounded-md border p-3">
            <div className="space-y-3">
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
                      ({getRoomTypeLabel(room.room_type)})
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* 筛选说明 */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {getFilterDescription()}
          </p>
          {hasActiveFilters && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mt-1">
                提示：同类条件为"或"关系，不同类条件为"与"关系
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                💡 视图将展示筛选资源及其关联资源的完整排班，匹配项带⭐标记
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
