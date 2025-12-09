const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function checkServiceUsage() {
  const serviceId = '83368971-5abc-4978-9216-98cde2f0d7ba';
  
  try {
    console.log(`🔍 检查服务 ${serviceId} 的使用情况...`);
    
    // 检查服务是否存在
    const serviceResult = await pool.query('SELECT * FROM services WHERE id = $1', [serviceId]);
    
    if (serviceResult.rows.length === 0) {
      console.log('❌ 服务不存在');
      return;
    }
    
    const service = serviceResult.rows[0];
    console.log('✅ 找到服务:', {
      id: service.id,
      name: service.name,
      category: service.category,
      is_active: service.is_active
    });
    
    // 检查该服务是否被预约使用
    const appointmentResult = await pool.query(
      'SELECT COUNT(*) as count FROM appointments WHERE service_id = $1',
      [serviceId]
    );
    
    const appointmentCount = parseInt(appointmentResult.rows[0].count);
    console.log(`📊 该服务被 ${appointmentCount} 个预约使用`);
    
    if (appointmentCount > 0) {
      // 获取使用该服务的预约详情
      const appointmentsDetailResult = await pool.query(
        'SELECT id, customer_name, requested_date, status, workflow_status FROM appointments WHERE service_id = $1 LIMIT 5',
        [serviceId]
      );
      
      console.log('📋 使用该服务的预约详情:');
      appointmentsDetailResult.rows.forEach((apt, index) => {
        console.log(`  ${index + 1}. ID: ${apt.id}, 客户: ${apt.customer_name}, 日期: ${apt.requested_date}, 状态: ${apt.status}, 工作流: ${apt.workflow_status}`);
      });
      
      console.log('\n💡 解决方案:');
      console.log('1. 将服务状态设置为禁用而不是删除');
      console.log('2. 先删除或修改使用该服务的预约');
      console.log('3. 修改服务器端逻辑，允许删除被使用的历史服务（但保留历史记录）');
    } else {
      console.log('✅ 该服务未被任何预约使用，应该可以删除');
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await pool.end();
  }
}

checkServiceUsage();