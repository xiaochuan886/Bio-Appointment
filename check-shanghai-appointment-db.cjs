#!/usr/bin/env node

const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function checkShanghaiAppointment() {
  console.log('🔍 检查上海门店预约客户李三的数据...\n');

  try {
    // 测试数据库连接
    console.log('📡 测试数据库连接...');
    const testResult = await pool.query('SELECT NOW() as current_time');
    console.log('✅ 数据库连接成功:', testResult.rows[0].current_time);

    // 1. 检查预约记录
    console.log('\n1. 查询预约记录...');
    const appointmentQuery = `
      SELECT 
        a.*,
        s.name as store_name,
        s.city as store_city,
        srv.name as service_name,
        p.full_name as sales_name,
        p.role as sales_role
      FROM appointments a
      LEFT JOIN stores s ON a.store_id = s.id
      LEFT JOIN services srv ON a.service_id = srv.id
      LEFT JOIN profiles p ON a.sales_id = p.id
      WHERE a.customer_name ILIKE '%李三%' 
         OR a.customer_phone ILIKE '%李三%'
      ORDER BY a.created_at DESC
    `;

    const { rows: appointments } = await pool.query(appointmentQuery);
    
    console.log(`📋 找到 ${appointments.length} 条相关预约记录:`);
    if (appointments.length > 0) {
      appointments.forEach((apt, index) => {
        console.log(`\n预约 ${index + 1}:`);
        console.log(`  ID: ${apt.id}`);
        console.log(`  客户姓名: ${apt.customer_name}`);
        console.log(`  客户电话: ${apt.customer_phone}`);
        console.log(`  门店: ${apt.store_name} (${apt.store_city})`);
        console.log(`  服务: ${apt.service_name}`);
        console.log(`  预约时间: ${apt.appointment_time}`);
        console.log(`  状态: ${apt.status}`);
        console.log(`  创建时间: ${apt.created_at}`);
        console.log(`  销售员: ${apt.sales_name} (${apt.sales_role})`);
      });
    } else {
      console.log('❌ 未找到客户李三的预约记录');
    }

    // 2. 检查上海门店信息
    console.log('\n2. 查询上海门店信息...');
    const storeQuery = `
      SELECT * FROM stores 
      WHERE city ILIKE '%上海%'
      ORDER BY name
    `;
    
    const { rows: shanghaiStores } = await pool.query(storeQuery);
    console.log(`🏪 找到 ${shanghaiStores.length} 个上海门店:`);
    shanghaiStores.forEach(store => {
      console.log(`  门店ID: ${store.id}, 名称: ${store.name}, 城市: ${store.city}`);
    });

    // 3. 检查护士长用户
    console.log('\n3. 查询上海门店的护士长...');
    if (shanghaiStores.length > 0) {
      for (const store of shanghaiStores) {
        const nurseQuery = `
          SELECT * FROM profiles 
          WHERE role = 'head_nurse' 
            AND store_id = $1
          ORDER BY full_name
        `;
        
        const { rows: headNurses } = await pool.query(nurseQuery, [store.id]);
        console.log(`\n👩‍⚕️ ${store.name} 的护士长 (${headNurses.length} 人):`);
        headNurses.forEach(nurse => {
          console.log(`  护士长: ${nurse.full_name} (ID: ${nurse.id})`);
          console.log(`  邮箱: ${nurse.email}`);
          console.log(`  状态: ${nurse.is_active ? '活跃' : '非活跃'}`);
        });
      }
    }

    // 4. 检查排班记录
    console.log('\n4. 查询相关排班记录...');
    if (appointments.length > 0) {
      for (const apt of appointments) {
        const appointmentDate = apt.appointment_time.toISOString().split('T')[0];
        
        const scheduleQuery = `
          SELECT 
            sc.*,
            p.full_name as nurse_name,
            p.role as nurse_role,
            s.name as store_name,
            s.city as store_city
          FROM schedules sc
          LEFT JOIN profiles p ON sc.nurse_id = p.id
          LEFT JOIN stores s ON sc.store_id = s.id
          WHERE sc.store_id = $1 
            AND sc.date = $2
          ORDER BY sc.start_time
        `;

        const { rows: schedules } = await pool.query(scheduleQuery, [apt.store_id, appointmentDate]);
        
        console.log(`\n📅 预约 ${apt.id} 对应日期 (${appointmentDate}) 的排班记录 (${schedules.length} 条):`);
        schedules.forEach(schedule => {
          console.log(`  排班ID: ${schedule.id}`);
          console.log(`  护士: ${schedule.nurse_name} (${schedule.nurse_role})`);
          console.log(`  日期: ${schedule.date}`);
          console.log(`  时间: ${schedule.start_time} - ${schedule.end_time}`);
          console.log(`  状态: ${schedule.status}`);
          console.log(`  门店: ${schedule.store_name}`);
        });
      }
    }

    // 5. 检查任务记录
    console.log('\n5. 查询相关任务记录...');
    if (appointments.length > 0) {
      for (const apt of appointments) {
        const taskQuery = `
          SELECT 
            te.*,
            p.full_name as nurse_name,
            p.role as nurse_role,
            a.customer_name,
            a.appointment_time
          FROM task_executions te
          LEFT JOIN profiles p ON te.nurse_id = p.id
          LEFT JOIN appointments a ON te.appointment_id = a.id
          WHERE te.appointment_id = $1
          ORDER BY te.created_at
        `;

        const { rows: tasks } = await pool.query(taskQuery, [apt.id]);
        
        console.log(`\n📋 预约 ${apt.id} 的任务记录 (${tasks.length} 条):`);
        tasks.forEach(task => {
          console.log(`  任务ID: ${task.id}`);
          console.log(`  护士: ${task.nurse_name}`);
          console.log(`  状态: ${task.status}`);
          console.log(`  创建时间: ${task.created_at}`);
        });
      }
    }

    // 6. 检查最近的所有预约记录（用于调试）
    console.log('\n6. 查询最近的所有预约记录（最近10条）...');
    const recentQuery = `
      SELECT 
        a.id,
        a.customer_name,
        a.customer_phone,
        s.name as store_name,
        s.city as store_city,
        a.appointment_time,
        a.status,
        a.created_at
      FROM appointments a
      LEFT JOIN stores s ON a.store_id = s.id
      ORDER BY a.created_at DESC
      LIMIT 10
    `;

    const { rows: recentAppointments } = await pool.query(recentQuery);
    console.log(`\n📋 最近的预约记录 (${recentAppointments.length} 条):`);
    recentAppointments.forEach((apt, index) => {
      console.log(`  ${index + 1}. ${apt.customer_name} - ${apt.store_name} (${apt.store_city}) - ${apt.appointment_time} - ${apt.status}`);
    });

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  } finally {
    await pool.end();
  }
}

checkShanghaiAppointment();