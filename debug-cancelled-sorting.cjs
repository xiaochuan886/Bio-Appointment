const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function debugCancelledSorting() {
  console.log('🔍 调试已取消预约排序...\n');

  try {
    // 查看前10个已取消预约的时间戳信息
    const result = await pool.query(`
      SELECT 
        customer_name,
        cancelled_at,
        created_at,
        updated_at,
        COALESCE(cancelled_at, updated_at, created_at) as sort_time
      FROM appointments 
      WHERE status = 'cancelled'
      ORDER BY COALESCE(cancelled_at, updated_at, created_at) DESC, created_at DESC
      LIMIT 10
    `);

    console.log('📋 前10个已取消预约的时间戳信息:');
    console.log('─'.repeat(100));
    
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. 客户: ${row.customer_name}`);
      console.log(`   cancelled_at: ${row.cancelled_at ? new Date(row.cancelled_at).toLocaleString() : 'NULL'}`);
      console.log(`   created_at: ${row.created_at ? new Date(row.created_at).toLocaleString() : 'NULL'}`);
      console.log(`   updated_at: ${row.updated_at ? new Date(row.updated_at).toLocaleString() : 'NULL'}`);
      console.log(`   sort_time: ${row.sort_time ? new Date(row.sort_time).toLocaleString() : 'NULL'}`);
      console.log('');
    });

    // 查看有销售信息的已取消预约
    console.log('\n📋 有销售信息的已取消预约:');
    console.log('─'.repeat(100));
    
    const salesResult = await pool.query(`
      SELECT 
        a.customer_name,
        a.cancelled_at,
        a.created_at,
        COALESCE(sales_p.full_name, creator_p.full_name) as sales_name
      FROM appointments a
      LEFT JOIN profiles sales_p ON a.sales_id = sales_p.id
      LEFT JOIN profiles creator_p ON a.created_by = creator_p.id
      WHERE a.status = 'cancelled' 
        AND (sales_p.full_name IS NOT NULL OR creator_p.full_name IS NOT NULL)
      ORDER BY COALESCE(a.cancelled_at, a.updated_at, a.created_at) DESC, a.created_at DESC
    `);

    salesResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. 客户: ${row.customer_name}`);
      console.log(`   预约人: ${row.sales_name || '未指定'}`);
      console.log(`   cancelled_at: ${row.cancelled_at ? new Date(row.cancelled_at).toLocaleString() : 'NULL'}`);
      console.log(`   created_at: ${row.created_at ? new Date(row.created_at).toLocaleString() : 'NULL'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ 调试失败:', error);
  } finally {
    await pool.end();
  }
}

debugCancelledSorting();