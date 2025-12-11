#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function checkTables() {
  try {
    console.log('📡 检查数据库表结构...\n');

    // 查询所有表
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    const { rows: tables } = await pool.query(tablesQuery);
    console.log(`📋 数据库中的表 (${tables.length} 个):`);
    
    if (tables.length === 0) {
      console.log('❌ 数据库中没有表，需要先运行迁移脚本');
      return;
    }
    
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });

    // 检查每个表的记录数
    console.log('\n📊 各表记录数:');
    for (const table of tables) {
      try {
        const countQuery = `SELECT COUNT(*) as count FROM ${table.table_name}`;
        const { rows: countResult } = await pool.query(countQuery);
        console.log(`  ${table.table_name}: ${countResult[0].count} 条记录`);
      } catch (error) {
        console.log(`  ${table.table_name}: 查询失败 - ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ 检查表结构失败:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();