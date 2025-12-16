const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123'
});

async function testCompleteScenario() {
  console.log('🧪 完整测试：资源可用性检查\n');

  try {
    // 1. 创建一个测试排班，占用特定房间和护士
    const testDate = '2025-12-16';
    const testTimeStart = '14:00:00';
    const testTimeEnd = '15:00:00';

    // 获取上海门店的一个房间和一个护士
    const roomResult = await pool.query(`
      SELECT id, name FROM resources 
      WHERE type IN ('vip', 'treatment', 'consultation') 
        AND name LIKE '%上海%'
      LIMIT 1
    `);

    const nurseResult = await pool.query(`
      SELECT id, name FROM resources 
      WHERE type = 'nurse' 
        AND name LIKE '%上海%'
      LIMIT 1
    `);

    if (roomResult.rows.length === 0 || nurseResult.rows.length === 0) {
      console.log('❌ 没有找到上海的房间或护士资源');
      await pool.end();
      return;
    }

    const room = roomResult.rows[0];
    const nurse = nurseResult.rows[0];

    console.log('📋 测试数据:');
    console.log('  房间:', room.name);
    console.log('  护士:', nurse.name);
    console.log('  日期:', testDate);
    console.log('  时间:', testTimeStart, '-', testTimeEnd);
    console.log('');

    // 2. 创建测试排班（如果不存在）
    const existingSchedule = await pool.query(`
      SELECT id FROM schedules
      WHERE scheduled_date = $1
        AND scheduled_time_start = $2
        AND room_id = $3
        AND nurse_id = $4
        AND status != 'cancelled'
    `, [testDate, testTimeStart, room.id, nurse.id]);

    if (existingSchedule.rows.length === 0) {
      // 先创建一个测试预约
      const appointmentResult = await pool.query(`
        INSERT INTO appointments (
          customer_name, service_id, requested_date,
          requested_time_start, requested_time_end,
          status, total_people, estimated_duration
        )
        SELECT 
          '测试客户', id, $1, $2, $3, 'pending', 1, 60
        FROM services LIMIT 1
        RETURNING id
      `, [testDate, testTimeStart, testTimeEnd]);

      const appointmentId = appointmentResult.rows[0].id;

      // 创建排班
      await pool.query(`
        INSERT INTO schedules (
          appointment_id, scheduled_date, scheduled_time_start, scheduled_time_end,
          room_id, nurse_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [appointmentId, testDate, testTimeStart, testTimeEnd, room.id, nurse.id, 'scheduled']);
      
      console.log('✅ 已创建测试排班');
    } else {
      console.log('ℹ️  测试排班已存在');
    }
    console.log('');

    // 3. 测试资源可用性API - 完全重叠的时间段（应该不可用）
    console.log('🔍 测试1: 完全重叠的时间段 (14:00-15:00)');
    const params1 = new URLSearchParams({
      date: testDate,
      time_start: '14:00:00',
      time_end: '15:00:00'
    });

    const response1 = await fetch(`http://localhost:3001/api/resources/availability?${params1.toString()}`);
    const data1 = await response1.json();

    console.log('  可用房间数:', data1.available_rooms?.length || 0);
    console.log('  可用护士数:', data1.available_nurses?.length || 0);
    console.log('  该房间可用?', !data1.available_rooms?.some(r => r.id === room.id) ? '❌ 不可用（正确）' : '✅ 可用（错误）');
    console.log('  该护士可用?', !data1.available_nurses?.some(n => n.id === nurse.id) ? '❌ 不可用（正确）' : '✅ 可用（错误）');
    console.log('');

    // 4. 测试部分重叠的时间段（应该不可用）
    console.log('🔍 测试2: 部分重叠的时间段 (14:30-15:30)');
    const params2 = new URLSearchParams({
      date: testDate,
      time_start: '14:30:00',
      time_end: '15:30:00'
    });

    const response2 = await fetch(`http://localhost:3001/api/resources/availability?${params2.toString()}`);
    const data2 = await response2.json();

    console.log('  可用房间数:', data2.available_rooms?.length || 0);
    console.log('  可用护士数:', data2.available_nurses?.length || 0);
    console.log('  该房间可用?', !data2.available_rooms?.some(r => r.id === room.id) ? '❌ 不可用（正确）' : '✅ 可用（错误）');
    console.log('  该护士可用?', !data2.available_nurses?.some(n => n.id === nurse.id) ? '❌ 不可用（正确）' : '✅ 可用（错误）');
    console.log('');

    // 5. 测试不重叠的时间段（应该可用）
    console.log('🔍 测试3: 不重叠的时间段 (15:00-16:00)');
    const params3 = new URLSearchParams({
      date: testDate,
      time_start: '15:00:00',
      time_end: '16:00:00'
    });

    const response3 = await fetch(`http://localhost:3001/api/resources/availability?${params3.toString()}`);
    const data3 = await response3.json();

    console.log('  可用房间数:', data3.available_rooms?.length || 0);
    console.log('  可用护士数:', data3.available_nurses?.length || 0);
    console.log('  该房间可用?', data3.available_rooms?.some(r => r.id === room.id) ? '✅ 可用（正确）' : '❌ 不可用（错误）');
    console.log('  该护士可用?', data3.available_nurses?.some(n => n.id === nurse.id) ? '✅ 可用（正确）' : '❌ 不可用（错误）');
    console.log('');

    console.log('🎉 测试完成！');

    await pool.end();

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    await pool.end();
  }
}

testCompleteScenario();
