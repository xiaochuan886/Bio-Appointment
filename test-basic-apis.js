// 基本API测试脚本
const API_BASE_URL = 'http://localhost:3001/api';

// 模拟token
const TEST_TOKEN = 'test-token';

// Helper function to handle API responses
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`,
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error.message);
    throw error;
  }
}

// 测试基本API功能
async function testBasicAPIs() {
  console.log('🧪 开始测试基本API功能...\n');
  
  try {
    // 1. 测试健康检查
    console.log('🏥 测试API健康检查...');
    try {
      const health = await apiCall('/health');
      console.log('✅ API健康状态:', health.status);
      console.log('   数据库状态:', health.database);
    } catch (error) {
      console.log('❌ API健康检查失败:', error.message);
    }
    
    // 2. 测试获取预约列表
    console.log('\n📋 测试获取预约列表...');
    try {
      const appointments = await apiCall('/appointments');
      console.log(`✅ 获取到 ${appointments.length} 个预约`);
      
      // 显示前几个预约的基本信息
      if (appointments.length > 0) {
        console.log('前3个预约:');
        appointments.slice(0, 3).forEach((apt, index) => {
          console.log(`  ${index + 1}. ${apt.customer_name} - ${apt.service_name || apt.service_id} (${apt.status})`);
        });
      }
    } catch (error) {
      console.log('❌ 获取预约列表失败:', error.message);
    }
    
    // 3. 测试获取服务列表
    console.log('\n🔧 测试获取服务列表...');
    try {
      const services = await apiCall('/services');
      console.log(`✅ 获取到 ${services.length} 个服务`);
      
      // 按类别分组显示服务
      const servicesByCategory = {};
      services.forEach(service => {
        if (!servicesByCategory[service.category]) {
          servicesByCategory[service.category] = [];
        }
        servicesByCategory[service.category].push(service.name);
      });
      
      Object.entries(servicesByCategory).forEach(([category, serviceNames]) => {
        console.log(`  ${category}: ${serviceNames.join(', ')}`);
      });
    } catch (error) {
      console.log('❌ 获取服务列表失败:', error.message);
    }
    
    // 4. 测试获取用户列表
    console.log('\n👥 测试获取用户列表...');
    try {
      const profiles = await apiCall('/profiles');
      console.log(`✅ 获取到 ${profiles.length} 个用户`);
      
      // 按角色分组显示用户
      const usersByRole = {};
      profiles.forEach(user => {
        if (!usersByRole[user.role]) {
          usersByRole[user.role] = [];
        }
        usersByRole[user.role].push(user.full_name || user.username);
      });
      
      Object.entries(usersByRole).forEach(([role, userNames]) => {
        console.log(`  ${role}: ${userNames.length} 个用户`);
      });
    } catch (error) {
      console.log('❌ 获取用户列表失败:', error.message);
    }
    
    console.log('\n🎉 基本API测试完成！');
    console.log('\n⚠️  注意：工作流相关的API端点（nurse-pending、doctor-pending等）尚未实现');
    
  } catch (error) {
    console.error('❌ API测试失败:', error.message);
  }
}

// 运行测试
testBasicAPIs();