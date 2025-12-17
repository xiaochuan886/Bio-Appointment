# 资源筛选功能文档

## 功能概述

资源筛选功能允许护士长在资源看板上按资源类型筛选显示内容，提高了大规模资源管理的效率和可视性。

## 功能特性

### 1. 筛选目标
- **护士（含护士长）**：筛选显示所有护士和护士长资源
- **房间资源**：筛选显示所有房间资源（VIP室、治疗区、咨询室等）

### 2. 筛选器设计

#### 界面控件
- 位置：资源看板右侧边栏顶部
- 样式：卡片式布局，清晰的复选框组
- 图标：使用Filter图标标识筛选功能

#### 多选支持
- 可以单独选择"护士（含护士长）"
- 可以单独选择"房间资源"
- 可以同时选择两者（显示所有资源）
- 可以都不选择（默认显示所有资源）

#### 实时筛选
- 选择筛选条件后，资源看板立即刷新
- 仅显示符合筛选条件的资源行
- 不影响数据加载，仅影响显示

#### 状态标识
- 激活筛选时显示"（已筛选）"标记
- 复选框选中状态清晰可见
- 底部显示当前筛选状态说明

### 3. 筛选逻辑

#### 日视图
- **仅护士**：隐藏"房间排班"区域，仅显示"护士排班"区域
- **仅房间**：隐藏"护士排班"区域，仅显示"房间排班"区域
- **两者都选/都不选**：显示完整的房间和护士排班区域
- **无结果**：显示友好的提示信息

#### 周视图
- **仅护士**：隐藏"周视图 - 房间排班"，仅显示"周视图 - 护士排班"
- **仅房间**：隐藏"周视图 - 护士排班"，仅显示"周视图 - 房间排班"
- **两者都选/都不选**：显示完整的房间和护士排班网格
- **无结果**：显示友好的提示信息

#### 月视图
- 月视图显示所有排班的汇总，不区分资源类型
- 当有筛选条件激活时，显示提示："注意：月视图显示所有排班汇总，不区分资源类型"
- 筛选条件不影响月视图的显示内容

### 4. 用户体验优化

#### 视觉反馈
- 筛选器卡片使用标准UI组件，与整体设计风格一致
- 选中状态使用主题色高亮
- 筛选说明文字动态更新

#### 无结果处理
- 当筛选条件导致无资源显示时，显示友好提示
- 提示用户"暂无符合筛选条件的资源"
- 建议用户"请调整筛选条件或清除筛选"

#### 月视图特殊处理
- 月视图不支持资源类型筛选（因为是汇总视图）
- 显示明确的提示信息，避免用户困惑

## 技术实现

### 组件结构

#### ResourceFilter 组件
```typescript
// 位置：src/components/appointment/ResourceFilter.tsx
export type ResourceFilterType = 'nurse' | 'room';

interface ResourceFilterProps {
  selectedFilters: ResourceFilterType[];
  onFilterChange: (filters: ResourceFilterType[]) => void;
}
```

#### GanttChart 组件更新
```typescript
// 新增 props
interface GanttChartProps {
  // ... 其他 props
  resourceFilters?: ResourceFilterType[];
}

// 筛选逻辑
const shouldShowResource = (resourceType: 'room' | 'nurse') => {
  if (resourceFilters.length === 0) return true;
  if (resourceFilters.length === 2) return true;
  return resourceFilters.includes(resourceType);
};

const filteredRooms = shouldShowResource('room') ? rooms : [];
const filteredNurses = shouldShowResource('nurse') ? nurses : [];
```

#### SchedulePage 集成
```typescript
// 状态管理
const [resourceFilters, setResourceFilters] = useState<ResourceFilterType[]>([]);

// 传递给子组件
<ResourceFilter
  selectedFilters={resourceFilters}
  onFilterChange={setResourceFilters}
/>

<GanttChart
  // ... 其他 props
  resourceFilters={resourceFilters}
/>
```

### 筛选算法

1. **初始化**：默认不选择任何筛选条件（显示所有资源）
2. **选择处理**：
   - 点击复选框时，切换该筛选条件的选中状态
   - 更新 `resourceFilters` 数组
3. **资源过滤**：
   - 根据 `resourceFilters` 数组判断是否显示某类资源
   - 空数组或包含两个类型：显示所有
   - 包含一个类型：仅显示该类型
4. **视图渲染**：
   - 使用 `filteredRooms` 和 `filteredNurses` 替代原始数据
   - 条件渲染区域标题和内容

## 使用场景

### 场景1：专注护士排班
护士长需要重点关注护士资源的分配情况：
1. 勾选"护士（含护士长）"
2. 取消勾选"房间资源"
3. 看板仅显示护士排班，视图更清晰

### 场景2：专注房间排班
护士长需要检查房间使用情况：
1. 勾选"房间资源"
2. 取消勾选"护士（含护士长）"
3. 看板仅显示房间排班，便于发现空闲时段

### 场景3：全局视图
护士长需要查看完整的资源分配：
1. 同时勾选两个选项，或都不勾选
2. 看板显示所有资源的完整排班情况

### 场景4：月度总览
护士长查看月度排班汇总：
1. 切换到月视图
2. 筛选条件不影响月视图显示
3. 看到所有排班的统计信息

## 注意事项

1. **月视图限制**：月视图是汇总视图，不支持按资源类型筛选
2. **数据完整性**：筛选仅影响显示，不影响数据加载和统计
3. **状态持久化**：筛选状态在切换视图模式时保持（日/周/月）
4. **性能优化**：筛选在前端进行，不需要额外的API请求

## 未来扩展

可能的功能扩展方向：
1. 支持按护士级别筛选（护士长、高级护士、普通护士）
2. 支持按房间类型筛选（VIP室、治疗区、咨询室）
3. 支持多条件组合筛选
4. 筛选条件的保存和快速切换
5. 筛选历史记录

## 更新日志

### v1.4.0 (2025-11-27)
- ✅ 新增 ResourceFilter 组件
- ✅ 更新 GanttChart 组件支持资源筛选
- ✅ 集成到 SchedulePage
- ✅ 支持日视图、周视图、月视图
- ✅ 添加无结果提示
- ✅ 添加月视图特殊说明
- ✅ 通过完整的 lint 检查
