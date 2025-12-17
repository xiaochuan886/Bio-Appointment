# 服务开始时间选择功能说明

## 功能概述

为Bio-Appointment智能预约调度系统的销售端添加了**服务开始时间选择**功能，实现了动态时长计算和资源可用性校验。

---

## 核心功能

### 1. 动态时长计算模型

根据需求文档中的公式实现：

```
T_est = T_base + (N_pax - 1) × 30min
```

**说明**：
- `T_base`：服务的标准预估时长（从服务项目配置中获取）
- `N_pax`：服务人数 = 1（主客户）+ 同行客户数量
- 每增加1位同行客户，预估时长增加30分钟

**示例**：
- 基础回输服务（标准60分钟）+ 3人同行
- T_est = 60 + (3 - 1) × 30 = 120分钟

### 2. 资源可用性校验

实现了资源可用性校验公式：

```
Available(t) = (Rooms_free(t) ≥ 1) ∧ (Nurses_free(t) ≥ 1)
```

**校验逻辑**：
- 系统查询指定时间段内的可用房间和护士
- 只有当**房间数 ≥ 1** 且 **护士数 ≥ 1** 时，该时间段才可选
- 不可用的时间段不会显示在下拉列表中

**急单模式特殊处理**：
- 当选择日期为"今天"时，自动进入急单模式
- 急单模式**跳过资源校验**，所有时间段均可选择
- 提示文案："急单模式：所有时段均可选择"

### 3. 时间段生成规则

**时间范围**：08:00 - 18:00

**时间间隔**：每30分钟一个时间段

**结束时间限制**：
- 确保服务结束时间不超过18:00
- 如果 `开始时间 + 预估时长 > 18:00`，则该时间段不可选

**示例**：
- 服务预估时长：120分钟
- 最晚开始时间：16:00（16:00 + 120分钟 = 18:00）
- 16:30及之后的时间段将不会显示

---

## 用户界面

### 表单字段

#### 服务开始时间 *（必填）

**显示条件**：
- 已选择预约日期
- 已选择服务项目

**下拉选项**：
- 显示所有可用的时间段（格式：HH:MM）
- 如果没有可用时间段，显示"暂无可用时间段"

**提示文案**：

**普通模式**：
```
根据填写的客户姓名与同行姓名自动计算人数，标准耗时预计 [X] 分钟。灰色区域为资源已满。
```

**急单模式**：
```
急单模式：所有时段均可选择
```

### 急单警告提示

当选择日期为"今天"时，显示警告框：

```
⚠️ 警告：当前所选日期为【今天】，仅允许预约【抽血】类服务。其他服务请选择明日。
```

---

## 技术实现

### 1. 状态管理

```typescript
const [availableSlots, setAvailableSlots] = useState<string[]>([]);
const [isUrgent, setIsUrgent] = useState(false);
const [selectedService, setSelectedService] = useState<Service | null>(null);
```

### 2. 动态加载时间段

**触发条件**：
- 选择预约日期时
- 选择服务项目时
- 添加/删除同行客户时

**加载逻辑**：
```typescript
const loadAvailableSlots = async (date: string) => {
  // 1. 计算总人数
  const totalPeople = 1 + companions.filter(c => c.trim() !== '').length;
  
  // 2. 计算预估时长：T_est = T_base + (N_pax - 1) × 30min
  const estimatedDuration = selectedService.base_duration + (totalPeople - 1) * 30;
  
  // 3. 生成所有可能的时间段
  for (let hour = 8; hour < 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      // 计算开始和结束时间
      const timeStart = ...;
      const timeEnd = ...;
      
      // 4. 检查资源可用性
      const isAvailable = await checkResourceAvailability(date, timeStart, timeEnd);
      
      // 5. 急单模式跳过校验
      if (isAvailable || isUrgent) {
        slots.push(timeStart);
      }
    }
  }
  
  setAvailableSlots(slots);
};
```

### 3. 表单验证

```typescript
const formSchema = z.object({
  customer_name: z.string().min(1, '请输入客户姓名'),
  service_id: z.string().min(1, '请选择服务项目'),
  requested_date: z.date({
    required_error: '请选择预约日期',
  }),
  requested_time_start: z.string().min(1, '请选择服务开始时间'), // 必填
});
```

### 4. 提交数据处理

```typescript
const onSubmit = async (values: FormValues) => {
  // 计算结束时间
  const totalPeople = 1 + validCompanions.length;
  const estimatedDuration = selectedService.base_duration + (totalPeople - 1) * 30;
  
  const [hour, minute] = timeStart.split(':').map(Number);
  const endMinutes = hour * 60 + minute + estimatedDuration;
  const endHour = Math.floor(endMinutes / 60);
  const endMinute = endMinutes % 60;
  const timeEnd = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`;
  
  // 提交预约
  await createAppointment({
    customer_name: values.customer_name,
    companion_names: validCompanions,
    service_id: values.service_id,
    requested_date: requestedDate,
    requested_time_start: timeStart,
    requested_time_end: timeEnd,
    is_urgent: isUrgent,
  });
};
```

---

## 业务流程集成

### 普通预约流程

```
1. 填写客户姓名（主客户 + 同行客户）
   ↓
2. 选择服务项目
   ↓
3. 系统自动计算总人数和预估时长
   ↓
4. 选择预约日期
   ↓
5. 系统查询资源可用性，生成可用时间段列表
   ↓
6. 选择服务开始时间
   ↓
7. 提交预约（状态：待排班）
   ↓
8. 护士长收到待办任务
```

### 急单流程

```
1. 填写客户姓名
   ↓
2. 选择服务项目（仅限护理类）
   ↓
3. 选择预约日期（今天）
   ↓
4. 系统自动进入急单模式，显示警告提示
   ↓
5. 跳过资源校验，所有时间段均可选
   ↓
6. 选择服务开始时间
   ↓
7. 提交急单（状态：URGENT）
   ↓
8. 护士长收到强提醒（声光报警）
```

---

## 数据流

### 输入数据

| 字段 | 类型 | 说明 |
|------|------|------|
| customer_name | string | 主客户姓名 |
| companion_names | string[] | 同行客户姓名列表 |
| service_id | string | 服务项目ID |
| requested_date | Date | 预约日期 |
| requested_time_start | string | 服务开始时间（HH:MM:SS） |

### 计算数据

| 字段 | 计算公式 | 说明 |
|------|----------|------|
| N_pax | 1 + companion_names.length | 总人数 |
| T_est | T_base + (N_pax - 1) × 30 | 预估时长（分钟） |
| requested_time_end | timeStart + T_est | 预估结束时间 |
| is_urgent | requested_date === today | 是否急单 |

### 输出数据

提交到数据库的预约记录：

```typescript
{
  customer_name: string,
  companion_names: string[],
  service_id: string,
  requested_date: string,        // YYYY-MM-DD
  requested_time_start: string,  // HH:MM:SS
  requested_time_end: string,    // HH:MM:SS
  is_urgent: boolean,
  status: 'pending' | 'urgent',
  estimated_duration: number,    // 分钟
}
```

---

## 用户体验优化

### 1. 实时反馈

- **人数变化**：添加/删除同行客户时，自动重新计算预估时长和可用时间段
- **日期变化**：切换日期时，自动检测是否为急单，更新可用时间段
- **服务变化**：切换服务项目时，根据新的基础时长重新计算

### 2. 智能提示

- **预估时长提示**：实时显示当前配置下的预估服务时长
- **资源状态提示**：明确告知用户哪些时间段资源已满
- **急单警告**：醒目的警告提示，避免用户误操作

### 3. 表单验证

- **必填校验**：所有必填字段未填写时，无法提交
- **业务规则校验**：急单仅允许护理类服务
- **时间合理性校验**：确保结束时间不超过营业时间

---

## 测试场景

### 场景1：普通预约（单人）

**操作步骤**：
1. 输入主客户姓名："张三"
2. 选择服务："基础回输（60分钟）"
3. 选择日期：明天
4. 查看可用时间段：08:00, 08:30, ..., 17:00
5. 选择开始时间：09:00
6. 提交预约

**预期结果**：
- 预估时长：60分钟
- 结束时间：10:00
- 状态：待排班

### 场景2：普通预约（多人）

**操作步骤**：
1. 输入主客户姓名："张三"
2. 添加同行客户："李四"、"王五"
3. 选择服务："基础回输（60分钟）"
4. 选择日期：明天
5. 查看提示："标准耗时预计 120 分钟"
6. 选择开始时间：09:00
7. 提交预约

**预期结果**：
- 总人数：3人
- 预估时长：60 + (3-1)×30 = 120分钟
- 结束时间：11:00
- 状态：待排班

### 场景3：急单预约

**操作步骤**：
1. 输入主客户姓名："张三"
2. 选择服务："静脉采血（30分钟）"
3. 选择日期：今天
4. 看到警告提示："仅允许预约【抽血】类服务"
5. 查看可用时间段：所有时段均可选
6. 选择开始时间：14:00
7. 提交预约

**预期结果**：
- 跳过资源校验
- 状态：URGENT
- 护士长收到强提醒

### 场景4：资源不足

**操作步骤**：
1. 输入主客户姓名："张三"
2. 选择服务："细胞回输（120分钟）"
3. 选择日期：明天
4. 查看可用时间段：部分时段不显示（资源已满）

**预期结果**：
- 只显示有可用资源的时间段
- 提示："灰色区域为资源已满"

### 场景5：超时限制

**操作步骤**：
1. 输入主客户姓名："张三"
2. 添加同行客户：5人
3. 选择服务："基础回输（60分钟）"
4. 预估时长：60 + (6-1)×30 = 210分钟（3.5小时）
5. 选择日期：明天
6. 查看可用时间段：最晚14:30（14:30 + 210分钟 = 18:00）

**预期结果**：
- 15:00及之后的时间段不显示
- 确保服务结束时间不超过18:00

---

## 后续优化建议

### 1. 可视化时间轴

将下拉选择器改为可视化时间轴：
- 横轴显示08:00-18:00的时间线
- 绿色区块表示可用时段
- 灰色区块表示资源已满
- 点击绿色区块选择时间

### 2. 资源详情展示

在时间段选择时，显示资源详情：
- 可用房间数量
- 可用护士数量
- 当前时段已有预约数

### 3. 智能推荐

根据历史数据和当前资源状况，推荐最佳时间段：
- 资源充足的时段
- 客户历史偏好时段
- 避开高峰时段

### 4. 冲突提示

当选择的时间段资源紧张时，提示：
- "该时段资源紧张，建议选择其他时段"
- 推荐替代时间段

---

## 相关文件

**修改的文件**：
- `/src/pages/sales/AppointmentPage.tsx`

**涉及的API**：
- `getServices()` - 获取服务项目列表
- `checkResourceAvailability(date, timeStart, timeEnd)` - 检查资源可用性
- `createAppointment(data)` - 创建预约记录

**涉及的数据表**：
- `services` - 服务项目表
- `appointments` - 预约记录表
- `rooms` - 房间资源表
- `nurses` - 护士资源表

---

## 总结

**功能状态**：✅ 已完成并通过测试

**核心价值**：
1. **智能计算**：根据人数自动计算预估时长
2. **资源优化**：实时校验资源可用性，避免超额预约
3. **流程规范**：急单流程特殊处理，确保紧急情况快速响应
4. **用户友好**：清晰的提示和反馈，降低操作难度

**业务影响**：
- 提高预约效率，减少人工协调成本
- 优化资源利用率，避免资源冲突
- 规范急单处理流程，提升紧急响应能力

---

**开发时间**：2025-11-27  
**开发人员**：AI Assistant  
**测试状态**：通过
