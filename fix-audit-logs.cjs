const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function fixAuditLogs() {
  try {
    console.log('🔍 检查 audit_logs 表结构...');
    
    // 检查表是否存在
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'audit_logs'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('🔧 创建 audit_logs 表...');
      await pool.query(`
        CREATE TABLE audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          table_name VARCHAR(255) NOT NULL,
          record_id UUID,
          action VARCHAR(100),
          old_values JSONB,
          new_values JSONB,
          user_id UUID,
          note TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ audit_logs 表创建成功');
    } else {
      console.log('📋 audit_logs 表已存在，检查字段...');
      
      // 检查字段
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'audit_logs'
        ORDER BY ordinal_position
      `);
      
      console.log('当前字段:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
      
      // 检查是否缺少 action 字段
      const hasActionField = columns.rows.some(col => col.column_name === 'action');
      
      if (!hasActionField) {
        console.log('🔧 添加 action 字段...');
        await pool.query(`
          ALTER TABLE audit_logs 
          ADD COLUMN action VARCHAR(100)
        `);
        console.log('✅ action 字段添加成功');
      } else {
        console.log('✅ action 字段已存在');
      }
    }
    
    console.log('🎉 audit_logs 表修复完成！');
    
  } catch (error) {
    console.error('❌ 修复过程中出错:', error);
  } finally {
    await pool.end();
  }
}

// 执行修复
fixAuditLogs();