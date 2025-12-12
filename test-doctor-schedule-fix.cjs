const { Pool } = require('pg');

// 数据库连接
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function testDoctorScheduleFix() {
  try {
    console.log('🔍 开始测试医生排班问题...\n');

    // 1. 检查是否有医生账户
    console.log('1. 检查医生账户...');
    const doctorResult = await pool.query(
      "SELECT id, username, full_name, role, store_id FROM profiles WHERE role = 'doctor' LIMIT 1"
    );
    
    if (doctorResult.rows.length === 0) {
      console.log('❌ 没有找到医生账户');
      return;
    }
    
    const doctor = doctorResult.rows[0];
    console.log('✅ 找到医生账户:', doctor);
    
    // 2. 检查是否有待确认的预约
    console.log('\n2. 检查待确认的预约...');
    const pendingAppointmentResult = await pool.query(`
      SELECT a.*, s.name as service_name, s.category as service_category
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      WHERE a.workflow_status = 'pending_doctor_confirmation'
        AND a.status != 'cancelled'
        AND s.category IN ('consultation', 'report')
      LIMIT 1
    `);
    
    if (pendingAppointmentResult.rows.length === 0) {
      console.log('❌ 没有找到待确认的预约');
      
      // 创建一个测试预约
      console.log('\n2.1 创建测试预约...');
      const serviceResult = await pool.query(
        "SELECT id FROM services WHERE category IN ('consultation', 'report') LIMIT 1"
      );
      
      if (serviceResult.rows.length === 0) {
        console.log('❌ 没有找到咨询服务');
        return;
      }
      
      const storeResult = await pool.query('SELECT id FROM stores LIMIT 1');
      if (storeResult.rows.length === 0) {
        console.log('❌ 没有找到门店');
        return;
      }
      
      const newAppointment = await pool.query(`
        INSERT INTO appointments (customer_name, service_id, requested_date, requested_time_start, requested_time_end, workflow_status, status, store_id, doctor_id)
        VALUES ($1, $2, $3, $4, $5, 'pending_doctor_confirmation', 'pending', $6, $7)
        RETURNING *
      `, [
        '测试客户',
        serviceResult.rows[0].id,
        new Date().toISOString().split('T')[0],
        '10:00:00',
        '11:00:00',
        storeResult.rows[0].id,
        doctor.id
      ]);
      
      console.log('✅ 创建测试预约成功:', newAppointment.rows[0].id);
      
      // 使用新创建的预约ID
      pendingAppointmentResult.rows[0] = newAppointment.rows[0];
    }
    
    const appointment = pendingAppointmentResult.rows[0];
    console.log('✅ 找到待确认预约:', appointment);
    
    // 3. 模拟医生确认预约
    console.log('\n3. 模拟医生确认预约...');
    const confirmResult = await pool.query(`
      UPDATE appointments
      SET workflow_status = 'doctor_confirmed',
          doctor_confirmed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [appointment.id]);
    
    const confirmedAppointment = confirmResult.rows[0];
    console.log('✅ 预约确认成功:', confirmedAppointment.id);
    
    // 4. 检查是否自动创建了排班
    console.log('\n4. 检查是否自动创建了排班...');
    const scheduleResult = await pool.query(`
      SELECT * FROM schedules WHERE appointment_id = $1
    `, [appointment.id]);
    
    if (scheduleResult.rows.length === 0) {
      console.log('❌ 没有找到排班记录，这是问题所在！');
      
      // 手动创建排班
      console.log('\n4.1 手动创建排班...');
      const manualScheduleResult = await pool.query(`
        INSERT INTO schedules (appointment_id, scheduled_date, scheduled_time_start, scheduled_time_end, doctor_id, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'scheduled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        confirmedAppointment.id,
        confirmedAppointment.requested_date,
        confirmedAppointment.requested_time_start,
        confirmedAppointment.requested_time_end,
        doctor.id
      ]);
      
      console.log('✅ 手动创建排班成功:', manualScheduleResult.rows[0].id);
    } else {
      console.log('✅ 找到排班记录:', scheduleResult.rows[0]);
      
      // 检查排班是否有doctor_id
      if (!scheduleResult.rows[0].doctor_id) {
        console.log('❌ 排班记录缺少doctor_id字段，这是问题所在！');
        
        // 更新排班记录
        await pool.query(`
          UPDATE schedules SET doctor_id = $1 WHERE id = $2
        `, [doctor.id, scheduleResult.rows[0].id]);
        
        console.log('✅ 已更新排班记录的doctor_id');
      } else {
        console.log('✅ 排班记录有正确的doctor_id');
      }
    }
    
    // 5. 测试医生排班查询
    console.log('\n5. 测试医生排班查询...');
    const doctorScheduleResult = await pool.query(`
      SELECT
        s.*,
        a.customer_name,
        a.service_id,
        a.doctor_id,
        a.store_id as appointment_store_id,
        srv.name as service_name,
        srv.category as service_category
      FROM schedules s
      INNER JOIN appointments a ON s.appointment_id = a.id
      LEFT JOIN services srv ON a.service_id = srv.id
      WHERE srv.category IN ('consultation', 'report')
        AND s.status != 'cancelled'
        AND (s.doctor_id = $1 OR a.doctor_id = $1)
        AND a.store_id = $2
      ORDER BY s.scheduled_date, s.scheduled_time_start
    `, [doctor.id, doctor.store_id]);
    
    console.log(`✅ 医生排班查询结果: ${doctorScheduleResult.rows.length} 条记录`);
    
    if (doctorScheduleResult.rows.length === 0) {
      console.log('❌ 医生排班查询返回空结果，这是问题所在！');
    } else {
      console.log('✅ 医生排班查询返回数据:');
      doctorScheduleResult.rows.forEach((schedule, index) => {
        console.log(`  ${index + 1}. 预约: ${schedule.customer_name}, 服务: ${schedule.service_name}, 日期: ${schedule.scheduled_date}`);
      });
    }
    
    // 6. 检查schedules表是否有doctor_id字段
    console.log('\n6. 检查schedules表结构...');
    const tableStructureResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'schedules' 
      ORDER BY ordinal_position
    `);
    
    const hasDoctorIdColumn = tableStructureResult.rows.some(col => col.column_name === 'doctor_id');
    
    if (hasDoctorIdColumn) {
      console.log('✅ schedules表有doctor_id字段');
    } else {
      console.log('❌ schedules表缺少doctor_id字段，这是问题所在！');
      
      // 添加doctor_id字段
      console.log('\n6.1 添加doctor_id字段...');
      await pool.query(`
        ALTER TABLE schedules ADD COLUMN doctor_id UUID
      `);
      
      console.log('✅ 已添加doctor_id字段');
      
      // 更新现有排班记录
      await pool.query(`
        UPDATE schedules s 
        SET doctor_id = a.doctor_id 
        FROM appointments a 
        WHERE s.appointment_id = a.id 
          AND a.doctor_id IS NOT NULL
      `);
      
      console.log('✅ 已更新现有排班记录的doctor_id');
    }
    
    console.log('\n🎉 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await pool.end();
  }
}

testDoctorScheduleFix();