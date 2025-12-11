const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function createScheduleWithSalesInfo() {
  console.log('🧪 创建带销售信息的排班记录...\n');

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

    // 4. 获取护士
    const nurseResult = await pool.query(
      "SELECT id, full_name FROM profiles WHERE role = 'nurse' LIMIT 1"
    );
    const nurse = nurseResult.rows[0];
    console.log(`✅ 使用护士: ${nurse.full_name} (${nurse.id})`);

    // 5. 获取房间
    const roomResult = await pool.query("SELECT id, name FROM resources WHERE type = 'room' LIMIT 1");
    const room = roomResult.rows[0];
    console.log(`✅ 使用房间: ${room.name} (${room.id})`);

    // 6. 创建预约
    const today = new Date().toISOString().split('T')[0];
    
    const appointmentResult = await pool.query(
      `INSERT INTO appointments (
        customer_name, customer_phone, service_id, requested_date, 
        requested_time_start, requested_time_end, status, 
        total_people, estimated_duration, is_urgent, 
        companion_names, store_id, sales_id, created_by,
        workflow_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'pending', 
        $7, $8, $9, $10, $11, $12, $13, 'nurse_scheduled'
      ) RETURNING *`,
      [
        '资源看板测试客户-销售信息',
        '13700000000',
        service.id,
        today,
        '11:00:00',
        '12:00:00',
        2, // total_people
        60, // estimated_duration
        false, // is_urgent
        ['同行客户C'], // companion_names
        store.id,
        salesId, // sales_id 
        salesId, // created_by
      ]
    );

    const appointment = appointmentResult.rows[0];
    console.log(`✅ 创建预约成功: ${appointment.id}`);

    // 7. 创建排班
    const scheduleResult = await pool.query(
      `INSERT INTO schedules (
        appointment_id, scheduled_date, scheduled_time_start, scheduled_time_end,
        room_id, nurse_id, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'scheduled'
      ) RETURNING *`,
      [
        appointment.id,
        today,
        '11:00:00',
        '12:00:00',
        room.id,
        nurse.id
      ]
    );

    const schedule = scheduleResult.rows[0];
    console.log(`✅ 创建排班成功: ${schedule.id}`);

    // 8. 验证排班API返回
    console.log('\n🔍 验证排班API返回...');
    
    const fetch = require('node-fetch');
    const mockToken = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3MzM4NjI1NzksImV4cCI6MTczMzk0ODk3OX0.signature';
    
    const response = await fetch(`http://localhost:3001/api/schedules?date=${today}`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ 排班API返回 ${data.length} 个排班记录`);
      
      // 查找我们刚创建的排班
      const ourSchedule = data.find(s => s.id === schedule.id);
      if (ourSchedule) {
        console.log(`✅ 找到新创建的排班:`);
        console.log(`   客户: ${ourSchedule.customer_name}`);
        console.log(`   预约人: ${ourSchedule.sales_name || '未指定'}`);
        console.log(`   销售角色: ${ourSchedule.sales_role || '未知'}`);
        console.log(`   服务: ${ourSchedule.service_name}`);
        console.log(`   护士: ${ourSchedule.nurse_name}`);
        console.log(`   房间: ${ourSchedule.room_name}`);
        
        if (ourSchedule.sales_name && ourSchedule.sales_name !== '未指定') {
          console.log('   ✅ 销售信息正确显示');
        } else {
          console.log('   ❌ 销售信息缺失');
        }
      } else {
        console.log('❌ 没有找到新创建的排班');
      }
      
      // 显示所有有销售信息的排班
      const withSalesInfo = data.filter(s => s.sales_name && s.sales_name !== '未指定');
      console.log(`\n📊 有销售信息的排班: ${withSalesInfo.length}/${data.length}`);
      
      if (withSalesInfo.length > 0) {
        console.log('\n✅ 有销售信息的排班:');
        withSalesInfo.forEach((s, index) => {
          console.log(`   ${index + 1}. ${s.customer_name} - 预约人: ${s.sales_name}`);
        });
      }
      
    } else {
      console.log(`❌ 排班API调用失败: ${response.status}`);
    }

    console.log('\n🎯 现在可以在资源看板中点击这个排班，查看弹窗是否正确显示销售信息');

  } catch (error) {
    console.error('❌ 创建失败:', error);
  } finally {
    await pool.end();
  }
}

createScheduleWithSalesInfo();