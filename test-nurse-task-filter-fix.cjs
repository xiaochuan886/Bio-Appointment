#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function testNurseTaskFilter() {
  console.log('🔍 测试护士任务过滤修复...\n');

  try {
    // 1. 查看当前的排班情况
    console.log('1. 查看当前排班情况...');
    const scheduleQuery = `
      SELECT 
        s.id,
        s.nurse_id,
        s.scheduled_date,
        s.scheduled_time_start,
        s.scheduled_time_end,
        s.status,
        p.full_name as nurse_name,
        p.role as nurse_role,
        a.customer_name,
        st.name as store_name
      FROM schedules s
      LEFT JOIN profiles p ON s.nurse_id = p.id
      LEFT JOIN appointments a ON s.appointment_id = a.id
      LEFT JOIN stores st ON a.store_id = st.id
      WHERE s.scheduled_date >= CURRENT_DATE - INTERVAL '1 day'
      ORDER BY s.scheduled_date, s.scheduled_time_start
    `;

    const { rows: schedules } = await pool.query(scheduleQuery);
    console.log(`📋 找到 ${schedules.length} 条排班记录:`);
    
    schedules.forEach((schedule, index) => {
      console.log(`\n排班 ${index + 1}:`);
      console.log(`  ID: ${schedule.id}`);
      console.log(`  护士: ${schedule.nurse_name} (${schedule.nurse_role})`);
      console.log(`  客户: ${schedule.customer_name}`);
      console.log(`  门店: ${schedule.store_name}`);
      console.log(`  日期: ${schedule.scheduled_date}`);
      console.log(`  时间: ${schedule.scheduled_time_start} - ${schedule.scheduled_time_end}`);
      console.log(`  状态: ${schedule.status}`);
    });

    // 2. 查看护士长的排班
    console.log('\n2. 查看护士长王护士长的排班...');
    const headNurseQuery = `
      SELECT 
        s.id,
        s.scheduled_date,
        s.scheduled_time_start,
        s.scheduled_time_end,
        s.status,
        a.customer_name,
        srv.name as service_name
      FROM schedules s
      LEFT JOIN appointments a ON s.appointment_id = a.id
      LEFT JOIN services srv ON a.service_id = srv.id
      LEFT JOIN profiles p ON s.nurse_id = p.id
      WHERE p.username = 'head_nurse2'
        AND s.scheduled_date >= CURRENT_DATE - INTERVAL '1 day'
      ORDER BY s.scheduled_date, s.scheduled_time_start
    `;

    const { rows: headNurseSchedules } = await pool.query(headNurseQuery);
    console.log(`👩‍⚕️ 护士长王护士长的排班 (${headNurseSchedules.length} 条):`);
    
    headNurseSchedules.forEach((schedule, index) => {
      console.log(`  ${index + 1}. ${schedule.customer_name} - ${schedule.service_name} - ${schedule.scheduled_date} ${schedule.scheduled_time_start}-${schedule.scheduled_time_end} - ${schedule.status}`);
    });

    // 3. 查看刘敏护士的排班
    console.log('\n3. 查看刘敏护士的排班...');
    const liuMinQuery = `
      SELECT 
        s.id,
        s.scheduled_date,
        s.scheduled_time_start,
        s.scheduled_time_end,
        s.status,
        a.customer_name,
        srv.name as service_name
      FROM schedules s
      LEFT JOIN appointments a ON s.appointment_id = a.id
      LEFT JOIN services srv ON a.service_id = srv.id
      LEFT JOIN profiles p ON s.nurse_id = p.id
      WHERE p.full_name ILIKE '%刘敏%'
        AND s.scheduled_date >= CURRENT_DATE - INTERVAL '1 day'
      ORDER BY s.scheduled_date, s.scheduled_time_start
    `;

    const { rows: liuMinSchedules } = await pool.query(liuMinQuery);
    console.log(`👩‍⚕️ 刘敏护士的排班 (${liuMinSchedules.length} 条):`);
    
    liuMinSchedules.forEach((schedule, index) => {
      console.log(`  ${index + 1}. ${schedule.customer_name} - ${schedule.service_name} - ${schedule.scheduled_date} ${schedule.scheduled_time_start}-${schedule.scheduled_time_end} - ${schedule.status}`);
    });

    // 4. 检查是否有重复分配的任务
    console.log('\n4. 检查重复分配的任务...');
    const duplicateQuery = `
      SELECT 
        a.customer_name,
        srv.name as service_name,
        COUNT(s.id) as schedule_count,
        STRING_AGG(p.full_name, ', ') as assigned_nurses
      FROM appointments a
      LEFT JOIN services srv ON a.service_id = srv.id
      LEFT JOIN schedules s ON a.id = s.appointment_id
      LEFT JOIN profiles p ON s.nurse_id = p.id
      WHERE s.scheduled_date >= CURRENT_DATE - INTERVAL '1 day'
      GROUP BY a.id, a.customer_name, srv.name
      HAVING COUNT(s.id) > 1
    `;

    const { rows: duplicates } = await pool.query(duplicateQuery);
    if (duplicates.length > 0) {
      console.log(`⚠️  发现 ${duplicates.length} 个重复分配的预约:`);
      duplicates.forEach((dup, index) => {
        console.log(`  ${index + 1}. ${dup.customer_name} - ${dup.service_name} - 分配给: ${dup.assigned_nurses} (${dup.schedule_count}次)`);
      });
    } else {
      console.log('✅ 没有发现重复分配的任务');
    }

    // 5. 验证任务分配的正确性
    console.log('\n5. 验证任务分配的正确性...');
    console.log('📋 预期结果:');
    console.log('  - 护士长王护士长应该只看到分配给自己的任务');
    console.log('  - 刘敏护士应该只看到分配给自己的任务');
    console.log('  - 每个预约应该只分配给一个护士');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await pool.end();
  }
}

testNurseTaskFilter();