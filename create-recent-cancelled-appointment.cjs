const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function createRecentCancelledAppointment() {
  console.log('🧪 创建最新的已取消预约（带销售信息）...\n');

  try {
    // 1. 获取销售用户
    const salesResult = await pool.query(
      "SELECT id, username, full_name, role FROM profiles WHERE role = 'sales' LIMIT 1"
    );

    if (salesResult.rows.length === 0) {
      console.log('❌ 没有找到销售用户');
      return;
    }

    const salesUser = salesResult.rows[0];
    console.log('📋 找到销售用户:', {
      id: salesUser.id,
      name: salesUser.full_name,
      username: salesUser.username,
      role: salesUser.role
    });

    // 2. 获取护理服务
    const serviceResult = await pool.query(
      "SELECT id, name FROM services WHERE category = 'nursing' AND is_active = true LIMIT 1"
    );

    if (serviceResult.rows.length === 0) {
      console.log('❌ 没有找到护理服务');
      return;
    }

    const service = serviceResult.rows[0];
    console.log('📋 找到护理服务:', service);

    // 3. 获取门店
    const storeResult = await pool.query(
      "SELECT id, name FROM stores WHERE status = 'active' LIMIT 1"
    );

    if (storeResult.rows.length === 0) {
      console.log('❌ 没有找到门店');
      return;
    }

    const store = storeResult.rows[0];
    console.log('📋 找到门店:', store);

    // 4. 创建最新的已取消预约（带销售信息）
    const appointmentData = {
      customer_name: '最新测试客户-销售信息验证',
      customer_phone: '13800138001',
      service_id: service.id,
      requested_date: new Date().toISOString().split('T')[0], // 今天
      requested_time_start: '14:00:00',
      requested_time_end: '15:00:00',
      total_people: 2,
      companion_names: ['同行客户A'],
      estimated_duration: 60,
      is_urgent: false,
      store_id: store.id,
      sales_id: salesUser.id,
      created_by: salesUser.id,
      status: 'cancelled',
      cancelled_reason: '测试用途-验证销售信息显示',
      cancelled_at: new Date(),
      workflow_status: 'cancelled',
      requires_nurse_scheduling: true
    };

    const insertResult = await pool.query(
      `INSERT INTO appointments (
        customer_name, customer_phone, service_id, requested_date, 
        requested_time_start, requested_time_end, total_people, companion_names,
        estimated_duration, is_urgent, store_id, sales_id, created_by,
        status, cancelled_reason, cancelled_at, workflow_status, requires_nurse_scheduling
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        appointmentData.customer_name,
        appointmentData.customer_phone,
        appointmentData.service_id,
        appointmentData.requested_date,
        appointmentData.requested_time_start,
        appointmentData.requested_time_end,
        appointmentData.total_people,
        appointmentData.companion_names,
        appointmentData.estimated_duration,
        appointmentData.is_urgent,
        appointmentData.store_id,
        appointmentData.sales_id,
        appointmentData.created_by,
        appointmentData.status,
        appointmentData.cancelled_reason,
        appointmentData.cancelled_at,
        appointmentData.workflow_status,
        appointmentData.requires_nurse_scheduling
      ]
    );

    const newAppointment = insertResult.rows[0];
    console.log('✅ 创建最新已取消预约成功:', {
      id: newAppointment.id,
      customer_name: newAppointment.customer_name,
      sales_id: newAppointment.sales_id,
      status: newAppointment.status,
      cancelled_at: newAppointment.cancelled_at
    });

    // 5. 验证销售信息查询
    console.log('\n🔍 验证销售信息查询...');
    const verifyQuery = `
      SELECT
        a.id,
        a.customer_name,
        a.companion_names,
        a.total_people,
        a.status,
        a.cancelled_reason,
        a.cancelled_at,
        s.name as service_name,
        COALESCE(sales_p.full_name, creator_p.full_name) as sales_name,
        COALESCE(sales_p.username, creator_p.username) as sales_username,
        COALESCE(sales_p.role, creator_p.role) as sales_role
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN profiles sales_p ON a.sales_id = sales_p.id
      LEFT JOIN profiles creator_p ON a.created_by = creator_p.id
      WHERE a.id = $1
    `;

    const verifyResult = await pool.query(verifyQuery, [newAppointment.id]);
    const verifiedAppointment = verifyResult.rows[0];

    console.log('📋 验证结果:');
    console.log(`   客户: ${verifiedAppointment.customer_name}`);
    console.log(`   服务: ${verifiedAppointment.service_name}`);
    console.log(`   预约人: ${verifiedAppointment.sales_name || '未指定'}`);
    console.log(`   预约人用户名: ${verifiedAppointment.sales_username || '未指定'}`);
    console.log(`   预约人角色: ${verifiedAppointment.sales_role || '未指定'}`);
    console.log(`   客户数量: ${verifiedAppointment.total_people}`);
    if (verifiedAppointment.companion_names && verifiedAppointment.companion_names.length > 0) {
      console.log(`   同行客户: ${verifiedAppointment.companion_names.join(', ')}`);
    }
    console.log(`   状态: ${verifiedAppointment.status}`);
    console.log(`   取消原因: ${verifiedAppointment.cancelled_reason}`);
    console.log(`   取消时间: ${new Date(verifiedAppointment.cancelled_at).toLocaleString()}`);

    console.log('\n🎉 最新已取消预约创建完成！');
    console.log('现在刷新前端页面，应该能在已取消预约列表的顶部看到带销售信息的预约。');

  } catch (error) {
    console.error('❌ 创建已取消预约失败:', error);
  } finally {
    await pool.end();
  }
}

// 运行测试
createRecentCancelledAppointment();