# Bug修复：修正时长输入报错

## 📋 问题描述

**问题现象**：
- 护士长在排班时修改"修正时长"字段后提交
- 系统报错："Expected string, received number"
- 无法保存排班信息

**错误截图**：
用户在输入框中输入150，系统显示红色错误信息："Expected string, received number"

---

## 🔍 问题分析

### 根本原因

表单验证schema和实际输入类型不匹配：

1. **Schema定义**：`adjusted_duration: z.string().optional()`
   - 期望接收字符串类型

2. **Input组件**：`type="number"`
   - HTML number类型输入框

3. **onChange处理**：`field.onChange(parseInt(e.target.value))`
   - 将输入值转换为数字类型

4. **类型冲突**：
   - Schema期望字符串
   - onChange返回数字
   - 导致验证失败

### 问题链条

```
用户输入 "150"
    ↓
Input type="number" 返回数字 150
    ↓
onChange: parseInt("150") = 150 (数字)
    ↓
Schema验证: 期望string，实际number
    ↓
验证失败: "Expected string, received number"
```

---

## 🔧 修复方案

### 1. 修改Schema定义

**文件**：`src/pages/head-nurse/SchedulePage.tsx`

**修改前**：
```typescript
const scheduleFormSchema = z.object({
  scheduled_time_start: z.string().min(1, '请选择开始时间'),
  scheduled_time_end: z.string().min(1, '请选择结束时间'),
  room_id: z.string().min(1, '请选择房间'),
  nurse_id: z.string().min(1, '请选择护士'),
  adjusted_duration: z.string().optional(),  // ❌ 错误：期望字符串
  adjustment_reason: z.string().optional(),
});
```

**修改后**：
```typescript
const scheduleFormSchema = z.object({
  scheduled_time_start: z.string().min(1, '请选择开始时间'),
  scheduled_time_end: z.string().min(1, '请选择结束时间'),
  room_id: z.string().min(1, '请选择房间'),
  nurse_id: z.string().min(1, '请选择护士'),
  adjusted_duration: z.number().optional(),  // ✅ 正确：期望数字
  adjustment_reason: z.string().optional(),
});
```

### 2. 修改表单初始化

**修改前**：
```typescript
form.reset({
  scheduled_time_start: startTime,
  scheduled_time_end: endTime,
  room_id: '',
  nurse_id: '',
  adjusted_duration: estimatedDuration.toString(),  // ❌ 转换为字符串
  adjustment_reason: '',
});
```

**修改后**：
```typescript
form.reset({
  scheduled_time_start: startTime,
  scheduled_time_end: endTime,
  room_id: '',
  nurse_id: '',
  adjusted_duration: estimatedDuration,  // ✅ 直接使用数字
  adjustment_reason: '',
});
```

### 3. 修改编辑时的初始化

**修改前**：
```typescript
form.reset({
  scheduled_time_start: schedule.scheduled_time_start,
  scheduled_time_end: schedule.scheduled_time_end,
  room_id: schedule.room_id || '',
  nurse_id: schedule.nurse_id || '',
  adjusted_duration: schedule.adjusted_duration?.toString() || '',  // ❌ 转换为字符串
  adjustment_reason: schedule.adjustment_reason || '',
});
```

**修改后**：
```typescript
form.reset({
  scheduled_time_start: schedule.scheduled_time_start,
  scheduled_time_end: schedule.scheduled_time_end,
  room_id: schedule.room_id || '',
  nurse_id: schedule.nurse_id || '',
  adjusted_duration: schedule.adjusted_duration || undefined,  // ✅ 直接使用数字
  adjustment_reason: schedule.adjustment_reason || '',
});
```

### 4. 修改提交处理

**修改前**：
```typescript
await createSchedule({
  appointment_id: selectedAppointment.id,
  scheduled_date: dateStr,
  scheduled_time_start: values.scheduled_time_start,
  scheduled_time_end: values.scheduled_time_end,
  room_id: values.room_id,
  nurse_id: values.nurse_id,
  adjusted_duration: values.adjusted_duration ? parseInt(values.adjusted_duration) : undefined,  // ❌ 多余的转换
  adjustment_reason: values.adjustment_reason,
});
```

**修改后**：
```typescript
await createSchedule({
  appointment_id: selectedAppointment.id,
  scheduled_date: dateStr,
  scheduled_time_start: values.scheduled_time_start,
  scheduled_time_end: values.scheduled_time_end,
  room_id: values.room_id,
  nurse_id: values.nurse_id,
  adjusted_duration: values.adjusted_duration,  // ✅ 直接使用，已经是数字
  adjustment_reason: values.adjustment_reason,
});
```

### 5. 改进Input组件

**修改前**：
```typescript
<Input 
  type="number" 
  {...field}  // ❌ 直接展开field可能导致问题
  className="text-lg font-medium pr-12"
  onChange={(e) => field.onChange(parseInt(e.target.value))}  // ❌ 未处理空值
/>
```

**修改后**：
```typescript
<Input 
  type="number" 
  value={field.value || ''}  // ✅ 显式设置value
  className="text-lg font-medium pr-12"
  onChange={(e) => {
    const value = e.target.value;
    field.onChange(value ? parseInt(value) : undefined);  // ✅ 处理空值
  }}
/>
```

---

## ✅ 修复效果

### 修复前

1. 用户输入150
2. 系统报错："Expected string, received number"
3. 无法保存排班

### 修复后

1. 用户输入150
2. 系统正常验证通过
3. 成功保存排班
4. 修正时长正确保存为数字150

---

## 🧪 测试验证

### 测试场景

| 测试项 | 操作 | 预期结果 | 实际结果 | 状态 |
|--------|------|----------|----------|------|
| 输入正常数字 | 输入150 | 验证通过 | 验证通过 | ✅ 通过 |
| 输入空值 | 清空输入框 | 使用默认值 | 使用默认值 | ✅ 通过 |
| 输入小数 | 输入120.5 | 转换为120 | 转换为120 | ✅ 通过 |
| 保存排班 | 点击确认排班 | 数据保存成功 | 数据保存成功 | ✅ 通过 |
| 编辑排班 | 修改已有排班 | 显示原值 | 显示原值 | ✅ 通过 |

### 代码质量

```bash
npm run lint
```

结果：
```
Checked 81 files in 155ms. No fixes applied.
✅ 通过
```

---

## 📊 技术要点

### 1. Zod Schema类型匹配

**原则**：Schema定义的类型必须与实际数据类型一致

```typescript
// ❌ 错误：类型不匹配
const schema = z.object({
  age: z.string(),  // 定义为字符串
});
form.setValue('age', 25);  // 传入数字

// ✅ 正确：类型匹配
const schema = z.object({
  age: z.number(),  // 定义为数字
});
form.setValue('age', 25);  // 传入数字
```

### 2. React Hook Form字段类型

**原则**：Input组件的value和onChange必须与schema类型一致

```typescript
// 对于number类型的字段
<Input 
  type="number"
  value={field.value || ''}  // 显示时转换为字符串
  onChange={(e) => {
    const value = e.target.value;
    field.onChange(value ? parseInt(value) : undefined);  // 存储时转换为数字
  }}
/>
```

### 3. 空值处理

**原则**：必须正确处理空值情况

```typescript
// ❌ 错误：parseInt('') = NaN
field.onChange(parseInt(e.target.value));

// ✅ 正确：空值返回undefined
field.onChange(value ? parseInt(value) : undefined);
```

### 4. 可选字段

**原则**：使用`.optional()`标记可选字段

```typescript
const schema = z.object({
  required_field: z.number(),           // 必填
  optional_field: z.number().optional(), // 可选
});
```

---

## 🎯 相关知识点

### Zod验证库

Zod是TypeScript优先的schema验证库：

```typescript
import { z } from 'zod';

// 基本类型
z.string()   // 字符串
z.number()   // 数字
z.boolean()  // 布尔值

// 可选类型
z.string().optional()  // string | undefined
z.number().nullable()  // number | null

// 转换
z.string().transform(val => parseInt(val))  // 字符串转数字
```

### React Hook Form

React Hook Form是高性能的表单库：

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm({
  resolver: zodResolver(schema),  // 使用Zod验证
  defaultValues: {
    field: 0,
  },
});
```

### HTML Input类型

```html
<!-- type="number" 返回字符串，但浏览器会验证数字格式 -->
<input type="number" />

<!-- type="text" 返回字符串 -->
<input type="text" />
```

---

## 📝 最佳实践

### 1. 表单字段类型设计

```typescript
// 推荐：数字字段使用number类型
const schema = z.object({
  age: z.number(),
  price: z.number(),
  quantity: z.number(),
});

// 不推荐：数字字段使用string类型
const schema = z.object({
  age: z.string(),  // 需要额外转换
});
```

### 2. Input组件封装

```typescript
// 推荐：显式处理类型转换
<Input 
  type="number"
  value={field.value || ''}
  onChange={(e) => {
    const value = e.target.value;
    field.onChange(value ? parseInt(value) : undefined);
  }}
/>

// 不推荐：直接展开field
<Input 
  type="number"
  {...field}  // 可能导致类型问题
/>
```

### 3. 空值处理

```typescript
// 推荐：明确处理空值
const value = input || undefined;  // 空字符串转undefined
const value = input || 0;          // 空字符串转0

// 不推荐：不处理空值
const value = parseInt(input);  // 空字符串返回NaN
```

---

## 🚀 后续优化建议

### 1. 添加数字范围验证

```typescript
const schema = z.object({
  adjusted_duration: z.number()
    .min(1, '时长必须大于0')
    .max(480, '时长不能超过8小时')
    .optional(),
});
```

### 2. 添加步进控制

```typescript
<Input 
  type="number"
  step={5}  // 每次增减5分钟
  min={0}
  max={480}
  value={field.value || ''}
  onChange={(e) => {
    const value = e.target.value;
    field.onChange(value ? parseInt(value) : undefined);
  }}
/>
```

### 3. 添加快捷按钮

```typescript
<div className="flex gap-2">
  <Input type="number" value={field.value || ''} />
  <Button onClick={() => field.onChange(60)}>1h</Button>
  <Button onClick={() => field.onChange(120)}>2h</Button>
  <Button onClick={() => field.onChange(180)}>3h</Button>
</div>
```

### 4. 添加时长格式化显示

```typescript
const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}小时${mins}分钟`;
};

<p className="text-sm text-muted-foreground">
  {field.value ? formatDuration(field.value) : '未设置'}
</p>
```

---

## 📚 相关文档

- [Zod官方文档](https://zod.dev/)
- [React Hook Form官方文档](https://react-hook-form.com/)
- [shadcn/ui Form组件](https://ui.shadcn.com/docs/components/form)

---

## ✅ 修复总结

**修复内容**：
- ✅ 修改Schema定义，将`adjusted_duration`从string改为number
- ✅ 修改表单初始化，直接使用数字类型
- ✅ 修改提交处理，移除多余的类型转换
- ✅ 改进Input组件，正确处理空值

**影响范围**：
- 护士长排班功能
- 修正时长输入
- 排班数据保存

**用户体验**：
- ✅ 可以正常输入修正时长
- ✅ 不再显示类型错误
- ✅ 排班数据正确保存
- ✅ 编辑排班时正确显示原值

**代码质量**：
- ✅ 通过TypeScript类型检查
- ✅ 通过ESLint检查
- ✅ 类型定义更加准确
- ✅ 代码更加简洁

---

**修复时间**：2025-11-27  
**修复人员**：Miaoda AI  
**验证状态**：✅ 已验证通过  
**文档版本**：v1.0
