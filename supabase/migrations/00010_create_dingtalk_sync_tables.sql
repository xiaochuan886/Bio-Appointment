/*
# 创建钉钉同步相关表

## 1. 新增表

### dingtalk_sync_config（钉钉同步配置表）
- `id` (uuid, 主键)
- `app_key` (text, 钉钉应用 AppKey)
- `app_secret` (text, 钉钉应用 AppSecret，加密存储)
- `agent_id` (text, 钉钉应用 AgentId)
- `corp_id` (text, 钉钉企业 CorpId)
- `sync_enabled` (boolean, 是否启用同步)
- `auto_sync_enabled` (boolean, 是否启用自动同步)
- `sync_schedule` (text, 同步计划，如 'daily', 'hourly')
- `sync_time` (time, 同步时间)
- `conflict_strategy` (text, 冲突解决策略：'dingtalk_first', 'local_first', 'manual')
- `selected_departments` (jsonb, 选择的部门列表)
- `last_sync_at` (timestamptz, 最后同步时间)
- `created_at` (timestamptz, 创建时间)
- `updated_at` (timestamptz, 更新时间)

### dingtalk_sync_logs（钉钉同步日志表）
- `id` (uuid, 主键)
- `sync_type` (text, 同步类型：'manual', 'auto', 'incremental')
- `status` (text, 状态：'pending', 'running', 'success', 'failed', 'partial')
- `total_users` (integer, 总用户数)
- `success_count` (integer, 成功数量)
- `failed_count` (integer, 失败数量)
- `skipped_count` (integer, 跳过数量)
- `error_message` (text, 错误信息)
- `details` (jsonb, 详细信息)
- `started_at` (timestamptz, 开始时间)
- `completed_at` (timestamptz, 完成时间)
- `created_by` (uuid, 创建人)
- `created_at` (timestamptz, 创建时间)

### dingtalk_department_mapping（钉钉部门映射表）
- `id` (uuid, 主键)
- `dingtalk_dept_id` (text, 钉钉部门 ID)
- `dingtalk_dept_name` (text, 钉钉部门名称)
- `local_department` (text, 本地部门名称)
- `parent_id` (text, 父部门 ID)
- `order_num` (integer, 排序)
- `enabled` (boolean, 是否启用)
- `created_at` (timestamptz, 创建时间)
- `updated_at` (timestamptz, 更新时间)

## 2. 安全策略
- 所有表启用 RLS
- 超级管理员拥有完全访问权限
- 普通用户只能查看同步日志

## 3. 索引
- 为常用查询字段创建索引
*/

-- 创建同步状态枚举
CREATE TYPE sync_status AS ENUM ('pending', 'running', 'success', 'failed', 'partial');

-- 创建同步类型枚举
CREATE TYPE sync_type AS ENUM ('manual', 'auto', 'incremental');

-- 创建冲突策略枚举
CREATE TYPE conflict_strategy AS ENUM ('dingtalk_first', 'local_first', 'manual');

-- 1. 创建钉钉同步配置表
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

-- 2. 创建钉钉同步日志表
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

-- 3. 创建钉钉部门映射表
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON dingtalk_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON dingtalk_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_by ON dingtalk_sync_logs(created_by);
CREATE INDEX IF NOT EXISTS idx_dept_mapping_dingtalk_id ON dingtalk_department_mapping(dingtalk_dept_id);
CREATE INDEX IF NOT EXISTS idx_dept_mapping_enabled ON dingtalk_department_mapping(enabled);

-- 启用 RLS
ALTER TABLE dingtalk_sync_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE dingtalk_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dingtalk_department_mapping ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略

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
CREATE TRIGGER update_dingtalk_sync_config_updated_at
  BEFORE UPDATE ON dingtalk_sync_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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
    'total_syncs', COUNT(*),
    'success_count', COUNT(*) FILTER (WHERE status = 'success'),
    'failed_count', COUNT(*) FILTER (WHERE status = 'failed'),
    'last_sync', MAX(started_at),
    'total_users_synced', SUM(success_count)
  )
  INTO result
  FROM dingtalk_sync_logs
  WHERE started_at > now() - interval '30 days';
  
  RETURN result;
END;
$$;