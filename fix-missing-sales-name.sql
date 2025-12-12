-- 修复缺失的预约人数据
-- 这个脚本会为所有缺少sales_name的预约添加预约人信息

-- 1. 首先检查当前数据状态
SELECT 
  COUNT(*) as total_appointments,
  COUNT(sales_name) as with_sales_name,
  COUNT(sales_id) as with_sales_id,
  COUNT(created_by) as with_created_by
FROM appointments;

-- 2. 查看缺少sales_name的预约
SELECT 
  id,
  customer_name,
  sales_name,
  sales_id,
  created_by,
  scheduled_date
FROM appointments 
WHERE sales_name IS NULL 
LIMIT 10;

-- 3. 更新缺失的sales_name字段
-- 方案1: 从sales_id关联的profiles表获取姓名
UPDATE appointments 
SET sales_name = (
  SELECT full_name 
  FROM profiles 
  WHERE profiles.id = appointments.sales_id
)
WHERE sales_name IS NULL 
  AND sales_id IS NOT NULL;

-- 方案2: 如果没有sales_id，从created_by获取创建者姓名
UPDATE appointments 
SET sales_name = (
  SELECT full_name 
  FROM profiles 
  WHERE profiles.id = appointments.created_by
)
WHERE sales_name IS NULL 
  AND created_by IS NOT NULL;

-- 方案3: 如果以上都没有，设置默认值
UPDATE appointments 
SET sales_name = '系统管理员'
WHERE sales_name IS NULL;

-- 4. 验证更新结果
SELECT 
  COUNT(*) as total_appointments,
  COUNT(sales_name) as with_sales_name,
  COUNT(CASE WHEN sales_name IS NOT NULL THEN 1 END) as updated_count
FROM appointments;

-- 5. 查看更新后的数据样例
SELECT 
  id,
  customer_name,
  sales_name,
  companion_names,
  total_people,
  scheduled_date
FROM appointments 
WHERE sales_name IS NOT NULL
LIMIT 5;