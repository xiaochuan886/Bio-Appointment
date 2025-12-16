const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function testScheduleDurationUpdate() {
  console.log('🔍 调试排班时长更新问题...\n');
  
  try {
    // 1. 获取现有的排班数据
    const scheduleResult = await pool.query(`
      SELECT s.id, s.appointment_id, s.scheduled_time_start, s.scheduled_time_end, 
             a.estimated_duration as current_duration
      FROM schedules s
      LEFT JOIN appointments a ON s.appointment_id = a.id
      WHERE s.status != 'cancelled'
      ORDER BY s.created_at DESC
      LIMIT 5
    `);
    
    console.log('📋 现有排班数据:');
    scheduleResult.rows.forEach((schedule, index) => {
      const startTime = new Date(`1970-01-01T${schedule.scheduled_time_start}`);
      const endTime = new Date(`1970-01-01T${schedule.scheduled_time_end}`);
      const calculatedDuration = Math.round((endTime - startTime) / (1000 * 60));
      
      console.log(`${index + 1}. 排班ID: ${schedule.id}`);
      console.log(`   预约ID: ${schedule.appointment_id}`);
      console.log(`   开始时间: ${schedule.scheduled_time_start}`);
      console.log(`   结束时间: ${schedule.scheduled_time_end}`);
      console.log(`   当前预约时长: ${schedule.current_duration} 分钟`);
      console.log(`   计算得出的时长: ${calculatedDuration} 分钟`);
      console.log(`   时长是否一致: ${schedule.current_duration === calculatedDuration ? '✅ 是' : '❌ 否'}`);
      console.log('');
    });
    
    // 2. 测试更新排班并检查时长是否更新
    if (scheduleResult.rows.length > 0) {
      const testSchedule = scheduleResult.rows[0];
      console.log('🧪 测试更新排班时长...');
      
      // 计算新的时长（增加30分钟）
      const startTime = new Date(`1970-01-01T${testSchedule.scheduled_time_start}`);
      const newEndTime = new Date(startTime.getTime() + (90 * 60 * 1000)); // 90分钟
      const newEndTimeStr = newEndTime.toTimeString().slice(0, 8);
      
      console.log(`原始结束时间: ${testSchedule.scheduled_time_end}`);
      console.log(`新的结束时间: ${newEndTimeStr}`);
      
      // 更新排班结束时间
      const updateResult = await pool.query(`
        UPDATE schedules 
        SET scheduled_time_end = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [newEndTimeStr, testSchedule.id]);
      
      console.log('✅ 排班更新成功');
      
      // 检查预约的时长是否被更新
      const appointmentCheck = await pool.query(`
        SELECT estimated_duration FROM appointments WHERE id = $1
      `, [testSchedule.appointment_id]);
      
      const updatedDuration = appointmentCheck.rows[0].estimated_duration;
      const expectedDuration = 90; // 我们设置了90分钟
      
      console.log(`更新后的预约时长: ${updatedDuration} 分钟`);
      console.log(`期望的时长: ${expectedDuration} 分钟`);
      console.log(`时长是否正确更新: ${updatedDuration === expectedDuration ? '✅ 是' : '❌ 否'}`);
      
      if (updatedDuration !== expectedDuration) {
        console.log('\n❌ 问题确认：更新排班时，预约的estimated_duration没有被同步更新！');
        console.log('这解释了为什么用户看到"提交之后的记录时长并没有正确修改"');
      }
    }
    
  } catch (error) {
    console.error('❌ 调试过程中出错:', error);
  } finally {
    await pool.end();
  }
}

testScheduleDurationUpdate();