/*
# 修复schedules表的外键约束

## 问题
schedules表的room_id和nurse_id外键约束指向旧的resources表，
但系统已升级为使用独立的nurses和rooms表。

## 修改内容

### 1. 删除旧的外键约束
- schedules_room_id_fkey (指向resources表)
- schedules_nurse_id_fkey (指向resources表)

### 2. 添加新的外键约束
- schedules_room_id_fkey (指向rooms表)
- schedules_nurse_id_fkey (指向nurses表)

### 3. 数据迁移
由于schedules表可能已有数据引用了resources表的ID，
需要先清理这些数据或进行数据迁移。
为简化处理，本迁移会清空schedules表。

## 注意事项
- 本迁移会清空schedules表的所有数据
- 如果生产环境有重要数据，需要先备份
*/

-- ==================== 清理现有数据 ====================

-- 清空schedules表（因为外键引用的是旧表的ID，无法直接迁移）
TRUNCATE TABLE schedules CASCADE;

-- ==================== 删除旧的外键约束 ====================

-- 删除room_id的外键约束（指向resources表）
ALTER TABLE schedules 
DROP CONSTRAINT IF EXISTS schedules_room_id_fkey;

-- 删除nurse_id的外键约束（指向resources表）
ALTER TABLE schedules 
DROP CONSTRAINT IF EXISTS schedules_nurse_id_fkey;

-- ==================== 添加新的外键约束 ====================

-- 添加room_id的外键约束（指向rooms表）
ALTER TABLE schedules 
ADD CONSTRAINT schedules_room_id_fkey 
FOREIGN KEY (room_id) 
REFERENCES rooms(id) 
ON DELETE RESTRICT;

-- 添加nurse_id的外键约束（指向nurses表）
ALTER TABLE schedules 
ADD CONSTRAINT schedules_nurse_id_fkey 
FOREIGN KEY (nurse_id) 
REFERENCES nurses(id) 
ON DELETE RESTRICT;

-- ==================== 验证约束 ====================

-- 查看schedules表的所有外键约束
-- 应该看到：
-- - schedules_room_id_fkey -> rooms(id)
-- - schedules_nurse_id_fkey -> nurses(id)
-- - schedules_appointment_id_fkey -> appointments(id)
-- - schedules_created_by_fkey -> profiles(id)
