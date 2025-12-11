// 验证排班过滤功能的简单脚本
// 在浏览器控制台中运行

console.log('🧪 开始验证排班过滤功能...');

// 模拟排班数据
const mockSchedules = [
  { id: 1, status: 'scheduled', scheduled_date: '2025-12-10T00:00:00.000Z', appointment: { customer_name: '张三' } },
  { id: 2, status: 'cancelled', scheduled_date: '2025-12-10T00:00:00.000Z', appointment: { customer_name: '李四' } },
  { id: 3, status: 'completed', scheduled_date: '2025-12-10T00:00:00.000Z', appointment: { customer_name: '王五' } },
  { id: 4, status: 'in_progress', scheduled_date: '2025-12-10T00:00:00.000Z', appointment: { customer_name: '赵六' } },
  { id: 5, status: 'cancelled', scheduled_date: '2025-12-11T00:00:00.000Z', appointment: { customer_name: '钱七' } },
];

console.log('📊 原始数据:', mockSchedules);

// 测试过滤逻辑（模拟甘特图组件的过滤）
function testScheduleFilter(schedules, viewMode) {
  let visibleSchedules = schedules;
  
  // 在周视图和月视图中，过滤掉已取消的排班
  if (viewMode === 'week' || viewMode === 'month') {
    const originalCount = schedules.length;
    visibleSchedules = schedules.filter(schedule => schedule.status !== 'cancelled');
    const filteredCount = visibleSchedules.length;
    const cancelledCount = originalCount - filteredCount;
    
    console.log(`[${viewMode}视图] 过滤结果:`, {
      原始排班数: originalCount,
      过滤后排班数: filteredCount,
      已取消排班数: cancelledCount,
      已取消排班: schedules.filter(s => s.status === 'cancelled').map(s => ({
        id: s.id,
        status: s.status,
        customer: s.appointment?.customer_name
      }))
    });
  }
  
  return visibleSchedules;
}

// 测试不同视图模式
console.log('\n=== 测试结果 ===');
const dayViewResult = testScheduleFilter(mockSchedules, 'day');
const weekViewResult = testScheduleFilter(mockSchedules, 'week');
const monthViewResult = testScheduleFilter(mockSchedules, 'month');

console.log('\n📈 汇总:');
console.log('日视图排班数:', dayViewResult.length, '(应该包含已取消排班)');
console.log('周视图排班数:', weekViewResult.length, '(应该排除已取消排班)');
console.log('月视图排班数:', monthViewResult.length, '(应该排除已取消排班)');

// 验证周二数据
const tuesdaySchedules = mockSchedules.filter(s => s.scheduled_date.startsWith('2025-12-10'));
const tuesdayFiltered = tuesdaySchedules.filter(s => s.status !== 'cancelled');

console.log('\n📅 周二数据验证:');
console.log('周二总排班:', tuesdaySchedules.length);
console.log('周二已取消:', tuesdaySchedules.filter(s => s.status === 'cancelled').length);
console.log('周二过滤后:', tuesdayFiltered.length);
console.log('预期结果: 应该显示3个排班(排除1个已取消)');

if (tuesdayFiltered.length === 3 && tuesdaySchedules.filter(s => s.status === 'cancelled').length === 1) {
  console.log('✅ 测试通过！');
} else {
  console.log('❌ 测试失败！');
}

console.log('🔍 请检查浏览器网络面板和控制台，查看实际的API响应和过滤日志');