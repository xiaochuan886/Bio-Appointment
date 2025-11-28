/*
# 钉钉集成数据库表

## 功能说明
为 Bio-Appointment 系统添加钉钉集成功能所需的数据库表结构。

## 新增表

### 1. dingtalk_users（钉钉用户映射表）
存储钉钉用户与系统用户的映射关系。
- `id`: UUID 主键
- `profile_id`: 关联系统用户
- `dingtalk_userid`: 钉钉用户 ID（唯一）
- `dingtalk_unionid`: 钉钉 UnionID
- `name`: 钉钉姓名
- `mobile`: 手机号
- `department_ids`: 部门 ID 数组
- `avatar`: 头像 URL
- `is_active`: 是否激活
- `last_sync_at`: 最后同步时间

### 2. dingtalk_departments（钉钉部门映射表）
存储钉钉部门信息。
- `id`: UUID 主键
- `dingtalk_dept_id`: 钉钉部门 ID（唯一）
- `name`: 部门名称
- `parent_id`: 父部门 ID
- `order_num`: 排序号
- `is_active`: 是否激活

### 3. dingtalk_sync_logs（同步日志表）
记录通讯录同步操作日志。
- `id`: UUID 主键
- `sync_type`: 同步类型（departments/users）
- `status`: 状态（success/failed/running）
- `total_count`: 总数
- `success_count`: 成功数
- `failed_count`: 失败数
- `error_message`: 错误信息
- `started_at`: 开始时间
- `completed_at`: 完成时间
- `created_by`: 操作人

### 4. dingtalk_notifications（钉钉通知记录表）
记录发送到钉钉的通知消息。
- `id`: UUID 主键
- `notification_type`: 通知类型
- `recipient_userid`: 接收人钉钉 userid
- `title`: 标题
- `content`: 内容
- `status`: 状态（pending/sent/failed）
- `sent_at`: 发送时间
- `error_message`: 错误信息
- `related_id`: 关联业务 ID

## 安全策略
- 启用 RLS
- 超级管理员拥有所有权限
- 普通用户只能查看自己的钉钉映射信息
- 同步日志和通知记录仅管理员可查看
*/

-- 创建枚举类型
CREATE TYPE dingtalk_sync_type AS ENUM ('departments', 'users');
CREATE TYPE dingtalk_sync_status AS ENUM ('running', 'success', 'failed');
CREATE TYPE dingtalk_notification_status AS ENUM ('pending', 'sent', 'failed');

-- 1. 钉钉用户映射表
CREATE TABLE IF NOT EXISTS dingtalk_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  dingtalk_userid text UNIQUE NOT NULL,
  dingtalk_unionid text,
  name text NOT NULL,
  mobile text,
  department_ids text[] DEFAULT '{}',
  avatar text,
  is_active boolean DEFAULT true,
  last_sync_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. 钉钉部门映射表
CREATE TABLE IF NOT EXISTS dingtalk_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dingtalk_dept_id text UNIQUE NOT NULL,
  name text NOT NULL,
  parent_id uuid REFERENCES dingtalk_departments(id) ON DELETE SET NULL,
  order_num integer DEFAULT 0,
  is_active boolean DEFAULT true,
  last_sync_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. 钉钉同步日志表
CREATE TABLE IF NOT EXISTS dingtalk_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type dingtalk_sync_type NOT NULL,
  status dingtalk_sync_status NOT NULL DEFAULT 'running',
  total_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 4. 钉钉通知记录表
CREATE TABLE IF NOT EXISTS dingtalk_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
  recipient_userid text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  status dingtalk_notification_status DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  related_id uuid,
  created_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX idx_dingtalk_users_profile_id ON dingtalk_users(profile_id);
CREATE INDEX idx_dingtalk_users_dingtalk_userid ON dingtalk_users(dingtalk_userid);
CREATE INDEX idx_dingtalk_users_mobile ON dingtalk_users(mobile);
CREATE INDEX idx_dingtalk_departments_parent_id ON dingtalk_departments(parent_id);
CREATE INDEX idx_dingtalk_departments_dingtalk_dept_id ON dingtalk_departments(dingtalk_dept_id);
CREATE INDEX idx_dingtalk_sync_logs_created_by ON dingtalk_sync_logs(created_by);
CREATE INDEX idx_dingtalk_sync_logs_sync_type ON dingtalk_sync_logs(sync_type);
CREATE INDEX idx_dingtalk_notifications_recipient ON dingtalk_notifications(recipient_userid);
CREATE INDEX idx_dingtalk_notifications_status ON dingtalk_notifications(status);

-- 更新时间戳触发器
CREATE OR REPLACE FUNCTION update_dingtalk_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dingtalk_users_updated_at
  BEFORE UPDATE ON dingtalk_users
  FOR EACH ROW
  EXECUTE FUNCTION update_dingtalk_updated_at();

CREATE TRIGGER update_dingtalk_departments_updated_at
  BEFORE UPDATE ON dingtalk_departments
  FOR EACH ROW
  EXECUTE FUNCTION update_dingtalk_updated_at();

-- 启用 RLS
ALTER TABLE dingtalk_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE dingtalk_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dingtalk_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dingtalk_notifications ENABLE ROW LEVEL SECURITY;

-- RLS 策略：dingtalk_users
CREATE POLICY "超级管理员可以查看所有钉钉用户映射" ON dingtalk_users
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "用户可以查看自己的钉钉映射" ON dingtalk_users
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

CREATE POLICY "超级管理员可以管理钉钉用户映射" ON dingtalk_users
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- RLS 策略：dingtalk_departments
CREATE POLICY "所有认证用户可以查看钉钉部门" ON dingtalk_departments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "超级管理员可以管理钉钉部门" ON dingtalk_departments
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- RLS 策略：dingtalk_sync_logs
CREATE POLICY "超级管理员可以查看同步日志" ON dingtalk_sync_logs
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "超级管理员可以创建同步日志" ON dingtalk_sync_logs
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

-- RLS 策略：dingtalk_notifications
CREATE POLICY "超级管理员可以查看所有通知记录" ON dingtalk_notifications
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "用户可以查看发给自己的通知记录" ON dingtalk_notifications
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM dingtalk_users du
      WHERE du.dingtalk_userid = recipient_userid
      AND du.profile_id = auth.uid()
    )
  );

CREATE POLICY "系统可以创建通知记录" ON dingtalk_notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- 更新 profiles 表，添加钉钉关联字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dingtalk_userid text;
CREATE INDEX IF NOT EXISTS idx_profiles_dingtalk_userid ON profiles(dingtalk_userid);