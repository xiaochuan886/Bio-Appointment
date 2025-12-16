const { Pool } = require('pg');

// 数据库连接
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function testCompleteScheduleEdit() {
  console.log('🎭 测试完整的排班编辑功能...');
  
  try {
    // 步骤1: 获取一个现有的排班和相关信息
    console.log('\n📋 步骤1: 获取排班和用户数据...');
    
    const [scheduleResult, userResult] = await Promise.all([
      pool.query(`
        SELECT s.*, a.customer_name, a.store_id as appointment_store_id, a.estimated_duration
        FROM schedules s
        LEFT JOIN appointments a ON s.appointment_id = a.id
        WHERE s.status != 'cancelled'
        ORDER BY s.created_at DESC
        LIMIT 1
      `),
      pool.query(`
        SELECT id, role, store_id, full_name
        FROM profiles
        WHERE role IN ('super_admin', 'head_nurse')
        LIMIT 1
      `)
    ]);
    
    if (scheduleResult.rows.length === 0) {
      console.log('❌ 没有找到可测试的排班');
      return;
    }
    
    if (userResult.rows.length === 0) {
      console.log('❌ 没有找到可测试的用户');
      return;
    }
    
    const schedule = scheduleResult.rows[0];
    const user = userResult.rows[0];
    
    console.log(`📊 测试排班: ID=${schedule.id}, 客户=${schedule.customer_name}, 当前状态=${schedule.status}`);
    console.log(`👤 测试用户: ${user.full_name} (${user.role}), 门店=${user.store_id}`);
    
    // 步骤2: 模拟前端API调用 - 更新排班
    console.log('\n🔧 步骤2: 模拟API调用更新排班...');
    
    const updateData = {
      scheduled_time_start: '09:00:00',
      scheduled_time_end: '11:00:00',
      room_id: schedule.room_id,
      nurse_id: schedule.nurse_id,
      status: 'scheduled', // 使用修复后的状态值
    };
    
    console.log('📤 更新数据:', updateData);
    
    // 步骤3: 执行更新
    console.log('\n💾 步骤3: 执行数据库更新...');
    
    const updateResult = await pool.query(`
      UPDATE schedules 
      SET 
        scheduled_time_start = $1,
        scheduled_time_end = $2,
        room_id = $3,
        nurse_id = $4,
        status = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [
      updateData.scheduled_time_start,
      updateData.scheduled_time_end,
      updateData.room_id,
      updateData.nurse_id,
      updateData.status,
      schedule.id
    ]);
    
    if (updateResult.rows.length > 0) {
      const updatedSchedule = updateResult.rows[0];
      console.log('✅ 排班更新成功！');
      console.log(`📊 更新后状态: ${updatedSchedule.status}`);
      console.log(`📊 更新时间: ${updatedSchedule.updated_at}`);
      
      // 步骤4: 验证更新结果
      console.log('\n🔍 步骤4: 验证更新结果...');
      
      const verifyResult = await pool.query(`
        SELECT s.*, a.customer_name, a.store_id as appointment_store_id
        FROM schedules s
        LEFT JOIN appointments a ON s.appointment_id = a.id
        WHERE s.id = $1
      `, [schedule.id]);
      
      if (verifyResult.rows.length > 0) {
        const verifiedSchedule = verifyResult.rows[0];
        console.log('✅ 更新验证成功！');
        console.log(`📊 验证状态: ${verifiedSchedule.status}`);
        console.log(`📊 验证时间: ${verifiedSchedule.scheduled_time_start} - ${verifiedSchedule.scheduled_time_end}`);
      } else {
        console.log('❌ 更新验证失败 - 找不到更新后的记录');
      }
    } else {
      console.log('❌ 排班更新失败');
    }
    
    // 步骤5: 测试无效状态值（应该失败）
    console.log('\n🚫 步骤5: 测试无效状态值...');
    
    try {
      const invalidUpdateResult = await pool.query(`
        UPDATE schedules 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, ['published', schedule.id]);
      
      console.log('❌ 意外: 无效状态值更新成功了？这不应该发生');
    } catch (invalidError) {
      console.log('✅ 预期的错误: 无效状态值被正确拒绝');
      console.log(`🔍 错误信息: ${invalidError.message}`);
    }
    
    console.log('\n🎯 排班编辑功能测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    await pool.end();
  }
}

// 运行测试
testCompleteScheduleEdit().then(() => {
  console.log('\n🎉 所有测试完成！');
}).catch(error => {
  console.error('💥 测试过程中发生错误:', error);
});