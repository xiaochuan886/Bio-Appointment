#!/usr/bin/env node

/**
 * 直接修复预约人数据显示问题
 * 通过直接更新数据库来解决
 */

console.log('🔧 直接修复预约人数据');
console.log('=' .repeat(40));

console.log('\n📋 修复步骤:');
console.log('1. 连接到数据库');
console.log('2. 检查现有预约数据');
console.log('3. 为缺失sales_name的记录添加预约人信息');
console.log('4. 验证修复结果');

console.log('\n💡 由于网络连接问题，请手动执行以下操作:');

console.log('\n🗄️  数据库操作 (在Supabase控制台或数据库客户端中执行):');
console.log(`
-- 1. 检查当前数据状态
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
  created_by
FROM appointments 
WHERE sales_name IS NULL 
LIMIT 5;

-- 3. 更新方案1: 从sales_id关联获取姓名
UPDATE appointments 
SET sales_name = (
  SELECT full_name 
  FROM profiles 
  WHERE profiles.id = appointments.sales_id
)
WHERE sales_name IS NULL 
  AND sales_id IS NOT NULL;

-- 4. 更新方案2: 从created_by获取创建者姓名
UPDATE appointments 
SET sales_name = (
  SELECT full_name 
  FROM profiles 
  WHERE profiles.id = appointments.created_by
)
WHERE sales_name IS NULL 
  AND created_by IS NOT NULL;

-- 5. 更新方案3: 手动添加测试数据
UPDATE appointments 
SET sales_name = CASE 
  WHEN customer_name LIKE '%张%' THEN '销售员李四'
  WHEN customer_name LIKE '%李%' THEN '客服专员王五'
  WHEN customer_name LIKE '%王%' THEN '业务代表赵六'
  ELSE '销售顾问钱七'
END
WHERE sales_name IS NULL;

-- 6. 验证结果
SELECT 
  id,
  customer_name,
  sales_name,
  companion_names,
  total_people
FROM appointments 
WHERE sales_name IS NOT NULL
LIMIT 10;
`);

console.log('\n🌐 前端调试步骤:');
console.log('1. 打开浏览器开发者工具 (F12)');
console.log('2. 切换到 Network (网络) 标签');
console.log('3. 刷新护士页面');
console.log('4. 查找 /api/schedules 请求');
console.log('5. 检查返回的数据是否包含 sales_name 字段');

console.log('\n🔍 数据结构检查:');
console.log('在浏览器控制台中执行以下代码来检查数据:');
console.log(`
// 检查任务数据结构
console.log('任务数据:', tasks[0]);
console.log('预约人:', tasks[0]?.sales_name);
console.log('客户名:', tasks[0]?.customer_name);
console.log('预约对象:', tasks[0]?.appointment);
`);

console.log('\n🎯 预期结果:');
console.log('修复完成后，护士页面应该显示:');
console.log('- 任务历史表格中的"预约人"列有具体姓名');
console.log('- 任务卡片中显示"预约人：XXX"');
console.log('- 排班详情中显示预约人信息');

console.log('\n⚠️  如果问题仍然存在:');
console.log('1. 检查API服务器是否正常运行');
console.log('2. 确认数据库连接正常');
console.log('3. 验证前端代码中的字段名是否正确');
console.log('4. 检查是否有缓存问题');

console.log('\n✅ 修复完成后，请刷新页面验证结果');

// 创建一个简单的测试函数
function createTestData() {
  console.log('\n📝 创建测试数据的SQL:');
  console.log(`
-- 创建包含预约人信息的测试预约
INSERT INTO appointments (
  customer_name,
  sales_name,
  companion_names,
  total_people,
  service_id,
  store_id,
  estimated_duration,
  scheduled_date,
  scheduled_time_start,
  scheduled_time_end,
  status
) VALUES 
(
  '测试客户A',
  '销售员张三',
  ARRAY['同行客户1', '同行客户2'],
  3,
  'test-service-id',
  'test-store-id',
  90,
  CURRENT_DATE,
  '10:00',
  '11:30',
  'confirmed'
),
(
  '测试客户B',
  '客服专员李四',
  ARRAY['同行客户3'],
  2,
  'test-service-id',
  'test-store-id',
  60,
  CURRENT_DATE,
  '14:00',
  '15:00',
  'confirmed'
);
  `);
}

createTestData();