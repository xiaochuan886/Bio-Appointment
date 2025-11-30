-- 钉钉同步配置和部门映射表
-- 基于 Supabase migration 00010 和 00011

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

-- 1. 创建钉钉同步配置表
CREATE TABLE IF NOT EXISTS dingtalk_sync_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_key TEXT NOT NULL,
  app_secret TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  corp_id TEXT NOT NULL,
  sync_enabled BOOLEAN DEFAULT true,
  auto_sync_enabled BOOLEAN DEFAULT false,
  sync_schedule TEXT DEFAULT 'daily',
  sync_time TIME DEFAULT '02:00:00',
  conflict_strategy conflict_strategy DEFAULT 'dingtalk_first',
  selected_departments JSONB DEFAULT '[]'::jsonb,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 更新钉钉同步日志表（如果已存在则修改，否则创建）
DROP TABLE IF EXISTS dingtalk_sync_logs CASCADE;

CREATE TABLE dingtalk_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_type sync_type NOT NULL,
  status sync_status DEFAULT 'pending',
  total_users INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  error_message TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 创建钉钉部门映射表
CREATE TABLE IF NOT EXISTS dingtalk_department_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dingtalk_dept_id TEXT UNIQUE NOT NULL,
  dingtalk_dept_name TEXT NOT NULL,
  local_department TEXT,
  parent_id TEXT,
  order_num INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON dingtalk_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON dingtalk_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_by ON dingtalk_sync_logs(created_by);
CREATE INDEX IF NOT EXISTS idx_dept_mapping_dingtalk_id ON dingtalk_department_mapping(dingtalk_dept_id);
CREATE INDEX IF NOT EXISTS idx_dept_mapping_enabled ON dingtalk_department_mapping(enabled);

-- 创建更新时间触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

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
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
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

-- 添加注释
COMMENT ON TABLE dingtalk_sync_config IS '钉钉同步配置表';
COMMENT ON TABLE dingtalk_sync_logs IS '钉钉同步日志表';
COMMENT ON TABLE dingtalk_department_mapping IS '钉钉部门映射表';
