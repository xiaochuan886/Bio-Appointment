const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function debugDoctorConfirmSchedule() {
  try {
    console.log('🔍 开始调试医生确认预约后排班创建问题...\n');

    // 1. 检查待确认的预约
    const pendingAppointmentResult = await pool.query(
      `SELECT a.*, s.category as service_category, s.name as service_name
       FROM appointments a
       LEFT JOIN services s ON a.service_id = s.id
       WHERE a.workflow_status = 'pending_doctor_confirmation'
       AND a.status != 'cancelled'
       AND s.category IN ('consultation', 'report')
       LIMIT 1`
    );

    if (pendingAppointmentResult.rows.length === 0) {
      console.log('❌ 没有找到待确认的医生预约');
      return;
    }

    const appointment = pendingAppointmentResult.rows[0];
    console.log('✅ 找到待确认预约:', {
      id: appointment.id,
      customer_name: appointment.customer_name,
      service_name: appointment.service_name,
      service_category: appointment.service_category,
      workflow_status: appointment.workflow_status
    });

    // 2. 获取医生信息
    const doctorResult = await pool.query(
      'SELECT id, full_name, store_id FROM profiles WHERE role = $1 AND store_id = $2 LIMIT 1',
      ['doctor', appointment.store_id]
    );

    if (doctorResult.rows.length === 0) {
      console.log('❌ 没有找到匹配的医生');
      return;
    }

    const doctor = doctorResult.rows[0];
    console.log('✅ 找到医生:', {
      id: doctor.id,
      full_name: doctor.full_name,
      store_id: doctor.store_id
    });

    // 3. 模拟医生确认预约
    console.log('\n🔄 模拟医生确认预约...');
    
    // 更新预约状态
    const updateResult = await pool.query(
      `UPDATE appointments
       SET workflow_status = 'doctor_confirmed',
           doctor_confirmed_at = CURRENT_TIMESTAMP,
           doctor_note = '调试测试',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [appointment.id]
    );

    const updatedAppointment = updateResult.rows[0];
    console.log('✅ 预约状态更新成功:', {
      id: updatedAppointment.id,
      workflow_status: updatedAppointment.workflow_status,
      doctor_confirmed_at: updatedAppointment.doctor_confirmed_at
    });

    // 4. 检查是否已存在排班
    console.log('\n🔍 检查现有排班...');
    const existingScheduleResult = await pool.query(
      'SELECT id, doctor_id FROM schedules WHERE appointment_id = $1 AND status != \'cancelled\'',
      [updatedAppointment.id]
    );

    console.log(`📊 找到 ${existingScheduleResult.rows.length} 个现有排班`);
    
    if (existingScheduleResult.rows.length > 0) {
      console.log('⚠️ 排班已存在:', existingScheduleResult.rows[0]);
    } else {
      // 5. 手动创建排班（模拟API中的逻辑）
      console.log('\n🔧 手动创建排班...');
      
      const scheduleData = {
        appointment_id: updatedAppointment.id,
        scheduled_date: updatedAppointment.requested_date,
        scheduled_time_start: updatedAppointment.requested_time_start,
        scheduled_time_end: updatedAppointment.requested_time_end,
        doctor_id: doctor.id,
        status: 'scheduled'
      };

      console.log('📝 排班数据:', scheduleData);

      const scheduleResult = await pool.query(
        `INSERT INTO schedules (appointment_id, scheduled_date, scheduled_time_start, scheduled_time_end, doctor_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          scheduleData.appointment_id,
          scheduleData.scheduled_date,
          scheduleData.scheduled_time_start,
          scheduleData.scheduled_time_end,
          scheduleData.doctor_id,
          scheduleData.status
        ]
      );

      const newSchedule = scheduleResult.rows[0];
      console.log('✅ 排班创建成功:', {
        id: newSchedule.id,
        appointment_id: newSchedule.appointment_id,
        doctor_id: newSchedule.doctor_id,
        scheduled_date: newSchedule.scheduled_date,
        status: newSchedule.status
      });

      // 6. 验证排班是否可以被医生查询到
      console.log('\n🔍 验证医生排班查询...');
      const doctorScheduleResult = await pool.query(
        `SELECT s.*, a.customer_name, srv.name as service_name
         FROM schedules s
         INNER JOIN appointments a ON s.appointment_id = a.id
         LEFT JOIN services srv ON a.service_id = srv.id
         WHERE srv.category IN ('consultation', 'report')
           AND s.status != 'cancelled'
           AND (s.doctor_id = $1 OR a.doctor_id = $1)
           AND a.store_id = $2
         ORDER BY s.scheduled_date, s.scheduled_time_start`,
        [doctor.id, doctor.store_id]
      );

      console.log(`📊 医生排班查询返回 ${doctorScheduleResult.rows.length} 条记录`);
      
      const foundSchedule = doctorScheduleResult.rows.find(s => s.id === newSchedule.id);
      if (foundSchedule) {
        console.log('✅ 新创建的排班可以在医生排班视图中找到:', {
          id: foundSchedule.id,
          customer_name: foundSchedule.customer_name,
          service_name: foundSchedule.service_name,
          doctor_id: foundSchedule.doctor_id
        });
      } else {
        console.log('❌ 新创建的排班无法在医生排班视图中找到');
        console.log('📋 所有排班记录:');
        doctorScheduleResult.rows.forEach((s, index) => {
          console.log(`  ${index + 1}. ID: ${s.id}, 医生ID: ${s.doctor_id}, 客户: ${s.customer_name}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error);
  } finally {
    await pool.end();
  }
}

debugDoctorConfirmSchedule();