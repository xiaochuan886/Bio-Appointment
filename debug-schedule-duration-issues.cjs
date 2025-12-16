const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bio_appointment',
});

async function debugScheduleDurationIssues() {
  console.log('🔍 调试排班时长问题');
  console.log('=====================================');

  try {
    // 1. 检查排班数据中的时长字段
    console.log('\n📊 检查排班数据中的时长字段:');
    const scheduleQuery = `
      SELECT 
        s.id,
        s.scheduled_time_start,
        s.scheduled_time_end,
        s.adjusted_duration,
        s.adjustment_reason,
        a.estimated_duration as appointment_estimated_duration,
        a.customer_name,
        a.service_id,
        srv.name as service_name,
        srv.base_duration as service_base_duration
      FROM schedules s
      LEFT JOIN appointments a ON s.appointment_id = a.id
      LEFT JOIN services srv ON a.service_id = srv.id
      WHERE a.service_id IS NOT NULL
      ORDER BY a.customer_name
      LIMIT 5
    `;
    
    const scheduleResult = await pool.query(scheduleQuery);
    
    console.log('排班数据样本:');
    scheduleResult.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. ${row.customer_name} - ${row.service_name}`);
      console.log(`   排班时间: ${row.scheduled_time_start} - ${row.scheduled_time_end}`);
      console.log(`   调整时长: ${row.adjusted_duration || '未设置'}`);
      console.log(`   预约时长: ${row.appointment_estimated_duration}`);
      console.log(`   服务基础时长: ${row.service_base_duration}`);
      
      // 计算实际排班时长
      if (row.scheduled_time_start && row.scheduled_time_end) {
        const [startHour, startMinute] = row.scheduled_time_start.split(':').map(Number);
        const [endHour, endMinute] = row.scheduled_time_end.split(':').map(Number);
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;
        const actualDuration = endMinutes - startMinutes;
        
        console.log(`   实际排班时长: ${actualDuration}分钟`);
        
        // 检查时长是否一致
        const expectedDuration = row.adjusted_duration || row.appointment_estimated_duration || row.service_base_duration;
        if (actualDuration !== expectedDuration) {
          console.log(`   ⚠️  时长不一致! 实际:${actualDuration}分钟, 预期:${expectedDuration}分钟`);
        }
      }
    });

    // 2. 检查创建排班API的逻辑
    console.log('\n🔧 检查创建排班API的逻辑:');
    console.log('在SchedulePage.tsx的handleCreateSchedule函数中:');
    console.log('- 设置了adjusted_duration字段');
    console.log('- 但没有根据adjusted_duration重新计算scheduled_time_end');
    
    console.log('\n在saveSchedule函数中:');
    console.log('- 创建排班时直接使用了表单中的scheduled_time_end');
    console.log('- 但这个值可能不是根据adjusted_duration计算的');
    
    // 3. 检查甘特图显示逻辑
    console.log('\n📊 检查甘特图显示逻辑:');
    console.log('在GanttChart.tsx中:');
    console.log('- getSchedulePosition函数使用scheduled_time_start和scheduled_time_end计算位置');
    console.log('- TooltipContent中只显示时间，不显示调整后的时长');
    console.log('- ScheduleDetailDialog.tsx中正确显示了adjusted_duration');

    // 4. 模拟创建排班的问题场景
    console.log('\n🧪 模拟问题场景:');
    console.log('假设预约标准时长60分钟，用户调整为90分钟:');
    console.log('1. handleCreateSchedule设置adjusted_duration=90');
    console.log('2. 但scheduled_time_end仍基于原始60分钟计算');
    console.log('3. 甘特图显示60分钟的宽度');
    console.log('4. Tooltip显示60分钟的时间段');
    console.log('5. 只有弹窗显示90分钟');

    console.log('\n✅ 问题分析完成');
    console.log('=====================================');
    
  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error);
  } finally {
    await pool.end();
  }
}

debugScheduleDurationIssues();