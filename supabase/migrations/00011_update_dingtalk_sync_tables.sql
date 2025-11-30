/*
# 更新钉钉同步相关表

## 1. 新增表和字段

### 新增表
- dingtalk_sync_config（钉钉同步配置表）
- dingtalk_sync_logs（钉钉同步日志表）
- dingtalk_department_mapping（钉钉部门映射表）

## 2. 安全策略
- 所有表启用 RLS
- 超级管理员拥有完全访问权限
*/

-- 创建同步状态枚举（如果不存在）
DO $$ BEGIN
  CREATE TYPE sync_status AS ENUM ('pending', 'running', 'success', 'failed', 'partial');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 创建同步类型枚举（如果不存在）
DO $$ BEGIN
  CREATE TYPE sync_type AS ENUM ('manual', 'auto', 'incremental');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 创建冲突策略枚举（如果不存在）
DO $$ BEGIN
  CREATE TYPE conflict_strategy AS ENUM ('dingtalk_first', 'local_first', 'manual');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. 创建钉钉同步配置表（如果不存在）
CREATE TABLE IF NOT EXISTS dingtalk_sync_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_key text NOT NULL,
  app_secret text NOT NULL,
  agent_id text NOT NULL,
  corp_id text NOT NULL,
  sync_enabled boolean DEFAULT true,
  auto_sync_enabled boolean DEFAULT false,
  sync_schedule text DEFAULT 'daily',
  sync_time time DEFAULT '02:00:00',
  conflict_strategy conflict_strategy DEFAULT 'dingtalk_first',
  selected_departments jsonb DEFAULT '[]'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. 创建钉钉同步日志表（如果不存在）
CREATE TABLE IF NOT EXISTS dingtalk_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type sync_type NOT NULL,
  status sync_status DEFAULT 'pending',
  total_users integer DEFAULT 0,
  success_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  skipped_count integer DEFAULT 0,
  error_message text,
  details jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- 3. 创建钉钉部门映射表（如果不存在）
CREATE TABLE IF NOT EXISTS dingtalk_department_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dingtalk_dept_id text UNIQUE NOT NULL,
  dingtalk_dept_name text NOT NULL,
  local_department text,
  parent_id text,
  order_num integer DEFAULT 0,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON dingtalk_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON dingtalk_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_by ON dingtalk_sync_logs(created_by);
CREATE INDEX IF NOT EXISTS idx_dept_mapping_dingtalk_id ON dingtalk_department_mapping(dingtalk_dept_id);
CREATE INDEX IF NOT EXISTS idx_dept_mapping_enabled ON dingtalk_department_mapping(enabled);

-- 启用 RLS
ALTER TABLE dingtalk_sync_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE dingtalk_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dingtalk_department_mapping ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "超级管理员可以管理钉钉配置" ON dingtalk_sync_config;
DROP POLICY IF EXISTS "超级管理员可以查看所有同步日志" ON dingtalk_sync_logs;
DROP POLICY IF EXISTS "超级管理员可以创建同步日志" ON dingtalk_sync_logs;
DROP POLICY IF EXISTS "超级管理员可以管理部门映射" ON dingtalk_department_mapping;
DROP POLICY IF EXISTS "所有用户可以查看部门映射" ON dingtalk_department_mapping;

-- 创建新的 RLS 策略

-- dingtalk_sync_config 策略
CREATE POLICY "超级管理员可以管理钉钉配置" ON dingtalk_sync_config
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- dingtalk_sync_logs 策略
CREATE POLICY "超级管理员可以查看所有同步日志" ON dingtalk_sync_logs
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "超级管理员可以创建同步日志" ON dingtalk_sync_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- dingtalk_department_mapping 策略
CREATE POLICY "超级管理员可以管理部门映射" ON dingtalk_department_mapping
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "所有用户可以查看部门映射" ON dingtalk_department_mapping
  FOR SELECT
  TO authenticated
  USING (true);

-- 创建更新时间触发器
DROP TRIGGER IF EXISTS update_dingtalk_sync_config_updated_at ON dingtalk_sync_config;
CREATE TRIGGER update_dingtalk_sync_config_updated_at
  BEFORE UPDATE ON dingtalk_sync_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dingtalk_department_mapping_updated_at ON dingtalk_department_mapping;
CREATE TRIGGER update_dingtalk_department_mapping_updated_at
  BEFORE UPDATE ON dingtalk_department_mapping
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 创建 RPC 函数：获取同步统计
CREATE OR REPLACE FUNCTION get_sync_statistics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_syncs', COALESCE(COUNT(*), 0),
    'success_count', COALESCE(COUNT(*) FILTER (WHERE status = 'success'), 0),
    'failed_count', COALESCE(COUNT(*) FILTER (WHERE status = 'failed'), 0),
    'last_sync', MAX(started_at),
    'total_users_synced', COALESCE(SUM(success_count), 0)
  )
  INTO result
  FROM dingtalk_sync_logs
  WHERE started_at > now() - interval '30 days';
  
  RETURN result;
END;
$$;