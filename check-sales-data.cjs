#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123'
});

async function checkSalesData() {
  try {
    console.log('🔍 检查预约表中的销售信息...\n');
    
    // 检查预约表中的销售信息
    const result = await pool.query(`
      SELECT 
        a.id, 
        a.customer_name, 
        a.sales_id,
        a.created_by,
        p.full_name as sales_name,
        p.username as sales_username,
        p.role as sales_role
      FROM appointments a
      LEFT JOIN profiles p ON a.sales_id = p.id
      WHERE a.customer_name LIKE '%测试%' OR a.customer_name LIKE '%张三%'
      ORDER BY a.created_at DESC
      LIMIT 10
    `);
    
    console.log(`找到 ${result.rows.length} 条预约记录:\n`);
    
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. 客户: ${row.customer_name}`);
      console.log(`   预约ID: ${row.id}`);
      console.log(`   sales_id: ${row.sales_id || '无'}`);
      console.log(`   created_by: ${row.created_by || '无'}`);
      console.log(`   销售姓名: ${row.sales_name || '无'}`);
      console.log(`   销售用户名: ${row.sales_username || '无'}`);
      console.log(`   销售角色: ${row.sales_role || '无'}`);
      console.log('');
    });
    
    // 检查profiles表中的销售用户
    console.log('📋 检查profiles表中的销售用户:');
    const salesResult = await pool.query(`
      SELECT id, username, full_name, role 
      FROM profiles 
      WHERE role = 'sales'
      ORDER BY created_at DESC
    `);
    
    console.log(`找到 ${salesResult.rows.length} 个销售用户:`);
    salesResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.full_name} (${row.username}) - ${row.role}`);
      console.log(`   ID: ${row.id}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ 查询失败:', error);
  }
}

checkSalesData();