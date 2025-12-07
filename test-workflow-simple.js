// 简化的工作流API测试脚本
const API_BASE_URL = 'http://localhost:5173/api';

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

// 测试工作流API
async function testWorkflowAPIs() {
  console.log('🧪 开始测试工作流API...\n');
  
  try {
    // 1. 测试获取护士长待处理预约
    console.log('📋 测试获取护士长待处理预约...');
    try {
      const nurseAppointments = await apiCall('/appointments/nurse-pending');
      console.log(`✅ 获取到 ${nurseAppointments.length} 个护士长待处理预约`);
      
      // 显示前几个预约的基本信息
      if (nurseAppointments.length > 0) {
        console.log('前3个护士长待处理预约:');
        nurseAppointments.slice(0, 3).forEach((apt, index) => {
          console.log(`  ${index + 1}. ${apt.customer_name} - ${apt.service_name} (${apt.workflow_status})`);
        });
      }
    } catch (error) {
      console.log('❌ 获取护士长待处理预约失败:', error.message);
    }
    
    // 2. 测试获取医生待处理预约
    console.log('\n👨‍⚕️ 测试获取医生待处理预约...');
    try {
      const doctorAppointments = await apiCall('/appointments/doctor-pending');
      console.log(`✅ 获取到 ${doctorAppointments.length} 个医生待处理预约`);
      
      // 显示前几个预约的基本信息
      if (doctorAppointments.length > 0) {
        console.log('前3个医生待处理预约:');
        doctorAppointments.slice(0, 3).forEach((apt, index) => {
          console.log(`  ${index + 1}. ${apt.customer_name} - ${apt.service_name} (${apt.workflow_status})`);
        });
      }
    } catch (error) {
      console.log('❌ 获取医生待处理预约失败:', error.message);
    }
    
    // 3. 测试工作流状态更新（如果有医生待处理预约）
    try {
      const doctorAppointments = await apiCall('/appointments/doctor-pending');
      if (doctorAppointments.length > 0) {
        const testAppointment = doctorAppointments[0];
        console.log(`\n🔍 测试预约: ${testAppointment.customer_name} (${testAppointment.id})`);
        
        // 测试医生确认预约
        console.log('✅ 测试医生确认预约...');
        try {
          const confirmedAppointment = await apiCall(`/appointments/${testAppointment.id}/doctor-confirm`, {
            method: 'PUT',
            body: JSON.stringify({
              doctor_id: 'test-doctor-id',
              doctor_note: '测试确认备注'
            }),
          });
          console.log(`✅ 预约已确认，状态: ${confirmedAppointment.workflow_status}`);
        } catch (error) {
          console.log('❌ 医生确认预约失败:', error.message);
        }
      }
    } catch (error) {
      console.log('❌ 获取医生预约进行测试失败:', error.message);
    }
    
    console.log('\n🎉 所有API测试完成！');
    
  } catch (error) {
    console.error('❌ API测试失败:', error.message);
  }
}

// 运行测试
testWorkflowAPIs();