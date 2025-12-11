#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function debugTestScheduleData() {
  try {
    console.log('🔍 调试测试排班数据...\n');

    // 1. 查找我们创建的预约
    console.log('1. 查找测试预约数据...');
    const appointmentQuery = `
      SELECT 
        a.id,
        a.customer_name,
        a.companion_names,
        a.total_people,
        a.sales_id,
        sales_p.full_name as sales_name,
        sales_p.username as sales_username,
        sales_p.role as sales_role,
        a.requested_date,
        a.status
      FROM appointments a
      LEFT JOIN profiles sales_p ON a.sales_id = sales_p.id
      WHERE a.customer_name LIKE '%测试客户%'
      ORDER BY a.created_at DESC
    `;
    
    const { rows: appointments } = await pool.query(appointmentQuery);
    console.log(`找到 ${appointments.length} 个测试预约:`);
    
    appointments.forEach((apt, index) => {
      console.log(`\n预约 ${index + 1}:`);
      console.log(`  ID: ${apt.id}`);
      console.log(`  客户: ${apt.customer_name}`);
      console.log(`  同行客户: ${apt.companion_names ? apt.companion_names.join(', ') : '无'}`);
      console.log(`  总人数: ${apt.total_people}`);
      console.log(`  销售: ${apt.sales_name || '未指定'} (${apt.sales_username || 'N/A'})`);
      console.log(`  日期: ${apt.requested_date}`);
      console.log(`  状态: ${apt.status}`);
    });

    // 2. 查找对应的排班
    if (appointments.length > 0) {
      console.log('\n2. 查找对应的排班数据...');
      const appointmentIds = appointments.map(a => a.id);
      
      const scheduleQuery = `
        SELECT 
          s.id,
          s.appointment_id,
          s.scheduled_date,
          s.scheduled_time_start,
          s.scheduled_time_end,
          s.status,
          r.name as room_name,
          n.full_name as nurse_name,
          a.customer_name
        FROM schedules s
        LEFT JOIN resources r ON s.room_id = r.id
        LEFT JOIN profiles n ON s.nurse_id = n.id
        LEFT JOIN appointments a ON s.appointment_id = a.id
        WHERE s.appointment_id = ANY($1)
        ORDER BY s.scheduled_date, s.scheduled_time_start
      `;
      
      const { rows: schedules } = await pool.query(scheduleQuery, [appointmentIds]);
      console.log(`找到 ${schedules.length} 个对应的排班:`);
      
      schedules.forEach((sch, index) => {
        console.log(`\n排班 ${index + 1}:`);
        console.log(`  ID: ${sch.id}`);
        console.log(`  预约ID: ${sch.appointment_id}`);
        console.log(`  客户: ${sch.customer_name}`);
        console.log(`  日期: ${sch.scheduled_date}`);
        console.log(`  时间: ${sch.scheduled_time_start} - ${sch.scheduled_time_end}`);
        console.log(`  房间: ${sch.room_name || '未分配'}`);
        console.log(`  护士: ${sch.nurse_name || '未分配'}`);
        console.log(`  状态: ${sch.status}`);
      });

      // 3. 测试API查询
      if (schedules.length > 0) {
        console.log('\n3. 测试API查询结果...');
        const testDate = '2024-12-15';
        
        const apiQuery = `
          SELECT
            s.*,
            a.customer_name,
            a.companion_names,
            a.total_people,
            a.service_id,
            a.estimated_duration,
            a.is_urgent,
            a.store_id as appointment_store_id,
            srv.name as service_name,
            srv.category as service_category,
            r.name as room_name,
            r.type as room_type,
            r.status as room_status,
            p.full_name as nurse_name,
            p.role as nurse_role,
            p.department as nurse_department,
            sales_p.full_name as sales_name,
            sales_p.username as sales_username,
            sales_p.role as sales_role
          FROM schedules s
          LEFT JOIN appointments a ON s.appointment_id = a.id
          LEFT JOIN services srv ON a.service_id = srv.id
          LEFT JOIN resources r ON s.room_id = r.id
          LEFT JOIN profiles p ON s.nurse_id = p.id
          LEFT JOIN profiles sales_p ON a.sales_id = sales_p.id
          WHERE DATE(s.scheduled_date) = $1
            AND a.customer_name LIKE '%测试客户%'
        `;
        
        const { rows: apiResults } = await pool.query(apiQuery, [testDate]);
        console.log(`API查询返回 ${apiResults.length} 条记录:`);
        
        apiResults.forEach((result, index) => {
          console.log(`\nAPI结果 ${index + 1}:`);
          console.log(`  客户: ${result.customer_name}`);
          console.log(`  销售: ${result.sales_name || '未指定'}`);
          console.log(`  同行客户: ${result.companion_names ? result.companion_names.join(', ') : '无'}`);
          console.log(`  总人数: ${result.total_people}`);
          console.log(`  日期: ${result.scheduled_date}`);
          console.log(`  时间: ${result.scheduled_time_start}`);
          console.log(`  状态: ${result.status}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ 调试失败:', error.message);
  } finally {
    await pool.end();
  }
}

debugTestScheduleData();