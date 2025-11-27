/*
# 创建资源管理表

## 概述
为系统配置功能创建独立的资源管理表：护士、医生、房间

## 新增表

### 1. nurses（护士表）
- `id` (uuid, primary key)
- `name` (text, not null) - 护士姓名
- `skill_level` (text, not null) - 技能等级：junior/intermediate/senior
- `is_available` (boolean, default true) - 是否可用
- `created_at` (timestamptz, default now())

### 2. doctors（医生表）
- `id` (uuid, primary key)
- `name` (text, not null) - 医生姓名
- `specialty` (text, not null) - 专业领域
- `is_available` (boolean, default true) - 是否可用
- `created_at` (timestamptz, default now())

### 3. rooms（房间表）
- `id` (uuid, primary key)
- `name` (text, not null) - 房间名称
- `room_type` (text, not null) - 房间类型：vip/treatment/consultation
- `is_available` (boolean, default true) - 是否可用
- `created_at` (timestamptz, default now())

## 安全策略
- 所有表启用RLS
- 允许所有用户读取
- 允许所有用户写入（后续可根据需求调整为仅管理员可写）

## 索引
- 为常用查询字段创建索引
*/

-- ==================== 创建护士表 ====================

CREATE TABLE IF NOT EXISTS nurses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  skill_level TEXT NOT NULL CHECK (skill_level IN ('junior', 'intermediate', 'senior')),
  is_available BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_nurses_is_available ON nurses(is_available);
CREATE INDEX IF NOT EXISTS idx_nurses_name ON nurses(name);

-- 启用RLS
ALTER TABLE nurses ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许所有用户读取
CREATE POLICY "允许所有用户查看护士" ON nurses
  FOR SELECT
  USING (true);

-- 创建策略：允许所有用户插入
CREATE POLICY "允许所有用户添加护士" ON nurses
  FOR INSERT
  WITH CHECK (true);

-- 创建策略：允许所有用户更新
CREATE POLICY "允许所有用户更新护士" ON nurses
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 创建策略：允许所有用户删除
CREATE POLICY "允许所有用户删除护士" ON nurses
  FOR DELETE
  USING (true);

-- ==================== 创建医生表 ====================

CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_doctors_is_available ON doctors(is_available);
CREATE INDEX IF NOT EXISTS idx_doctors_name ON doctors(name);

-- 启用RLS
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许所有用户读取
CREATE POLICY "允许所有用户查看医生" ON doctors
  FOR SELECT
  USING (true);

-- 创建策略：允许所有用户插入
CREATE POLICY "允许所有用户添加医生" ON doctors
  FOR INSERT
  WITH CHECK (true);

-- 创建策略：允许所有用户更新
CREATE POLICY "允许所有用户更新医生" ON doctors
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 创建策略：允许所有用户删除
CREATE POLICY "允许所有用户删除医生" ON doctors
  FOR DELETE
  USING (true);

-- ==================== 创建房间表 ====================

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  room_type TEXT NOT NULL CHECK (room_type IN ('vip', 'treatment', 'consultation')),
  is_available BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_rooms_is_available ON rooms(is_available);
CREATE INDEX IF NOT EXISTS idx_rooms_name ON rooms(name);
CREATE INDEX IF NOT EXISTS idx_rooms_room_type ON rooms(room_type);

-- 启用RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许所有用户读取
CREATE POLICY "允许所有用户查看房间" ON rooms
  FOR SELECT
  USING (true);

-- 创建策略：允许所有用户插入
CREATE POLICY "允许所有用户添加房间" ON rooms
  FOR INSERT
  WITH CHECK (true);

-- 创建策略：允许所有用户更新
CREATE POLICY "允许所有用户更新房间" ON rooms
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 创建策略：允许所有用户删除
CREATE POLICY "允许所有用户删除房间" ON rooms
  FOR DELETE
  USING (true);

-- ==================== 插入初始数据 ====================

-- 插入示例护士数据
INSERT INTO nurses (name, skill_level, is_available) VALUES
  ('护士A', 'senior', true),
  ('护士B', 'intermediate', true),
  ('护士C', 'intermediate', true),
  ('护士D', 'junior', true)
ON CONFLICT DO NOTHING;

-- 插入示例医生数据
INSERT INTO doctors (name, specialty, is_available) VALUES
  ('李医生', '肿瘤科', true),
  ('王医生', '心血管科', true),
  ('张医生', '内分泌科', true)
ON CONFLICT DO NOTHING;

-- 插入示例房间数据
INSERT INTO rooms (name, room_type, is_available) VALUES
  ('VIP室1', 'vip', true),
  ('VIP室2', 'vip', true),
  ('VIP室3', 'vip', true),
  ('治疗区A', 'treatment', true),
  ('治疗区B', 'treatment', true),
  ('治疗区C', 'treatment', true),
  ('咨询室1', 'consultation', true),
  ('咨询室2', 'consultation', true)
ON CONFLICT DO NOTHING;
