const { Pool } = require('pg');
const fetch = require('node-fetch');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://app_user:secure_password_123@localhost:5437/bio_appointment'
});

async function debugAdjustedDurationIssue() {
  console.log('🔍 调整调整时长问题...\n');

  try {
    // 1. 获取一个排班记录
    const scheduleResult = await pool.query(`
      SELECT s.*, a.estimated_duration as appointment_duration, a.requested_time_start 
      FROM schedules s
      JOIN appointments a ON s.appointment_id = a.id
      WHERE s.scheduled_date = CURRENT_DATE
      ORDER BY s.created_at DESC
      LIMIT 1
    `);

    if (scheduleResult.rows.length === 0) {
      console.log('❌ 没有找到今天的排班记录');
      return;
    }

    const schedule = scheduleResult.rows[0];
    console.log('📋 测试排班信息:');
    console.log(`   排班ID: ${schedule.id}`);
    console.log(`   预约ID: ${schedule.appointment_id}`);
    console.log(`   当前开始时间: ${schedule.scheduled_time_start}`);
    console.log(`   当前结束时间: ${schedule.scheduled_time_end}`);
    console.log(`   当前时长: ${schedule.appointment_duration} 分钟`);
    console.log(`   预约请求时间: ${schedule.requested_time_start}`);
    console.log(`   调整时长: ${schedule.adjusted_duration || '未设置'}`);
    console.log(`   调整原因: ${schedule.adjustment_reason || '未设置'}\n`);

    // 2. 测试直接更新排班的adjusted_duration字段
    console.log('🔄 测试1: 直接更新adjusted_duration字段');
    const testAdjustedDuration = 120;
    const testAdjustmentReason = '测试调整时长';

    const directUpdateResult = await pool.query(`
      UPDATE schedules 
      SET adjusted_duration = $1, adjustment_reason = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING adjusted_duration, adjustment_reason
    `, [testAdjustedDuration, testAdjustmentReason, schedule.id]);

    console.log('✅ 直接更新结果:');
    console.log(`   调整时长: ${directUpdateResult.rows[0].adjusted_duration}`);
    console.log(`   调整原因: ${directUpdateResult.rows[0].adjustment_reason}\n`);

    // 3. 验证数据库中的值
    const verifyResult = await pool.query(`
      SELECT adjusted_duration, adjustment_reason 
      FROM schedules 
      WHERE id = $1
    `, [schedule.id]);

    console.log('📊 验证数据库中的值:');
    console.log(`   调整时长: ${verifyResult.rows[0].adjusted_duration}`);
    console.log(`   调整原因: ${verifyResult.rows[0].adjustment_reason}\n`);

    // 4. 测试通过API更新排班（模拟前端调用）
    console.log('🔄 测试2: 通过API更新排班');
    
    // 获取认证令牌
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin', // API期望email字段，不是username
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error('登录失败');
    }

    const loginData = await loginResponse.json();
    console.log('🔑 登录响应:', JSON.stringify(loginData, null, 2));
    
    // 登录响应结构: { user: {...}, tokens: { accessToken: ..., refreshToken: ... } }
    const token = loginData.tokens?.accessToken || loginData.token;
    console.log('🔑 提取的token:', token);

    // 准备更新数据
    const updateData = {
      scheduled_date: schedule.scheduled_date.toISOString().split('T')[0], // 转换为YYYY-MM-DD格式
      scheduled_time_start: schedule.scheduled_time_start,
      scheduled_time_end: schedule.scheduled_time_end,
      room_id: schedule.room_id,
      nurse_id: schedule.nurse_id,
      status: 'scheduled',
      adjusted_duration: 180, // 不同的值来测试
      adjustment_reason: 'API测试调整时长'
    };

    console.log('📤 发送的更新数据:');
    console.log(JSON.stringify(updateData, null, 2));

    // 调用API更新排班
    const updateResponse = await fetch(`http://localhost:3001/api/schedules/${schedule.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    console.log(`📡 API响应状态: ${updateResponse.status}`);

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.log(`❌ API错误: ${errorText}`);
      return;
    }

    const updateResult = await updateResponse.json();
    console.log('✅ API更新成功');
    console.log('📊 API响应结构:');
    console.log(JSON.stringify(updateResult, null, 2));
    
    // 检查响应结构
    if (updateResult.data) {
      console.log('📊 更新后的排班数据:');
      console.log(JSON.stringify(updateResult.data, null, 2));
    } else if (updateResult.updatedSchedule || updateResult.schedule) {
      console.log('📊 更新后的排班数据 (其他字段):');
      console.log(JSON.stringify(updateResult.updatedSchedule || updateResult.schedule, null, 2));
    } else {
      console.log('📊 完整响应数据:');
      console.log(JSON.stringify(updateResult, null, 2));
    }

    // 5. 验证API更新后的数据库值
    const finalVerifyResult = await pool.query(`
      SELECT adjusted_duration, adjustment_reason, a.estimated_duration
      FROM schedules s
      JOIN appointments a ON s.appointment_id = a.id
      WHERE s.id = $1
    `, [schedule.id]);

    console.log('\n📊 最终验证结果:');
    console.log(`   排班调整时长: ${finalVerifyResult.rows[0].adjusted_duration}`);
    console.log(`   排班调整原因: ${finalVerifyResult.rows[0].adjustment_reason}`);
    console.log(`   预约时长: ${finalVerifyResult.rows[0].estimated_duration}`);

    // 6. 检查API服务器日志中是否有相关错误
    console.log('\n🔍 检查API服务器日志...');
    console.log('请查看API服务器终端输出，看是否有关于adjusted_duration的错误信息');

  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error);
  } finally {
    await pool.end();
  }
}

debugAdjustedDurationIssue();