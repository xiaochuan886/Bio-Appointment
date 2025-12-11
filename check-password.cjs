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

async function checkPassword() {
  try {
    console.log('🔍 检查护士长密码...\n');

    // 查询护士长的密码哈希
    const query = `
      SELECT username, password_hash 
      FROM profiles 
      WHERE username = 'head_nurse2'
    `;
    
    const { rows } = await pool.query(query);
    
    if (rows.length > 0) {
      const user = rows[0];
      console.log(`用户: ${user.username}`);
      console.log(`密码哈希: ${user.password_hash}`);
      
      // 测试常见密码
      const testPasswords = ['password', 'password123', '123456', 'admin'];
      
      for (const pwd of testPasswords) {
        try {
          const isMatch = await bcrypt.compare(pwd, user.password_hash);
          console.log(`测试密码 "${pwd}": ${isMatch ? '✅ 匹配' : '❌ 不匹配'}`);
          if (isMatch) {
            console.log(`\n🎉 找到正确密码: ${pwd}`);
            break;
          }
        } catch (error) {
          console.log(`测试密码 "${pwd}": ❌ 错误 - ${error.message}`);
        }
      }
    } else {
      console.log('❌ 未找到用户 head_nurse2');
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await pool.end();
  }
}

checkPassword();