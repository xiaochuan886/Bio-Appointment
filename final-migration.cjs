const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function finalMigration() {
  try {
    console.log('开始最终排班状态迁移...');
    
    // 1. 先检查当前的状态值
    const currentStatusResult = await pool.query('SELECT DISTINCT status FROM schedules ORDER BY status');
    console.log('当前排班状态:', currentStatusResult.rows.map(row => row.status));
    
    // 2. 开始事务
    await pool.query('BEGIN');
    
    // 3. 先删除默认值约束
    console.log('删除默认值约束...');
    try {
      await pool.query('ALTER TABLE schedules ALTER COLUMN status DROP DEFAULT');
    } catch (e) {
      console.log('默认值不存在或已删除:', e.message);
    }
    
    // 4. 将状态列转换为文本类型
    console.log('将状态列转换为文本类型...');
    await pool.query('ALTER TABLE schedules ALTER COLUMN status TYPE TEXT USING status::text');
    
    // 5. 删除旧的枚举类型（使用CASCADE）
    console.log('删除旧的枚举类型...');
    try {
      await pool.query('DROP TYPE IF EXISTS schedule_status CASCADE');
    } catch (e) {
      console.log('枚举类型不存在或已删除:', e.message);
    }
    
    // 6. 创建新的枚举类型
    console.log('创建新的枚举类型...');
    await pool.query(`
      CREATE TYPE schedule_status AS ENUM (
        'pending',
        'scheduled', 
        'in_progress',
        'completed',
        'cancelled'
      )
    `);
    
    // 7. 更新现有数据
    console.log('更新现有数据...');
    await pool.query(`
      UPDATE schedules 
      SET status = CASE 
        WHEN status = 'draft' THEN 'pending'
        WHEN status = 'published' THEN 'scheduled'
        WHEN status = 'locked' THEN 'completed'
        ELSE status
      END
    `);
    
    // 8. 将状态列转换为新枚举类型
    console.log('将状态列转换为新枚举类型...');
    await pool.query(`
      ALTER TABLE schedules 
      ALTER COLUMN status TYPE schedule_status 
      USING status::text::schedule_status
    `);
    
    // 9. 设置新的默认值
    console.log('设置新的默认值...');
    await pool.query(`
      ALTER TABLE schedules 
      ALTER COLUMN status SET DEFAULT 'pending'
    `);
    
    // 10. 添加非空约束
    console.log('添加非空约束...');
    await pool.query(`
      ALTER TABLE schedules 
      ALTER COLUMN status SET NOT NULL
    `);
    
    // 提交事务
    await pool.query('COMMIT');
    
    console.log('✅ 排班状态迁移完成！');
    
    // 验证结果
    const result = await pool.query('SELECT status, COUNT(*) as count FROM schedules GROUP BY status ORDER BY status');
    console.log('迁移后的状态分布:');
    result.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count}`);
    });
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

finalMigration();