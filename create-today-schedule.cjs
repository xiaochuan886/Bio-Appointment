const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function createTodaySchedule() {
  console.log('🔧 [修复] 创建今天日期的排班数据...');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`  - 目标日期: ${today}`);
    
    // 1. 获取今天的预约
    console.log('\n📊 [修复] 1. 获取今天的预约:');
    const appointmentsQuery = `
      SELECT id, customer_name, requested_date, requested_time_start, requested_time_end,
             service_id, doctor_id
      FROM appointments 
      WHERE requested_date = $1 AND status != 'cancelled'
      ORDER BY created_at DESC
    `;
    const appointmentsResult = await pool.query(appointmentsQuery, [today]);
    console.log(`  - 找到 ${appointmentsResult.rows.length} 个今天的预约`);
    
    if (appointmentsResult.rows.length === 0) {
      // 如果没有今天的预约，创建一个测试预约
      console.log('  - 没有今天的预约，创建测试预约...');
      
      // 获取第一个服务和用户
      const serviceResult = await pool.query('SELECT id, name FROM services LIMIT 1');
      const userResult = await pool.query('SELECT id, full_name FROM profiles WHERE role = \'sales\' LIMIT 1');
      
      if (serviceResult.rows.length > 0 && userResult.rows.length > 0) {
        const newAppointment = await pool.query(
          `INSERT INTO appointments (customer_name, service_id, requested_date, requested_time_start, requested_time_end, estimated_duration, status, workflow_status, requires_nurse_scheduling, sales_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', 'pending_nurse_assignment', true, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING *`,
          ['测试客户-今天', serviceResult.rows[0].id, today, '09:00:00', '10:00:00', 60, userResult.rows[0].id]
        );
        console.log(`  - 创建测试预约: ${newAppointment.rows[0].customer_name}`);
        appointmentsResult.rows.push(newAppointment.rows[0]);
      }
    }
    
    // 2. 获取可用资源
    console.log('\n📊 [修复] 2. 获取可用资源:');
    const roomsQuery = `
      SELECT id, name, type FROM resources 
      WHERE status = 'available' AND type IN ('room', 'vip', 'treatment', 'consultation')
      ORDER BY name
      LIMIT 5
    `;
    const roomsResult = await pool.query(roomsQuery);
    console.log(`  - 找到 ${roomsResult.rows.length} 个可用房间`);
    
    const nursesQuery = `
      SELECT id, full_name, role FROM profiles 
      WHERE status = 'active' AND role IN ('nurse', 'head_nurse')
      ORDER BY role, full_name
      LIMIT 5
    `;
    const nursesResult = await pool.query(nursesQuery);
    console.log(`  - 找到 ${nursesResult.rows.length} 个可用护士`);
    
    // 3. 为今天的预约创建排班
    console.log('\n📊 [修复] 3. 为今天的预约创建排班:');
    let createdSchedules = 0;
    
    for (const apt of appointmentsResult.rows) {
      // 检查是否已存在排班
      const existingScheduleQuery = `SELECT id FROM schedules WHERE appointment_id = $1`;
      const existingResult = await pool.query(existingScheduleQuery, [apt.id]);
      
      if (existingResult.rows.length === 0) {
        // 分配房间和护士
        const room = roomsResult.rows[createdSchedules % roomsResult.rows.length];
        const nurse = nursesResult.rows[createdSchedules % nursesResult.rows.length];
        
        console.log(`  创建排班: ${apt.customer_name} -> ${room.name} (${nurse.full_name})`);
        
        await pool.query(
          `INSERT INTO schedules (appointment_id, scheduled_date, scheduled_time_start, scheduled_time_end, room_id, nurse_id, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [apt.id, apt.requested_date, apt.requested_time_start, apt.requested_time_end, room.id, nurse.id]
        );
        
        createdSchedules++;
      } else {
        console.log(`  预约 ${apt.customer_name} 已存在排班，跳过`);
      }
    }
    
    console.log(`  - 总共创建了 ${createdSchedules} 个排班`);
    
    // 4. 验证创建结果
    console.log('\n📊 [修复] 4. 验证创建结果:');
    const verifyQuery = `
      SELECT 
        s.id,
        a.customer_name,
        r.name as room_name,
        r.type as room_type,
        p.full_name as nurse_name,
        s.scheduled_date
      FROM schedules s
      LEFT JOIN appointments a ON s.appointment_id = a.id
      LEFT JOIN resources r ON s.room_id = r.id
      LEFT JOIN profiles p ON s.nurse_id = p.id
      WHERE DATE(s.scheduled_date) = $1
      ORDER BY s.scheduled_date, s.scheduled_time_start
    `;
    const verifyResult = await pool.query(verifyQuery, [today]);
    console.log(`  - 今天(${today})的排班数: ${verifyResult.rows.length}`);
    
    verifyResult.rows.forEach((schedule, index) => {
      console.log(`  ${index + 1}. ${schedule.customer_name} -> ${schedule.room_name} (${schedule.room_type}) - ${schedule.nurse_name}`);
    });

    console.log('\n✅ [修复] 今天排班创建完成！');

  } catch (error) {
    console.error('❌ [修复] 创建过程中发生错误:', error);
  } finally {
    await pool.end();
  }
}

// 执行创建
createTodaySchedule();