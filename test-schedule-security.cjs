const fetch = require('node-fetch');

// API基础URL
const API_BASE = 'http://localhost:3001';

// 测试用户令牌（模拟不同角色的用户）
const TOKENS = {
  super_admin: 'Bearer mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3MzQ1NjAwMDAsImV4cCI6MTczNDY0NjQwMH0.signature',
  head_nurse: 'Bearer mock.eyJ1c2VySWQiOiJoZWFkLW51cnNlLWlkIiwiZW1haWwiOiJoZWFkbnVyc2VAdGVzdC5jb20iLCJyb2xlIjoiaGVhZF9udXJzZSIsImlhdCI6MTczNDU2MDAwMCwiZXhwIjoxNzM0NjQ2NDAwfQ.signature',
  nurse: 'Bearer mock.eyJ1c2VySWQiOiJudXJzZS1pZCIsImVtYWlsIjoibnVyc2VAdGVzdC5jb20iLCJyb2xlIjoibnVyc2UiLCJpYXQiOjE3MzQ1NjAwMDAsImV4cCI6MTczNDY0NjQwMH0.signature',
  invalid: 'Bearer invalid.token'
};

// 测试用的UUID格式
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const INVALID_UUID = 'invalid-uuid-format';

// 测试用的日期格式
const VALID_DATE = '2024-01-15';
const INVALID_DATE = '2024/01/15';

// 测试用的时间格式
const VALID_TIME = '10:00:00';
const INVALID_TIME = '10:00 AM';

// 测试函数
async function testAPI(method, endpoint, data = null, token = null, expectedStatus = 200) {
  try {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers.Authorization = token;
    }

    if (data) {
      options.body = JSON.stringify(data);
    }

    console.log(`\n🔍 测试 ${method} ${endpoint}`);
    if (token) {
      console.log(`   令牌: ${token.includes('super_admin') ? '超级管理员' : token.includes('head_nurse') ? '护士长' : token.includes('nurse') ? '护士' : '无效'}`);
    }
    if (data) {
      console.log(`   数据: ${JSON.stringify(data, null, 2)}`);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const responseData = await response.json();

    console.log(`   状态码: ${response.status}`);
    console.log(`   响应: ${JSON.stringify(responseData, null, 2)}`);

    if (response.status === expectedStatus) {
      console.log(`   ✅ 测试通过 (期望状态码: ${expectedStatus})`);
    } else {
      console.log(`   ❌ 测试失败 (期望状态码: ${expectedStatus}, 实际: ${response.status})`);
    }

    return { status: response.status, data: responseData };
  } catch (error) {
    console.error(`   ❌ 请求失败: ${error.message}`);
    return { status: 0, error: error.message };
  }
}

// 运行测试
async function runTests() {
  console.log('🚀 开始测试排班API安全性...\n');

  // 1. 测试GET /api/schedules - 无身份验证
  console.log('\n📋 1. 测试GET /api/schedules - 无身份验证');
  await testAPI('GET', '/api/schedules');

  // 2. 测试GET /api/schedules - 有效身份验证
  console.log('\n📋 2. 测试GET /api/schedules - 有效身份验证');
  await testAPI('GET', '/api/schedules', null, TOKENS.super_admin, 200);

  // 3. 测试GET /api/schedules - 无效UUID参数
  console.log('\n📋 3. 测试GET /api/schedules - 无效UUID参数');
  await testAPI('GET', `/api/schedules?nurse_id=${INVALID_UUID}`, null, TOKENS.super_admin, 400);

  // 4. 测试GET /api/schedules - 无效日期参数
  console.log('\n📋 4. 测试GET /api/schedules - 无效日期参数');
  await testAPI('GET', `/api/schedules?date=${INVALID_DATE}`, null, TOKENS.super_admin, 400);

  // 5. 测试POST /api/schedules - 无身份验证
  console.log('\n📋 5. 测试POST /api/schedules - 无身份验证');
  await testAPI('POST', '/api/schedules', {
    appointment_id: VALID_UUID,
    scheduled_date: VALID_DATE,
    scheduled_time_start: VALID_TIME,
    scheduled_time_end: VALID_TIME
  }, null, 401);

  // 6. 测试POST /api/schedules - 护士权限（应该被拒绝）
  console.log('\n📋 6. 测试POST /api/schedules - 护士权限（应该被拒绝）');
  await testAPI('POST', '/api/schedules', {
    appointment_id: VALID_UUID,
    scheduled_date: VALID_DATE,
    scheduled_time_start: VALID_TIME,
    scheduled_time_end: VALID_TIME
  }, TOKENS.nurse, 403);

  // 7. 测试POST /api/schedules - 护士长权限（应该成功）
  console.log('\n📋 7. 测试POST /api/schedules - 护士长权限（应该成功）');
  await testAPI('POST', '/api/schedules', {
    appointment_id: VALID_UUID,
    scheduled_date: VALID_DATE,
    scheduled_time_start: VALID_TIME,
    scheduled_time_end: VALID_TIME
  }, TOKENS.head_nurse, 201); // 可能是404因为预约不存在，但权限检查应该通过

  // 8. 测试POST /api/schedules - 无效UUID格式
  console.log('\n📋 8. 测试POST /api/schedules - 无效UUID格式');
  await testAPI('POST', '/api/schedules', {
    appointment_id: INVALID_UUID,
    scheduled_date: VALID_DATE,
    scheduled_time_start: VALID_TIME,
    scheduled_time_end: VALID_TIME
  }, TOKENS.super_admin, 400);

  // 9. 测试POST /api/schedules - 无效日期格式
  console.log('\n📋 9. 测试POST /api/schedules - 无效日期格式');
  await testAPI('POST', '/api/schedules', {
    appointment_id: VALID_UUID,
    scheduled_date: INVALID_DATE,
    scheduled_time_start: VALID_TIME,
    scheduled_time_end: VALID_TIME
  }, TOKENS.super_admin, 400);

  // 10. 测试PUT /api/schedules/:id - 无身份验证
  console.log('\n📋 10. 测试PUT /api/schedules/:id - 无身份验证');
  await testAPI('PUT', `/api/schedules/${VALID_UUID}`, {
    notes: '更新的备注'
  }, null, 401);

  // 11. 测试PUT /api/schedules/:id - 无效UUID格式
  console.log('\n📋 11. 测试PUT /api/schedules/:id - 无效UUID格式');
  await testAPI('PUT', `/api/schedules/${INVALID_UUID}`, {
    notes: '更新的备注'
  }, TOKENS.super_admin, 400);

  // 12. 测试DELETE /api/schedules/:id - 无身份验证
  console.log('\n📋 12. 测试DELETE /api/schedules/:id - 无身份验证');
  await testAPI('DELETE', `/api/schedules/${VALID_UUID}`, null, null, 401);

  // 13. 测试DELETE /api/schedules/:id - 护士权限（应该被拒绝）
  console.log('\n📋 13. 测试DELETE /api/schedules/:id - 护士权限（应该被拒绝）');
  await testAPI('DELETE', `/api/schedules/${VALID_UUID}`, null, TOKENS.nurse, 403);

  // 14. 测试DELETE /api/schedules/:id - 护士长权限（应该成功或404）'
  console.log('\n📋 14. 测试DELETE /api/schedules/:id - 护士长权限（应该成功或404）');
  await testAPI('DELETE', `/api/schedules/${VALID_UUID}`, null, TOKENS.head_nurse, 200); // 可能是404因为排班不存在，但权限检查应该通过

  console.log('\n✅ 测试完成！');
}

// 运行测试
runTests().catch(error => {
  console.error('❌ 测试运行失败:', error);
});