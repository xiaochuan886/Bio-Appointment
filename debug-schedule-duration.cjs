const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function testScheduleDuration() {
  try {
    console.log('🔍 [DEBUG] 开始测试排班时长处理...');
    
    // 1. 获取一个预约和它的原始时长
    const appointmentResult = await pool.query(`
      SELECT a.id, a.customer_name, a.estimated_duration, a.requested_time_start, a.requested_time_end,
             s.name as service_name, s.base_duration
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      WHERE a.status != 'cancelled'
      LIMIT 1
    `);
    
    if (appointmentResult.rows.length === 0) {
      console.log('❌ 没有找到可用的预约');
      return;
    }
    
    const appointment = appointmentResult.rows[0];
    console.log('📋 [DEBUG] 找到预约:', {
      id: appointment.id,
      customer_name: appointment.customer_name,
      estimated_duration: appointment.estimated_duration,
      requested_time_start: appointment.requested_time_start,
      requested_time_end: appointment.requested_time_end,
      service_name: appointment.service_name,
      base_duration: appointment.base_duration
    });
    
    // 2. 模拟前端发送的排班数据，包含修改后的时长
    const modifiedDuration = 90; // 修改为90分钟
    const scheduledTimeStart = '09:00:00';
    const scheduledTimeEnd = '10:30:00'; // 90分钟后的时间
    
    console.log('🕐 [DEBUG] 模拟排班数据:', {
      appointment_id: appointment.id,
      scheduled_date: '2025-01-15',
      scheduled_time_start: scheduledTimeStart,
      scheduled_time_end: scheduledTimeEnd,
      duration: modifiedDuration,
      room_id: null,
      nurse_id: null
    });
    
    // 3. 检查排班创建API是否接收时长参数
    console.log('🔍 [DEBUG] 检查排班API是否处理时长参数...');
    
    // 4. 模拟创建排班请求
    const testScheduleData = {
      appointment_id: appointment.id,
      scheduled_date: '2025-01-15',
      scheduled_time_start: scheduledTimeStart,
      scheduled_time_end: scheduledTimeEnd,
      room_id: null,
      nurse_id: null,
      notes: `测试时长处理 - 原始时长: ${appointment.estimated_duration}分钟, 修改后时长: ${modifiedDuration}分钟`
    };
    
    // 直接插入排班数据到数据库，模拟API行为
    const insertResult = await pool.query(`
      INSERT INTO schedules (appointment_id, scheduled_date, scheduled_time_start, scheduled_time_end, room_id, nurse_id, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled')
       RETURNING *
    `, [
      testScheduleData.appointment_id,
      testScheduleData.scheduled_date,
      testScheduleData.scheduled_time_start,
      testScheduleData.scheduled_time_end,
      testScheduleData.room_id,
      testScheduleData.nurse_id,
      testScheduleData.notes
    ]);
    
    const createdSchedule = insertResult.rows[0];
    console.log('✅ [DEBUG] 排班创建成功:', {
      id: createdSchedule.id,
      appointment_id: createdSchedule.appointment_id,
      scheduled_time_start: createdSchedule.scheduled_time_start,
      scheduled_time_end: createdSchedule.scheduled_time_end,
      notes: createdSchedule.notes
    });
    
    // 5. 检查预约的时长是否被更新
    const updatedAppointmentResult = await pool.query(`
      SELECT estimated_duration, requested_time_start, requested_time_end
      FROM appointments
      WHERE id = $1
    `, [appointment.id]);
    
    const updatedAppointment = updatedAppointmentResult.rows[0];
    console.log('📊 [DEBUG] 预约时长检查:', {
      original_duration: appointment.estimated_duration,
      updated_duration: updatedAppointment.estimated_duration,
      original_time_start: appointment.requested_time_start,
      updated_time_start: updatedAppointment.requested_time_start,
      original_time_end: appointment.requested_time_end,
      updated_time_end: updatedAppointment.requested_time_end
    });
    
    // 6. 清理测试数据
    await pool.query('DELETE FROM schedules WHERE id = $1', [createdSchedule.id]);
    console.log('🧹 [DEBUG] 清理测试数据完成');
    
    // 7. 分析问题
    console.log('\n🔍 [分析] 排班时长处理问题分析:');
    console.log('1. 排班API只接收 scheduled_time_start 和 scheduled_time_end');
    console.log('2. 排班API不接收 duration 参数');
    console.log('3. 排班创建后，预约的 estimated_duration 没有被更新');
    console.log('4. 前端修改的时长只体现在 scheduled_time_start 和 scheduled_time_end 上');
    console.log('5. 但预约本身的 estimated_duration 字段保持不变');
    
    console.log('\n💡 [解决方案] 需要修改排班API:');
    console.log('1. 在排班创建时，根据时间差计算实际时长');
    console.log('2. 可选：更新预约的 estimated_duration 字段以反映实际时长');
    console.log('3. 或者在排班表中添加 duration 字段存储实际时长');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await pool.end();
  }
}

testScheduleDuration();