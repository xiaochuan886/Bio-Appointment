const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function debugScheduleRoomValidation() {
  try {
    console.log('🔍 调试排班房间验证问题...\n');

    // 1. 检查数据库中的房间数据
    console.log('1. 检查数据库中的房间数据:');
    const allRooms = await pool.query(`
      SELECT id, name, type, status, store_id, created_at 
      FROM resources 
      WHERE type IN ('room', 'vip', 'treatment', 'consultation') 
      ORDER BY name
    `);
    console.log(`   找到 ${allRooms.rows.length} 个房间:`);
    allRooms.rows.forEach((room, index) => {
      console.log(`   ${index + 1}. ID: ${room.id}, 名称: ${room.name}, 类型: ${room.type}, 状态: ${room.status}, 门店: ${room.store_id}`);
    });

    // 2. 检查门店数据
    console.log('\n2. 检查门店数据:');
    const stores = await pool.query('SELECT id, name FROM stores ORDER BY name');
    console.log(`   找到 ${stores.rows.length} 个门店:`);
    stores.rows.forEach((store, index) => {
      console.log(`   ${index + 1}. ID: ${store.id}, 名称: ${store.name}`);
    });

    // 3. 检查预约数据
    console.log('\n3. 检查最近的预约数据:');
    const recentAppointments = await pool.query(`
      SELECT id, customer_name, store_id, requested_date, created_at
      FROM appointments 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log(`   找到 ${recentAppointments.rows.length} 个最近预约:`);
    recentAppointments.rows.forEach((apt, index) => {
      console.log(`   ${index + 1}. ID: ${apt.id}, 客户: ${apt.customer_name}, 门店: ${apt.store_id}, 日期: ${apt.requested_date}`);
    });

    // 4. 检查排班数据
    console.log('\n4. 检查最近的排班数据:');
    const recentSchedules = await pool.query(`
      SELECT s.id, s.appointment_id, s.room_id, s.scheduled_date, s.created_at,
             a.customer_name, a.store_id as appointment_store_id,
             r.name as room_name, r.store_id as room_store_id
      FROM schedules s
      LEFT JOIN appointments a ON s.appointment_id = a.id
      LEFT JOIN resources r ON s.room_id = r.id
      ORDER BY s.created_at DESC 
      LIMIT 5
    `);
    console.log(`   找到 ${recentSchedules.rows.length} 个最近排班:`);
    recentSchedules.rows.forEach((schedule, index) => {
      console.log(`   ${index + 1}. 排班ID: ${schedule.id}, 预约ID: ${schedule.appointment_id}`);
      console.log(`       房间ID: ${schedule.room_id}, 房间名称: ${schedule.room_name}`);
      console.log(`       预约门店: ${schedule.appointment_store_id}, 房间门店: ${schedule.room_store_id}`);
      console.log(`       日期: ${schedule.scheduled_date}`);
    });

    // 5. 模拟房间验证逻辑
    console.log('\n5. 模拟房间验证逻辑:');
    
    // 选择一个预约进行测试
    if (recentAppointments.rows.length > 0) {
      const testAppointment = recentAppointments.rows[0];
      const appointmentStoreId = testAppointment.store_id;
      
      console.log(`   测试预约: ${testAppointment.id} (门店: ${appointmentStoreId})`);
      
      // 测试所有房间
      for (const room of allRooms.rows) {
        console.log(`   测试房间: ${room.id} (${room.name})`);
        
        // 模拟API中的验证逻辑
        const roomResult = await pool.query('SELECT store_id FROM resources WHERE id = $1', [room.id]);
        
        if (roomResult.rows.length === 0) {
          console.log(`     ❌ 房间不存在于数据库`);
        } else if (roomResult.rows[0].store_id !== appointmentStoreId) {
          console.log(`     ❌ 房间门店不匹配: 房间门店=${roomResult.rows[0].store_id}, 预约门店=${appointmentStoreId}`);
        } else {
          console.log(`     ✅ 房间验证通过`);
        }
      }
    }

    // 6. 检查房间ID格式问题
    console.log('\n6. 检查房间ID格式:');
    allRooms.rows.forEach((room, index) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isValidUUID = uuidRegex.test(room.id);
      console.log(`   ${index + 1}. 房间: ${room.name}, ID: ${room.id}, UUID格式: ${isValidUUID ? '✅' : '❌'}`);
    });

    // 7. 检查是否有重复的房间名称
    console.log('\n7. 检查重复的房间名称:');
    const roomNames = allRooms.rows.map(r => r.name);
    const duplicateNames = roomNames.filter((name, index) => roomNames.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      console.log(`   ⚠️ 发现重复的房间名称: ${[...new Set(duplicateNames)].join(', ')}`);
    } else {
      console.log(`   ✅ 没有重复的房间名称`);
    }

    // 8. 检查房间与门店的关联
    console.log('\n8. 检查房间与门店的关联:');
    const orphanedRooms = allRooms.rows.filter(room => {
      return !stores.rows.some(store => store.id === room.store_id);
    });
    
    if (orphanedRooms.length > 0) {
      console.log(`   ⚠️ 发现 ${orphanedRooms.length} 个孤立的房间(门店不存在):`);
      orphanedRooms.forEach(room => {
        console.log(`     - ${room.name} (门店ID: ${room.store_id})`);
      });
    } else {
      console.log(`   ✅ 所有房间都关联到有效的门店`);
    }

    console.log('\n✅ 调试完成!');
    
  } catch (error) {
    console.error('❌ 调试失败:', error);
  } finally {
    await pool.end();
  }
}

debugScheduleRoomValidation();