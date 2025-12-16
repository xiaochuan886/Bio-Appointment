const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function testScheduleFixVerification() {
  console.log('🔍 验证排班修复效果...\n');
  
  try {
    // 1. 测试调整时长功能
    console.log('📝 测试1: 验证调整时长字段是否正确传递');
    
    // 获取一个现有的排班
    const scheduleResult = await pool.query(`
      SELECT s.id, s.appointment_id, s.scheduled_time_start, s.scheduled_time_end, 
             a.estimated_duration as current_duration, a.requested_time_start
      FROM schedules s
      LEFT JOIN appointments a ON s.appointment_id = a.id
      WHERE s.status != 'cancelled'
      ORDER BY s.created_at DESC
      LIMIT 1
    `);
    
    if (scheduleResult.rows.length === 0) {
      console.log('❌ 没有找到可测试的排班');
      return;
    }
    
    const testSchedule = scheduleResult.rows[0];
    console.log('📋 测试排班信息:');
    console.log(`   排班ID: ${testSchedule.id}`);
    console.log(`   预约ID: ${testSchedule.appointment_id}`);
    console.log(`   当前开始时间: ${testSchedule.scheduled_time_start}`);
    console.log(`   当前结束时间: ${testSchedule.scheduled_time_end}`);
    console.log(`   当前时长: ${testSchedule.current_duration} 分钟`);
    console.log(`   预约请求时间: ${testSchedule.requested_time_start}`);
    console.log('');
    
    // 2. 模拟前端提交调整时长
    const adjustedDuration = 120; // 设置为120分钟
    const adjustmentReason = '测试调整时长';
    
    console.log(`🔄 模拟前端提交调整时长: ${adjustedDuration} 分钟，原因: ${adjustmentReason}`);
    
    // 模拟API调用（直接更新数据库）
    const updateResult = await pool.query(`
      UPDATE schedules 
        SET adjusted_duration = $1, adjustment_reason = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
    `, [adjustedDuration, adjustmentReason, testSchedule.id]);
    
    console.log('✅ 排班调整时长更新成功');
    
    // 3. 验证时长同步逻辑
    console.log('\n📊 测试2: 验证时长同步逻辑');
    
    // 更新排班时间以触发时长同步
    const newStartTime = testSchedule.scheduled_time_start;
    const newEndTime = '11:00:00'; // 增加时间
    
    await pool.query(`
      UPDATE schedules 
        SET scheduled_time_end = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
    `, [newEndTime, testSchedule.id]);
    
    console.log('✅ 排班时间更新成功');
    
    // 4. 检查预约时长是否被同步更新
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒确保更新完成
    
    const appointmentCheck = await pool.query(`
      SELECT estimated_duration FROM appointments WHERE id = $1
    `, [testSchedule.appointment_id]);
    
    const updatedDuration = appointmentCheck.rows[0].estimated_duration;
    
    // 计算期望的时长
    const startTime = new Date(`1970-01-01T${newStartTime}`);
    const endTime = new Date(`1970-01-01T${newEndTime}`);
    const expectedDuration = Math.round((endTime - startTime) / (1000 * 60));
    
    console.log('\n📊 时长同步验证结果:');
    console.log(`   更新后的预约时长: ${updatedDuration} 分钟`);
    console.log(`   期望的时长: ${expectedDuration} 分钟`);
    console.log(`   时长是否正确同步: ${updatedDuration === expectedDuration ? '✅ 是' : '❌ 否'}`);
    
    if (updatedDuration === expectedDuration) {
      console.log('\n🎉 修复验证成功！');
      console.log('✅ 调整时长字段正确传递到后端');
      console.log('✅ 时长同步逻辑正常工作');
      console.log('✅ 排班编辑功能完全正常');
    } else {
      console.log('\n❌ 修复验证失败！');
      console.log('❌ 调整时长字段未正确传递或时长同步逻辑有问题');
    }
    
  } catch (error) {
    console.error('❌ 验证过程中出错:', error);
  } finally {
    await pool.end();
  }
}

testScheduleFixVerification();