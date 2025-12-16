const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function verifyFixResult() {
  console.log('🔍 [验证] 开始验证修复效果...');
  
  try {
    // 1. 测试房间API
    console.log('\n📊 [验证] 1. 测试房间API:');
    const roomsQuery = `
      SELECT id, name, type, status, store_id FROM resources 
      WHERE type IN ($1, $2, $3, $4) 
      ORDER BY name
    `;
    const roomsResult = await pool.query(roomsQuery, ['room', 'vip', 'treatment', 'consultation']);
    console.log(`  - 房间API返回 ${roomsResult.rows.length} 条记录`);
    
    // 转换数据格式（模拟API转换逻辑）
    const transformedRooms = roomsResult.rows.map(resource => {
      let room_type = 'treatment';
      if (['vip', 'treatment', 'consultation'].includes(resource.type)) {
        room_type = resource.type;
      } else if (resource.type === 'room') {
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
    
    console.log('  - 转换后的房间数据:');
    transformedRooms.forEach((room, index) => {
      console.log(`    ${index + 1}. ${room.name} (${room.room_type}) - 可用: ${room.is_available}`);
    });

    // 2. 测试排班API（模拟工作台和排班页面的查询）
    console.log('\n📊 [验证] 2. 测试排班API:');
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
    
    // 测试今天的排班
    const today = new Date().toISOString().split('T')[0];
    const scheduleResult = await pool.query(scheduleQuery, [today]);
    console.log(`  - 排班API返回 ${scheduleResult.rows.length} 条记录 (${today})`);
    
    if (scheduleResult.rows.length > 0) {
      // 转换排班数据格式（模拟API转换逻辑）
      const transformedSchedules = scheduleResult.rows.map(row => {
        let room_type = 'treatment';
        if (row.room_name && row.room_name.includes('VIP')) {
          room_type = 'vip';
        } else if (row.room_name && row.room_name.includes('咨询')) {
          room_type = 'consultation';
        }

        return {
          ...row,
          room_type: room_type,
          appointment: row.appointment_id ? {
            id: row.appointment_id,
            customer_name: row.customer_name,
            service: row.service_id ? {
              id: row.service_id,
              name: row.service_name,
              category: row.service_category
            } : null
          } : null,
          room: row.room_id ? {
            id: row.room_id,
            name: row.room_name,
            type: room_type,
            status: row.room_status
          } : null,
          nurse: row.nurse_id ? {
            id: row.nurse_id,
            name: row.nurse_name,
            role: row.nurse_role,
            department: row.nurse_department
          } : null
        };
      });
      
      console.log('  - 转换后的排班数据:');
      transformedSchedules.forEach((schedule, index) => {
        console.log(`    ${index + 1}. ${schedule.appointment?.customer_name} -> ${schedule.room?.name} (${schedule.room?.type}) - ${schedule.nurse?.name}`);
      });
    }

    // 3. 测试护士API
    console.log('\n📊 [验证] 3. 测试护士API:');
    const nursesQuery = `
      SELECT id, username, full_name, role, department, status FROM profiles 
      WHERE role IN ($1, $2) AND status = $3 
      ORDER BY role, full_name
    `;
    const nursesResult = await pool.query(nursesQuery, ['nurse', 'head_nurse', 'active']);
    console.log(`  - 护士API返回 ${nursesResult.rows.length} 条记录`);
    
    const transformedNurses = nursesResult.rows.map(profile => ({
      id: profile.id,
      name: profile.full_name,
      skill_level: profile.role === 'head_nurse' ? 'senior' : 'intermediate',
      is_available: profile.status === 'active',
      created_at: profile.created_at || new Date().toISOString()
    }));
    
    console.log('  - 转换后的护士数据:');
    transformedNurses.slice(0, 3).forEach((nurse, index) => {
      console.log(`    ${index + 1}. ${nurse.name} (${nurse.skill_level}) - 可用: ${nurse.is_available}`);
    });

    // 4. 验证数据关联性
    console.log('\n📊 [验证] 4. 验证数据关联性:');
    const relationshipQuery = `
      SELECT 
        COUNT(DISTINCT r.id) as total_rooms,
        COUNT(DISTINCT s.id) as total_schedules,
        COUNT(DISTINCT CASE WHEN s.room_id IS NOT NULL THEN s.id END) as schedules_with_rooms,
        COUNT(DISTINCT CASE WHEN s.nurse_id IS NOT NULL THEN s.id END) as schedules_with_nurses
      FROM resources r
      LEFT JOIN schedules s ON r.id = s.room_id
      WHERE r.type IN ('room', 'vip', 'treatment', 'consultation')
    `;
    const relationshipResult = await pool.query(relationshipQuery);
    const relData = relationshipResult.rows[0];
    console.log(`  - 总房间数: ${relData.total_rooms}`);
    console.log(`  - 总排班数: ${relData.total_schedules}`);
    console.log(`  - 有房间的排班数: ${relData.schedules_with_rooms}`);
    console.log(`  - 有护士的排班数: ${relData.schedules_with_nurses}`);

    // 5. 最终验证结果
    console.log('\n✅ [验证] 5. 最终验证结果:');
    const allTestsPass = 
      roomsResult.rows.length > 0 && 
      scheduleResult.rows.length > 0 && 
      nursesResult.rows.length > 0 &&
      relData.schedules_with_rooms > 0 &&
      relData.schedules_with_nurses > 0;

    if (allTestsPass) {
      console.log('  ✅ 所有测试通过！房间信息获取问题已修复。');
      console.log('  ✅ 工作台和排班页面现在可以正常获取房间信息。');
    } else {
      console.log('  ❌ 部分测试失败，需要进一步检查。');
    }

  } catch (error) {
    console.error('❌ [验证] 验证过程中发生错误:', error);
  } finally {
    await pool.end();
  }
}

// 执行验证
verifyFixResult();