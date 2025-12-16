const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://app_user:secure_password_123@localhost:5437/bio_appointment'
});

async function checkProfilesStructure() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 profiles表结构:');
    result.rows.forEach(column => {
      console.log(`   ${column.column_name}: ${column.data_type} (可为空: ${column.is_nullable})`);
    });
    
    // 查看前几条记录
    const dataResult = await pool.query(`
      SELECT * FROM profiles 
      LIMIT 5
    `);
    
    console.log('\n📋 profiles表数据:');
    dataResult.rows.forEach((row, index) => {
      console.log(`   记录${index + 1}:`, row);
    });
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await pool.end();
  }
}

checkProfilesStructure();