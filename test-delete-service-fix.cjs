const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function testDeleteService() {
  const serviceId = '83368971-5abc-4978-9216-98cde2f0d7ba';
  
  try {
    console.log('🧪 测试删除服务 API...');
    
    // 模拟 API 请求
    const response = await fetch(`http://localhost:3001/api/services/${serviceId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const responseData = await response.json();
    
    console.log(`📊 响应状态: ${response.status}`);
    console.log('📋 响应数据:', JSON.stringify(responseData, null, 2));
    
    if (response.status === 400 && responseData.error === 'Cannot delete service') {
      console.log('✅ 修复成功！服务器返回了更详细的错误信息');
      console.log('\n📝 错误消息:');
      console.log(responseData.message);
      
      if (responseData.appointmentCount) {
        console.log(`\n📊 预约数量: ${responseData.appointmentCount}`);
      }
      
      if (responseData.appointments && responseData.appointments.length > 0) {
        console.log('\n📋 使用该服务的预约:');
        responseData.appointments.forEach((apt, index) => {
          console.log(`  ${index + 1}. 客户: ${apt.customer_name}, 日期: ${apt.requested_date}`);
        });
      }
    } else if (response.status === 200) {
      console.log('✅ 服务删除成功');
    } else {
      console.log('❌ 意外的响应');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await pool.end();
  }
}

testDeleteService();