const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function createRecentCancelledWithSales() {
  console.log('🧪 创建最新的已取消预约（确保显示在顶部）...\n');

  try {
    // 1. 获取销售用户
    const salesResult = await pool.query(
      "SELECT id, full_name FROM profiles WHERE role = 'sales' LIMIT 1"
    );
    
    const salesId = salesResult.rows[0].id;
    const salesName = salesResult.rows[0].full_name;
    console.log(`✅ 使用销售用户: ${salesName} (${salesId})`);

    // 2. 获取护理服务
    const serviceResult = await pool.query(
      "SELECT id, name FROM services WHERE category = 'nursing' LIMIT 1"
    );
    const service = serviceResult.rows[0];
    console.log(`✅ 使用服务: ${service.name} (${service.id})`);

    // 3. 获取门店
    const storeResult = await pool.query("SELECT id, name FROM stores LIMIT 1");
    const store = storeResult.rows[0];
    console.log(`✅ 使用门店: ${store.name} (${store.id})`);

    // 4. 先创建一个正常预约，然后立即取消它
    const today = new Date().toISOString().split('T')[0];
    
    // 创建预约
    const appointmentResult = await pool.query(
      `INSERT INTO appointments (
        customer_name, customer_phone, service_id, requested_date, 
        requested_time_start, requested_time_end, status, 
        total_people, estimated_duration, is_urgent, 
        companion_names, store_id, sales_id, created_by,
        workflow_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'pending', 
        $7, $8, $9, $10, $11, $12, $13, 'pending_nurse_assignment'
      ) RETURNING *`,
      [
        '刚刚取消的客户-有销售信息',
        '13900000000',
        service.id,
        today,
        '14:00:00',
        '15:00:00',
        2, // total_people
        60, // estimated_duration
        false, // is_urgent
        ['同行客户B'], // companion_names
        store.id,
        salesId, // sales_id 
        salesId, // created_by
      ]
    );

    const appointment = appointmentResult.rows[0];
    console.log(`✅ 创建预约成功: ${appointment.id}`);

    // 立即取消预约
    const cancelResult = await pool.query(
      `UPDATE appointments 
       SET status = 'cancelled', 
           cancelled_at = CURRENT_TIMESTAMP,
           cancelled_reason = '刚刚取消-测试销售信息显示',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 
       RETURNING *`,
      [appointment.id]
    );

    const cancelledAppointment = cancelResult.rows[0];
    console.log(`✅ 取消预约成功:`);
    console.log(`   ID: ${cancelledAppointment.id}`);
    console.log(`   客户: ${cancelledAppointment.customer_name}`);
    console.log(`   取消时间: ${cancelledAppointment.cancelled_at}`);
    console.log(`   取消原因: ${cancelledAppointment.cancelled_reason}`);

    // 5. 验证API返回
    console.log('\n🔍 验证API返回...');
    
    const fetch = require('node-fetch');
    const mockToken = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3MzM4NjI1NzksImV4cCI6MTczMzk0ODk3OX0.signature';
    
    const response = await fetch('http://localhost:3001/api/appointments/cancelled', {
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ API返回 ${data.length} 个已取消预约`);
      
      // 显示前5个预约的详细信息
      console.log('\n📋 前5个已取消预约（按最新排序）:');
      console.log('─'.repeat(80));
      
      data.slice(0, 5).forEach((apt, index) => {
        console.log(`${index + 1}. 客户: ${apt.customer_name}`);
        console.log(`   预约人: ${apt.sales_name || '未指定'}`);
        console.log(`   服务: ${apt.service_name}`);
        console.log(`   取消时间: ${apt.cancelled_at ? new Date(apt.cancelled_at).toLocaleString() : '未知'}`);
        console.log(`   创建时间: ${apt.created_at ? new Date(apt.created_at).toLocaleString() : '未知'}`);
        if (apt.cancelled_reason) {
          console.log(`   取消原因: ${apt.cancelled_reason}`);
        }
        console.log('');
      });
      
      // 查找我们刚创建的预约
      const ourAppointment = data.find(apt => apt.id === appointment.id);
      if (ourAppointment) {
        const position = data.findIndex(apt => apt.id === appointment.id) + 1;
        console.log(`✅ 找到新创建的预约，位置: ${position}`);
        console.log(`   客户: ${ourAppointment.customer_name}`);
        console.log(`   预约人: ${ourAppointment.sales_name || '未指定'}`);
        
        if (position <= 3) {
          console.log('   ✅ 预约显示在前3位，排序正确');
        } else {
          console.log('   ⚠️ 预约未显示在前3位，可能需要调整排序');
        }
        
        if (ourAppointment.sales_name && ourAppointment.sales_name !== '未指定') {
          console.log('   ✅ 销售信息正确显示');
        } else {
          console.log('   ❌ 销售信息缺失');
        }
      } else {
        console.log('❌ 没有找到新创建的预约');
      }
      
    } else {
      console.log(`❌ API调用失败: ${response.status}`);
    }

    console.log('\n🎯 现在可以在前端查看已取消预约列表，新取消的预约应该显示在顶部');

  } catch (error) {
    console.error('❌ 操作失败:', error);
  } finally {
    await pool.end();
  }
}

createRecentCancelledWithSales();