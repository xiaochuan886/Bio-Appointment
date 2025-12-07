const fetch = require('node-fetch');

// 配置
const BASE_URL = 'http://localhost:3001';
let authToken = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3MzQ1MDAwMDAsImV4cCI6MTczNDU4NjQwMH0.signature';

// 测试函数
async function testAPI(method, endpoint, data = null, headers = {}) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        ...headers
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    console.log(`\n🔍 测试 ${method} ${endpoint}`);
    if (data) console.log(`   数据: ${JSON.stringify(data)}`);

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const responseData = await response.json();

    console.log(`   状态: ${response.status}`);
    console.log(`   响应: ${JSON.stringify(responseData, null, 2)}`);

    return { success: response.ok, data: responseData, status: response.status };
  } catch (error) {
    console.error(`   错误: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试门店管理API...\n');

  // 1. 测试获取门店列表
  console.log('=== 1. 获取门店列表 ===');
  await testAPI('GET', '/api/stores');

  // 2. 测试创建门店
  console.log('\n=== 2. 创建门店 ===');
  const createStoreResult = await testAPI('POST', '/api/stores', {
    name: '测试门店',
    address: '测试地址123号',
    phone: '400-123-4567',
    contact_person: '张经理',
    status: 'active',
    description: '这是一个测试门店',
    business_hours: {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' }
    }
  });

  let storeId = null;
  if (createStoreResult.success && createStoreResult.data.id) {
    storeId = createStoreResult.data.id;
    console.log(`   ✅ 门店创建成功，ID: ${storeId}`);
  } else {
    console.log('   ❌ 门店创建失败');
    return;
  }

  // 3. 测试获取单个门店
  console.log('\n=== 3. 获取单个门店 ===');
  await testAPI('GET', `/api/stores/${storeId}`);

  // 4. 测试更新门店
  console.log('\n=== 4. 更新门店 ===');
  await testAPI('PUT', `/api/stores/${storeId}`, {
    name: '更新后的测试门店',
    phone: '400-999-8888'
  });

  // 5. 测试获取门店资源
  console.log('\n=== 5. 获取门店资源 ===');
  await testAPI('GET', `/api/stores/${storeId}/resources`);

  // 6. 测试获取门店员工
  console.log('\n=== 6. 获取门店员工 ===');
  await testAPI('GET', `/api/stores/${storeId}/staff`);

  // 7. 测试带门店过滤的预约查询
  console.log('\n=== 7. 带门店过滤的预约查询 ===');
  await testAPI('GET', `/api/appointments?store_id=${storeId}`);

  // 8. 测试带门店过滤的资源查询
  console.log('\n=== 8. 带门店过滤的资源查询 ===');
  await testAPI('GET', `/api/resources?store_id=${storeId}`);

  // 9. 测试带门店过滤的用户查询
  console.log('\n=== 9. 带门店过滤的用户查询 ===');
  await testAPI('GET', `/api/profiles?store_id=${storeId}`);

  // 10. 测试创建带门店的预约
  console.log('\n=== 10. 创建带门店的预约 ===');
  const appointmentResult = await testAPI('POST', '/api/appointments', {
    customer_name: '测试客户',
    customer_phone: '13800138000',
    service_id: '550e8400-e29b-41d4-a716-446655440005', // 使用数据库中实际存在的服务ID
    requested_date: '2025-12-10',
    requested_time_start: '10:00',
    requested_time_end: '11:00',
    notes: '测试预约',
    total_people: 1,
    estimated_duration: 60,
    is_urgent: false,
    store_id: storeId
  });

  // 11. 测试权限控制 - 使用非管理员token
  console.log('\n=== 11. 测试权限控制 ===');
  const nurseToken = 'mock.eyJ1c2VySWQiOiJudXJzZS1pZCIsImVtYWlsIjoibnVyc2VAdGVzdC5jb20iLCJyb2xlIjoibnVyc2UiLCJpYXQiOjE3MzQ1MDAwMDAsImV4cCI6MTczNDU4NjQwMH0.signature';
  
  // 尝试访问其他门店数据（应该失败）
  await testAPI('GET', '/api/stores', null, {
    'Authorization': `Bearer ${nurseToken}`
  });

  // 12. 测试删除门店（如果有依赖数据应该失败）
  console.log('\n=== 12. 测试删除门店 ===');
  await testAPI('DELETE', `/api/stores/${storeId}`);

  console.log('\n🏁 API测试完成！');
}

// 运行测试
runTests().catch(console.error);