#!/usr/bin/env node

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function fixPassword() {
  try {
    console.log('🔧 修复护士长密码...\n');

    // 生成正确的密码哈希
    const password = 'password123';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    console.log(`原密码: ${password}`);
    console.log(`新哈希: ${hashedPassword}`);

    // 更新密码
    const updateQuery = `
      UPDATE profiles 
      SET password_hash = $1 
      WHERE username = 'head_nurse2'
    `;
    
    await pool.query(updateQuery, [hashedPassword]);
    console.log('✅ 密码已更新');

    // 验证更新
    const verifyQuery = `
      SELECT username, password_hash 
      FROM profiles 
      WHERE username = 'head_nurse2'
    `;
    
    const { rows } = await pool.query(verifyQuery);
    if (rows.length > 0) {
      const isMatch = await bcrypt.compare(password, rows[0].password_hash);
      console.log(`验证密码: ${isMatch ? '✅ 成功' : '❌ 失败'}`);
    }

  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await pool.end();
  }
}

fixPassword();