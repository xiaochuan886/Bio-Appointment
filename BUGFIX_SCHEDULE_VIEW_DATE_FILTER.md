# 智能排班页面视图显示问题修复

## 问题描述（更新）

智能排班页面（`/head-nurse/schedule`）存在两个关键问题：

### 第一次修复（2025-12-04 首次）
1. **日视图问题**：不同日期的排班被错误地展示到了当天，导致所有历史和未来的排班都堆积在一起
2. **周视图问题**：明明有排班数据，却显示为空
3. **月视图问题**：明明有排班数据，却显示为空

**原因**：`getSchedulesForResource` 函数缺少日期过滤逻辑

### 第二次修复（2025-12-04 补充）
1. **所有视图都看不到数据**：日视图、周视图、月视图全部显示为空

**原因**：第一次修复后，所有视图都使用了 `visibleRooms` 和 `visibleNurses`，但应该使用 `filteredRooms` 和 `filteredNurses`（应用了资源类型筛选后的结果）

## 根本原因

在 `GanttChart.tsx` 组件中，`getSchedulesForResource` 函数缺少日期过滤逻辑：

### 问题代码

```typescript
const getSchedulesForResource = (resourceId: string, resourceType: 'room' | 'nurse') => {
  return visibleSchedules.filter(schedule => {
    // 只有资源过滤，没有日期过滤 ❌
    if (resourceType === 'room') {
      return schedule.room_id === resourceId;
    }
    return schedule.nurse_id === resourceId;
  });
};
```

### 为什么周视图和月视图能正常工作？

- **周视图**和**月视图**在渲染时，每个单元格都显式地按日期过滤了排班数据：
  ```typescript
  const daySchedules = visibleSchedules.filter(
    s => s.scheduled_date === dateStr && s.room_id === room.id
  );
  ```

- **日视图**却调用了 `getSchedulesForResource`，这个函数没有日期过滤，导致返回了所有日期的排班

## 修复方案

### 第一次修复：添加日期过滤

#### 1. 更新 `getSchedulesForResource` 函数

为函数添加可选的日期过滤参数：

```typescript
const getSchedulesForResource = (
  resourceId: string, 
  resourceType: 'room' | 'nurse', 
  dateFilter?: string  // 新增日期过滤参数
) => {
  const filtered = visibleSchedules.filter(schedule => {
    // 日期过滤（日视图需要）
    if (dateFilter && schedule.scheduled_date !== dateFilter) {
      return false;
    }
    
    // 资源过滤
    if (resourceType === 'room') {
      return schedule.room_id === resourceId;
    }
    return schedule.nurse_id === resourceId;
  });

  // 调试日志
  if (dateFilter) {
    console.log(`📅 [日视图过滤] 资源类型=${resourceType}, 资源ID=${resourceId}, 日期=${dateFilter}, 过滤后数量=${filtered.length}`);
  }

  return filtered;
};
```

#### 2. 修改日视图调用

在日视图渲染时传入日期过滤参数：

```typescript
// 房间排班
{visibleRooms.map(room => {
  const roomSchedules = getSchedulesForResource(room.id, 'room', selectedDate); // 传入日期
  // ...
})}

// 护士排班
{visibleNurses.map(nurse => {
  const nurseSchedules = getSchedulesForResource(nurse.id, 'nurse', selectedDate); // 传入日期
  // ...
})}
```

#### 3. 修复类型安全问题

由于 `Schedule` 类型中的 `nurse_id` 和 `room_id` 可能为 `undefined`，需要在使用时添加空值检查：

```typescript
// 筛选逻辑
const nurseMatch = selectedNurseIds.length === 0 || (schedule.nurse_id && selectedNurseIds.includes(schedule.nurse_id));
const roomMatch = selectedRoomIds.length === 0 || (schedule.room_id && selectedRoomIds.includes(schedule.room_id));

// 颜色获取
const nurseColor = getNurseColor(schedule.nurse_id || '', nurses);
const roomColor = getRoomColor(schedule.room_id || '', rooms);
```

### 第二次修复：修正资源筛选逻辑

#### 问题分析

在第一次修复后，所有视图都看不到数据了。原因在于：

```typescript
// 第 96-97 行：应用资源类型筛选
const filteredRooms = shouldShowResource('room') ? visibleRooms : [];
const filteredNurses = shouldShowResource('nurse') ? visibleNurses : [];

// 但所有视图都在使用 visibleRooms 和 visibleNurses！
// 日视图：{visibleRooms.length > 0 && ...}
// 周视图：{visibleRooms.length > 0 && ...}
// 月视图：不需要按资源类型筛选
```

当没有选择任何 `resourceFilters` 时，`shouldShowResource` 函数返回 `true`，所以 `filteredRooms` 和 `filteredNurses` 应该是正常的。但如果有筛选条件，就会出现问题。

#### 修复方案

将所有视图中的 `visibleRooms` 和 `visibleNurses` 替换为 `filteredRooms` 和 `filteredNurses`：

```typescript
// 周视图
{filteredRooms.length > 0 && (
  // ...
  {filteredRooms.map(room => {
    // ...
  })}
)}

{filteredNurses.length > 0 && (
  // ...
  {filteredNurses.map(nurse => {
    // ...
  })}
)}

// 日视图（同样修改）
{filteredRooms.length > 0 && ...}
{filteredNurses.length > 0 && ...}

// 月视图：不需要修改，因为它显示所有排班汇总
```

#### 添加调试日志

为了更好地排查问题，添加了详细的调试日志：

```typescript
// 组件输入日志
console.log('🔵 [GanttChart] 组件输入:', {
  schedulesCount: schedules.length,
  nursesCount: nurses.length,
  roomsCount: rooms.length,
  selectedDate,
  viewMode,
  resourceFilters,
  selectedNurseIds,
  selectedRoomIds
});

// 周视图日志
console.log('📊 [周视图] filteredRooms数量:', filteredRooms.length);
console.log('📊 [周视图] filteredNurses数量:', filteredNurses.length);
console.log('📊 [周视图] visibleSchedules数量:', visibleSchedules.length);

// 月视图日志
console.log('📊 [月视图] visibleSchedules数量:', visibleSchedules.length);
```

## 修改文件（汇总）

- **文件**: `src/components/appointment/GanttChart.tsx`
- **第一次修改**:
  1. `getSchedulesForResource` 函数添加日期过滤参数（第262-282行）
  2. 日视图房间排班调用添加日期参数（第776行）
  3. 日视图护士排班调用添加日期参数（第850行）
  4. 修复类型安全问题（第70-71行、第161-162行、第199-200行）
- **第二次修改**:
  1. 周视图使用 `filteredRooms` 和 `filteredNurses`（第358、370、468、480、575行）
  2. 日视图使用 `filteredRooms` 和 `filteredNurses`（第761、775、832、849、905行）
  3. 添加调试日志（第38、348、610行）

## 验证方法

### 1. 日视图验证
```bash
# 1. 启动应用
# 2. 访问 http://localhost:5176/head-nurse/schedule
# 3. 确保当前为"日视图"模式
# 4. 观察资源看板中的排班：
#    - 只应显示当前选中日期的排班
#    - 不同日期的排班不应混在一起
# 5. 切换到不同日期，验证排班数据是否正确更新
```

### 2. 周视图验证
```bash
# 1. 切换到"周视图"模式
# 2. 观察每天的排班数量和客户名称
# 3. 点击有排班的单元格，应弹出详情对话框
# 4. 验证对话框中显示的排班是否属于正确的日期
```

### 3. 月视图验证
```bash
# 1. 切换到"月视图"模式
# 2. 观察每天的排班数量和客户名称
# 3. 点击有排班的日期单元格，应弹出详情对话框
# 4. 验证对话框中显示的排班是否属于正确的日期
```

### 4. 查看调试日志
打开浏览器控制台，在日视图模式下应该能看到类似的日志：

```
📅 [日视图过滤] 资源类型=room, 资源ID=xxx, 日期=2025-12-04, 过滤后数量=2
📅 [日视图过滤] 资源类型=nurse, 资源ID=yyy, 日期=2025-12-04, 过滤后数量=1
```

## 预期效果

修复后，智能排班页面应该：

✅ **日视图**：只显示当前选中日期的排班，不同日期的排班不会混在一起
✅ **周视图**：正确显示每天的排班数量和客户名称，可点击查看详情
✅ **月视图**：正确显示每天的排班数量和客户名称，可点击查看详情
✅ **日期切换**：切换日期时，所有视图都能正确更新显示对应日期的数据

## 相关文件

- `src/components/appointment/GanttChart.tsx` - 甘特图组件（主要修改）
- `src/pages/head-nurse/SchedulePage.tsx` - 排班页面（使用甘特图）
- `src/types/types.ts` - 类型定义

## 修复时间

- 修复日期：2025-12-04
- 修复人：AI Assistant
