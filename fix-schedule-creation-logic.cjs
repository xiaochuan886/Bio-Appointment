const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function fixScheduleCreationLogic() {
  console.log('🔧 [修复] 开始修复排班创建逻辑...');
  
  try {
    // 1. 检查现有预约的工作流状态
    console.log('\n📊 [修复] 1. 检查现有预约的工作流状态:');
    const appointmentsQuery = `
      SELECT a.id, a.customer_name, a.workflow_status, a.requires_nurse_scheduling,
             s.name as service_name, s.category as service_category
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      WHERE a.status != 'cancelled'
      ORDER BY a.created_at DESC
    `;
    const appointmentsResult = await pool.query(appointmentsQuery);
    console.log(`  - 找到 ${appointmentsResult.rows.length} 个预约记录`);
    appointmentsResult.rows.forEach((apt, index) => {
      console.log(`  ${index + 1}. ${apt.customer_name} - 工作流: ${apt.workflow_status}, 需要排班: ${apt.requires_nurse_scheduling}, 服务: ${apt.service_category}`);
    });

    // 2. 修复预约工作流状态
    console.log('\n🔧 [修复] 2. 修复预约工作流状态:');
    for (const apt of appointmentsResult.rows) {
      let newWorkflowStatus = apt.workflow_status;
      let requiresNurseScheduling = apt.requires_nurse_scheduling;
      
      // 根据服务类别确定正确的工作流状态
      if (apt.service_category === 'consultation' || apt.service_category === 'report') {
        newWorkflowStatus = 'pending_doctor_confirmation';
        requiresNurseScheduling = false;
      } else if (apt.service_category === 'nursing') {
        newWorkflowStatus = 'pending_nurse_assignment';
        requiresNurseScheduling = true;
      }
      
      if (newWorkflowStatus !== apt.workflow_status || requiresNurseScheduling !== apt.requires_nurse_scheduling) {
        console.log(`  更新预约 ${apt.customer_name}: ${apt.workflow_status} -> ${newWorkflowStatus}`);
        await pool.query(
          `UPDATE appointments 
           SET workflow_status = $1, requires_nurse_scheduling = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [newWorkflowStatus, requiresNurseScheduling, apt.id]
        );
      }
    }

    // 3. 为医生确认的预约创建排班
    console.log('\n🔧 [修复] 3. 为医生确认的预约创建排班:');
    const doctorConfirmedQuery = `
      SELECT a.id, a.customer_name, a.requested_date, a.requested_time_start, a.requested_time_end,
             a.doctor_id, s.name as service_name, s.category as service_category
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      WHERE a.workflow_status = 'doctor_confirmed' 
        AND a.status != 'cancelled'
        AND NOT EXISTS (
          SELECT 1 FROM schedules sch WHERE sch.appointment_id = a.id
        )
    `;
    const doctorConfirmedResult = await pool.query(doctorConfirmedQuery);
    console.log(`  - 找到 ${doctorConfirmedResult.rows.length} 个需要创建排班的医生确认预约`);
    
    for (const apt of doctorConfirmedResult.rows) {
      console.log(`  为预约 ${apt.customer_name} 创建排班`);
      await pool.query(
        `INSERT INTO schedules (appointment_id, scheduled_date, scheduled_time_start, scheduled_time_end, doctor_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'scheduled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [apt.id, apt.requested_date, apt.requested_time_start, apt.requested_time_end, apt.doctor_id]
      );
    }

    // 4. 创建一些测试排班数据以验证功能
    console.log('\n🔧 [修复] 4. 创建测试排班数据:');
    const testAppointmentsQuery = `
      SELECT id, customer_name, requested_date, requested_time_start, requested_time_end
      FROM appointments 
      WHERE status != 'cancelled'
      ORDER BY created_at DESC
      LIMIT 3
    `;
    const testAppointmentsResult = await pool.query(testAppointmentsQuery);
    
    if (testAppointmentsResult.rows.length > 0) {
      // 获取可用的房间和护士
      const roomsQuery = `SELECT id, name FROM resources WHERE status = 'available' LIMIT 3`;
      const roomsResult = await pool.query(roomsQuery);
      
      const nursesQuery = `SELECT id, full_name FROM profiles WHERE role IN ('nurse', 'head_nurse') AND status = 'active' LIMIT 3`;
      const nursesResult = await pool.query(nursesQuery);
      
      console.log(`  - 找到 ${roomsResult.rows.length} 个可用房间`);
      console.log(`  - 找到 ${nursesResult.rows.length} 个可用护士`);
      
      for (let i = 0; i < Math.min(testAppointmentsResult.rows.length, roomsResult.rows.length, nursesResult.rows.length); i++) {
        const apt = testAppointmentsResult.rows[i];
        const room = roomsResult.rows[i];
        const nurse = nursesResult.rows[i];
        
        // 检查是否已存在排班
        const existingScheduleQuery = `SELECT id FROM schedules WHERE appointment_id = $1`;
        const existingResult = await pool.query(existingScheduleQuery, [apt.id]);
        
        if (existingResult.rows.length === 0) {
          console.log(`  创建测试排班: ${apt.customer_name} -> ${room.name} (${nurse.full_name})`);
          await pool.query(
            `INSERT INTO schedules (appointment_id, scheduled_date, scheduled_time_start, scheduled_time_end, room_id, nurse_id, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [apt.id, apt.requested_date, apt.requested_time_start, apt.requested_time_end, room.id, nurse.id]
          );
        }
      }
    }

    // 5. 验证修复结果
    console.log('\n✅ [修复] 5. 验证修复结果:');
    const finalSchedulesQuery = `
      SELECT s.id, a.customer_name, r.name as room_name, p.full_name as nurse_name, s.scheduled_date
      FROM schedules s
      LEFT JOIN appointments a ON s.appointment_id = a.id
      LEFT JOIN resources r ON s.room_id = r.id
      LEFT JOIN profiles p ON s.nurse_id = p.id
      ORDER BY s.scheduled_date DESC
      LIMIT 5
    `;
    const finalSchedulesResult = await pool.query(finalSchedulesQuery);
    console.log(`  - 修复后排班记录数: ${finalSchedulesResult.rows.length}`);
    finalSchedulesResult.rows.forEach((schedule, index) => {
      console.log(`  ${index + 1}. ${schedule.customer_name} - ${schedule.room_name} - ${schedule.nurse_name} - ${schedule.scheduled_date}`);
    });

    console.log('\n✅ [修复] 排班创建逻辑修复完成！');

  } catch (error) {
    console.error('❌ [修复] 修复过程中发生错误:', error);
  } finally {
    await pool.end();
  }
}

// 执行修复
fixScheduleCreationLogic();