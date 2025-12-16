const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function debugScheduleStatusError() {
  try {
    console.log('🔍 开始调试排班状态错误...');
    
    // 1. 检查数据库中的 schedule_status 枚举值
    console.log('\n📋 检查 schedule_status 枚举值:');
    const enumResult = await pool.query(`
      SELECT unnest(enum_range(NULL::schedule_status)) as status_value
    `);
    console.log('可用的状态值:', enumResult.rows.map(r => r.status_value));
    
    // 2. 检查现有排班的状态
    console.log('\n📊 检查现有排班的状态:');
    const scheduleResult = await pool.query(`
      SELECT id, status, appointment_id, created_at, updated_at
      FROM schedules
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log('现有排班:', scheduleResult.rows);
    
    // 3. 尝试创建一个测试排班
    console.log('\n🧪 尝试创建测试排班...');
    
    // 获取一个有效的预约ID
    const appointmentResult = await pool.query(`
      SELECT id, store_id, customer_name
      FROM appointments
      WHERE status != 'cancelled'
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    if (appointmentResult.rows.length === 0) {
      console.log('❌ 没有找到可用的预约');
      return;
    }
    
    const appointment = appointmentResult.rows[0];
    console.log('使用预约:', appointment);
    
    // 获取一个有效的房间ID
    const roomResult = await pool.query(`
      SELECT id, name, store_id
      FROM resources
      WHERE store_id = $1
      LIMIT 1
    `, [appointment.store_id]);
    
    if (roomResult.rows.length === 0) {
      console.log('❌ 没有找到可用的房间');
      return;
    }
    
    const room = roomResult.rows[0];
    console.log('使用房间:', room);
    
    // 尝试创建排班，使用不同的状态值
    const testStatuses = ['scheduled', 'pending', 'published'];
    
    for (const status of testStatuses) {
      console.log(`\n🔍 测试状态: ${status}`);
      
      try {
        const result = await pool.query(`
          INSERT INTO schedules (appointment_id, scheduled_date, scheduled_time_start, scheduled_time_end, room_id, status)
          VALUES ($1, CURRENT_DATE, '09:00:00', '10:00:00', $2, $3)
          RETURNING id, status
        `, [appointment.id, room.id, status]);
        
        console.log(`✅ 状态 ${status} 创建成功:`, result.rows[0]);
        
        // 立即删除测试排班
        await pool.query('DELETE FROM schedules WHERE id = $1', [result.rows[0].id]);
        console.log(`🗑️ 已删除测试排班`);
        
      } catch (error) {
        console.log(`❌ 状态 ${status} 创建失败:`, error.message);
      }
    }
    
    // 4. 检查是否有触发器或约束导致状态被修改
    console.log('\n🔍 检查排班表的约束和触发器:');
    const constraintResult = await pool.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        cc.check_clause
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_name = 'schedules'
        AND tc.constraint_type = 'CHECK'
    `);
    console.log('约束条件:', constraintResult.rows);
    
    const triggerResult = await pool.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'schedules'
    `);
    console.log('触发器:', triggerResult.rows);
    
  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error);
  } finally {
    await pool.end();
  }
}

debugScheduleStatusError();