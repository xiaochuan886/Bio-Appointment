#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123'
});

async function checkCreatedBy() {
  try {
    console.log('🔍 检查created_by字段对应的用户信息...\n');
    
    // 检查created_by对应的用户信息
    const result = await pool.query(`
      SELECT DISTINCT
        a.created_by,
        p.full_name,
        p.username,
        p.role,
        COUNT(a.id) as appointment_count
      FROM appointments a
      LEFT JOIN profiles p ON a.created_by = p.id
      WHERE a.created_by IS NOT NULL
      GROUP BY a.created_by, p.full_name, p.username, p.role
      ORDER BY appointment_count DESC
    `);
    
    console.log('created_by字段对应的用户信息:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. 用户: ${row.full_name || '未知'} (${row.username || '未知'})`);
      console.log(`   角色: ${row.role || '未知'}`);
      console.log(`   ID: ${row.created_by}`);
      console.log(`   创建的预约数: ${row.appointment_count}`);
      console.log('');
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ 查询失败:', error);
  }
}

checkCreatedBy();