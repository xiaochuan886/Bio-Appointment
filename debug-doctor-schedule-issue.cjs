const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function debugDoctorScheduleIssue() {
  try {
    console.log('🔍 [DEBUG] 开始调试医生排班视图问题...\n');

    // 1. 检查医生用户
    console.log('1. 检查医生用户:');
    const doctorsResult = await pool.query(
      'SELECT id, username, full_name, role, store_id FROM profiles WHERE role = $1',
      ['doctor']
    );
    console.log('医生用户列表:', doctorsResult.rows);
    
    if (doctorsResult.rows.length === 0) {
      console.log('❌ 没有找到医生用户');
      return;
    }
    
    const doctor = doctorsResult.rows[0];
    console.log(`使用医生账户: ${doctor.full_name} (${doctor.id})\n`);

    // 2. 检查待确认的预约
    console.log('2. 检查待确认的预约:');
    const pendingAppointmentsResult = await pool.query(`
      SELECT 
        a.id,
        a.customer_name,
        a.workflow_status,
        a.status,
        a.doctor_id,
        a.store_id,
        s.name as service_name,
        s.category as service_category,
        a.requested_date,
        a.requested_time_start
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      WHERE a.workflow_status = 'pending_doctor_confirmation'
        AND a.status != 'cancelled'
        AND s.category IN ('consultation', 'report')
      ORDER BY a.requested_date ASC
    `);
    console.log(`找到 ${pendingAppointmentsResult.rows.length} 个待确认的预约:`);
    pendingAppointmentsResult.rows.forEach(apt => {
      console.log(`  - ${apt.customer_name} (${apt.id}) - ${apt.service_name} - ${apt.requested_date} ${apt.requested_time_start}`);
    });
    console.log('');

    // 3. 检查已确认的预约
    console.log('3. 检查已确认的预约:');
    const confirmedAppointmentsResult = await pool.query(`
      SELECT 
        a.id,
        a.customer_name,
        a.workflow_status,
        a.status,
        a.doctor_id,
        a.store_id,
        a.doctor_confirmed_at,
        s.name as service_name,
        s.category as service_category,
        a.requested_date,
        a.requested_time_start
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      WHERE a.workflow_status = 'doctor_confirmed'
        AND a.status != 'cancelled'
        AND s.category IN ('consultation', 'report')
      ORDER BY a.doctor_confirmed_at DESC
      LIMIT 10
    `);
    console.log(`找到 ${confirmedAppointmentsResult.rows.length} 个已确认的预约:`);
    confirmedAppointmentsResult.rows.forEach(apt => {
      console.log(`  - ${apt.customer_name} (${apt.id}) - ${apt.service_name} - ${apt.doctor_confirmed_at}`);
    });
    console.log('');

    // 4. 检查排班数据
    console.log('4. 检查排班数据:');
    const schedulesResult = await pool.query(`
      SELECT 
        s.id,
        s.appointment_id,
        s.scheduled_date,
        s.scheduled_time_start,
        s.scheduled_time_end,
        s.status,
        a.customer_name,
        a.workflow_status,
        a.doctor_id,
        a.store_id,
        srv.name as service_name,
        srv.category as service_category
      FROM schedules s
      INNER JOIN appointments a ON s.appointment_id = a.id
      LEFT JOIN services srv ON a.service_id = srv.id
      WHERE srv.category IN ('consultation', 'report')
        AND s.status != 'cancelled'
      ORDER BY s.scheduled_date DESC, s.scheduled_time_start DESC
      LIMIT 10
    `);
    console.log(`找到 ${schedulesResult.rows.length} 个排班记录:`);
    schedulesResult.rows.forEach(schedule => {
      console.log(`  - ${schedule.customer_name} (${schedule.appointment_id}) - ${schedule.service_name} - ${schedule.scheduled_date} ${schedule.scheduled_time_start} [${schedule.status}]`);
    });
    console.log('');

    // 5. 检查医生的排班（模拟API调用）
    console.log('5. 检查医生的排班（模拟API调用）:');
    const doctorSchedulesResult = await pool.query(`
      SELECT
        s.*,
        a.customer_name,
        a.companion_names,
        a.total_people,
        a.service_id,
        a.estimated_duration,
        a.is_urgent,
        a.doctor_id,
        a.store_id as appointment_store_id,
        srv.name as service_name,
        srv.category as service_category,
        r.name as room_name,
        r.type as room_type,
        r.status as room_status,
        COALESCE(sales_p.full_name, creator_p.full_name) as sales_name,
        COALESCE(sales_p.username, creator_p.username) as sales_username,
        COALESCE(sales_p.role, creator_p.role) as sales_role
      FROM schedules s
      INNER JOIN appointments a ON s.appointment_id = a.id
      LEFT JOIN services srv ON a.service_id = srv.id
      LEFT JOIN resources r ON s.room_id = r.id
      LEFT JOIN profiles sales_p ON a.sales_id = sales_p.id
      LEFT JOIN profiles creator_p ON a.created_by = creator_p.id
      WHERE srv.category IN ('consultation', 'report')
        AND s.status != 'cancelled'
        AND a.doctor_id = $1
        AND a.store_id = $2
      ORDER BY s.scheduled_date, s.scheduled_time_start
    `, [doctor.id, doctor.store_id]);
    
    console.log(`医生 ${doctor.full_name} 的排班数量: ${doctorSchedulesResult.rows.length}`);
    doctorSchedulesResult.rows.forEach(schedule => {
      console.log(`  - ${schedule.customer_name} - ${schedule.service_name} - ${schedule.scheduled_date} ${schedule.scheduled_time_start}`);
    });
    console.log('');

    // 6. 检查是否有已确认但没有排班的预约
    console.log('6. 检查已确认但没有排班的预约:');
    const missingSchedulesResult = await pool.query(`
      SELECT 
        a.id,
        a.customer_name,
        a.workflow_status,
        a.doctor_confirmed_at,
        s.name as service_name,
        s.category as service_category,
        a.requested_date,
        a.requested_time_start
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN schedules sch ON a.id = sch.appointment_id AND sch.status != 'cancelled'
      WHERE a.workflow_status = 'doctor_confirmed'
        AND a.status != 'cancelled'
        AND s.category IN ('consultation', 'report')
        AND sch.id IS NULL
      ORDER BY a.doctor_confirmed_at DESC
    `);
    
    console.log(`找到 ${missingSchedulesResult.rows.length} 个已确认但没有排班的预约:`);
    missingSchedulesResult.rows.forEach(apt => {
      console.log(`  - ${apt.customer_name} (${apt.id}) - ${apt.service_name} - 确认时间: ${apt.doctor_confirmed_at}`);
    });
    console.log('');

    // 7. 检查最近确认的预约的排班状态
    console.log('7. 检查最近确认的预约的排班状态:');
    const recentConfirmedResult = await pool.query(`
      SELECT 
        a.id as appointment_id,
        a.customer_name,
        a.workflow_status,
        a.doctor_confirmed_at,
        s.name as service_name,
        s.category as service_category,
        sch.id as schedule_id,
        sch.status as schedule_status,
        sch.scheduled_date,
        sch.scheduled_time_start
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN schedules sch ON a.id = sch.appointment_id
      WHERE a.workflow_status = 'doctor_confirmed'
        AND a.status != 'cancelled'
        AND s.category IN ('consultation', 'report')
        AND a.doctor_confirmed_at >= NOW() - INTERVAL '24 hours'
      ORDER BY a.doctor_confirmed_at DESC
    `);
    
    console.log(`最近24小时内确认的预约: ${recentConfirmedResult.rows.length}`);
    recentConfirmedResult.rows.forEach(apt => {
      console.log(`  - ${apt.customer_name} (${apt.appointment_id})`);
      console.log(`    预约状态: ${apt.workflow_status}`);
      console.log(`    排班ID: ${apt.schedule_id || 'NULL'}`);
      console.log(`    排班状态: ${apt.schedule_status || 'NULL'}`);
      console.log(`    确认时间: ${apt.doctor_confirmed_at}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ 调试过程中出错:', error);
  } finally {
    await pool.end();
  }
}

// 运行调试
debugDoctorScheduleIssue();