import { Filter } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export type ResourceFilterType = 'nurse' | 'room';

interface ResourceFilterProps {
  selectedFilters: ResourceFilterType[];
  onFilterChange: (filters: ResourceFilterType[]) => void;
}

export default function ResourceFilter({ selectedFilters, onFilterChange }: ResourceFilterProps) {
  const handleFilterToggle = (filterType: ResourceFilterType) => {
    if (selectedFilters.includes(filterType)) {
      // 取消选择
      onFilterChange(selectedFilters.filter(f => f !== filterType));
    } else {
      // 添加选择
      onFilterChange([...selectedFilters, filterType]);
    }
  };

  const isNurseSelected = selectedFilters.includes('nurse');
  const isRoomSelected = selectedFilters.includes('room');
  const hasActiveFilters = selectedFilters.length > 0 && selectedFilters.length < 2;

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* 标题 */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">资源筛选</h3>
          {hasActiveFilters && (
            <span className="text-xs text-primary">
              （已筛选）
            </span>
          )}
        </div>

        {/* 筛选选项 */}
        <div className="space-y-3">
          {/* 护士（含护士长）选项 */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-nurse"
              checked={isNurseSelected}
              onCheckedChange={() => handleFilterToggle('nurse')}
            />
            <Label
              htmlFor="filter-nurse"
              className="text-sm font-normal cursor-pointer"
            >
              护士（含护士长）
            </Label>
          </div>

          {/* 房间资源选项 */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-room"
              checked={isRoomSelected}
              onCheckedChange={() => handleFilterToggle('room')}
            />
            <Label
              htmlFor="filter-room"
              className="text-sm font-normal cursor-pointer"
            >
              房间资源
            </Label>
          </div>
        </div>

        {/* 筛选说明 */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          {selectedFilters.length === 0 && (
            <p>未选择筛选条件，显示所有资源</p>
          )}
          {selectedFilters.length === 1 && isNurseSelected && (
            <p>仅显示护士和护士长资源</p>
          )}
          {selectedFilters.length === 1 && isRoomSelected && (
            <p>仅显示房间资源</p>
          )}
          {selectedFilters.length === 2 && (
            <p>显示所有资源</p>
          )}
        </div>
      </div>
    </Card>
  );
}
