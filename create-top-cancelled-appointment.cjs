const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function createTopCancelledAppointment() {
  console.log('🧪 创建最新的已取消预约（应显示在列表顶部）...\n');

  try {
    // 1. 获取一个销售用户ID
    const salesResult = await pool.query(
      "SELECT id, full_name FROM profiles WHERE role = 'sales' LIMIT 1"
    );
    
    let salesId = null;
    let salesName = '张销售';
    
    if (salesResult.rows.length > 0) {
      salesId = salesResult.rows[0].id;
      salesName = salesResult.rows[0].full_name;
      console.log(`✅ 找到销售用户: ${salesName} (${salesId})`);
    } else {
      // 创建一个销售用户
      const createSalesResult = await pool.query(
        `INSERT INTO profiles (username, email, full_name, role, status)
         VALUES ('sales_zhang', 'zhang@sales.com', '张销售', 'sales', 'active')
         RETURNING id, full_name`
      );
      salesId = createSalesResult.rows[0].id;
      salesName = createSalesResult.rows[0].full_name;
      console.log(`✅ 创建销售用户: ${salesName} (${salesId})`);
    }

    // 2. 获取一个护理服务
    const serviceResult = await pool.query(
      "SELECT id, name FROM services WHERE category = 'nursing' LIMIT 1"
    );
    
    if (serviceResult.rows.length === 0) {
      throw new Error('没有找到护理服务');
    }
    
    const service = serviceResult.rows[0];
    console.log(`✅ 使用服务: ${service.name} (${service.id})`);

    // 3. 获取一个门店
    const storeResult = await pool.query("SELECT id, name FROM stores LIMIT 1");
    if (storeResult.rows.length === 0) {
      throw new Error('没有找到门店');
    }
    
    const store = storeResult.rows[0];
    console.log(`✅ 使用门店: ${store.name} (${store.id})`);

    // 4. 创建一个新的预约（使用今天的日期确保排在前面）
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date();
    
    const appointmentResult = await pool.query(
      `INSERT INTO appointments (
        customer_name, customer_phone, service_id, requested_date, 
        requested_time_start, requested_time_end, status, 
        total_people, estimated_duration, is_urgent, 
        companion_names, store_id, sales_id, created_by,
        workflow_status, cancelled_at, cancelled_reason,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'cancelled', 
        $7, $8, $9, $10, $11, $12, $13,
        'cancelled', CURRENT_TIMESTAMP, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *`,
      [
        '最新顶部测试客户-销售信息',
        '13800000000',
        service.id,
        today,
        '10:00:00',
        '11:00:00',
        2, // total_people
        60, // estimated_duration
        false, // is_urgent
        ['同行客户A'], // companion_names
        store.id,
        salesId, // sales_id 
        salesId, // created_by
        '客户临时有事取消' // cancelled_reason
      ]
    );

    const appointment = appointmentResult.rows[0];
    console.log(`✅ 创建已取消预约成功:`);
    console.log(`   ID: ${appointment.id}`);
    console.log(`   客户: ${appointment.customer_name}`);
    console.log(`   销售ID: ${appointment.sales_id}`);
    console.log(`   创建时间: ${appointment.created_at}`);
    console.log(`   取消时间: ${appointment.cancelled_at}`);
    console.log(`   取消原因: ${appointment.cancelled_reason}`);

    // 5. 验证API返回
    console.log('\n🔍 验证API返回...');
    
    // 模拟API调用验证
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
      
      // 查找我们刚创建的预约
      const ourAppointment = data.find(apt => apt.id === appointment.id);
      if (ourAppointment) {
        console.log(`✅ 找到新创建的预约，位置: ${data.findIndex(apt => apt.id === appointment.id) + 1}`);
        console.log(`   客户: ${ourAppointment.customer_name}`);
        console.log(`   预约人: ${ourAppointment.sales_name || '未指定'}`);
        console.log(`   销售角色: ${ourAppointment.sales_role || '未知'}`);
        
        if (ourAppointment.sales_name && ourAppointment.sales_name !== '未指定') {
          console.log('   ✅ 销售信息正确');
        } else {
          console.log('   ❌ 销售信息缺失');
        }
      } else {
        console.log('❌ 没有找到新创建的预约');
      }
      
      // 显示前3个预约的销售信息
      console.log('\n📋 前3个预约的销售信息:');
      data.slice(0, 3).forEach((apt, index) => {
        console.log(`   ${index + 1}. ${apt.customer_name} - 预约人: ${apt.sales_name || '未指定'}`);
      });
      
    } else {
      console.log(`❌ API调用失败: ${response.status}`);
    }

    console.log('\n🎯 现在可以在前端查看已取消预约列表，新创建的预约应该显示在顶部并包含销售信息');

  } catch (error) {
    console.error('❌ 创建失败:', error);
  } finally {
    await pool.end();
  }
}

createTopCancelledAppointment();