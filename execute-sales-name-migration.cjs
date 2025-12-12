#!/usr/bin/env node

/**
 * 执行预约人信息数据库迁移
 */

const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'bio_appointment',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function executeSalesNameMigration() {
  console.log('🔍 执行预约人信息数据库迁移...\n');

  try {
    // 读取迁移文件
    const fs = require('fs');
    const migrationSQL = fs.readFileSync('database/migrations/09-add-sales-name-column.sql', 'utf8');

    console.log('1. 开始执行迁移...');
    
    // 执行迁移
    await pool.query(migrationSQL);
    
    console.log('✅ 迁移执行成功！');

    // 验证迁移结果
    console.log('\n2. 验证迁移结果...');
    
    // 检查列是否已添加
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'appointments' 
        AND column_name IN ('sales_name', 'sales_username', 'sales_role')
      ORDER BY column_name;
    `);
    
    console.log('✅ 已添加的列:');
    columnCheck.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // 检查数据更新情况
    const dataCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_appointments,
        COUNT(sales_name) as with_sales_name,
        COUNT(sales_id) as with_sales_id,
        COUNT(created_by) as with_created_by
      FROM appointments;
    `);
    
    const stats = dataCheck.rows[0];
    const updatePercentage = stats.total_appointments > 0 
      ? ((stats.with_sales_name / stats.total_appointments) * 100).toFixed(2)
      : 0;
    
    console.log('\n📊 数据统计:');
    console.log(`  - 总预约记录数: ${stats.total_appointments}`);
    console.log(`  - 有预约人姓名的记录: ${stats.with_sales_name}`);
    console.log(`  - 有sales_id的记录: ${stats.with_sales_id}`);
    console.log(`  - 有created_by的记录: ${stats.with_created_by}`);
    console.log(`  - 预约人信息覆盖率: ${updatePercentage}%`);

    // 显示一些示例数据
    const sampleData = await pool.query(`
      SELECT customer_name, sales_name, sales_username, sales_role
      FROM appointments 
      WHERE sales_name IS NOT NULL
      LIMIT 5;
    `);
    
    if (sampleData.rows.length > 0) {
      console.log('\n📋 示例数据:');
      sampleData.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. 客户: ${row.customer_name}, 预约人: ${row.sales_name} (${row.sales_username}, ${row.sales_role})`);
      });
    }

    // 检查触发器是否创建成功
    const triggerCheck = await pool.query(`
      SELECT trigger_name, event_manipulation, action_timing
      FROM information_schema.triggers 
      WHERE trigger_name = 'trigger_update_appointment_sales_info';
    `);
    
    if (triggerCheck.rows.length > 0) {
      console.log('\n✅ 触发器创建成功:');
      triggerCheck.rows.forEach(row => {
        console.log(`  - ${row.trigger_name}: ${row.action_timing} ${row.event_manipulation}`);
      });
    }

    console.log('\n🎉 预约人信息迁移完成！');
    console.log('现在可以直接在appointments表中存储和查询预约人信息了。');

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    await pool.end();
  }
}

// 运行迁移
executeSalesNameMigration();