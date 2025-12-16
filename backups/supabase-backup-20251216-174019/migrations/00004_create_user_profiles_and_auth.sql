/*
# 创建用户认证与权限管理系统

## 1. 枚举类型
- `user_role`：用户角色枚举
  - `super_admin`：超级管理员，拥有所有权限
  - `sales`：销售/健康管理师，发起预约
  - `head_nurse`：护士长，智能排班和资源分配
  - `nurse`：护士，执行任务
  - `doctor`：医生，预约确认

- `user_status`：用户状态枚举
  - `active`：活跃状态
  - `disabled`：禁用状态

## 2. 新建表
- `profiles`：用户基本信息表
  - `id` (uuid, primary key, references auth.users)：用户ID
  - `username` (text, unique, not null)：用户名
  - `email` (text, unique)：邮箱（自动生成：username@miaoda.com）
  - `full_name` (text)：真实姓名
  - `role` (user_role, not null, default 'sales')：用户角色
  - `department` (text)：所属部门
  - `status` (user_status, not null, default 'active')：用户状态
  - `created_at` (timestamptz, default now())：创建时间
  - `updated_at` (timestamptz, default now())：更新时间

## 3. 权限辅助函数
- `is_admin(uid uuid)`：检查用户是否为超级管理员
- `get_user_role(uid uuid)`：获取用户角色
- `has_role(uid uuid, required_role user_role)`：检查用户是否拥有指定角色

## 4. 安全策略
- 启用 RLS（Row Level Security）
- 超级管理员拥有所有权限
- 用户可以查看自己的信息
- 用户可以更新自己的信息（除了 role 和 status）
- 创建 public_profiles 视图用于公开信息展示

## 5. 自动同步触发器
- `handle_new_user()`：当用户邮箱验证后，自动同步到 profiles 表
- 第一个注册的用户自动成为超级管理员
- 后续用户默认角色为 sales

## 注意事项
- 使用用户名+密码登录方式（模拟邮箱：username@miaoda.com）
- 需要禁用邮箱验证
- 所有外键引用应该指向 profiles(id) 而不是 auth.users(id)
*/

-- 创建用户角色枚举
CREATE TYPE user_role AS ENUM ('super_admin', 'sales', 'head_nurse', 'nurse', 'doctor');

-- 创建用户状态枚举
CREATE TYPE user_status AS ENUM ('active', 'disabled');

-- 创建 profiles 表
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text UNIQUE,
  full_name text,
  role user_role NOT NULL DEFAULT 'sales'::user_role,
  department text,
  status user_status NOT NULL DEFAULT 'active'::user_status,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);

-- 启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 创建权限辅助函数
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = uid AND role = 'super_admin'::user_role AND status = 'active'::user_status
  );
$$;

CREATE OR REPLACE FUNCTION get_user_role(uid uuid)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE id = uid AND status = 'active'::user_status;
$$;

CREATE OR REPLACE FUNCTION has_role(uid uuid, required_role user_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = uid AND role = required_role AND status = 'active'::user_status
  );
$$;

-- 创建 RLS 策略
-- 1. 超级管理员拥有所有权限
CREATE POLICY "超级管理员拥有所有权限" ON profiles
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- 2. 用户可以查看自己的信息
CREATE POLICY "用户可以查看自己的信息" ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 3. 用户可以更新自己的信息（除了 role 和 status）
CREATE POLICY "用户可以更新自己的信息" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    AND status = (SELECT status FROM profiles WHERE id = auth.uid())
  );

-- 4. 所有认证用户可以查看其他用户的基本信息（用于显示名称等）
CREATE POLICY "所有用户可以查看基本信息" ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 创建 public_profiles 视图（用于公开信息）
CREATE OR REPLACE VIEW public_profiles AS
SELECT
  id,
  username,
  full_name,
  role,
  department
FROM profiles
WHERE status = 'active'::user_status;

-- 创建自动同步触发器函数
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  extracted_username text;
BEGIN
  -- 统计现有用户数量
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- 从邮箱中提取用户名（去掉 @miaoda.com）
  extracted_username := SPLIT_PART(NEW.email, '@', 1);
  
  -- 插入到 profiles 表
  INSERT INTO profiles (id, username, email, role)
  VALUES (
    NEW.id,
    extracted_username,
    NEW.email,
    CASE 
      WHEN user_count = 0 THEN 'super_admin'::user_role 
      ELSE 'sales'::user_role 
    END
  );
  
  RETURN NEW;
END;
$$;

-- 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

-- 创建触发器：当用户邮箱验证后自动同步
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();