const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function fixAppointmentStoreId() {
  try {
    console.log('🔍 开始检查预约的store_id问题...');
    
    // 1. 检查有多少预约的store_id为null
    const nullStoreIdResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM appointments 
      WHERE store_id IS NULL
    `);
    
    console.log(`📊 发现 ${nullStoreIdResult.rows[0].count} 个预约的store_id为null`);
    
    // 2. 查看这些预约的详细信息
    const nullStoreAppointments = await pool.query(`
      SELECT a.id, a.customer_name, a.requested_date, a.created_at,
             s.name as store_name
      FROM appointments a
      LEFT JOIN stores s ON a.store_id = s.id
      WHERE a.store_id IS NULL
      LIMIT 10
    `);
    
    console.log('📋 store_id为null的预约样本:');
    nullStoreAppointments.rows.forEach(apt => {
      console.log(`  - ${apt.customer_name} (${apt.id}) - ${apt.requested_date} - 当前门店: ${apt.store_name || '无'}`);
    });
    
    // 3. 检查是否有默认门店
    const defaultStoreResult = await pool.query(`
      SELECT id, name 
      FROM stores 
      WHERE status = 'active' 
      ORDER BY created_at 
      LIMIT 1
    `);
    
    if (defaultStoreResult.rows.length === 0) {
      console.log('❌ 没有找到活跃的门店，无法修复');
      return;
    }
    
    const defaultStore = defaultStoreResult.rows[0];
    console.log(`🏢 找到默认门店: ${defaultStore.name} (${defaultStore.id})`);
    
    // 4. 修复所有store_id为null的预约
    console.log('🔧 开始修复预约的store_id...');
    
    const updateResult = await pool.query(`
      UPDATE appointments 
      SET store_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE store_id IS NULL
      RETURNING id, customer_name, requested_date
    `, [defaultStore.id]);
    
    console.log(`✅ 成功修复了 ${updateResult.rows.length} 个预约的store_id`);
    
    // 5. 验证修复结果
    const verifyResult = await pool.query(`
      SELECT COUNT(*) as null_count, 
             COUNT(CASE WHEN store_id IS NOT NULL THEN 1 END) as not_null_count
      FROM appointments
    `);
    
    console.log('📊 修复后的统计:');
    console.log(`  - store_id为null: ${verifyResult.rows[0].null_count}`);
    console.log(`  - store_id不为null: ${verifyResult.rows[0].not_null_count}`);
    
    // 6. 检查房间数据
    const roomStats = await pool.query(`
      SELECT COUNT(*) as total_rooms,
             COUNT(CASE WHEN store_id IS NULL THEN 1 END) as null_store_rooms
      FROM resources 
      WHERE type IN ('room', 'vip', 'treatment', 'consultation')
    `);
    
    console.log('📊 房间数据统计:');
    console.log(`  - 总房间数: ${roomStats.rows[0].total_rooms}`);
    console.log(`  - store_id为null的房间: ${roomStats.rows[0].null_store_rooms}`);
    
    console.log('✅ 修复完成！');
    
  } catch (error) {
    console.error('❌ 修复过程中出错:', error);
  } finally {
    await pool.end();
  }
}

// 运行修复
fixAppointmentStoreId();