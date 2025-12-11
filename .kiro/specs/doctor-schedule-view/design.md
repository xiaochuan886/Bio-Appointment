# 医生排班视图设计文档

## 概述

本设计文档描述了为医生服务管理页面添加排班视图功能的技术实现方案。该功能将复用现有智能排班页面的视图组件，为医生提供日、周、月三种视图模式来查看自己的预约排班情况，同时保持现有预约确认功能不变。

## 架构设计

### 整体架构

```
医生服务管理页面 (DoctorAppointmentPage)
├── 预约管理选项卡 (现有功能)
│   ├── 待确认预约列表
│   ├── 已完成预约列表
│   └── 已拒绝预约列表
└── 排班视图选项卡 (新增功能)
    ├── 视图切换器 (ViewSwitcher)
    ├── 日期导航器 (DateRangePicker)
    ├── 排班图表 (GanttChart)
    └── 排班详情对话框 (ScheduleDetailDialog)
```

### 组件复用策略

- **ViewSwitcher**: 直接复用现有组件，支持日、周、月视图切换
- **DateRangePicker**: 复用现有日期选择组件
- **GanttChart**: 复用现有甘特图组件，添加医生数据过滤
- **ScheduleDetailDialog**: 复用现有详情对话框，调整为只读模式

## 组件和接口设计

### 1. 页面结构更新

```typescript
// DoctorAppointmentPage.tsx 更新
interface DoctorAppointmentPageState {
  // 现有状态
  appointments: Appointment[];
  selectedAppointment: Appointment | null;
  isRejectDialogOpen: boolean;
  
  // 新增排班视图状态
  activeTab: 'appointments' | 'schedule';
  selectedDate: Date;
  viewMode: ViewMode;
  schedules: ScheduleWithDetails[];
  nurses: Nurse[];
  rooms: Room[];
}
```

### 2. 数据获取接口

```typescript
// 复用现有API，添加医生过滤
interface DoctorScheduleQuery {
  doctor_id: string;
  start_date?: string;
  end_date?: string;
  date?: string;
}

// API调用示例
const schedules = await clientApi.getSchedules({
  doctor_id: user.id,
  start_date: startDate,
  end_date: endDate
});
```

### 3. 排班数据过滤

```typescript
// 医生排班数据过滤逻辑
const filterDoctorSchedules = (schedules: ScheduleWithDetails[], doctorId: string) => {
  return schedules.filter(schedule => 
    schedule.appointment?.doctor_id === doctorId &&
    schedule.appointment?.service?.category === 'consultation'
  );
};
```

## 数据模型

### 排班视图数据结构

```typescript
interface DoctorScheduleView {
  schedules: ScheduleWithDetails[];
  viewMode: 'day' | 'week' | 'month';
  selectedDate: Date;
  doctorId: string;
}

interface ScheduleWithDetails {
  id: string;
  scheduled_date: string;
  scheduled_time_start: string;
  scheduled_time_end: string;
  status: 'published' | 'locked' | 'cancelled';
  appointment?: {
    id: string;
    customer_name: string;
    service?: {
      name: string;
      category: string;
    };
    doctor_id: string;
    workflow_status: string;
    is_urgent: boolean;
  };
}
```

## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式声明。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

基于验收标准分析，以下是可测试的正确性属性：

### 属性 1: 医生数据隔离
*对于任何* 医生用户和排班数据集，排班视图应该只显示属于当前医生的预约排班
**验证需求: 1.3**

### 属性 2: 视图切换状态保持
*对于任何* 视图切换操作，当前选择的日期应该在切换前后保持不变
**验证需求: 2.5**

### 属性 3: 日期导航视图保持
*对于任何* 日期导航操作，当前选择的视图模式应该在导航前后保持不变
**验证需求: 4.5**

### 属性 4: 预约详情完整性
*对于任何* 预约详情显示，应该包含客户姓名、服务项目、预约时间和状态信息
**验证需求: 3.2**

### 属性 5: 状态颜色映射一致性
*对于任何* 预约状态，排班项目应该使用对应的正确颜色标识
**验证需求: 5.1, 5.2, 5.3, 5.4**

### 属性 6: 实时更新响应性
*对于任何* 预约状态变化，排班视图应该在30秒内反映更新
**验证需求: 6.4**

### 属性 7: 日期过滤准确性
*对于任何* 选择的日期，视图应该只显示该日期对应的排班数据
**验证需求: 4.2**

### 属性 8: 功能兼容性保持
*对于任何* 排班视图操作，现有的预约确认功能应该保持正常工作
**验证需求: 1.4**

### 属性 9: 响应式布局适配
*对于任何* 屏幕尺寸变化，视图布局应该自动调整并保持核心功能可用
**验证需求: 7.4, 7.5**

## 错误处理

### 1. 数据加载错误
- 网络请求失败时显示错误提示
- 提供重试机制
- 降级到缓存数据（如果可用）

### 2. 权限验证错误
- 验证医生身份和权限
- 非医生用户访问时重定向
- 跨门店数据访问控制

### 3. 视图渲染错误
- 数据格式异常时的容错处理
- 空数据状态的友好提示
- 组件加载失败的备用方案

## 测试策略

### 单元测试
- 数据过滤逻辑测试
- 状态管理测试
- 组件渲染测试
- 错误处理测试

### 属性测试
使用 **@fast-check/jest** 进行属性测试，每个测试运行最少100次迭代：

1. **医生数据隔离测试**: 生成随机医生ID和排班数据，验证过滤结果只包含对应医生的数据
2. **视图切换状态保持测试**: 生成随机日期和视图模式，验证切换后日期保持不变
3. **日期导航视图保持测试**: 生成随机视图模式和日期变化，验证导航后视图模式保持不变
4. **预约详情完整性测试**: 生成随机预约数据，验证详情显示包含所有必需字段
5. **状态颜色映射测试**: 生成随机预约状态，验证颜色映射的一致性
6. **日期过滤准确性测试**: 生成随机日期和排班数据，验证过滤结果的准确性
7. **响应式布局测试**: 生成随机屏幕尺寸，验证布局适配的正确性

每个属性测试必须使用注释明确标识对应的设计文档属性：
```typescript
// **Feature: doctor-schedule-view, Property 1: 医生数据隔离**
```

### 集成测试
- API数据获取测试
- 组件交互测试
- 路由和权限测试
- 实时更新测试

### 端到端测试
- 完整用户流程测试
- 跨浏览器兼容性测试
- 性能和响应时间测试
- 移动端适配测试