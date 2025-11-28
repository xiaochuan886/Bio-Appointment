import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import type { Nurse, Room } from "@/types/types";

interface ResourceDetailFilterProps {
  nurses: Nurse[];
  rooms: Room[];
  selectedNurseId: string | null;
  selectedRoomId: string | null;
  onNurseChange: (nurseId: string | null) => void;
  onRoomChange: (roomId: string | null) => void;
  onClearFilters: () => void;
}

export default function ResourceDetailFilter({
  nurses,
  rooms,
  selectedNurseId,
  selectedRoomId,
  onNurseChange,
  onRoomChange,
  onClearFilters,
}: ResourceDetailFilterProps) {
  const hasActiveFilters = selectedNurseId || selectedRoomId;

  const getFilterDescription = () => {
    if (!hasActiveFilters) {
      return "未选择筛选条件，显示所有排班";
    }

    const parts: string[] = [];
    if (selectedNurseId) {
      const nurse = nurses.find(n => n.id === selectedNurseId);
      parts.push(`人员：${nurse?.name || '未知'}`);
    }
    if (selectedRoomId) {
      const room = rooms.find(r => r.id === selectedRoomId);
      parts.push(`房间：${room?.name || '未知'}`);
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
        <div className="space-y-2">
          <label className="text-sm font-medium">人员筛选</label>
          <Select
            value={selectedNurseId || "all"}
            onValueChange={(value) => onNurseChange(value === "all" ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择护士或护士长" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部人员</SelectItem>
              {nurses.map((nurse) => (
                <SelectItem key={nurse.id} value={nurse.id}>
                  {nurse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 房间筛选 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">房间筛选</label>
          <Select
            value={selectedRoomId || "all"}
            onValueChange={(value) => onRoomChange(value === "all" ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择房间" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部房间</SelectItem>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 筛选说明 */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {getFilterDescription()}
          </p>
          {hasActiveFilters && (
            <p className="text-xs text-muted-foreground mt-1">
              提示：两个条件为"与"关系，同时满足才显示
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
