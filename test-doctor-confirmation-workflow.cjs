const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function testDoctorConfirmationWorkflow() {
  try {
    console.log('🔍 [TEST] 开始测试医生确认预约工作流...\n');

    // 1. 获取医生用户
    const doctorsResult = await pool.query(
      'SELECT id, username, full_name, role, store_id FROM profiles WHERE role = $1 LIMIT 1',
      ['doctor']
    );
    
    if (doctorsResult.rows.length === 0) {
      console.log('❌ 没有找到医生用户');
      return;
    }
    
    const doctor = doctorsResult.rows[0];
    console.log(`1. 使用医生账户: ${doctor.full_name} (${doctor.id})`);
    console.log(`   门店ID: ${doctor.store_id}\n`);

    // 2. 获取一个待确认的预约
    const pendingAppointmentResult = await pool.query(`
      SELECT 
        a.id,
        a.customer_name,
        a.workflow_status,
        a.status,
        a.doctor_id,
        a.store_id,
        a.requested_date,
        a.requested_time_start,
        a.requested_time_end,
        s.name as service_name,
        s.category as service_category
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      WHERE a.workflow_status = 'pending_doctor_confirmation'
        AND a.status != 'cancelled'
        AND s.category IN ('consultation', 'report')
        AND (a.doctor_id = $1 OR a.doctor_id IS NULL)
        AND a.store_id = $2
      LIMIT 1
    `, [doctor.id, doctor.store_id]);

    if (pendingAppointmentResult.rows.length === 0) {
      console.log('❌ 没有找到待确认的预约');
      return;
    }

    const appointment = pendingAppointmentResult.rows[0];
    console.log(`2. 找到待确认预约: ${appointment.customer_name} (${appointment.id})`);
    console.log(`   服务: ${appointment.service_name} (${appointment.service_category})`);
    console.log(`   日期: ${appointment.requested_date} ${appointment.requested_time_start}\n`);

    // 3. 模拟医生确认预约
    console.log('3. 模拟医生确认预约...');
    const confirmResult = await pool.query(`
      UPDATE appointments
      SET workflow_status = 'doctor_confirmed',
          doctor_confirmed_at = CURRENT_TIMESTAMP,
          doctor_note = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, ['测试医生确认', appointment.id]);

    const confirmedAppointment = confirmResult.rows[0];
    console.log(`   ✅ 预约确认成功: ${confirmedAppointment.workflow_status}`);
    console.log(`   确认时间: ${confirmedAppointment.doctor_confirmed_at}\n`);

    // 4. 检查是否自动创建了排班
    console.log('4. 检查是否自动创建了排班...');
    const scheduleResult = await pool.query(`
      SELECT 
        s.id,
        s.appointment_id,
        s.scheduled_date,
        s.scheduled_time_start,
        s.scheduled_time_end,
        s.status,
        s.created_at
      FROM schedules s
      WHERE s.appointment_id = $1
        AND s.status != 'cancelled'
    `, [appointment.id]);

    if (scheduleResult.rows.length === 0) {
      console.log('   ❌ 没有找到对应的排班记录');
      
      // 手动创建排班
      console.log('   🔧 手动创建排班...');
      const createScheduleResult = await pool.query(`
        INSERT INTO schedules (appointment_id, scheduled_date, scheduled_time_start, scheduled_time_end, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'scheduled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        appointment.id,
        appointment.requested_date,
        appointment.requested_time_start,
        appointment.requested_time_end
      ]);
      
      const createdSchedule = createScheduleResult.rows[0];
      console.log(`   ✅ 排班创建成功: ${createdSchedule.id}`);
    } else {
      const schedule = scheduleResult.rows[0];
      console.log(`   ✅ 找到排班记录: ${schedule.id}`);
      console.log(`   排班状态: ${schedule.status}`);
      console.log(`   排班日期: ${schedule.scheduled_date} ${schedule.scheduled_time_start}`);
    }

    // 5. 测试医生排班API查询
    console.log('\n5. 测试医生排班API查询...');
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

    console.log(`   找到 ${doctorSchedulesResult.rows.length} 个排班记录`);
    
    // 查找刚确认的预约对应的排班
    const newSchedule = doctorSchedulesResult.rows.find(s => s.appointment_id === appointment.id);
    if (newSchedule) {
      console.log(`   ✅ 新确认的预约在排班列表中: ${newSchedule.customer_name}`);
    } else {
      console.log(`   ❌ 新确认的预约不在排班列表中`);
    }

    // 6. 测试日期范围查询
    console.log('\n6. 测试日期范围查询...');
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const dateRangeSchedulesResult = await pool.query(`
      SELECT
        s.*,
        a.customer_name,
        srv.name as service_name,
        srv.category as service_category
      FROM schedules s
      INNER JOIN appointments a ON s.appointment_id = a.id
      LEFT JOIN services srv ON a.service_id = srv.id
      WHERE srv.category IN ('consultation', 'report')
        AND s.status != 'cancelled'
        AND a.doctor_id = $1
        AND a.store_id = $2
        AND DATE(s.scheduled_date) = $3
      ORDER BY s.scheduled_time_start
    `, [doctor.id, doctor.store_id, todayStr]);

    console.log(`   今天 (${todayStr}) 的排班数量: ${dateRangeSchedulesResult.rows.length}`);
    dateRangeSchedulesResult.rows.forEach(schedule => {
      console.log(`   - ${schedule.customer_name} - ${schedule.service_name} - ${schedule.scheduled_time_start}`);
    });

    // 7. 检查服务类别拼写问题
    console.log('\n7. 检查服务类别拼写问题...');
    const serviceCategoriesResult = await pool.query(`
      SELECT DISTINCT category, COUNT(*) as count
      FROM services
      GROUP BY category
      ORDER BY count DESC
    `);
    
    console.log('   服务类别分布:');
    serviceCategoriesResult.rows.forEach(row => {
      console.log(`   - ${row.category}: ${row.count} 个服务`);
    });

  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  } finally {
    await pool.end();
  }
}

// 运行测试
testDoctorConfirmationWorkflow();