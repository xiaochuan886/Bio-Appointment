const { Pool } = require('pg');

// 数据库连接
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function testScheduleStatusFix() {
  console.log('🧪 测试排班状态修复...');
  
  try {
    // 步骤1: 获取一个现有的排班
    console.log('\n📋 步骤1: 获取现有排班...');
    
    const scheduleResult = await pool.query(`
      SELECT s.*, a.customer_name, a.store_id as appointment_store_id
      FROM schedules s
      LEFT JOIN appointments a ON s.appointment_id = a.id
      WHERE s.status != 'cancelled'
      ORDER BY s.created_at DESC
      LIMIT 1
    `);
    
    if (scheduleResult.rows.length === 0) {
      console.log('❌ 没有找到可测试的排班');
      return;
    }
    
    const schedule = scheduleResult.rows[0];
    console.log(`📊 找到排班: ID=${schedule.id}, 当前状态=${schedule.status}, 客户=${schedule.customer_name}`);
    
    // 步骤2: 测试更新排班状态为 'scheduled'
    console.log('\n🔧 步骤2: 测试更新排班状态...');
    
    try {
      const updateResult = await pool.query(`
        UPDATE schedules 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, ['scheduled', schedule.id]);
      
      if (updateResult.rows.length > 0) {
        console.log('✅ 排班状态更新成功');
        console.log(`📊 更新后状态: ${updateResult.rows[0].status}`);
      } else {
        console.log('❌ 排班状态更新失败 - 没有返回更新后的记录');
      }
    } catch (updateError) {
      console.error('❌ 排班状态更新失败:', updateError.message);
      if (updateError.message.includes('invalid input value for enum')) {
        console.log('🔍 确认这是枚举值错误');
      }
    }
    
    // 步骤3: 测试更新排班状态为 'published' (应该失败)
    console.log('\n🔧 步骤3: 测试无效状态值...');
    
    try {
      const invalidUpdateResult = await pool.query(`
        UPDATE schedules 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, ['published', schedule.id]);
      
      console.log('❌ 意外: 无效状态值更新成功了？');
      console.log(`📊 更新后状态: ${invalidUpdateResult.rows[0].status}`);
    } catch (invalidUpdateError) {
      console.log('✅ 预期的错误: 无效状态值被拒绝');
      console.log(`🔍 错误信息: ${invalidUpdateError.message}`);
    }
    
    // 步骤4: 恢复原始状态
    console.log('\n🔧 步骤4: 恢复原始状态...');
    
    try {
      const restoreResult = await pool.query(`
        UPDATE schedules 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [schedule.status, schedule.id]);
      
      if (restoreResult.rows.length > 0) {
        console.log('✅ 原始状态恢复成功');
      } else {
        console.log('❌ 原始状态恢复失败');
      }
    } catch (restoreError) {
      console.error('❌ 原始状态恢复失败:', restoreError.message);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    await pool.end();
  }
}

// 运行测试
testScheduleStatusFix().then(() => {
  console.log('\n🎉 测试完成！');
}).catch(error => {
  console.error('💥 测试过程中发生错误:', error);
});