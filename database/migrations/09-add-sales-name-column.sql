-- 添加预约人信息列到appointments表
-- 创建时间: 2025-12-11
-- 描述: 为appointments表添加sales_name等预约人相关字段，并更新现有数据

-- 1. 添加预约人相关列
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS sales_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS sales_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS sales_role VARCHAR(50);

-- 2. 为现有记录更新预约人信息
-- 基于sales_id关联profiles表获取预约人信息
UPDATE appointments 
SET 
    sales_name = p.full_name,
    sales_username = p.username,
    sales_role = p.role
FROM profiles p
WHERE appointments.sales_id = p.id 
  AND appointments.sales_name IS NULL;

-- 3. 为没有sales_id但有created_by的记录更新预约人信息
-- 使用创建者作为预约人
UPDATE appointments 
SET 
    sales_name = p.full_name,
    sales_username = p.username,
    sales_role = p.role
FROM profiles p
WHERE appointments.created_by = p.id 
  AND appointments.sales_name IS NULL
  AND appointments.sales_id IS NULL;

-- 4. 创建触发器函数，在插入或更新时自动设置预约人信息
CREATE OR REPLACE FUNCTION update_appointment_sales_info()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果设置了sales_id但没有sales_name，自动从profiles表获取
    IF NEW.sales_id IS NOT NULL AND NEW.sales_name IS NULL THEN
        SELECT full_name, username, role 
        INTO NEW.sales_name, NEW.sales_username, NEW.sales_role
        FROM profiles 
        WHERE id = NEW.sales_id;
    END IF;
    
    -- 如果没有sales_id但有created_by，使用创建者信息
    IF NEW.sales_id IS NULL AND NEW.created_by IS NOT NULL AND NEW.sales_name IS NULL THEN
        SELECT full_name, username, role 
        INTO NEW.sales_name, NEW.sales_username, NEW.sales_role
        FROM profiles 
        WHERE id = NEW.created_by;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建触发器
DROP TRIGGER IF EXISTS trigger_update_appointment_sales_info ON appointments;
CREATE TRIGGER trigger_update_appointment_sales_info
    BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_appointment_sales_info();

-- 6. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_appointments_sales_name ON appointments(sales_name);
CREATE INDEX IF NOT EXISTS idx_appointments_sales_id ON appointments(sales_id);

-- 7. 添加注释
COMMENT ON COLUMN appointments.sales_name IS '预约人姓名（冗余字段，用于提高查询性能）';
COMMENT ON COLUMN appointments.sales_username IS '预约人用户名（冗余字段）';
COMMENT ON COLUMN appointments.sales_role IS '预约人角色（冗余字段）';

-- 8. 统计更新结果
DO $$
DECLARE
    total_appointments INTEGER;
    with_sales_name INTEGER;
    update_percentage NUMERIC;
BEGIN
    SELECT COUNT(*) INTO total_appointments FROM appointments;
    SELECT COUNT(*) INTO with_sales_name FROM appointments WHERE sales_name IS NOT NULL;
    
    IF total_appointments > 0 THEN
        update_percentage := ROUND((with_sales_name::NUMERIC / total_appointments::NUMERIC) * 100, 2);
    ELSE
        update_percentage := 0;
    END IF;
    
    RAISE NOTICE '预约人信息更新完成！';
    RAISE NOTICE '总预约记录数: %', total_appointments;
    RAISE NOTICE '有预约人信息的记录数: %', with_sales_name;
    RAISE NOTICE '更新覆盖率: %％', update_percentage;
END $$;