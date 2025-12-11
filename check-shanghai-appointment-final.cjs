#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function checkShanghaiAppointment() {
  console.log('🔍 检查上海门店预约客户李三的数据...\n');

  try {
    // 1. 查找客户李三的预约记录
    console.log('1. 查询客户李三的预约记录...');
    const appointmentQuery = `
      SELECT 
        a.*,
        s.name as store_name,
        s.address as store_address,
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
    
    console.log(`📋 找到 ${appointments.length} 条客户李三的预约记录:`);
    if (appointments.length > 0) {
      appointments.forEach((apt, index) => {
        console.log(`\n预约 ${index + 1}:`);
        console.log(`  ID: ${apt.id}`);
        console.log(`  客户姓名: ${apt.customer_name}`);
        console.log(`  客户电话: ${apt.customer_phone}`);
        console.log(`  门店: ${apt.store_name || '未指定'} (${apt.store_address || '无地址'})`);
        console.log(`  服务: ${apt.service_name}`);
        console.log(`  预约日期: ${apt.requested_date}`);
        console.log(`  预约时间: ${apt.requested_time_start} - ${apt.requested_time_end}`);
        console.log(`  状态: ${apt.status}`);
        console.log(`  工作流状态: ${apt.workflow_status}`);
        console.log(`  创建时间: ${apt.created_at}`);
        console.log(`  销售员: ${apt.sales_name || '未指定'} (${apt.sales_role || ''})`);
      });
    } else {
      console.log('❌ 未找到客户李三的预约记录');
      
      // 查看最近的预约记录，看是否有类似的名字
      console.log('\n🔍 查看最近的预约记录，检查是否有类似名字...');
      const recentQuery = `
        SELECT customer_name, customer_phone, created_at
        FROM appointments 
        ORDER BY created_at DESC 
        LIMIT 10
      `;
      
      const { rows: recentAppointments } = await pool.query(recentQuery);
      console.log('最近的预约记录:');
      recentAppointments.forEach((apt, index) => {
        console.log(`  ${index + 1}. ${apt.customer_name} - ${apt.customer_phone} - ${apt.created_at}`);
      });
    }

    // 2. 检查上海门店信息
    console.log('\n2. 查询上海相关门店信息...');
    const storeQuery = `
      SELECT * FROM stores 
      WHERE name ILIKE '%上海%' 
         OR address ILIKE '%上海%'
      ORDER BY name
    `;
    
    const { rows: shanghaiStores } = await pool.query(storeQuery);
    console.log(`🏪 找到 ${shanghaiStores.length} 个上海相关门店:`);
    shanghaiStores.forEach(store => {
      console.log(`  门店ID: ${store.id}`);
      console.log(`  名称: ${store.name}`);
      console.log(`  地址: ${store.address}`);
      console.log(`  状态: ${store.status}`);
    });

    // 3. 检查上海门店的护士长
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
        
        if (headNurses.length > 0) {
          headNurses.forEach(nurse => {
            console.log(`  护士长: ${nurse.full_name} (ID: ${nurse.id})`);
            console.log(`  邮箱: ${nurse.email}`);
            console.log(`  用户名: ${nurse.username}`);
            console.log(`  状态: ${nurse.status}`);
          });
        } else {
          console.log(`  ❌ ${store.name} 没有分配护士长`);
        }
      }
    } else {
      console.log('❌ 没有找到上海相关的门店');
      
      // 显示所有门店
      console.log('\n🏪 所有门店列表:');
      const allStoresQuery = `SELECT * FROM stores ORDER BY name`;
      const { rows: allStores } = await pool.query(allStoresQuery);
      
      allStores.forEach(store => {
        console.log(`  ${store.name} - ${store.address} (ID: ${store.id})`);
      });
    }

    // 4. 检查是否有未分配门店的预约
    console.log('\n4. 检查未分配门店的预约记录...');
    const unassignedQuery = `
      SELECT 
        a.id,
        a.customer_name,
        a.customer_phone,
        a.status,
        a.workflow_status,
        a.created_at,
        srv.name as service_name
      FROM appointments a
      LEFT JOIN services srv ON a.service_id = srv.id
      WHERE a.store_id IS NULL
      ORDER BY a.created_at DESC
      LIMIT 10
    `;
    
    const { rows: unassignedAppointments } = await pool.query(unassignedQuery);
    console.log(`📋 未分配门店的预约记录 (${unassignedAppointments.length} 条):`);
    
    unassignedAppointments.forEach((apt, index) => {
      console.log(`  ${index + 1}. ${apt.customer_name} - ${apt.service_name} - ${apt.status} - ${apt.created_at}`);
    });

    // 5. 检查排班系统是否正常工作
    console.log('\n5. 检查排班系统状态...');
    
    // 检查最近的排班记录
    const recentSchedulesQuery = `
      SELECT 
        s.*,
        a.customer_name,
        p.full_name as nurse_name,
        st.name as store_name
      FROM schedules s
      LEFT JOIN appointments a ON s.appointment_id = a.id
      LEFT JOIN profiles p ON s.nurse_id = p.id
      LEFT JOIN stores st ON p.store_id = st.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `;
    
    const { rows: recentSchedules } = await pool.query(recentSchedulesQuery);
    console.log(`📅 最近的排班记录 (${recentSchedules.length} 条):`);
    
    recentSchedules.forEach((schedule, index) => {
      console.log(`  ${index + 1}. 客户: ${schedule.customer_name}, 护士: ${schedule.nurse_name}, 日期: ${schedule.scheduled_date}, 状态: ${schedule.status}`);
    });

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  } finally {
    await pool.end();
  }
}

checkShanghaiAppointment();