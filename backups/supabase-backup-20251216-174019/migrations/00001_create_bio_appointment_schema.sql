/*
# Bio-Appointment智能预约调度系统 - 数据库Schema

## 1. 概述
本migration创建Bio-Appointment系统的核心数据表，支持多角色协同的预约调度管理。

## 2. 新建表

### 2.1 profiles (用户档案表)
- `id` (uuid, primary key, references auth.users) - 用户ID
- `name` (text, not null) - 用户姓名
- `role` (user_role enum, not null) - 用户角色：sales(销售)、head_nurse(护士长)、nurse(护士)、doctor(医生)
- `phone` (text) - 联系电话
- `email` (text) - 邮箱
- `status` (text, default 'active') - 状态：active(在职)、unavailable(请假)
- `created_at` (timestamptz, default now()) - 创建时间
- `updated_at` (timestamptz, default now()) - 更新时间

### 2.2 services (服务项目表)
- `id` (uuid, primary key) - 服务ID
- `name` (text, not null) - 服务名称
- `category` (text, not null) - 服务类别：nursing(护理)、consultation(面诊)、report(报告解读)
- `base_duration` (integer, not null) - 标准预估时长(分钟)
- `requires_doctor` (boolean, default false) - 是否需要医生
- `allow_companions` (boolean, default false) - 是否允许同行客户
- `is_active` (boolean, default true) - 是否启用
- `created_at` (timestamptz, default now()) - 创建时间

### 2.3 resources (资源表)
- `id` (uuid, primary key) - 资源ID
- `name` (text, not null) - 资源名称
- `type` (text, not null) - 资源类型：room(房间)、nurse(护士)
- `category` (text) - 资源分类：vip_room(VIP室)、treatment_area(治疗区)
- `status` (text, default 'available') - 状态：available(可用)、unavailable(不可用)
- `created_at` (timestamptz, default now()) - 创建时间

### 2.4 appointments (预约表)
- `id` (uuid, primary key) - 预约ID
- `customer_name` (text, not null) - 主客户姓名
- `companion_names` (text[]) - 同行客户姓名数组
- `total_people` (integer, not null) - 总人数
- `service_id` (uuid, references services) - 服务项目ID
- `requested_date` (date, not null) - 预约日期
- `requested_time_start` (time) - 请求开始时间
- `requested_time_end` (time) - 请求结束时间
- `estimated_duration` (integer, not null) - 预估时长(分钟)
- `actual_duration` (integer) - 实际时长(分钟)
- `is_urgent` (boolean, default false) - 是否急单
- `status` (text, not null) - 状态：pending(待排班)、scheduled(已排班)、confirmed(已确认)、in_progress(进行中)、completed(已完成)、cancelled(已取消)
- `sales_id` (uuid, references profiles) - 销售ID
- `doctor_id` (uuid, references profiles) - 医生ID
- `doctor_status` (text) - 医生确认状态：pending(待确认)、accepted(已接受)、rejected(已拒绝)
- `doctor_note` (text) - 医生备注
- `created_by` (uuid, references profiles) - 创建人ID
- `created_at` (timestamptz, default now()) - 创建时间
- `updated_at` (timestamptz, default now()) - 更新时间

### 2.5 schedules (排班表)
- `id` (uuid, primary key) - 排班ID
- `appointment_id` (uuid, references appointments, unique) - 预约ID
- `scheduled_date` (date, not null) - 排班日期
- `scheduled_time_start` (time, not null) - 排班开始时间
- `scheduled_time_end` (time, not null) - 排班结束时间
- `room_id` (uuid, references resources) - 房间ID
- `nurse_id` (uuid, references resources) - 护士ID
- `adjusted_duration` (integer) - 护士长调整后的时长(分钟)
- `adjustment_reason` (text) - 调整原因
- `status` (text, not null) - 状态：draft(草稿)、published(已发布)、locked(已锁定)
- `created_by` (uuid, references profiles) - 创建人(护士长)ID
- `created_at` (timestamptz, default now()) - 创建时间
- `updated_at` (timestamptz, default now()) - 更新时间

### 2.6 task_executions (任务执行表)
- `id` (uuid, primary key) - 执行ID
- `schedule_id` (uuid, references schedules) - 排班ID
- `nurse_id` (uuid, references profiles) - 执行护士ID
- `check_in_time` (timestamptz) - 客户到达时间
- `start_time` (timestamptz) - 开始服务时间
- `finish_time` (timestamptz) - 结束服务时间
- `actual_duration` (integer) - 实际执行时长(分钟)
- `overtime_note` (text) - 超时备注
- `status` (text, not null) - 状态：pending(待执行)、checked_in(已到达)、in_progress(进行中)、completed(已完成)
- `created_at` (timestamptz, default now()) - 创建时间
- `updated_at` (timestamptz, default now()) - 更新时间

## 3. 安全策略
- 所有表不启用RLS，因为这是内部管理系统
- 所有用户都可以读写数据，权限通过应用层的角色字段控制
- 管理员可以完全访问所有数据

## 4. 索引优化
- appointments表按日期和状态索引
- schedules表按日期和时间索引
- 资源表按类型和状态索引

## 5. 触发器
- 自动更新updated_at字段
*/

-- 创建用户角色枚举
CREATE TYPE user_role AS ENUM ('sales', 'head_nurse', 'nurse', 'doctor');

-- 创建profiles表
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role user_role NOT NULL,
  phone text,
  email text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'unavailable')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建services表
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('nursing', 'consultation', 'report')),
  base_duration integer NOT NULL CHECK (base_duration > 0),
  requires_doctor boolean DEFAULT false,
  allow_companions boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 创建resources表
CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('room', 'nurse')),
  category text,
  status text DEFAULT 'available' CHECK (status IN ('available', 'unavailable')),
  created_at timestamptz DEFAULT now()
);

-- 创建appointments表
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  companion_names text[],
  total_people integer NOT NULL CHECK (total_people > 0),
  service_id uuid REFERENCES services(id),
  requested_date date NOT NULL,
  requested_time_start time,
  requested_time_end time,
  estimated_duration integer NOT NULL CHECK (estimated_duration > 0),
  actual_duration integer,
  is_urgent boolean DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  sales_id uuid REFERENCES profiles(id),
  doctor_id uuid REFERENCES profiles(id),
  doctor_status text CHECK (doctor_status IN ('pending', 'accepted', 'rejected')),
  doctor_note text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建schedules表
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  scheduled_time_start time NOT NULL,
  scheduled_time_end time NOT NULL,
  room_id uuid REFERENCES resources(id),
  nurse_id uuid REFERENCES resources(id),
  adjusted_duration integer,
  adjustment_reason text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'locked')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建task_executions表
CREATE TABLE IF NOT EXISTS task_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES schedules(id) ON DELETE CASCADE,
  nurse_id uuid REFERENCES profiles(id),
  check_in_time timestamptz,
  start_time timestamptz,
  finish_time timestamptz,
  actual_duration integer,
  overtime_note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'checked_in', 'in_progress', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX idx_appointments_date_status ON appointments(requested_date, status);
CREATE INDEX idx_schedules_date_time ON schedules(scheduled_date, scheduled_time_start);
CREATE INDEX idx_resources_type_status ON resources(type, status);
CREATE INDEX idx_profiles_role ON profiles(role);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要的表添加更新时间触发器
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_executions_updated_at BEFORE UPDATE ON task_executions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入初始服务项目数据
INSERT INTO services (name, category, base_duration, requires_doctor, allow_companions, is_active) VALUES
  ('抽血服务', 'nursing', 60, false, true, true),
  ('细胞回输', 'nursing', 120, false, false, true),
  ('医生面诊', 'consultation', 30, true, false, true),
  ('报告深度解读', 'report', 45, true, false, true);

-- 插入初始资源数据
INSERT INTO resources (name, type, category, status) VALUES
  ('VIP室1', 'room', 'vip_room', 'available'),
  ('VIP室2', 'room', 'vip_room', 'available'),
  ('VIP室3', 'room', 'vip_room', 'available'),
  ('VIP室4', 'room', 'vip_room', 'available'),
  ('VIP室5', 'room', 'vip_room', 'available'),
  ('治疗区A', 'room', 'treatment_area', 'available'),
  ('治疗区B', 'room', 'treatment_area', 'available'),
  ('治疗区C', 'room', 'treatment_area', 'available');

-- 创建RPC函数：检查资源可用性
CREATE OR REPLACE FUNCTION check_resource_availability(
  p_date date,
  p_time_start time,
  p_time_end time,
  p_exclude_schedule_id uuid DEFAULT NULL
)
RETURNS TABLE(
  available_rooms jsonb,
  available_nurses jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'category', r.category))
     FROM resources r
     WHERE r.type = 'room' AND r.status = 'available'
       AND NOT EXISTS (
         SELECT 1 FROM schedules s
         WHERE s.room_id = r.id
           AND s.scheduled_date = p_date
           AND s.status != 'draft'
           AND (s.id != p_exclude_schedule_id OR p_exclude_schedule_id IS NULL)
           AND (
             (s.scheduled_time_start, s.scheduled_time_end) OVERLAPS (p_time_start, p_time_end)
           )
       )
    ) as available_rooms,
    (SELECT jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name))
     FROM resources r
     WHERE r.type = 'nurse' AND r.status = 'available'
       AND NOT EXISTS (
         SELECT 1 FROM schedules s
         WHERE s.nurse_id = r.id
           AND s.scheduled_date = p_date
           AND s.status != 'draft'
           AND (s.id != p_exclude_schedule_id OR p_exclude_schedule_id IS NULL)
           AND (
             (s.scheduled_time_start, s.scheduled_time_end) OVERLAPS (p_time_start, p_time_end)
           )
       )
    ) as available_nurses;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;