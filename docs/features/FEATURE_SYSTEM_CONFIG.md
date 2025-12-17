# 系统配置功能说明

## 功能概述

为Bio-Appointment智能预约调度系统添加了**系统配置页面**，用于管理系统的核心资源：护士、医生、房间。

---

## 功能模块

### 1. 护士管理

#### 功能列表

**查看护士列表**
- 显示所有护士信息
- 包含姓名、技能等级、可用状态
- 按姓名排序

**添加护士**
- 输入护士姓名（必填）
- 选择技能等级：初级、中级、高级
- 设置可用状态（默认：可用）

**编辑护士**
- 修改护士姓名
- 调整技能等级
- 切换可用状态

**删除护士**
- 删除护士记录
- 需要确认操作

#### 技能等级说明

| 等级 | 英文标识 | 说明 |
|------|----------|------|
| 初级 | junior | 可承接基础护理服务 |
| 中级 | intermediate | 可承接常规护理服务 |
| 高级 | senior | 可承接所有护理服务，包括复杂操作 |

#### 可用状态

- **可用**：护士正常工作，可以被分配到排班中
- **不可用**：护士临时请假或不在岗，不会出现在排班选择列表中

---

### 2. 医生管理

#### 功能列表

**查看医生列表**
- 显示所有医生信息
- 包含姓名、专业领域、可用状态
- 按姓名排序

**添加医生**
- 输入医生姓名（必填）
- 输入专业领域（必填），例如：肿瘤科、心血管科
- 设置可用状态（默认：可用）

**编辑医生**
- 修改医生姓名
- 更新专业领域
- 切换可用状态

**删除医生**
- 删除医生记录
- 需要确认操作

#### 专业领域示例

- 肿瘤科
- 心血管科
- 内分泌科
- 消化科
- 呼吸科
- 神经科
- 免疫科

#### 可用状态

- **可用**：医生正常出诊，可以接受预约
- **不可用**：医生休假或不在岗，不会出现在预约选择列表中

---

### 3. 房间管理

#### 功能列表

**查看房间列表**
- 显示所有房间信息
- 包含房间名称、房间类型、可用状态
- 按名称排序

**添加房间**
- 输入房间名称（必填），例如：VIP室1、治疗区A
- 选择房间类型：VIP室、治疗区、咨询室
- 设置可用状态（默认：可用）

**编辑房间**
- 修改房间名称
- 调整房间类型
- 切换可用状态

**删除房间**
- 删除房间记录
- 需要确认操作

#### 房间类型说明

| 类型 | 英文标识 | 适用场景 |
|------|----------|----------|
| VIP室 | vip | 高端客户服务，环境私密舒适 |
| 治疗区 | treatment | 常规治疗服务，如细胞回输、静脉输液 |
| 咨询室 | consultation | 医生面诊、报告解读 |

#### 可用状态

- **可用**：房间正常使用，可以被分配到排班中
- **不可用**：房间维修或暂停使用，不会出现在排班选择列表中

---

## 用户界面

### 页面布局

**顶部标题区**
- 页面标题：系统配置
- 副标题：管理系统资源：护士、医生、房间

**提示信息**
- 蓝色提示框：修改资源状态为"不可用"后，该资源将不会出现在预约和排班的选择列表中

**Tab切换**
- 三个Tab：护士管理、医生管理、房间管理
- 点击切换不同的管理模块

### 列表展示

**表格列**
- 护士：姓名、技能等级、状态、操作
- 医生：姓名、专业领域、状态、操作
- 房间：房间名称、房间类型、状态、操作

**空状态**
- 当列表为空时，显示提示文案
- 例如："暂无护士数据，请点击'添加护士'按钮添加"

**操作按钮**
- 编辑按钮：铅笔图标
- 删除按钮：垃圾桶图标（红色）

### 添加/编辑对话框

**对话框标题**
- 添加模式：添加护士 / 添加医生 / 添加房间
- 编辑模式：编辑护士 / 编辑医生 / 编辑房间

**表单字段**
- 所有必填字段标注 *
- 下拉选择器用于选择类型/等级
- 开关按钮用于切换可用状态

**底部按钮**
- 取消按钮：关闭对话框，不保存
- 保存按钮：提交表单，保存数据

---

## 技术实现

### 数据表结构

#### nurses（护士表）

```sql
CREATE TABLE nurses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  skill_level TEXT NOT NULL CHECK (skill_level IN ('junior', 'intermediate', 'senior')),
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### doctors（医生表）

```sql
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### rooms（房间表）

```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  room_type TEXT NOT NULL CHECK (room_type IN ('vip', 'treatment', 'consultation')),
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### API函数

#### 护士管理API

```typescript
// 获取所有护士
getNurses(): Promise<Nurse[]>

// 获取可用护士
getAvailableNurses(): Promise<Nurse[]>

// 创建护士
createNurse(nurse: { name: string; skill_level: SkillLevel; is_available: boolean }): Promise<Nurse>

// 更新护士
updateNurse(id: string, nurse: Partial<Omit<Nurse, 'id' | 'created_at'>>): Promise<Nurse>

// 删除护士
deleteNurse(id: string): Promise<void>
```

#### 医生管理API

```typescript
// 获取所有医生
getDoctors(): Promise<Doctor[]>

// 获取可用医生
getAvailableDoctors(): Promise<Doctor[]>

// 创建医生
createDoctor(doctor: { name: string; specialty: string; is_available: boolean }): Promise<Doctor>

// 更新医生
updateDoctor(id: string, doctor: Partial<Omit<Doctor, 'id' | 'created_at'>>): Promise<Doctor>

// 删除医生
deleteDoctor(id: string): Promise<void>
```

#### 房间管理API

```typescript
// 获取所有房间
getRooms(): Promise<Room[]>

// 获取可用房间
getAvailableRooms(): Promise<Room[]>

// 创建房间
createRoom(room: { name: string; room_type: RoomType; is_available: boolean }): Promise<Room>

// 更新房间
updateRoom(id: string, room: Partial<Omit<Room, 'id' | 'created_at'>>): Promise<Room>

// 删除房间
deleteRoom(id: string): Promise<void>
```

### 类型定义

```typescript
export type SkillLevel = 'junior' | 'intermediate' | 'senior';
export type RoomType = 'vip' | 'treatment' | 'consultation';

export interface Nurse {
  id: string;
  name: string;
  skill_level: SkillLevel;
  is_available: boolean;
  created_at: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  is_available: boolean;
  created_at: string;
}

export interface Room {
  id: string;
  name: string;
  room_type: RoomType;
  is_available: boolean;
  created_at: string;
}
```

### 表单验证

使用Zod进行表单验证：

```typescript
// 护士表单Schema
const nurseSchema = z.object({
  name: z.string().min(1, '请输入护士姓名'),
  skill_level: z.enum(['junior', 'intermediate', 'senior'], {
    required_error: '请选择技能等级',
  }),
  is_available: z.boolean().default(true),
});

// 医生表单Schema
const doctorSchema = z.object({
  name: z.string().min(1, '请输入医生姓名'),
  specialty: z.string().min(1, '请输入专业领域'),
  is_available: z.boolean().default(true),
});

// 房间表单Schema
const roomSchema = z.object({
  name: z.string().min(1, '请输入房间名称'),
  room_type: z.enum(['vip', 'treatment', 'consultation'], {
    required_error: '请选择房间类型',
  }),
  is_available: z.boolean().default(true),
});
```

---

## 业务流程

### 添加资源流程

```
1. 点击"添加XXX"按钮
   ↓
2. 打开添加对话框
   ↓
3. 填写表单信息
   ↓
4. 点击"保存"按钮
   ↓
5. 表单验证
   ↓
6. 调用API创建资源
   ↓
7. 显示成功提示
   ↓
8. 关闭对话框
   ↓
9. 刷新列表
```

### 编辑资源流程

```
1. 点击列表中的"编辑"按钮
   ↓
2. 打开编辑对话框，填充现有数据
   ↓
3. 修改表单信息
   ↓
4. 点击"保存"按钮
   ↓
5. 表单验证
   ↓
6. 调用API更新资源
   ↓
7. 显示成功提示
   ↓
8. 关闭对话框
   ↓
9. 刷新列表
```

### 删除资源流程

```
1. 点击列表中的"删除"按钮
   ↓
2. 弹出确认对话框
   ↓
3. 用户确认删除
   ↓
4. 调用API删除资源
   ↓
5. 显示成功提示
   ↓
6. 刷新列表
```

### 切换可用状态流程

```
1. 在编辑对话框中切换"可用状态"开关
   ↓
2. 点击"保存"按钮
   ↓
3. 调用API更新资源
   ↓
4. 资源状态更新
   ↓
5. 影响预约和排班的选择列表
```

---

## 与其他模块的集成

### 1. 销售端预约发起

**影响**：
- 医生预约时，只显示`is_available = true`的医生
- 使用`getAvailableDoctors()`获取可选医生列表

**示例**：
```typescript
const doctors = await getAvailableDoctors();
// 只返回可用的医生
```

### 2. 护士长端智能排班

**影响**：
- 资源分配时，只显示`is_available = true`的护士和房间
- 使用`getAvailableNurses()`和`getAvailableRooms()`获取可选资源

**示例**：
```typescript
const nurses = await getAvailableNurses();
const rooms = await getAvailableRooms();
// 只返回可用的护士和房间
```

### 3. 资源可用性校验

**影响**：
- 在`check_resource_availability`函数中，只查询`is_available = true`的资源
- 不可用的资源不参与可用性计算

**SQL示例**：
```sql
SELECT * FROM nurses 
WHERE is_available = true 
AND id NOT IN (已占用的护士ID);
```

---

## 使用场景

### 场景1：新护士入职

**操作步骤**：
1. 进入系统配置页面
2. 切换到"护士管理"Tab
3. 点击"添加护士"按钮
4. 填写护士信息：
   - 姓名：张小护
   - 技能等级：中级
   - 可用状态：可用
5. 点击"保存"
6. 护士添加成功，可以在排班中选择

### 场景2：护士临时请假

**操作步骤**：
1. 进入系统配置页面
2. 切换到"护士管理"Tab
3. 找到请假的护士，点击"编辑"按钮
4. 将"可用状态"切换为"不可用"
5. 点击"保存"
6. 该护士不再出现在排班选择列表中

### 场景3：医生休假

**操作步骤**：
1. 进入系统配置页面
2. 切换到"医生管理"Tab
3. 找到休假的医生，点击"编辑"按钮
4. 将"可用状态"切换为"不可用"
5. 点击"保存"
6. 该医生不再出现在预约选择列表中

### 场景4：房间维修

**操作步骤**：
1. 进入系统配置页面
2. 切换到"房间管理"Tab
3. 找到维修的房间，点击"编辑"按钮
4. 将"可用状态"切换为"不可用"
5. 点击"保存"
6. 该房间不再出现在排班选择列表中

### 场景5：新增VIP室

**操作步骤**：
1. 进入系统配置页面
2. 切换到"房间管理"Tab
3. 点击"添加房间"按钮
4. 填写房间信息：
   - 房间名称：VIP室6
   - 房间类型：VIP室
   - 可用状态：可用
5. 点击"保存"
6. 新房间添加成功，可以在排班中选择

---

## 权限控制

### 访问权限

**建议**：
- 系统配置页面应该只对管理员或护士长开放
- 普通销售、护士、医生不应该有权限访问

**实现方式**（预留）：
- 在路由配置中添加权限检查
- 根据用户角色显示/隐藏导航菜单项

### 操作权限

**建议**：
- 管理员：完全权限（增删改查）
- 护士长：可以查看和修改可用状态，不能删除
- 其他角色：只读权限

---

## 数据完整性

### 删除限制

**问题**：
- 如果护士/医生/房间已经被分配到未来的排班中，是否允许删除？

**建议方案**：
1. **软删除**：不真正删除记录，只是标记为不可用
2. **级联检查**：删除前检查是否有关联的排班记录
3. **强制删除**：允许删除，但同时删除或更新关联的排班记录

**当前实现**：
- 直接删除，不做级联检查
- 建议在生产环境中添加级联检查

### 数据验证

**必填字段**：
- 护士：姓名、技能等级
- 医生：姓名、专业领域
- 房间：房间名称、房间类型

**唯一性约束**（建议添加）：
- 护士姓名应该唯一
- 医生姓名应该唯一
- 房间名称应该唯一

---

## 用户体验优化

### 1. 实时反馈

- **加载状态**：数据加载时显示加载动画
- **操作反馈**：操作成功/失败时显示Toast提示
- **确认对话框**：删除操作前弹出确认对话框

### 2. 表单体验

- **自动聚焦**：打开对话框时，自动聚焦到第一个输入框
- **回车提交**：在输入框中按回车键可以提交表单
- **ESC关闭**：按ESC键可以关闭对话框

### 3. 列表展示

- **排序**：按姓名/名称字母顺序排序
- **状态徽章**：使用不同颜色的徽章区分可用/不可用状态
- **空状态**：列表为空时显示友好的提示文案

---

## 测试场景

### 测试用例1：添加护士

**前置条件**：无

**操作步骤**：
1. 进入系统配置页面
2. 点击"添加护士"按钮
3. 填写姓名："测试护士A"
4. 选择技能等级："中级"
5. 保持可用状态为"可用"
6. 点击"保存"

**预期结果**：
- 显示成功提示："添加成功"
- 对话框关闭
- 列表中出现新添加的护士
- 护士信息正确显示

### 测试用例2：编辑医生

**前置条件**：已有医生"测试医生A"

**操作步骤**：
1. 进入系统配置页面
2. 切换到"医生管理"Tab
3. 找到"测试医生A"，点击"编辑"按钮
4. 修改专业领域为："心血管科"
5. 点击"保存"

**预期结果**：
- 显示成功提示："更新成功"
- 对话框关闭
- 列表中医生的专业领域更新为"心血管科"

### 测试用例3：删除房间

**前置条件**：已有房间"测试房间A"

**操作步骤**：
1. 进入系统配置页面
2. 切换到"房间管理"Tab
3. 找到"测试房间A"，点击"删除"按钮
4. 在确认对话框中点击"确定"

**预期结果**：
- 显示成功提示："删除成功"
- 列表中不再显示"测试房间A"

### 测试用例4：切换可用状态

**前置条件**：已有护士"测试护士B"，状态为"可用"

**操作步骤**：
1. 进入系统配置页面
2. 找到"测试护士B"，点击"编辑"按钮
3. 将"可用状态"切换为"不可用"
4. 点击"保存"

**预期结果**：
- 显示成功提示："更新成功"
- 列表中护士的状态徽章变为"不可用"
- 在排班页面中，该护士不再出现在选择列表中

### 测试用例5：表单验证

**前置条件**：无

**操作步骤**：
1. 进入系统配置页面
2. 点击"添加护士"按钮
3. 不填写任何信息
4. 直接点击"保存"

**预期结果**：
- 显示验证错误："请输入护士姓名"
- 显示验证错误："请选择技能等级"
- 表单不提交，对话框不关闭

---

## 相关文件

**新增文件**：
- `/src/pages/admin/SystemConfigPage.tsx` - 系统配置页面组件

**修改文件**：
- `/src/routes.tsx` - 添加系统配置路由
- `/src/db/api.ts` - 添加护士、医生、房间的CRUD API
- `/src/types/types.ts` - 添加Nurse、Doctor、Room类型定义

**涉及的数据表**：
- `nurses` - 护士表
- `doctors` - 医生表
- `rooms` - 房间表

---

## 后续优化建议

### 1. 批量操作

- 批量导入护士/医生/房间数据
- 批量修改可用状态
- 批量删除

### 2. 搜索和筛选

- 按姓名搜索
- 按状态筛选（可用/不可用）
- 按技能等级筛选（护士）
- 按房间类型筛选（房间）

### 3. 数据导出

- 导出护士列表为Excel
- 导出医生列表为Excel
- 导出房间列表为Excel

### 4. 操作日志

- 记录所有的增删改操作
- 显示操作人和操作时间
- 支持操作回滚

### 5. 数据统计

- 统计护士数量（按技能等级）
- 统计医生数量（按专业领域）
- 统计房间数量（按房间类型）
- 统计资源利用率

---

## 总结

**功能状态**：✅ 已完成并通过测试

**核心价值**：
1. **集中管理**：统一管理系统的核心资源
2. **灵活配置**：支持动态添加、编辑、删除资源
3. **状态控制**：通过可用状态控制资源的可见性
4. **用户友好**：简洁直观的操作界面

**业务影响**：
- 简化资源管理流程，提高管理效率
- 支持资源的动态调整，适应业务变化
- 通过可用状态控制，避免不可用资源被误用
- 为预约和排班提供准确的资源数据

---

**开发时间**：2025-11-27  
**开发人员**：AI Assistant  
**测试状态**：通过
