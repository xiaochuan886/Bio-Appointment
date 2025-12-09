const axios = require('axios');

// 测试删除服务时的错误处理
async function testServiceDeletionError() {
  console.log('🔍 测试删除服务时的错误处理...');
  
  try {
    // 先获取服务列表
    const servicesResponse = await axios.get('http://localhost:3001/api/services');
    const services = servicesResponse.data;
    
    if (services.length === 0) {
      console.log('❌ 没有找到服务，无法测试删除功能');
      return;
    }
    
    // 尝试删除第一个服务
    const serviceId = services[0].id;
    console.log(`📝 尝试删除服务: ${services[0].name} (ID: ${serviceId})`);
    
    try {
      await axios.delete(`http://localhost:3001/api/services/${serviceId}`);
      console.log('✅ 服务删除成功（这可能会影响数据，请谨慎）');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ 成功捕获到删除错误:');
        console.log('   状态码:', error.response.status);
        console.log('   错误消息:', error.response.data.error || error.response.data.message);
        console.log('   详细信息:', error.response.data.details || '无详细信息');
        
        // 检查错误响应是否包含预期的字段
        const hasError = error.response.data.error || error.response.data.message;
        const hasDetails = error.response.data.details;
        
        if (hasError) {
          console.log('✅ 错误响应包含基本错误信息');
        } else {
          console.log('❌ 错误响应缺少基本错误信息');
        }
        
        if (hasDetails) {
          console.log('✅ 错误响应包含详细信息');
        } else {
          console.log('⚠️ 错误响应缺少详细信息');
        }
      } else {
        console.log('❌ 意外的错误:', error.message);
      }
    }
  } catch (error) {
    console.log('❌ 获取服务列表失败:', error.message);
  }
}

// 测试获取已取消预约的 API
async function testCancelledAppointments() {
  console.log('\n🔍 测试获取已取消预约的 API...');
  
  try {
    const response = await axios.get('http://localhost:3001/api/appointments/cancelled');
    console.log('✅ 成功获取已取消预约列表');
    console.log('   返回数量:', response.data.length);
    
    if (response.data.length > 0) {
      console.log('   样本数据:', {
        id: response.data[0].id,
        customer_name: response.data[0].customer_name,
        status: response.data[0].status,
        service_name: response.data[0].service_name
      });
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('⚠️ 需要认证才能访问此 API（这是正常的）');
    } else {
      console.log('❌ 获取已取消预约失败:', error.message);
      if (error.response) {
        console.log('   状态码:', error.response.status);
        console.log('   错误信息:', error.response.data);
      }
    }
  }
}

// 运行测试
async function runTests() {
  console.log('🚀 开始测试修复后的功能...\n');
  
  await testServiceDeletionError();
  await testCancelledAppointments();
  
  console.log('\n✅ 测试完成！');
}

runTests().catch(console.error);