const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function checkSchedulesTable() {
  try {
    console.log('🔍 检查 schedules 表结构...');
    
    // 检查表结构
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'schedules'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 schedules 表字段:');
    structureResult.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // 检查最近创建的排班记录
    const recentScheduleResult = await pool.query(`
      SELECT * FROM schedules 
      WHERE created_at > NOW() - INTERVAL '10 minutes'
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    if (recentScheduleResult.rows.length > 0) {
      const schedule = recentScheduleResult.rows[0];
      console.log('\n📝 最近创建的排班记录:');
      console.log(`  ID: ${schedule.id}`);
      console.log(`  adjusted_duration: ${schedule.adjusted_duration}`);
      console.log(`  adjustment_reason: ${schedule.adjustment_reason}`);
      console.log(`  created_at: ${schedule.created_at}`);
    } else {
      console.log('\n📝 没有找到最近10分钟内创建的排班记录');
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await pool.end();
  }
}

checkSchedulesTable();