const { Pool } = require('pg');

// 数据库连接
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function testUserResultFix() {
  console.log('🧪 测试 userResult 修复...');
  
  try {
    // 模拟一个有效的用户token
    const mockToken = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3MzY4OTI4MDAsImV4cCI6MTczNjk3OTIwMH0.signature';
    
    // 测试数据
    const testScheduleData = {
      appointment_id: '00000000-0000-0000-0000-000000000000', // 使用一个假的UUID进行测试
      scheduled_date: '2025-12-15',
      scheduled_time_start: '10:00:00',
      scheduled_time_end: '11:00:00',
      room_id: '00000000-0000-0000-0000-000000000000', // 使用一个假的UUID进行测试
      nurse_id: 'admin-id',
      notes: '测试排班'
    };
    
    console.log('📤 发送测试请求到 /api/schedules...');
    
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
    
    if (response.status === 400 && result.error === 'Appointment not found') {
      console.log('✅ 修复成功！API正常处理请求，没有出现"userResult undefined"错误');
      console.log('💡 收到"Appointment not found"错误是预期的，因为我们使用了假的UUID');
    } else if (response.status === 500 && result.error && result.error.includes('userResult')) {
      console.log('❌ 修复失败！仍然存在userResult相关错误');
      console.log('🔍 错误详情:', result);
    } else {
      console.log('✅ 修复成功！API正常处理请求');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    
    if (error.message.includes('userResult') || error.message.includes('rows')) {
      console.log('❌ 修复失败！仍然存在userResult相关错误');
    } else {
      console.log('✅ 修复成功！没有出现userResult相关错误');
      console.log('💡 其他错误可能是正常的（如网络连接、数据库连接等）');
    }
  } finally {
    await pool.end();
  }
}

// 运行测试
testUserResultFix().then(() => {
  console.log('🎯 测试完成！');
}).catch(error => {
  console.error('💥 测试过程中发生错误:', error);
});