#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function createTestAppointmentWithSales() {
  try {
    console.log('🧪 创建包含销售信息和多客户的测试预约...\n');

    // 1. 获取销售用户ID
    const salesQuery = `SELECT id, username, full_name FROM profiles WHERE role = 'sales' LIMIT 1`;
    const { rows: salesUsers } = await pool.query(salesQuery);
    
    if (salesUsers.length === 0) {
      throw new Error('没有找到销售用户');
    }
    
    const salesUser = salesUsers[0];
    console.log(`✅ 找到销售用户: ${salesUser.full_name} (${salesUser.username})`);

    // 2. 获取门店ID
    const storeQuery = `SELECT id, name FROM stores WHERE status = 'active' LIMIT 1`;
    const { rows: stores } = await pool.query(storeQuery);
    
    if (stores.length === 0) {
      throw new Error('没有找到活跃门店');
    }
    
    const store = stores[0];
    console.log(`✅ 找到门店: ${store.name}`);

    // 3. 获取服务ID
    const serviceQuery = `SELECT id, name FROM services WHERE is_active = true LIMIT 1`;
    const { rows: services } = await pool.query(serviceQuery);
    
    if (services.length === 0) {
      throw new Error('没有找到活跃服务');
    }
    
    const service = services[0];
    console.log(`✅ 找到服务: ${service.name}`);

    // 4. 创建包含销售信息和多客户的预约
    const appointmentData = {
      customer_name: '测试客户-张三',
      companion_names: ['李四', '王五', '赵六'],
      total_people: 4,
      service_id: service.id,
      requested_date: '2024-12-15',
      requested_time_start: '10:00',
      requested_time_end: '11:00',
      estimated_duration: 60,
      is_urgent: false,
      status: 'pending',
      sales_id: salesUser.id,
      store_id: store.id,
      created_by: salesUser.id
    };

    const insertAppointmentQuery = `
      INSERT INTO appointments (
        customer_name, companion_names, total_people, service_id,
        requested_date, requested_time_start, requested_time_end,
        estimated_duration, is_urgent, status, sales_id, store_id, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING id
    `;

    const { rows: [appointment] } = await pool.query(insertAppointmentQuery, [
      appointmentData.customer_name,
      appointmentData.companion_names,
      appointmentData.total_people,
      appointmentData.service_id,
      appointmentData.requested_date,
      appointmentData.requested_time_start,
      appointmentData.requested_time_end,
      appointmentData.estimated_duration,
      appointmentData.is_urgent,
      appointmentData.status,
      appointmentData.sales_id,
      appointmentData.store_id,
      appointmentData.created_by
    ]);

    console.log(`✅ 创建预约成功，ID: ${appointment.id}`);

    // 5. 获取护士和房间
    const nurseQuery = `SELECT id, full_name FROM profiles WHERE role = 'nurse' AND status = 'active' LIMIT 1`;
    const { rows: nurses } = await pool.query(nurseQuery);
    
    const roomQuery = `SELECT id, name FROM resources WHERE type = 'room' AND status = 'available' LIMIT 1`;
    const { rows: rooms } = await pool.query(roomQuery);

    // 6. 定义排班插入查询
    const insertScheduleQuery = `
      INSERT INTO schedules (
        appointment_id, scheduled_date, scheduled_time_start, scheduled_time_end,
        room_id, nurse_id, adjusted_duration, status, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      ) RETURNING id
    `;

    if (nurses.length > 0 && rooms.length > 0) {
      // 创建第一个排班
      const scheduleData = {
        appointment_id: appointment.id,
        scheduled_date: '2024-12-15',
        scheduled_time_start: '10:00',
        scheduled_time_end: '11:00',
        room_id: rooms[0].id,
        nurse_id: nurses[0].id,
        adjusted_duration: 60,
        status: 'scheduled',
        created_by: salesUser.id
      };

      const { rows: [schedule] } = await pool.query(insertScheduleQuery, [
        scheduleData.appointment_id,
        scheduleData.scheduled_date,
        scheduleData.scheduled_time_start,
        scheduleData.scheduled_time_end,
        scheduleData.room_id,
        scheduleData.nurse_id,
        scheduleData.adjusted_duration,
        scheduleData.status,
        scheduleData.created_by
      ]);

      console.log(`✅ 创建排班成功，ID: ${schedule.id}`);
      console.log(`   护士: ${nurses[0].full_name}`);
      console.log(`   房间: ${rooms[0].name}`);
    }

    // 7. 创建另一个单客户预约（无销售信息）
    const singleCustomerData = {
      customer_name: '单客户测试-李明',
      companion_names: null,
      total_people: 1,
      service_id: service.id,
      requested_date: '2024-12-15',
      requested_time_start: '14:00',
      requested_time_end: '15:00',
      estimated_duration: 60,
      is_urgent: true,
      status: 'pending',
      sales_id: null, // 无销售信息
      store_id: store.id,
      created_by: salesUser.id
    };

    const { rows: [appointment2] } = await pool.query(insertAppointmentQuery, [
      singleCustomerData.customer_name,
      singleCustomerData.companion_names,
      singleCustomerData.total_people,
      singleCustomerData.service_id,
      singleCustomerData.requested_date,
      singleCustomerData.requested_time_start,
      singleCustomerData.requested_time_end,
      singleCustomerData.estimated_duration,
      singleCustomerData.is_urgent,
      singleCustomerData.status,
      singleCustomerData.sales_id,
      singleCustomerData.store_id,
      singleCustomerData.created_by
    ]);

    console.log(`✅ 创建单客户预约成功，ID: ${appointment2.id}`);

    if (nurses.length > 0 && rooms.length > 0) {
      const { rows: [schedule2] } = await pool.query(insertScheduleQuery, [
        appointment2.id,
        '2024-12-15',
        '14:00',
        '15:00',
        rooms[0].id,
        nurses[0].id,
        60,
        'scheduled',
        salesUser.id
      ]);

      console.log(`✅ 创建单客户排班成功，ID: ${schedule2.id}`);
    }

    console.log('\n🎉 测试数据创建完成！');
    console.log('现在可以测试预约详情显示功能了。');

  } catch (error) {
    console.error('❌ 创建测试数据失败:', error.message);
  } finally {
    await pool.end();
  }
}

createTestAppointmentWithSales();