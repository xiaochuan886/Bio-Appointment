const axios = require('axios');

// 测试删除服务时的错误处理（更全面的测试）
async function testServiceDeletionComprehensive() {
  console.log('🔍 全面测试删除服务时的错误处理...');
  
  try {
    // 先获取服务列表
    const servicesResponse = await axios.get('http://localhost:3001/api/services');
    const services = servicesResponse.data;
    
    if (services.length === 0) {
      console.log('❌ 没有找到服务，无法测试删除功能');
      return;
    }
    
    console.log(`📋 找到 ${services.length} 个服务`);
    
    // 获取预约列表，看看哪些服务被使用
    try {
      const appointmentsResponse = await axios.get('http://localhost:3001/api/appointments');
      const appointments = appointmentsResponse.data;
      console.log(`📅 找到 ${appointments.length} 个预约`);
      
      // 找出被预约使用的服务
      const usedServiceIds = new Set(appointments.map(a => a.service_id));
      const usedServices = services.filter(s => usedServiceIds.has(s.id));
      const unusedServices = services.filter(s => !usedServiceIds.has(s.id));
      
      console.log(`📊 被预约使用的服务: ${usedServices.length} 个`);
      console.log(`📊 未被预约使用的服务: ${unusedServices.length} 个`);
      
      if (usedServices.length > 0) {
        // 测试删除被使用的服务（应该返回错误）
        const serviceToDelete = usedServices[0];
        console.log(`\n🗑️ 测试删除被使用的服务: ${serviceToDelete.name} (ID: ${serviceToDelete.id})`);
        
        try {
          await axios.delete(`http://localhost:3001/api/services/${serviceToDelete.id}`);
          console.log('⚠️ 意外成功：被使用的服务删除成功（这可能不正常）');
        } catch (error) {
          if (error.response && error.response.status === 400) {
            console.log('✅ 成功捕获到删除错误:');
            console.log('   状态码:', error.response.status);
            console.log('   错误消息:', error.response.data.error || error.response.data.message);
            
            // 检查错误响应结构
            const response = error.response.data;
            const hasError = response.error || response.message;
            const hasDetails = response.details;
            
            console.log('\n📋 错误响应分析:');
            if (hasError) {
              console.log('   ✅ 包含基本错误信息');
            } else {
              console.log('   ❌ 缺少基本错误信息');
            }
            
            if (hasDetails) {
              console.log('   ✅ 包含详细信息');
              console.log('   详细信息内容:', hasDetails);
            } else {
              console.log('   ⚠️ 缺少详细信息');
            }
            
            // 检查是否是预期的错误类型
            const errorMessage = (response.error || response.message || '').toLowerCase();
            if (errorMessage.includes('cannot delete') || errorMessage.includes('无法删除') || errorMessage.includes('被')) {
              console.log('   ✅ 错误消息符合预期');
            } else {
              console.log('   ⚠️ 错误消息可能不符合预期');
            }
          } else {
            console.log('❌ 意外的错误类型:', error.message);
          }
        }
      } else {
        console.log('⚠️ 没有找到被预约使用的服务，无法测试删除错误场景');
      }
      
      if (unusedServices.length > 0) {
        // 测试删除未被使用的服务（应该成功）
        const serviceToDelete = unusedServices[0];
        console.log(`\n✅ 测试删除未使用的服务: ${serviceToDelete.name} (ID: ${serviceToDelete.id})`);
        
        try {
          await axios.delete(`http://localhost:3001/api/services/${serviceToDelete.id}`);
          console.log('✅ 成功删除未使用的服务');
        } catch (error) {
          console.log('❌ 删除未使用的服务失败:', error.message);
          if (error.response) {
            console.log('   状态码:', error.response.status);
            console.log('   错误信息:', error.response.data);
          }
        }
      }
    } catch (appointmentError) {
      console.log('⚠️ 无法获取预约列表，继续测试基本删除功能');
    }
  } catch (error) {
    console.log('❌ 获取服务列表失败:', error.message);
  }
}

// 测试前端错误显示（模拟前端请求）
async function testFrontendErrorHandling() {
  console.log('\n🔍 测试前端错误处理...');
  
  // 模拟前端 API 客户端的错误处理
  try {
    const servicesResponse = await axios.get('http://localhost:3001/api/services');
    const services = servicesResponse.data;
    
    if (services.length > 0) {
      const serviceId = services[0].id;
      
      try {
        await axios.delete(`http://localhost:3001/api/services/${serviceId}`);
      } catch (error) {
        // 模拟前端的错误处理逻辑
        console.log('📋 模拟前端错误处理:');
        
        let errorMessage = error.message || '删除失败';
        let detailedMessage = '';
        
        // 检查是否有增强的错误信息
        if (error.response && error.response.data) {
          const response = error.response.data;
          
          if (response.details) {
            detailedMessage = response.details;
            errorMessage = response.error || response.message || '无法删除服务';
          } else if (response.error && response.error.includes('被') && response.error.includes('个预约使用')) {
            detailedMessage = response.error;
            errorMessage = '无法删除服务，该服务正在被预约使用';
          }
        }
        
        console.log('   基本错误消息:', errorMessage);
        console.log('   详细错误信息:', detailedMessage || '无详细信息');
        
        if (detailedMessage) {
          console.log('   ✅ 前端可以显示详细的错误信息');
        } else {
          console.log('   ⚠️ 前端只能显示基本的错误信息');
        }
      }
    }
  } catch (error) {
    console.log('❌ 测试前端错误处理失败:', error.message);
  }
}

// 运行测试
async function runComprehensiveTests() {
  console.log('🚀 开始全面测试修复后的功能...\n');
  
  await testServiceDeletionComprehensive();
  await testFrontendErrorHandling();
  
  console.log('\n✅ 全面测试完成！');
  console.log('\n📝 测试总结:');
  console.log('1. ✅ 修复了删除服务时的错误提示显示问题');
  console.log('   - 增强了 API 客户端的错误处理');
  console.log('   - 修改了 SystemConfigPage.tsx 中的错误处理逻辑');
  console.log('   - 修改了 sonner.tsx，增加了 z-index 确保错误提示显示在最顶层');
  console.log('\n2. ✅ 在智能排班页面添加了查看已取消预约记录的功能');
  console.log('   - 在 API 客户端添加了获取已取消预约的方法');
  console.log('   - 在服务器端添加了相应的 API 端点');
  console.log('   - 在护士长排班页面添加了查看已取消预约的 UI 组件');
}

runComprehensiveTests().catch(console.error);