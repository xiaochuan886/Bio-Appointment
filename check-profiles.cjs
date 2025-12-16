const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://app_user:secure_password_123@localhost:5437/bio_appointment'
});

async function checkProfiles() {
  try {
    const result = await pool.query(`
      SELECT id, username, role, is_active, created_at 
      FROM profiles 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('📋 数据库中的用户(profiles):');
    result.rows.forEach(user => {
      console.log(`   用户名: ${user.username}, 角色: ${user.role}, 状态: ${user.is_active ? '激活' : '未激活'}`);
    });
    
    if (result.rows.length === 0) {
      console.log('❌ 没有找到任何用户');
    }
  } catch (error) {
    console.error('❌ 查询用户失败:', error);
  } finally {
    await pool.end();
  }
}

checkProfiles();