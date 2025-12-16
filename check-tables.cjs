const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://app_user:secure_password_123@localhost:5437/bio_appointment'
});

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 数据库中的表:');
    result.rows.forEach(row => {
      console.log(`   ${row.table_name}`);
    });
    
    if (result.rows.length === 0) {
      console.log('❌ 没有找到任何表');
    }
  } catch (error) {
    console.error('❌ 查询表失败:', error);
  } finally {
    await pool.end();
  }
}

checkTables();