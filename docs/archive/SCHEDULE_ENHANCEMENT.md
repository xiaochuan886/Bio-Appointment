# 智能排班功能增强说明

## 更新日期
2025-11-27

## 新增功能

### 1. 资源冲突二次确认

#### 功能描述
护士长在创建或编辑排班时,系统会自动检测资源冲突(房间冲突和护士冲突)。如果检测到冲突,会弹出确认对话框,显示详细的冲突信息,让护士长决定是否强制排班。

#### 实现细节
- **冲突检测逻辑**: 检查同一房间或同一护士在同一时间段是否已有其他排班
- **冲突信息展示**: 
  - 显示冲突的资源类型(房间/护士)
  - 显示冲突的资源名称
  - 列出所有冲突的排班详情(客户姓名、服务项目、时间段)
- **操作选项**:
  - **取消排班**: 返回编辑界面,重新选择资源或时间
  - **强制排班**: 忽略冲突,创建重叠排班(适用于急单或特殊情况)

#### 相关文件
- `/src/utils/scheduleUtils.ts` - 冲突检测工具函数
- `/src/components/appointment/ResourceConflictDialog.tsx` - 冲突确认对话框组件
- `/src/pages/head-nurse/SchedulePage.tsx` - 集成冲突检测逻辑

### 2. 甘特图重叠资源分行显示

#### 功能描述
当同一资源(房间或护士)在同一时间段有多个排班时,甘特图会自动将这些排班分配到不同的行显示,而不是重叠在一起。这样可以清晰地看到所有排班,避免视觉混乱。

#### 实现细节
- **智能分行算法**: 
  - 检测时间段重叠的排班
  - 将重叠的排班分配到不同的行
  - 动态调整资源行的高度以容纳所有排班
- **视觉提示**:
  - 在资源名称下方显示重叠排班数量(如: ⚠️ 2个重叠排班)
  - 使用琥珀色警告色突出显示
  - 每个排班卡片添加白色边框,增强区分度
- **自适应高度**: 
  - 每行高度固定为48px
  - 总高度根据重叠排班数量自动调整

#### 相关文件
- `/src/components/appointment/GanttChart.tsx` - 甘特图组件(包含分行逻辑)

### 3. 多视图支持(日/周/月)

#### 功能描述
资源看板新增视图切换功能,支持三种视图模式:
- **日视图**: 显示单日的详细排班情况(当前已实现)
- **周视图**: 显示一周的排班概览(UI已就绪,数据逻辑待实现)
- **月视图**: 显示一个月的排班统计(UI已就绪,数据逻辑待实现)

#### 实现细节
- **视图切换器**: 
  - 位于资源看板右上角
  - 三个按钮分别对应日/周/月视图
  - 当前选中的视图高亮显示
- **视图状态管理**: 
  - 使用React state管理当前视图模式
  - 视图切换时保持选中的日期
- **扩展性设计**: 
  - 甘特图组件接收`viewMode`参数
  - 为周视图和月视图预留接口

#### 相关文件
- `/src/components/appointment/ViewSwitcher.tsx` - 视图切换器组件
- `/src/components/appointment/GanttChart.tsx` - 甘特图组件(接收viewMode参数)
- `/src/pages/head-nurse/SchedulePage.tsx` - 视图状态管理

## 技术实现

### 时间重叠检测算法
```typescript
function isTimeOverlap(start1, end1, start2, end2) {
  // 将时间转换为分钟数
  const start1Minutes = hour1 * 60 + minute1;
  const end1Minutes = hour2 * 60 + minute2;
  const start2Minutes = hour3 * 60 + minute3;
  const end2Minutes = hour4 * 60 + minute4;
  
  // 检测重叠: 时间段1的开始时间 < 时间段2的结束时间 && 时间段2的开始时间 < 时间段1的结束时间
  return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
}
```

### 分行布局算法
```typescript
function arrangeSchedulesInRows(schedules) {
  const rows = [];
  
  schedules.forEach(schedule => {
    // 尝试将排班放入现有行
    let placed = false;
    for (const row of rows) {
      const hasOverlap = row.some(existing => 
        isTimeOverlap(schedule.start, schedule.end, existing.start, existing.end)
      );
      
      if (!hasOverlap) {
        row.push(schedule);
        placed = true;
        break;
      }
    }
    
    // 如果无法放入现有行,创建新行
    if (!placed) {
      rows.push([schedule]);
    }
  });
  
  return rows;
}
```

## 用户体验改进

### 1. 冲突提示
- 清晰的视觉警告(使用AlertTriangle图标和红色主题)
- 详细的冲突信息展示
- 明确的操作指引

### 2. 视觉反馈
- 重叠排班数量提示
- 琥珀色警告色
- 排班卡片边框增强

### 3. 操作便捷性
- 一键切换视图
- 保持日期选择状态
- 流畅的交互体验

## 后续优化建议

### 1. 周视图实现
- 显示一周7天的排班概览
- 支持横向滚动查看
- 显示每日排班数量统计

### 2. 月视图实现
- 日历式布局显示整月排班
- 每日显示排班数量
- 点击日期查看详细排班

### 3. 拖拽排班
- 支持在甘特图上直接拖拽排班卡片
- 拖拽时实时检测冲突
- 拖拽完成后自动保存

### 4. 批量操作
- 支持批量锁定排班
- 支持批量调整时间
- 支持批量分配资源

## 测试建议

### 1. 冲突检测测试
- 测试房间冲突检测
- 测试护士冲突检测
- 测试同时存在多个冲突的情况
- 测试编辑排班时排除自身的逻辑

### 2. 分行显示测试
- 测试2个重叠排班的显示
- 测试3个及以上重叠排班的显示
- 测试部分重叠的情况
- 测试完全重叠的情况

### 3. 视图切换测试
- 测试日/周/月视图切换
- 测试切换视图时日期保持
- 测试不同视图下的数据加载

## 注意事项

1. **强制排班**: 强制排班会导致资源重叠使用,请确保线下已协调好相关安排
2. **性能考虑**: 当排班数量较多时,分行算法可能影响性能,建议后续优化
3. **数据一致性**: 确保冲突检测使用的是最新的排班数据
4. **用户权限**: 强制排班功能仅限护士长使用,需要适当的权限控制

## 相关文档
- [系统需求文档](./README.md)
- [数据库设计](./supabase/migrations/)
- [API文档](./src/db/api.ts)
