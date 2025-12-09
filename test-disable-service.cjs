const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function testDisableService() {
  const serviceId = '83368971-5abc-4978-9216-98cde2f0d7ba';
  
  try {
    console.log('🧪 测试禁用服务功能...');
    
    // 1. 检查服务当前状态
    const beforeResult = await pool.query('SELECT is_active FROM services WHERE id = $1', [serviceId]);
    
    if (beforeResult.rows.length === 0) {
      console.log('❌ 服务不存在');
      return;
    }
    
    const currentStatus = beforeResult.rows[0].is_active;
    console.log(`📊 服务当前状态: ${currentStatus ? '启用' : '禁用'}`);
    
    // 2. 模拟 API 请求更新服务状态
    const response = await fetch(`http://localhost:3001/api/services/${serviceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        is_active: !currentStatus
      })
    });
    
    const responseData = await response.json();
    
    console.log(`📊 响应状态: ${response.status}`);
    console.log('📋 响应数据:', JSON.stringify(responseData, null, 2));
    
    if (response.status === 200) {
      console.log(`✅ 服务状态更新成功: ${!currentStatus ? '启用' : '禁用'}`);
      
      // 3. 验证数据库中的状态
      const afterResult = await pool.query('SELECT is_active FROM services WHERE id = $1', [serviceId]);
      const newStatus = afterResult.rows[0].is_active;
      console.log(`📊 服务新状态: ${newStatus ? '启用' : '禁用'}`);
      
      if (newStatus === !currentStatus) {
        console.log('✅ 数据库状态更新成功');
      } else {
        console.log('❌ 数据库状态更新失败');
      }
    } else {
      console.log('❌ 服务状态更新失败');
    }
    
    // 4. 恢复原始状态
    console.log('\n🔄 恢复原始状态...');
    const restoreResponse = await fetch(`http://localhost:3001/api/services/${serviceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        is_active: currentStatus
      })
    });
    
    if (restoreResponse.status === 200) {
      console.log('✅ 原始状态恢复成功');
    } else {
      console.log('❌ 原始状态恢复失败');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await pool.end();
  }
}

testDisableService();