const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function debugRoomIssue() {
  console.log('🔍 [DEBUG] 开始房间信息获取问题诊断...');
  
  try {
    // 1. 检查resources表中的房间数据
    console.log('\n📊 [DEBUG] 1. 检查resources表中的房间数据:');
    const resourcesQuery = `
      SELECT id, name, type, status, store_id, created_at
      FROM resources 
      WHERE type IN ('room', 'vip', 'treatment', 'consultation')
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const resourcesResult = await pool.query(resourcesQuery);
    console.log(`  - 找到 ${resourcesResult.rows.length} 个房间资源`);
    resourcesResult.rows.forEach((room, index) => {
      console.log(`  ${index + 1}. ID: ${room.id}, 名称: ${room.name}, 类型: ${room.type}, 状态: ${room.status}, 门店: ${room.store_id}`);
    });

    // 2. 检查schedules表中的房间关联
    console.log('\n📊 [DEBUG] 2. 检查schedules表中的房间关联:');
    const schedulesQuery = `
      SELECT s.id, s.room_id, s.scheduled_date, s.appointment_id,
             r.name as room_name, r.type as room_type, r.status as room_status
      FROM schedules s
      LEFT JOIN resources r ON s.room_id = r.id
      ORDER BY s.scheduled_date DESC
      LIMIT 10
    `;
    const schedulesResult = await pool.query(schedulesQuery);
    console.log(`  - 找到 ${schedulesResult.rows.length} 个排班记录`);
    schedulesResult.rows.forEach((schedule, index) => {
      console.log(`  ${index + 1}. 排班ID: ${schedule.id}, 房间ID: ${schedule.room_id}, 房间名称: ${schedule.room_name}, 房间类型: ${schedule.room_type}, 日期: ${schedule.scheduled_date}`);
    });

    // 3. 检查排班查询的具体执行情况
    console.log('\n📊 [DEBUG] 3. 模拟排班查询(2025-12-15):');
    const scheduleQuery = `
      SELECT
        s.*,
        a.customer_name,
        a.companion_names,
        a.total_people,
        a.service_id,
        a.estimated_duration,
        a.is_urgent,
        a.store_id as appointment_store_id,
        srv.name as service_name,
        srv.category as service_category,
        r.name as room_name,
        r.type as room_type,
        r.status as room_status,
        p.full_name as nurse_name,
        p.role as nurse_role,
        p.department as nurse_department,
        COALESCE(sales_p.full_name, creator_p.full_name) as sales_name,
        COALESCE(sales_p.username, creator_p.username) as sales_username,
        COALESCE(sales_p.role, creator_p.role) as sales_role
      FROM schedules s
      LEFT JOIN appointments a ON s.appointment_id = a.id
      LEFT JOIN services srv ON a.service_id = srv.id
      LEFT JOIN resources r ON s.room_id = r.id
      LEFT JOIN profiles p ON s.nurse_id = p.id
      LEFT JOIN profiles sales_p ON a.sales_id = sales_p.id
      LEFT JOIN profiles creator_p ON a.created_by = creator_p.id
     WHERE DATE(s.scheduled_date) = $1 ORDER BY s.scheduled_date, s.scheduled_time_start
    `;
    const scheduleResult = await pool.query(scheduleQuery, ['2025-12-15']);
    console.log(`  - 排班查询返回 ${scheduleResult.rows.length} 条记录`);
    if (scheduleResult.rows.length > 0) {
      scheduleResult.rows.forEach((schedule, index) => {
        console.log(`  ${index + 1}. 客户: ${schedule.customer_name}, 房间: ${schedule.room_name}, 房间类型: ${schedule.room_type}, 护士: ${schedule.nurse_name}`);
      });
    } else {
      console.log('  - ⚠️  没有找到排班记录，这可能是问题所在！');
    }

    // 4. 检查是否有任何排班记录
    console.log('\n📊 [DEBUG] 4. 检查所有排班记录:');
    const allSchedulesQuery = `SELECT COUNT(*) as total FROM schedules`;
    const allSchedulesResult = await pool.query(allSchedulesQuery);
    console.log(`  - 总排班记录数: ${allSchedulesResult.rows[0].total}`);

    // 5. 检查预约记录
    console.log('\n📊 [DEBUG] 5. 检查预约记录:');
    const appointmentsQuery = `
      SELECT COUNT(*) as total, 
             COUNT(CASE WHEN workflow_status = 'pending_nurse_assignment' THEN 1 END) as pending_nurse,
             COUNT(CASE WHEN workflow_status = 'doctor_confirmed' THEN 1 END) as doctor_confirmed
      FROM appointments
      WHERE status != 'cancelled'
    `;
    const appointmentsResult = await pool.query(appointmentsQuery);
    console.log(`  - 总预约数: ${appointmentsResult.rows[0].total}`);
    console.log(`  - 待护士分配: ${appointmentsResult.rows[0].pending_nurse}`);
    console.log(`  - 医生已确认: ${appointmentsResult.rows[0].doctor_confirmed}`);

    // 6. 检查房间API的查询逻辑
    console.log('\n📊 [DEBUG] 6. 检查房间API查询逻辑:');
    const roomsApiQuery = `
      SELECT id, name, type, status, store_id FROM resources 
      WHERE type IN ($1, $2, $3, $4) 
      ORDER BY name
    `;
    const roomsApiResult = await pool.query(roomsApiQuery, ['room', 'vip', 'treatment', 'consultation']);
    console.log(`  - 房间API查询返回 ${roomsApiResult.rows.length} 条记录`);
    
    // 7. 检查数据转换逻辑
    console.log('\n📊 [DEBUG] 7. 验证数据转换逻辑:');
    const transformedRooms = roomsApiResult.rows.map(resource => {
      let room_type = 'treatment'; // default
      
      // 优先使用数据库中的 type 字段
      if (['vip', 'treatment', 'consultation'].includes(resource.type)) {
        room_type = resource.type;
      } else if (resource.type === 'room') {
        // 对于旧的 type='room' 的记录，从名称推断
        if (resource.name.includes('VIP')) {
          room_type = 'vip';
        } else if (resource.name.includes('咨询')) {
          room_type = 'consultation';
        }
      }
      
      return {
        id: resource.id,
        name: resource.name,
        room_type: room_type,
        is_available: resource.status === 'available',
        store_id: resource.store_id,
        created_at: resource.created_at || new Date().toISOString()
      };
    });
    console.log(`  - 转换后的房间数据: ${transformedRooms.length} 条`);
    transformedRooms.slice(0, 3).forEach((room, index) => {
      console.log(`  ${index + 1}. ${room.name} -> room_type: ${room.room_type}, is_available: ${room.is_available}`);
    });

    console.log('\n✅ [DEBUG] 诊断完成！');
    
    // 问题总结
    console.log('\n🔍 [问题分析总结]:');
    if (scheduleResult.rows.length === 0) {
      console.log('❌ 主要问题: 排班查询返回空结果');
      console.log('   可能原因:');
      console.log('   1. 数据库中没有排班数据');
      console.log('   2. 排班数据存在但查询条件不匹配');
      console.log('   3. 房间数据存在但没有与排班关联');
    }
    
    if (resourcesResult.rows.length > 0 && scheduleResult.rows.length === 0) {
      console.log('❌ 次要问题: 房间数据存在但排班数据为空');
      console.log('   这表明工作台和排班页面无法获取房间信息是因为排班表为空');
    }

  } catch (error) {
    console.error('❌ [DEBUG] 诊断过程中发生错误:', error);
  } finally {
    await pool.end();
  }
}

// 执行诊断
debugRoomIssue();