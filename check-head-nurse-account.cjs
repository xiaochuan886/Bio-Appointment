#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function checkHeadNurseAccount() {
  try {
    console.log('🔍 检查护士长账户信息...\n');

    // 查询所有护士长账户
    const nurseQuery = `
      SELECT 
        id,
        username,
        email,
        full_name,
        role,
        status,
        store_id,
        (SELECT name FROM stores WHERE id = profiles.store_id) as store_name
      FROM profiles 
      WHERE role = 'head_nurse'
      ORDER BY full_name
    `;
    
    const { rows: nurses } = await pool.query(nurseQuery);
    console.log(`👩‍⚕️ 找到 ${nurses.length} 个护士长账户:`);
    
    nurses.forEach((nurse, index) => {
      console.log(`\n护士长 ${index + 1}:`);
      console.log(`  ID: ${nurse.id}`);
      console.log(`  用户名: ${nurse.username}`);
      console.log(`  姓名: ${nurse.full_name}`);
      console.log(`  邮箱: ${nurse.email}`);
      console.log(`  状态: ${nurse.status}`);
      console.log(`  门店ID: ${nurse.store_id}`);
      console.log(`  门店名称: ${nurse.store_name}`);
    });

    // 查询上海门店的护士长
    console.log('\n🏪 查询上海门店的护士长...');
    const shanghaiNurseQuery = `
      SELECT 
        p.id,
        p.username,
        p.full_name,
        p.store_id,
        s.name as store_name,
        s.address
      FROM profiles p
      JOIN stores s ON p.store_id = s.id
      WHERE p.role = 'head_nurse' 
        AND (s.name ILIKE '%上海%' OR s.address ILIKE '%上海%')
    `;
    
    const { rows: shanghaiNurses } = await pool.query(shanghaiNurseQuery);
    console.log(`📋 上海门店护士长 (${shanghaiNurses.length} 人):`);
    
    shanghaiNurses.forEach(nurse => {
      console.log(`  ${nurse.full_name} (${nurse.username}) - ${nurse.store_name}`);
    });

  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await pool.end();
  }
}

checkHeadNurseAccount();