# 用户管理 CRUD 功能说明

## ✅ 已完成的功能

### 1. 创建用户（Create）

**功能位置：** 用户管理页面右上角"创建用户"按钮

**功能说明：**
- 点击"创建用户"按钮打开创建对话框
- 填写以下信息：
  - 用户名（必填）：只能包含字母、数字和下划线，3-20个字符
  - 密码（必填）：至少6个字符
  - 真实姓名（必填）：2-50个字符
  - 角色（必填）：选择用户角色（超级管理员、销售/健康管理师、护士长、护士、医生）
  - 部门（可选）：输入部门名称
- 表单验证：
  - 用户名格式验证
  - 用户名唯一性检查
  - 密码长度验证
  - 姓名长度验证
- 创建成功后自动刷新用户列表

### 2. 读取用户（Read）

**功能说明：**
- 页面加载时自动获取所有用户列表
- 显示用户信息：
  - 用户名
  - 真实姓名
  - 角色（带颜色标签）
  - 部门
  - 状态（活跃/禁用）
  - 注册时间
- 显示用户总数

### 3. 更新用户（Update）

**功能位置：** 每个用户行的"编辑"按钮

**功能说明：**
- 点击"编辑"按钮打开编辑对话框
- 可修改以下信息：
  - 真实姓名
  - 角色
  - 部门
- 表单验证：
  - 姓名长度验证
  - 角色选择验证
- 更新成功后自动刷新用户列表
- 限制：不能编辑自己的账号

### 4. 删除用户（Delete）

**功能位置：** 每个用户行的"删除"按钮

**功能说明：**
- 点击"删除"按钮打开确认对话框
- 显示删除警告信息
- 确认后执行软删除（将用户状态设置为 disabled）
- 删除成功后自动刷新用户列表
- 限制：不能删除自己的账号

## 🎨 界面特点

### 1. 表单验证
- 使用 react-hook-form + zod 进行表单验证
- 实时显示验证错误信息
- 友好的错误提示

### 2. 用户体验
- 对话框形式的创建/编辑界面
- 确认对话框防止误删除
- 操作成功/失败的 Toast 提示
- 自动刷新列表数据

### 3. 权限控制
- 不能编辑或删除自己的账号
- 所有操作仅限管理员

### 4. 视觉设计
- 角色使用不同颜色的标签区分
- 状态使用图标和颜色标识
- 操作按钮使用图标+文字
- 响应式布局

## 📋 角色说明

### 超级管理员（红色）
- 拥有所有权限
- 可以管理用户、分配角色、访问所有功能模块

### 销售/健康管理师（蓝色）
- 发起预约
- 查看自己创建的预约
- 跟进客户

### 护士长（紫色）
- 智能排班
- 资源分配
- 查看所有预约和排班
- 管理护士任务

### 护士（绿色）
- 查看分配给自己的任务
- 执行护理任务
- 更新任务状态

### 医生（橙色）
- 预约握手
- 接受/拒绝/改期预约
- 查看分配给自己的预约

## 🔧 技术实现

### 1. 类型定义（types.ts）
```typescript
export interface CreateUserInput {
  username: string;
  password: string;
  full_name: string;
  role: UserRole;
  department?: string;
}

export interface UpdateUserInput {
  user_id: string;
  full_name?: string;
  role?: UserRole;
  department?: string;
  status?: UserStatus;
}

export interface DeleteUserInput {
  user_id: string;
}
```

### 2. API 函数（api.ts）
```typescript
// 创建用户
export async function createUser(input: CreateUserInput)

// 更新用户
export async function updateUser(input: UpdateUserInput)

// 删除用户（软删除）
export async function deleteUser(input: DeleteUserInput)

// 获取所有用户
export async function getAllUsers()
```

### 3. 表单验证（zod schema）
```typescript
// 创建用户表单验证
const createUserSchema = z.object({
  username: z.string()
    .min(3, '用户名至少3个字符')
    .max(20, '用户名最多20个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  password: z.string()
    .min(6, '密码至少6个字符')
    .max(50, '密码最多50个字符'),
  full_name: z.string()
    .min(2, '姓名至少2个字符')
    .max(50, '姓名最多50个字符'),
  role: z.enum(['super_admin', 'sales', 'head_nurse', 'nurse', 'doctor']),
  department: z.string().optional(),
});

// 编辑用户表单验证
const editUserSchema = z.object({
  full_name: z.string()
    .min(2, '姓名至少2个字符')
    .max(50, '姓名最多50个字符'),
  role: z.enum(['super_admin', 'sales', 'head_nurse', 'nurse', 'doctor']),
  department: z.string().optional(),
});
```

## 🚀 使用方法

### 创建新用户
1. 登录系统（使用管理员账号）
2. 进入"用户管理"页面
3. 点击右上角"创建用户"按钮
4. 填写用户信息
5. 点击"创建"按钮

### 编辑用户
1. 在用户列表中找到要编辑的用户
2. 点击该用户行的"编辑"按钮
3. 修改用户信息
4. 点击"保存"按钮

### 删除用户
1. 在用户列表中找到要删除的用户
2. 点击该用户行的"删除"按钮
3. 在确认对话框中点击"确认删除"

## ⚠️ 注意事项

1. **用户名唯一性**：用户名在系统中必须唯一，创建时会自动检查
2. **密码安全**：密码至少6个字符，建议使用强密码
3. **软删除**：删除用户实际上是将用户状态设置为"禁用"，不会物理删除数据
4. **自我保护**：不能编辑或删除自己的账号，防止误操作
5. **权限要求**：所有用户管理操作仅限管理员账号

## 🎯 后续优化建议

1. **批量操作**：支持批量删除、批量修改角色
2. **搜索过滤**：添加用户搜索和筛选功能
3. **导出功能**：支持导出用户列表为 Excel
4. **密码重置**：添加管理员重置用户密码功能
5. **操作日志**：记录用户管理操作日志
6. **分页功能**：当用户数量较多时添加分页

---

**功能已完成并通过测试！** ✅
