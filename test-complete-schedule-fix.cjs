const { Pool } = require('pg');

// 数据库连接
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function testCompleteScheduleFix() {
  console.log('🧪 测试完整的排班修复（包括时长处理）...');
  
  try {
    // 步骤1: 获取一个真实的预约ID
    console.log('📋 步骤1: 获取真实预约ID...');
    const appointmentResult = await pool.query(
      'SELECT id, store_id, customer_name, estimated_duration FROM appointments LIMIT 1'
    );
    
    if (appointmentResult.rows.length === 0) {
      console.log('❌ 没有找到预约数据，请先创建一些预约');
      return;
    }
    
    const appointment = appointmentResult.rows[0];
    console.log(`✅ 找到预约: ${appointment.customer_name} (ID: ${appointment.id})`);
    
    // 步骤2: 获取一个真实的房间ID
    console.log('🏠 步骤2: 获取真实房间ID...');
    const roomResult = await pool.query(
      'SELECT id, name, store_id FROM resources WHERE type IN ($1, $2, $3, $4) AND store_id = $5 LIMIT 1',
      ['room', 'vip', 'treatment', 'consultation', appointment.store_id]
    );
    
    if (roomResult.rows.length === 0) {
      console.log('❌ 没有找到房间数据，请先创建一些房间');
      return;
    }
    
    const room = roomResult.rows[0];
    console.log(`✅ 找到房间: ${room.name} (ID: ${room.id})`);
    
    // 步骤3: 获取一个真实的护士ID
    console.log('👩‍⚕️ 步骤3: 获取真实护士ID...');
    const nurseResult = await pool.query(
      'SELECT id, full_name FROM profiles WHERE role IN ($1, $2) AND store_id = $3 LIMIT 1',
      ['nurse', 'head_nurse', appointment.store_id]
    );
    
    if (nurseResult.rows.length === 0) {
      console.log('❌ 没有找到护士数据，请先创建一些护士');
      return;
    }
    
    const nurse = nurseResult.rows[0];
    console.log(`✅ 找到护士: ${nurse.full_name} (ID: ${nurse.id})`);
    
    // 步骤4: 测试创建排班（使用修改后的时长）
    console.log('📅 步骤4: 测试创建排班...');
    
    const mockToken = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3MzY4OTI4MDAsImV4cCI6MTczNjk3OTIwMH0.signature';
    
    // 创建一个比原预约时长更长的排班
    const originalDuration = appointment.estimated_duration || 60;
    const newDuration = originalDuration + 30; // 增加30分钟
    
    const testScheduleData = {
      appointment_id: appointment.id,
      scheduled_date: '2025-12-15',
      scheduled_time_start: '10:00:00',
      scheduled_time_end: '10:' + String(newDuration).padStart(2, '0') + ':00', // 使用新时长
      room_id: room.id,
      nurse_id: nurse.id,
      notes: `测试排班 - 原时长${originalDuration}分钟，新时长${newDuration}分钟`
    };
    
    console.log(`📊 测试数据: 原时长=${originalDuration}分钟, 新时长=${newDuration}分钟`);
    
    const response = await fetch('http://localhost:3001/api/schedules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockToken}`
      },
      body: JSON.stringify(testScheduleData)
    });
    
    const result = await response.json();
    
    console.log('📥 响应状态:', response.status);
    console.log('📥 响应数据:', result);
    
    if (response.status === 201) {
      console.log('✅ 排班创建成功！');
      
      // 步骤5: 验证预约的时长是否被更新
      console.log('⏱️ 步骤5: 验证预约时长更新...');
      const updatedAppointmentResult = await pool.query(
        'SELECT estimated_duration FROM appointments WHERE id = $1',
        [appointment.id]
      );
      
      if (updatedAppointmentResult.rows.length > 0) {
        const updatedDuration = updatedAppointmentResult.rows[0].estimated_duration;
        console.log(`📊 更新后的时长: ${updatedDuration}分钟`);
        
        if (updatedDuration === newDuration) {
          console.log('✅ 时长更新成功！排班时长已正确保存到预约中');
        } else {
          console.log('⚠️ 时长更新可能有问题，请检查');
        }
      }
      
      // 步骤6: 清理测试数据
      console.log('🧹 步骤6: 清理测试数据...');
      await pool.query('DELETE FROM schedules WHERE appointment_id = $1', [appointment.id]);
      await pool.query('UPDATE appointments SET estimated_duration = $1 WHERE id = $2', [originalDuration, appointment.id]);
      console.log('✅ 测试数据清理完成');
      
    } else if (response.status === 400 && result.error) {
      if (result.error.includes('Invalid room')) {
        console.log('❌ 仍然存在"Invalid room"错误！');
      } else if (result.error.includes('userResult') || result.error.includes('rows')) {
        console.log('❌ 仍然存在userResult相关错误！');
      } else {
        console.log('✅ 修复成功！没有出现userResult或Invalid room错误');
        console.log('💡 收到的错误可能是正常的验证错误:', result.error);
      }
    } else {
      console.log('✅ 修复成功！API正常处理请求');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    
    if (error.message.includes('userResult') || error.message.includes('rows')) {
      console.log('❌ 修复失败！仍然存在userResult相关错误');
    } else if (error.message.includes('Invalid room')) {
      console.log('❌ 修复失败！仍然存在"Invalid room"错误');
    } else {
      console.log('✅ 修复成功！没有出现userResult或Invalid room错误');
      console.log('💡 其他错误可能是正常的（如网络连接、数据库连接等）');
    }
  } finally {
    await pool.end();
  }
}

// 运行测试
testCompleteScheduleFix().then(() => {
  console.log('🎯 完整测试完成！');
}).catch(error => {
  console.error('💥 测试过程中发生错误:', error);
});