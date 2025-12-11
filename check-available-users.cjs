#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function checkAvailableUsers() {
  try {
    console.log('🔍 检查可用的测试用户...\n');

    // 查询所有用户
    const userQuery = `
      SELECT 
        id,
        username,
        email,
        full_name,
        role,
        status,
        store_id
      FROM profiles 
      WHERE status = 'active'
      ORDER BY role, full_name
      LIMIT 10
    `;
    
    const { rows: users } = await pool.query(userQuery);
    console.log(`👥 找到 ${users.length} 个活跃用户:`);
    
    users.forEach((user, index) => {
      console.log(`\n用户 ${index + 1}:`);
      console.log(`  用户名: ${user.username}`);
      console.log(`  姓名: ${user.full_name}`);
      console.log(`  角色: ${user.role}`);
      console.log(`  邮箱: ${user.email}`);
      console.log(`  门店ID: ${user.store_id}`);
    });

    // 查询有预约数据的排班
    console.log('\n📅 检查排班数据...');
    const scheduleQuery = `
      SELECT 
        s.id,
        s.scheduled_date,
        a.customer_name,
        a.companion_names,
        a.total_people,
        a.sales_id,
        sales_p.full_name as sales_name,
        sales_p.username as sales_username
      FROM schedules s
      LEFT JOIN appointments a ON s.appointment_id = a.id
      LEFT JOIN profiles sales_p ON a.sales_id = sales_p.id
      WHERE s.scheduled_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY s.scheduled_date DESC
      LIMIT 5
    `;
    
    const { rows: schedules } = await pool.query(scheduleQuery);
    console.log(`📋 找到 ${schedules.length} 条最近的排班记录:`);
    
    schedules.forEach((schedule, index) => {
      console.log(`\n排班 ${index + 1}:`);
      console.log(`  日期: ${schedule.scheduled_date}`);
      console.log(`  客户: ${schedule.customer_name}`);
      console.log(`  同行客户: ${schedule.companion_names ? schedule.companion_names.join(', ') : '无'}`);
      console.log(`  总人数: ${schedule.total_people}`);
      console.log(`  销售: ${schedule.sales_name || '未指定'} (${schedule.sales_username || 'N/A'})`);
    });

  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  } finally {
    await pool.end();
  }
}

checkAvailableUsers();