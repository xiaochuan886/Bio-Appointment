// 门店管理功能综合测试脚本
// 测试门店CRUD操作、权限控制、关联验证等功能

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// 测试配置
const API_BASE_URL = 'http://localhost:3001/api';
const TEST_REPORT_FILE = 'store-management-test-report.json';

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

// 测试用户令牌存储
let userTokens = {
  admin: null,
  sales: null,
  nurse_manager: null,
  doctor: null,
  nurse: null
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

// 工具函数：认证API调用
async function authenticatedApiCall(endpoint, token, options = {}) {
  return apiCall(endpoint, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });
}

// 工具函数：用户登录
async function login(username, password) {
  console.log(`\n🔐 登录用户: ${username}`);
  try {
    const result = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    
    if (result.success) {
      const token = result.data.accessToken || result.data.tokens?.accessToken;
      console.log(`✅ 登录成功: ${username}`);
      return token;
    } else {
      console.log(`❌ 登录失败: ${username} - ${result.data?.error || result.error}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ 登录异常: ${username} - ${error.message}`);
    return null;
  }
}

// 工具函数：创建测试门店
async function createTestStore(token, storeData) {
  const result = await authenticatedApiCall('/stores', token, {
    method: 'POST',
    body: JSON.stringify(storeData)
  });
  
  if (result.success) {
    testData.stores.push(result.data);
    return result.data;
  } else {
    throw new Error(`创建门店失败: ${result.data?.error || result.error}`);
  }
}

// 工具函数：创建测试用户
async function createTestUser(token, userData) {
  const result = await authenticatedApiCall('/profiles', token, {
    method: 'POST',
    body: JSON.stringify(userData)
  });
  
  if (result.success) {
    testData.users.push(result.data);
    return result.data;
  } else {
    throw new Error(`创建用户失败: ${result.data?.error || result.error}`);
  }
}

// 工具函数：创建测试预约
async function createTestAppointment(token, appointmentData) {
  const result = await authenticatedApiCall('/appointments', token, {
    method: 'POST',
    body: JSON.stringify(appointmentData)
  });
  
  if (result.success) {
    testData.appointments.push(result.data);
    return result.data;
  } else {
    throw new Error(`创建预约失败: ${result.data?.error || result.error}`);
  }
}

// ==================== 测试函数 ====================

// 1. 门店CRUD操作测试
async function testStoreCRUD() {
  console.log('\n🏪 开始门店CRUD操作测试');
  
  // 1.1 获取门店列表
  try {
    const result = await authenticatedApiCall('/stores', userTokens.admin);
    recordTest('crud', '获取门店列表', result.success, 
      result.success ? `获取到 ${result.data.length} 个门店` : `失败: ${result.data?.error}`);
  } catch (error) {
    recordTest('crud', '获取门店列表', false, `异常: ${error.message}`);
  }
  
  // 1.2 创建门店
  try {
    const storeData = {
      name: '测试门店-CRUD',
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
    
    const store = await createTestStore(userTokens.admin, storeData);
    recordTest('crud', '创建门店', true, `门店ID: ${store.id}, 名称: ${store.name}`);
  } catch (error) {
    recordTest('crud', '创建门店', false, error.message);
  }
  
  // 1.3 获取单个门店
  if (testData.stores.length > 0) {
    try {
      const storeId = testData.stores[testData.stores.length - 1].id;
      const result = await authenticatedApiCall(`/stores/${storeId}`, userTokens.admin);
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
        name: '更新后的测试门店',
        phone: '400-999-8888'
      };
      
      const result = await authenticatedApiCall(`/stores/${storeId}`, userTokens.admin, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      recordTest('crud', '更新门店', result.success, 
        result.success ? `更新成功: ${result.data.name}` : `失败: ${result.data?.error}`);
    } catch (error) {
      recordTest('crud', '更新门店', false, `异常: ${error.message}`);
    }
  }
  
  // 1.5 删除门店
  if (testData.stores.length > 0) {
    try {
      const storeId = testData.stores[testData.stores.length - 1].id;
      const result = await authenticatedApiCall(`/stores/${storeId}`, userTokens.admin, {
        method: 'DELETE'
      });
      
      recordTest('crud', '删除门店', result.success, 
        result.success ? '删除成功' : `失败: ${result.data?.error}`);
    } catch (error) {
      recordTest('crud', '删除门店', false, `异常: ${error.message}`);
    }
  }
}

// 2. 门店关联验证测试
async function testStoreAssociations() {
  console.log('\n🔗 开始门店关联验证测试');
  
  // 2.1 创建测试门店
  let testStore;
  try {
    const storeData = {
      name: '测试门店-关联验证',
      address: '关联测试地址',
      phone: '400-555-6666',
      contact_person: '李经理',
      status: 'active'
    };
    
    testStore = await createTestStore(userTokens.admin, storeData);
  } catch (error) {
    recordTest('associations', '创建测试门店', false, error.message);
    return;
  }
  
  // 2.2 创建关联用户
  try {
    const userData = {
      username: 'test_nurse_store',
      password: '123456',
      full_name: '测试护士-门店关联',
      role: 'nurse',
      store_id: testStore.id
    };
    
    const user = await createTestUser(userTokens.admin, userData);
    recordTest('associations', '创建门店关联用户', true, `用户ID: ${user.id}, 门店ID: ${user.store_id}`);
  } catch (error) {
    recordTest('associations', '创建门店关联用户', false, error.message);
  }
  
  // 2.3 获取门店资源
  try {
    const result = await authenticatedApiCall(`/stores/${testStore.id}/resources`, userTokens.admin);
    recordTest('associations', '获取门店资源', result.success, 
      result.success ? `获取到 ${result.data.length} 个资源` : `失败: ${result.data?.error}`);
  } catch (error) {
    recordTest('associations', '获取门店资源', false, `异常: ${error.message}`);
  }
  
  // 2.4 获取门店员工
  try {
    const result = await authenticatedApiCall(`/stores/${testStore.id}/staff`, userTokens.admin);
    recordTest('associations', '获取门店员工', result.success, 
      result.success ? `获取到 ${result.data.length} 个员工` : `失败: ${result.data?.error}`);
  } catch (error) {
    recordTest('associations', '获取门店员工', false, `异常: ${error.message}`);
  }
  
  // 2.5 创建带门店的预约
  try {
    const appointmentData = {
      customer_name: '测试客户-门店关联',
      customer_phone: '13800138000',
      service_id: '550e8400-e29b-41d4-a716-446655440005', // 使用健康检查服务ID
      requested_date: '2025-12-10',
      requested_time_start: '10:00:00',
      requested_time_end: '11:00:00',
      total_people: 1,
      estimated_duration: 60,
      is_urgent: false,
      notes: '门店关联测试预约',
      store_id: testStore.id
    };
    
    const appointment = await createTestAppointment(userTokens.sales, appointmentData);
    recordTest('associations', '创建门店关联预约', true, `预约ID: ${appointment.id}, 门店ID: ${appointment.store_id}`);
  } catch (error) {
    recordTest('associations', '创建门店关联预约', false, error.message);
  }
  
  // 2.6 按门店过滤预约
  try {
    const result = await authenticatedApiCall(`/appointments?store_id=${testStore.id}`, userTokens.admin);
    recordTest('associations', '按门店过滤预约', result.success, 
      result.success ? `获取到 ${result.data.length} 个预约` : `失败: ${result.data?.error}`);
  } catch (error) {
    recordTest('associations', '按门店过滤预约', false, `异常: ${error.message}`);
  }
}

// 3. 权限控制测试
async function testPermissions() {
  console.log('\n🔒 开始权限控制测试');
  
  // 3.1 创建测试门店
  let testStore;
  try {
    const storeData = {
      name: '测试门店-权限验证',
      address: '权限测试地址',
      phone: '400-777-8888',
      contact_person: '王经理',
      status: 'active'
    };
    
    testStore = await createTestStore(userTokens.admin, storeData);
  } catch (error) {
    recordTest('permissions', '创建权限测试门店', false, error.message);
    return;
  }
  
  // 3.2 管理员访问所有门店
  try {
    const result = await authenticatedApiCall('/stores', userTokens.admin);
    recordTest('permissions', '管理员访问所有门店', result.success, 
      result.success ? `获取到 ${result.data.length} 个门店` : `失败: ${result.data?.error}`);
  } catch (error) {
    recordTest('permissions', '管理员访问所有门店', false, `异常: ${error.message}`);
  }
  
  // 3.3 销售访问所有门店（创建预约需要）
  try {
    const result = await authenticatedApiCall('/stores', userTokens.sales);
    recordTest('permissions', '销售访问所有门店', result.success, 
      result.success ? `获取到 ${result.data.length} 个门店` : `失败: ${result.data?.error}`);
  } catch (error) {
    recordTest('permissions', '销售访问所有门店', false, `异常: ${error.message}`);
  }
  
  // 3.4 护士长访问所有门店（应该被限制）
  try {
    const result = await authenticatedApiCall('/stores', userTokens.nurse_manager);
    recordTest('permissions', '护士长访问所有门店', !result.success, 
      !result.success ? '正确限制访问' : `应该被限制但获取到 ${result.data.length} 个门店`);
  } catch (error) {
    recordTest('permissions', '护士长访问所有门店', true, `正确限制访问: ${error.message}`);
  }
  
  // 3.5 护士长只能管理自己门店的排班
  try {
    const result = await authenticatedApiCall(`/schedules?store_id=${testStore.id}`, userTokens.nurse_manager);
    recordTest('permissions', '护士长访问自己门店排班', result.success, 
      result.success ? `获取到 ${result.data.length} 个排班` : `失败: ${result.data?.error}`);
  } catch (error) {
    recordTest('permissions', '护士长访问自己门店排班', false, `异常: ${error.message}`);
  }
  
  // 3.6 非管理员用户创建门店（应该被拒绝）
  try {
    const storeData = {
      name: '未授权门店',
      address: '未授权地址',
      phone: '400-000-0000',
      contact_person: '未授权',
      status: 'active'
    };
    
    const result = await authenticatedApiCall('/stores', userTokens.sales, {
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
    const result = await authenticatedApiCall('/stores?status=active', userTokens.sales);
    recordTest('appointmentFlow', '销售获取活跃门店列表', result.success, 
      result.success ? `获取到 ${result.data.length} 个活跃门店` : `失败: ${result.data?.error}`);
  } catch (error) {
    recordTest('appointmentFlow', '销售获取活跃门店列表', false, `异常: ${error.message}`);
  }
  
  // 4.2 创建预约时选择门店
  if (testData.stores.length > 0) {
    try {
      const storeId = testData.stores[0].id;
      const appointmentData = {
        customer_name: '预约流程测试客户',
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
      
      const appointment = await createTestAppointment(userTokens.sales, appointmentData);
      recordTest('appointmentFlow', '创建预约时选择门店', true, `预约ID: ${appointment.id}, 门店ID: ${appointment.store_id}`);
    } catch (error) {
      recordTest('appointmentFlow', '创建预约时选择门店', false, error.message);
    }
  }
  
  // 4.3 验证预约包含门店信息
  if (testData.appointments.length > 0) {
    try {
      const appointmentId = testData.appointments[testData.appointments.length - 1].id;
      const result = await authenticatedApiCall(`/appointments/${appointmentId}`, userTokens.sales);
      
      const hasStoreInfo = result.success && result.data.store_id && result.data.store;
      recordTest('appointmentFlow', '验证预约包含门店信息', hasStoreInfo, 
        hasStoreInfo ? `门店名称: ${result.data.store?.name}` : '缺少门店信息');
    } catch (error) {
      recordTest('appointmentFlow', '验证预约包含门店信息', false, `异常: ${error.message}`);
    }
  }
  
  // 4.4 按门店过滤预约列表
  if (testData.stores.length > 0) {
    try {
      const storeId = testData.stores[0].id;
      const result = await authenticatedApiCall(`/appointments?store_id=${storeId}`, userTokens.sales);
      
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
  
  // 5.1 创建测试门店和用户
  let testStore, testNurse;
  try {
    const storeData = {
      name: '测试门店-排班限制',
      address: '排班限制测试地址',
      phone: '400-888-9999',
      contact_person: '赵经理',
      status: 'active'
    };
    
    testStore = await createTestStore(userTokens.admin, storeData);
    
    const userData = {
      username: 'test_nurse_schedule',
      password: '123456',
      full_name: '测试护士-排班限制',
      role: 'nurse',
      store_id: testStore.id
    };
    
    testNurse = await createTestUser(userTokens.admin, userData);
  } catch (error) {
    recordTest('scheduleRestrictions', '创建排班测试数据', false, error.message);
    return;
  }
  
  // 5.2 护士长查看自己门店的排班
  try {
    const result = await authenticatedApiCall(`/schedules?store_id=${testStore.id}`, userTokens.nurse_manager);
    recordTest('scheduleRestrictions', '护士长查看自己门店排班', result.success, 
      result.success ? `获取到 ${result.data.length} 个排班` : `失败: ${result.data?.error}`);
  } catch (error) {
    recordTest('scheduleRestrictions', '护士长查看自己门店排班', false, `异常: ${error.message}`);
  }
  
  // 5.3 护士长尝试查看其他门店排班（应该被限制）
  if (testData.stores.length > 1) {
    try {
      const otherStoreId = testData.stores.find(s => s.id !== testStore.id)?.id;
      if (otherStoreId) {
        const result = await authenticatedApiCall(`/schedules?store_id=${otherStoreId}`, userTokens.nurse_manager);
        recordTest('scheduleRestrictions', '护士长查看其他门店排班', !result.success, 
          !result.success ? '正确限制访问' : `应该被限制但获取到 ${result.data.length} 个排班`);
      }
    } catch (error) {
      recordTest('scheduleRestrictions', '护士长查看其他门店排班', true, `正确限制访问: ${error.message}`);
    }
  }
  
  // 5.4 创建排班时指定门店
  if (testData.appointments.length > 0) {
    try {
      const appointmentId = testData.appointments[testData.appointments.length - 1].id;
      const scheduleData = {
        appointment_id: appointmentId,
        scheduled_date: '2025-12-12',
        scheduled_time_start: '09:00:00',
        scheduled_time_end: '10:00:00',
        room_id: null,
        nurse_id: testNurse.id,
        notes: '排班门店范围限制测试'
      };
      
      const result = await authenticatedApiCall('/schedules', userTokens.nurse_manager, {
        method: 'POST',
        body: JSON.stringify(scheduleData)
      });
      
      recordTest('scheduleRestrictions', '创建排班时指定门店', result.success, 
        result.success ? `排班ID: ${result.data.id}` : `失败: ${result.data?.error}`);
    } catch (error) {
      recordTest('scheduleRestrictions', '创建排班时指定门店', false, `异常: ${error.message}`);
    }
  }
  
  // 5.5 验证排班包含门店信息
  try {
    const result = await authenticatedApiCall(`/schedules?store_id=${testStore.id}`, userTokens.admin);
    const allHaveStoreId = result.success && result.data.every(sch => 
      sch.appointment?.store_id === testStore.id || sch.store_id === testStore.id
    );
    
    recordTest('scheduleRestrictions', '验证排班包含门店信息', allHaveStoreId, 
      allHaveStoreId ? `所有排班都属于指定门店` : `排班门店信息不正确`);
  } catch (error) {
    recordTest('scheduleRestrictions', '验证排班包含门店信息', false, `异常: ${error.message}`);
  }
}

// ==================== 主测试函数 ====================

async function initializeTestUsers() {
  console.log('🚀 初始化测试用户...');
  
  // 登录测试用户
  userTokens.admin = await login('admin@test.com', 'admin123');
  userTokens.sales = await login('sales', '123456');
  userTokens.nurse_manager = await login('nurse_manager', '123456');
  userTokens.doctor = await login('doctor', '123456');
  userTokens.nurse = await login('nurse', '123456');
  
  // 检查关键用户是否登录成功
  if (!userTokens.admin || !userTokens.sales || !userTokens.nurse_manager) {
    console.error('❌ 关键测试用户登录失败，测试无法继续');
    return false;
  }
  
  console.log('✅ 测试用户初始化完成');
  return true;
}

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

async function runComprehensiveTests() {
  console.log('🧪 开始门店管理功能综合测试\n');
  
  // 初始化测试用户
  const usersInitialized = await initializeTestUsers();
  if (!usersInitialized) {
    return;
  }
  
  try {
    // 运行所有测试
    await testStoreCRUD();
    await testStoreAssociations();
    await testPermissions();
    await testAppointmentFlow();
    await testScheduleRestrictions();
    
    // 生成测试报告
    await generateTestReport();
    
    console.log('\n🎉 门店管理功能综合测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生异常:', error);
  }
}

// 运行测试
if (require.main === module) {
  runComprehensiveTests().catch(console.error);
}

module.exports = {
  runComprehensiveTests,
  testStoreCRUD,
  testStoreAssociations,
  testPermissions,
  testAppointmentFlow,
  testScheduleRestrictions,
  testResults
};