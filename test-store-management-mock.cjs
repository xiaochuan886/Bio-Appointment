// 门店管理功能模拟测试脚本
// 使用模拟令牌测试API功能，绕过认证问题

const fetch = require('node-fetch');
const fs = require('fs');

// 测试配置
const API_BASE_URL = 'http://localhost:3001/api';
const TEST_REPORT_FILE = 'store-management-test-report-mock.json';

// 模拟令牌（绕过认证）
const MOCK_TOKENS = {
  admin: 'mock.admin.token',
  sales: 'mock.sales.token',
  nurse_manager: 'mock.nurse_manager.token',
  doctor: 'mock.doctor.token',
  nurse: 'mock.nurse.token'
};

// 测试结果记录
let testResults = {
  summary: {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    startTime: new Date().toISOString(),
    endTime: null,
    duration: null
  },
  categories: {
    crud: { name: '门店CRUD操作', tests: [], passed: 0, failed: 0 },
    associations: { name: '门店关联验证', tests: [], passed: 0, failed: 0 },
    permissions: { name: '权限控制', tests: [], passed: 0, failed: 0 },
    appointmentFlow: { name: '预约流程门店选择', tests: [], passed: 0, failed: 0 },
    scheduleRestrictions: { name: '排班功能门店范围限制', tests: [], passed: 0, failed: 0 }
  },
  issues: [],
  recommendations: []
};

// 测试数据存储
let testData = {
  stores: [],
  appointments: [],
  users: [],
  resources: []
};

// 工具函数：记录测试结果
function recordTest(category, testName, passed, details = '') {
  const test = {
    name: testName,
    passed,
    details,
    timestamp: new Date().toISOString()
  };
  
  testResults.categories[category].tests.push(test);
  if (passed) {
    testResults.categories[category].passed++;
  } else {
    testResults.categories[category].failed++;
    testResults.issues.push({
      category: testResults.categories[category].name,
      test: testName,
      details
    });
  }
  
  testResults.summary.totalTests++;
  if (passed) {
    testResults.summary.passedTests++;
  } else {
    testResults.summary.failedTests++;
  }
  
  console.log(`${passed ? '✅' : '❌'} ${testName}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

// 工具函数：API调用
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 工具函数：模拟认证API调用
async function mockAuthenticatedApiCall(endpoint, userRole, options = {}) {
  return apiCall(endpoint, {
    ...options,
    headers: {
      'Authorization': `Bearer ${MOCK_TOKENS[userRole]}`,
      ...options.headers
    }
  });
}

// ==================== 测试函数 ====================

// 1. 门店CRUD操作测试
async function testStoreCRUD() {
  console.log('\n🏪 开始门店CRUD操作测试');
  
  // 1.1 获取门店列表
  try {
    const result = await mockAuthenticatedApiCall('/stores', 'admin');
    recordTest('crud', '获取门店列表', result.success, 
      result.success ? `获取到 ${result.data.stores?.length || 0} 个门店` : `失败: ${result.data?.error}`);
  } catch (error) {
    recordTest('crud', '获取门店列表', false, `异常: ${error.message}`);
  }
  
  // 1.2 创建门店
  try {
    const storeData = {
      name: '测试门店-CRUD-Mock',
      address: '测试地址123号',
      phone: '400-123-4567',
      contact_person: '张经理',
      status: 'active',
      description: '这是一个CRUD测试门店',
      business_hours: {
        monday: { open: '09:00', close: '18:00' },
        tuesday: { open: '09:00', close: '18:00' }
      }
    };
    
    const result = await mockAuthenticatedApiCall('/stores', 'admin', {
      method: 'POST',
      body: JSON.stringify(storeData)
    });
    
    if (result.success) {
      testData.stores.push(result.data);
      recordTest('crud', '创建门店', true, `门店ID: ${result.data.id}, 名称: ${result.data.name}`);
    } else {
      recordTest('crud', '创建门店', false, `失败: ${result.data?.error}`);
    }
  } catch (error) {
    recordTest('crud', '创建门店', false, `异常: ${error.message}`);
  }
  
  // 1.3 获取单个门店
  if (testData.stores.length > 0) {
    try {
      const storeId = testData.stores[testData.stores.length - 1].id;
      const result = await mockAuthenticatedApiCall(`/stores/${storeId}`, 'admin');
      recordTest('crud', '获取单个门店', result.success, 
        result.success ? `获取到门店: ${result.data.name}` : `失败: ${result.data?.error}`);
    } catch (error) {
      recordTest('crud', '获取单个门店', false, `异常: ${error.message}`);
    }
  }
  
  // 1.4 更新门店
  if (testData.stores.length > 0) {
    try {
      const storeId = testData.stores[testData.stores.length - 1].id;
      const updateData = {
        name: '更新后的测试门店-Mock',
        phone: '400-999-8888'
      };
      
      const result = await mockAuthenticatedApiCall(`/stores/${storeId}`, 'admin', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      recordTest('crud', '更新门店', result.success, 
        result.success ? `更新成功: ${result.data.name}` : `失败: ${result.data?.error}`);
    } catch (error) {
      recordTest('crud', '更新门店', false, `异常: ${error.message}`);
    }
  }
  
  // 1.5 获取门店资源
  if (testData.stores.length > 0) {
    try {
      const storeId = testData.stores[testData.stores.length - 1].id;
      const result = await mockAuthenticatedApiCall(`/stores/${storeId}/resources`, 'admin');
      recordTest('crud', '获取门店资源', result.success, 
        result.success ? `获取到 ${result.data.length} 个资源` : `失败: ${result.data?.error}`);
    } catch (error) {
      recordTest('crud', '获取门店资源', false, `异常: ${error.message}`);
    }
  }
  
  // 1.6 获取门店员工
  if (testData.stores.length > 0) {
    try {
      const storeId = testData.stores[testData.stores.length - 1].id;
      const result = await mockAuthenticatedApiCall(`/stores/${storeId}/staff`, 'admin');
      recordTest('crud', '获取门店员工', result.success, 
        result.success ? `获取到 ${result.data.length} 个员工` : `失败: ${result.data?.error}`);
    } catch (error) {
      recordTest('crud', '获取门店员工', false, `异常: ${error.message}`);
    }
  }
}

// 2. 门店关联验证测试
async function testStoreAssociations() {
  console.log('\n🔗 开始门店关联验证测试');
  
  // 2.1 按门店过滤预约
  if (testData.stores.length > 0) {
    try {
      const storeId = testData.stores[0].id;
      const result = await mockAuthenticatedApiCall(`/appointments?store_id=${storeId}`, 'admin');
      recordTest('associations', '按门店过滤预约', result.success, 
        result.success ? `获取到 ${result.data.length} 个预约` : `失败: ${result.data?.error}`);
    } catch (error) {
      recordTest('associations', '按门店过滤预约', false, `异常: ${error.message}`);
    }
  }
  
  // 2.2 按门店过滤资源
  if (testData.stores.length > 0) {
    try {
      const storeId = testData.stores[0].id;
      const result = await mockAuthenticatedApiCall(`/resources?store_id=${storeId}`, 'admin');
      recordTest('associations', '按门店过滤资源', result.success, 
        result.success ? `获取到 ${result.data.length} 个资源` : `失败: ${result.data?.error}`);
    } catch (error) {
      recordTest('associations', '按门店过滤资源', false, `异常: ${error.message}`);
    }
  }
  
  // 2.3 按门店过滤用户
  if (testData.stores.length > 0) {
    try {
      const storeId = testData.stores[0].id;
      const result = await mockAuthenticatedApiCall(`/profiles?store_id=${storeId}`, 'admin');
      recordTest('associations', '按门店过滤用户', result.success, 
        result.success ? `获取到 ${result.data.length} 个用户` : `失败: ${result.data?.error}`);
    } catch (error) {
      recordTest('associations', '按门店过滤用户', false, `异常: ${error.message}`);
    }
  }
  
  // 2.4 按门店过滤排班
  if (testData.stores.length > 0) {
    try {
      const storeId = testData.stores[0].id;
      const result = await mockAuthenticatedApiCall(`/schedules?store_id=${storeId}`, 'admin');
      recordTest('associations', '按门店过滤排班', result.success, 
        result.success ? `获取到 ${result.data.length} 个排班` : `失败: ${result.data?.error}`);
    } catch (error) {
      recordTest('associations', '按门店过滤排班', false, `异常: ${error.message}`);
    }
  }
}

// 3. 权限控制测试
async function testPermissions() {
  console.log('\n🔒 开始权限控制测试');
  
  // 3.1 管理员访问所有门店
  try {
    const result = await mockAuthenticatedApiCall('/stores', 'admin');
    recordTest('permissions', '管理员访问所有门店', result.success, 
      result.success ? `获取到 ${result.data.stores?.length || 0} 个门店` : `失败: ${result.data?.error}`);
  } catch (error) {
    recordTest('permissions', '管理员访问所有门店', false, `异常: ${error.message}`);
  }
  
  // 3.2 销售访问所有门店（创建预约需要）
  try {
    const result = await mockAuthenticatedApiCall('/stores', 'sales');
    recordTest('permissions', '销售访问所有门店', result.success, 
      result.success ? `获取到 ${result.data.stores?.length || 0} 个门店` : `失败: ${result.data?.error}`);
  } catch (error) {
    recordTest('permissions', '销售访问所有门店', false, `异常: ${error.message}`);
  }
  
  // 3.3 护士长访问所有门店（应该被限制）
  try {
    const result = await mockAuthenticatedApiCall('/stores', 'nurse_manager');
    recordTest('permissions', '护士长访问所有门店', !result.success, 
      !result.success ? '正确限制访问' : `应该被限制但获取到 ${result.data.stores?.length || 0} 个门店`);
  } catch (error) {
    recordTest('permissions', '护士长访问所有门店', true, `正确限制访问: ${error.message}`);
  }
  
  // 3.4 非管理员用户创建门店（应该被拒绝）
  try {
    const storeData = {
      name: '未授权门店-Mock',
      address: '未授权地址',
      phone: '400-000-0000',
      contact_person: '未授权',
      status: 'active'
    };
    
    const result = await mockAuthenticatedApiCall('/stores', 'sales', {
      method: 'POST',
      body: JSON.stringify(storeData)
    });
    
    recordTest('permissions', '非管理员创建门店', !result.success, 
      !result.success ? '正确拒绝创建' : `应该被拒绝但创建成功: ${result.data.name}`);
  } catch (error) {
    recordTest('permissions', '非管理员创建门店', true, `正确拒绝创建: ${error.message}`);
  }
}

// 4. 预约流程门店选择功能测试
async function testAppointmentFlow() {
  console.log('\n📅 开始预约流程门店选择功能测试');
  
  // 4.1 销售获取活跃门店列表
  try {
    const result = await mockAuthenticatedApiCall('/stores?status=active', 'sales');
    recordTest('appointmentFlow', '销售获取活跃门店列表', result.success, 
      result.success ? `获取到 ${result.data.stores?.length || 0} 个活跃门店` : `失败: ${result.data?.error}`);
  } catch (error) {
    recordTest('appointmentFlow', '销售获取活跃门店列表', false, `异常: ${error.message}`);
  }
  
  // 4.2 创建预约时选择门店
  if (testData.stores.length > 0) {
    try {
      const storeId = testData.stores[0].id;
      const appointmentData = {
        customer_name: '预约流程测试客户-Mock',
        customer_phone: '13900139000',
        service_id: '550e8400-e29b-41d4-a716-446655440005',
        requested_date: '2025-12-11',
        requested_time_start: '14:00:00',
        requested_time_end: '15:00:00',
        total_people: 1,
        estimated_duration: 60,
        is_urgent: false,
        notes: '预约流程门店选择测试',
        store_id: storeId
      };
      
      const result = await mockAuthenticatedApiCall('/appointments', 'sales', {
        method: 'POST',
        body: JSON.stringify(appointmentData)
      });
      
      if (result.success) {
        testData.appointments.push(result.data);
        recordTest('appointmentFlow', '创建预约时选择门店', true, `预约ID: ${result.data.id}, 门店ID: ${result.data.store_id}`);
      } else {
        recordTest('appointmentFlow', '创建预约时选择门店', false, `失败: ${result.data?.error}`);
      }
    } catch (error) {
      recordTest('appointmentFlow', '创建预约时选择门店', false, `异常: ${error.message}`);
    }
  }
  
  // 4.3 按门店过滤预约列表
  if (testData.stores.length > 0 && testData.appointments.length > 0) {
    try {
      const storeId = testData.stores[0].id;
      const result = await mockAuthenticatedApiCall(`/appointments?store_id=${storeId}`, 'sales');
      
      const allHaveStoreId = result.success && result.data.every(apt => apt.store_id === storeId);
      recordTest('appointmentFlow', '按门店过滤预约列表', allHaveStoreId, 
        allHaveStoreId ? `所有预约都属于指定门店` : `过滤不正确`);
    } catch (error) {
      recordTest('appointmentFlow', '按门店过滤预约列表', false, `异常: ${error.message}`);
    }
  }
}

// 5. 排班功能门店范围限制测试
async function testScheduleRestrictions() {
  console.log('\n👥 开始排班功能门店范围限制测试');
  
  // 5.1 护士长查看自己门店的排班
  if (testData.stores.length > 0) {
    try {
      const storeId = testData.stores[0].id;
      const result = await mockAuthenticatedApiCall(`/schedules?store_id=${storeId}`, 'nurse_manager');
      recordTest('scheduleRestrictions', '护士长查看自己门店排班', result.success, 
        result.success ? `获取到 ${result.data.length} 个排班` : `失败: ${result.data?.error}`);
    } catch (error) {
      recordTest('scheduleRestrictions', '护士长查看自己门店排班', false, `异常: ${error.message}`);
    }
  }
  
  // 5.2 护士长尝试查看其他门店排班（应该被限制）
  if (testData.stores.length > 1) {
    try {
      const otherStoreId = testData.stores[1].id;
      const result = await mockAuthenticatedApiCall(`/schedules?store_id=${otherStoreId}`, 'nurse_manager');
      recordTest('scheduleRestrictions', '护士长查看其他门店排班', !result.success, 
        !result.success ? '正确限制访问' : `应该被限制但获取到 ${result.data.length} 个排班`);
    } catch (error) {
      recordTest('scheduleRestrictions', '护士长查看其他门店排班', true, `正确限制访问: ${error.message}`);
    }
  }
  
  // 5.3 创建排班时指定门店
  if (testData.appointments.length > 0 && testData.stores.length > 0) {
    try {
      const appointmentId = testData.appointments[testData.appointments.length - 1].id;
      const scheduleData = {
        appointment_id: appointmentId,
        scheduled_date: '2025-12-12',
        scheduled_time_start: '09:00:00',
        scheduled_time_end: '10:00:00',
        room_id: null,
        nurse_id: null,
        notes: '排班门店范围限制测试'
      };
      
      const result = await mockAuthenticatedApiCall('/schedules', 'nurse_manager', {
        method: 'POST',
        body: JSON.stringify(scheduleData)
      });
      
      recordTest('scheduleRestrictions', '创建排班时指定门店', result.success, 
        result.success ? `排班ID: ${result.data.id}` : `失败: ${result.data?.error}`);
    } catch (error) {
      recordTest('scheduleRestrictions', '创建排班时指定门店', false, `异常: ${error.message}`);
    }
  }
}

// ==================== 主测试函数 ====================

async function generateTestReport() {
  console.log('\n📊 生成测试报告...');
  
  // 计算测试时长
  testResults.summary.endTime = new Date().toISOString();
  testResults.summary.duration = 
    new Date(testResults.summary.endTime) - new Date(testResults.summary.startTime);
  
  // 生成建议
  const failedCategories = Object.entries(testResults.categories)
    .filter(([_, cat]) => cat.failed > 0)
    .map(([_, cat]) => cat.name);
  
  if (failedCategories.length > 0) {
    testResults.recommendations.push(
      `需要重点关注以下测试类别: ${failedCategories.join(', ')}`
    );
  }
  
  if (testResults.summary.failedTests === 0) {
    testResults.recommendations.push('所有测试通过，门店管理功能运行良好');
  }
  
  testResults.recommendations.push('注意：此测试使用模拟令牌，实际部署时需要确保认证系统正常工作');
  
  // 保存报告文件
  try {
    fs.writeFileSync(TEST_REPORT_FILE, JSON.stringify(testResults, null, 2));
    console.log(`✅ 测试报告已保存到: ${TEST_REPORT_FILE}`);
  } catch (error) {
    console.error(`❌ 保存测试报告失败: ${error.message}`);
  }
  
  // 输出摘要
  console.log('\n📋 测试摘要');
  console.log('================');
  console.log(`总测试数: ${testResults.summary.totalTests}`);
  console.log(`通过: ${testResults.summary.passedTests}`);
  console.log(`失败: ${testResults.summary.failedTests}`);
  console.log(`成功率: ${((testResults.summary.passedTests / testResults.summary.totalTests) * 100).toFixed(2)}%`);
  console.log(`测试时长: ${testResults.summary.duration}ms`);
  
  console.log('\n📈 分类结果');
  console.log('============');
  Object.entries(testResults.categories).forEach(([key, cat]) => {
    const rate = ((cat.passed / (cat.passed + cat.failed)) * 100).toFixed(1);
    console.log(`${cat.name}: ${cat.passed}/${cat.passed + cat.failed} (${rate}%)`);
  });
  
  if (testResults.issues.length > 0) {
    console.log('\n⚠️ 发现的问题');
    console.log('==============');
    testResults.issues.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.category}] ${issue.test}`);
      console.log(`   ${issue.details}`);
    });
  }
  
  console.log('\n💡 建议');
  console.log('========');
  testResults.recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });
}

async function runMockTests() {
  console.log('🧪 开始门店管理功能模拟测试（使用模拟令牌）\n');
  
  try {
    // 运行所有测试
    await testStoreCRUD();
    await testStoreAssociations();
    await testPermissions();
    await testAppointmentFlow();
    await testScheduleRestrictions();
    
    // 生成测试报告
    await generateTestReport();
    
    console.log('\n🎉 门店管理功能模拟测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生异常:', error);
  }
}

// 运行测试
if (require.main === module) {
  runMockTests().catch(console.error);
}

module.exports = {
  runMockTests,
  testStoreCRUD,
  testStoreAssociations,
  testPermissions,
  testAppointmentFlow,
  testScheduleRestrictions,
  testResults
};