const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function checkRemainingNullAppointments() {
  try {
    console.log('🔍 检查剩余的store_id为null的预约...');
    
    // 查看所有store_id为null的预约
    const nullAppointments = await pool.query(`
      SELECT a.id, a.customer_name, a.requested_date, a.created_at, a.status,
             a.workflow_status, a.requires_nurse_scheduling,
             s.name as store_name
      FROM appointments a
      LEFT JOIN stores s ON a.store_id = s.id
      WHERE a.store_id IS NULL
    `);
    
    console.log(`📊 剩余 ${nullAppointments.rows.length} 个预约的store_id为null:`);
    nullAppointments.rows.forEach(apt => {
      console.log(`  - ${apt.customer_name} (${apt.id})`);
      console.log(`    日期: ${apt.requested_date}`);
      console.log(`    状态: ${apt.status}`);
      console.log(`    工作流状态: ${apt.workflow_status}`);
      console.log(`    需要护士排班: ${apt.requires_nurse_scheduling}`);
      console.log(`    创建时间: ${apt.created_at}`);
      console.log('');
    });
    
    // 检查是否有活跃的门店
    const activeStores = await pool.query(`
      SELECT id, name, status 
      FROM stores 
      ORDER BY created_at
    `);
    
    console.log('🏢 所有门店:');
    activeStores.rows.forEach(store => {
      console.log(`  - ${store.name} (${store.id}) - 状态: ${store.status}`);
    });
    
    // 手动修复剩余的预约
    if (nullAppointments.rows.length > 0 && activeStores.rows.length > 0) {
      const defaultStore = activeStores.rows.find(s => s.status === 'active') || activeStores.rows[0];
      console.log(`🔧 使用门店 ${defaultStore.name} (${defaultStore.id}) 修复剩余预约...`);
      
      for (const apt of nullAppointments.rows) {
        await pool.query(`
          UPDATE appointments 
          SET store_id = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [defaultStore.id, apt.id]);
        
        console.log(`✅ 修复预约: ${apt.customer_name}`);
      }
    }
    
    // 最终验证
    const finalCheck = await pool.query(`
      SELECT COUNT(*) as null_count
      FROM appointments 
      WHERE store_id IS NULL
    `);
    
    console.log(`📊 最终检查: store_id为null的预约数量: ${finalCheck.rows[0].null_count}`);
    
  } catch (error) {
    console.error('❌ 检查过程中出错:', error);
  } finally {
    await pool.end();
  }
}

// 运行检查
checkRemainingNullAppointments();