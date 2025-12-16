const { Pool } = require('pg');

// 数据库连接
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function checkScheduleStatusEnum() {
  console.log('🔍 检查 schedule_status 枚举类型...');
  
  try {
    // 检查枚举类型
    const enumResult = await pool.query(`
      SELECT e.enumlabel AS value
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'schedule_status'
      ORDER BY e.enumsortorder;
    `);
    
    console.log('📊 schedule_status 枚举值:');
    if (enumResult.rows.length === 0) {
      console.log('❌ 没有找到 schedule_status 枚举类型');
    } else {
      enumResult.rows.forEach(row => {
        console.log(`   - ${row.value}`);
      });
    }
    
    // 检查 schedules 表中的状态值
    const statusResult = await pool.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM schedules
      GROUP BY status
      ORDER BY status;
    `);
    
    console.log('\n📊 schedules 表中的状态值:');
    if (statusResult.rows.length === 0) {
      console.log('❌ schedules 表中没有数据');
    } else {
      statusResult.rows.forEach(row => {
        console.log(`   - ${row.status}: ${row.count} 条记录`);
      });
    }
    
    // 检查是否有无效的状态值
    console.log('\n🔍 检查无效的状态值...');
    const invalidResult = await pool.query(`
      SELECT s.id, s.status
      FROM schedules s
      LEFT JOIN pg_enum e ON e.enumlabel = s.status 
        AND e.enumtypid = (SELECT oid FROM pg_type WHERE typname = 'schedule_status')
      WHERE e.enumlabel IS NULL AND s.status IS NOT NULL
      LIMIT 10;
    `);
    
    if (invalidResult.rows.length > 0) {
      console.log('❌ 发现无效的状态值:');
      invalidResult.rows.forEach(row => {
        console.log(`   - 排班ID: ${row.id}, 状态: ${row.status}`);
      });
    } else {
      console.log('✅ 所有状态值都有效');
    }
    
    // 检查最近的错误日志
    console.log('\n🔍 检查最近的排班更新操作...');
    const recentSchedules = await pool.query(`
      SELECT id, status, updated_at
      FROM schedules
      WHERE updated_at > NOW() - INTERVAL '1 hour'
      ORDER BY updated_at DESC
      LIMIT 5;
    `);
    
    if (recentSchedules.rows.length > 0) {
      console.log('📊 最近更新的排班:');
      recentSchedules.rows.forEach(row => {
        console.log(`   - 排班ID: ${row.id}, 状态: ${row.status}, 更新时间: ${row.updated_at}`);
      });
    } else {
      console.log('📊 最近1小时内没有排班更新');
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await pool.end();
  }
}

// 运行检查
checkScheduleStatusEnum().then(() => {
  console.log('\n🎉 检查完成！');
}).catch(error => {
  console.error('💥 检查过程中发生错误:', error);
});