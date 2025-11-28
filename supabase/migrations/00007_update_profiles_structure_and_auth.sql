/*
# 更新 profiles 表结构并添加认证功能

## 1. 修改 profiles 表
- 添加 `username` 字段（唯一，必填）
- 添加 `department` 字段（部门）
- 将 `status` 改为枚举类型
- 将 `name` 重命名为 `full_name`

## 2. 创建权限辅助函数
- `is_admin(uid uuid)`：检查用户是否为超级管理员
- `get_user_role(uid uuid)`：获取用户角色
- `has_role(uid uuid, required_role user_role)`：检查用户是否拥有指定角色

## 3. 更新 RLS 策略
- 超级管理员拥有所有权限
- 所有用户可以查看基本信息
- 用户可以更新自己的信息（除了 role 和 status）

## 4. 创建自动同步触发器
- 用户注册后自动同步到 profiles 表
- 第一个用户自动成为超级管理员
*/

-- 1. 修改 profiles 表结构
-- 添加 username 字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;

-- 添加 department 字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department text;

-- 重命名 name 为 full_name
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'full_name'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'name'
  ) THEN
    ALTER TABLE profiles RENAME COLUMN name TO full_name;
  END IF;
END $$;

-- 更新 status 字段为枚举类型
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status_new user_status;

-- 迁移数据
UPDATE profiles 
SET status_new = CASE 
  WHEN status::text = 'active' THEN 'active'::user_status
  WHEN status::text = 'disabled' THEN 'disabled'::user_status
  ELSE 'active'::user_status
END
WHERE status_new IS NULL;

-- 删除旧列，重命名新列
ALTER TABLE profiles DROP COLUMN IF EXISTS status CASCADE;
ALTER TABLE profiles RENAME COLUMN status_new TO status;

-- 设置默认值
ALTER TABLE profiles ALTER COLUMN status SET DEFAULT 'active'::user_status;
ALTER TABLE profiles ALTER COLUMN status SET NOT NULL;

-- 为 username 生成默认值
UPDATE profiles 
SET username = COALESCE(
  SPLIT_PART(email, '@', 1),
  'user_' || SUBSTRING(id::text, 1, 8)
)
WHERE username IS NULL;

-- 设置 username 为必填和唯一
ALTER TABLE profiles ALTER COLUMN username SET NOT NULL;
DROP INDEX IF EXISTS idx_profiles_username_unique;
CREATE UNIQUE INDEX idx_profiles_username_unique ON profiles(username);

-- 创建其他索引
DROP INDEX IF EXISTS idx_profiles_role;
DROP INDEX IF EXISTS idx_profiles_status;
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);

-- 2. 创建权限辅助函数
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
  SELECT role FROM profiles WHERE id = uid AND status = 'active'::user_status LIMIT 1;
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

-- 3. 删除旧的 RLS 策略
DROP POLICY IF EXISTS "超级管理员拥有所有权限" ON profiles;
DROP POLICY IF EXISTS "用户可以查看自己的信息" ON profiles;
DROP POLICY IF EXISTS "用户可以更新自己的信息" ON profiles;
DROP POLICY IF EXISTS "所有用户可以查看基本信息" ON profiles;

-- 启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 创建新的 RLS 策略
CREATE POLICY "超级管理员拥有所有权限" ON profiles
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "所有用户可以查看基本信息" ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "用户可以更新自己的信息" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    AND status = (SELECT status FROM profiles WHERE id = auth.uid())
  );

-- 4. 创建 public_profiles 视图
DROP VIEW IF EXISTS public_profiles;
CREATE VIEW public_profiles AS
SELECT
  id,
  username,
  full_name,
  role,
  department
FROM profiles
WHERE status = 'active'::user_status;

-- 5. 创建自动同步触发器函数
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
  
  -- 从邮箱中提取用户名
  extracted_username := SPLIT_PART(NEW.email, '@', 1);
  
  -- 插入到 profiles 表
  INSERT INTO profiles (id, username, email, full_name, role, status)
  VALUES (
    NEW.id,
    extracted_username,
    NEW.email,
    extracted_username,
    CASE 
      WHEN user_count = 0 THEN 'super_admin'::user_role 
      ELSE 'sales'::user_role 
    END,
    'active'::user_status
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 删除旧触发器
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 创建新触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 6. 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();