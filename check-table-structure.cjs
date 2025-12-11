#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function checkTableStructure() {
  try {
    console.log('📋 检查关键表的结构...\n');

    const tables = ['appointments', 'stores', 'profiles', 'schedules', 'services'];
    
    for (const tableName of tables) {
      console.log(`\n🔍 ${tableName} 表结构:`);
      
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `;
      
      const { rows: columns } = await pool.query(columnsQuery, [tableName]);
      
      columns.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });
      
      // 显示前几条记录作为示例
      try {
        const sampleQuery = `SELECT * FROM ${tableName} LIMIT 3`;
        const { rows: samples } = await pool.query(sampleQuery);
        
        if (samples.length > 0) {
          console.log(`\n  示例数据:`);
          samples.forEach((row, index) => {
            console.log(`    记录 ${index + 1}:`, JSON.stringify(row, null, 2));
          });
        }
      } catch (error) {
        console.log(`  无法获取示例数据: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ 检查表结构失败:', error.message);
  } finally {
    await pool.end();
  }
}

checkTableStructure();