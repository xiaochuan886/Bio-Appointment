const { Pool } = require('pg');

// 数据库连接
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function checkAppointmentDuration() {
  console.log('🔍 检查预约时长...');
  
  try {
    const appointmentId = '8492c156-f1b7-4296-a732-9bcb39899163';
    
    const result = await pool.query(
      'SELECT id, customer_name, estimated_duration FROM appointments WHERE id = $1',
      [appointmentId]
    );
    
    if (result.rows.length > 0) {
      const appointment = result.rows[0];
      console.log(`📊 预约信息:`);
      console.log(`   ID: ${appointment.id}`);
      console.log(`   客户: ${appointment.customer_name}`);
      console.log(`   当前时长: ${appointment.estimated_duration}分钟`);
      
      // 检查相关的排班
      const scheduleResult = await pool.query(
        'SELECT scheduled_time_start, scheduled_time_end FROM schedules WHERE appointment_id = $1 ORDER BY created_at DESC LIMIT 1',
        [appointmentId]
      );
      
      if (scheduleResult.rows.length > 0) {
        const schedule = scheduleResult.rows[0];
        console.log(`📅 最新排班信息:`);
        console.log(`   开始时间: ${schedule.scheduled_time_start}`);
        console.log(`   结束时间: ${schedule.scheduled_time_end}`);
        
        // 计算排班时长
        const startTime = new Date(`1970-01-01T${schedule.scheduled_time_start}`);
        const endTime = new Date(`1970-01-01T${schedule.scheduled_time_end}`);
        const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
        
        console.log(`   排班时长: ${durationMinutes}分钟`);
        
        if (durationMinutes === appointment.estimated_duration) {
          console.log('✅ 时长匹配！预约时长已正确更新');
        } else {
          console.log('⚠️ 时长不匹配！预约时长可能未正确更新');
          console.log(`💡 预期时长: ${durationMinutes}分钟, 实际时长: ${appointment.estimated_duration}分钟`);
        }
      } else {
        console.log('📅 没有找到相关排班');
      }
    } else {
      console.log('❌ 没有找到预约');
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await pool.end();
  }
}

// 运行检查
checkAppointmentDuration().then(() => {
  console.log('🎯 检查完成！');
}).catch(error => {
  console.error('💥 检查过程中发生错误:', error);
});