const fs = require('fs');
const path = require('path');

// 测试配置
const API_BASE_URL = 'http://localhost:3001/api';
const TEST_RESULTS_FILE = 'dashboard-test-results.json';

// 测试结果记录
let testResults = {
  timestamp: new Date().toISOString(),
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  },
  tests: []
};

// 辅助函数：记录测试结果
function recordTest(testName, passed, details = '', error = null) {
  const result = {
    name: testName,
    passed,
    details,
    error: error ? error.message : null,
    timestamp: new Date().toISOString()
  };
  
  testResults.tests.push(result);
  testResults.summary.total++;
  if (passed) {
    testResults.summary.passed++;
  } else {
    testResults.summary.failed++;
    testResults.summary.errors.push({
      test: testName,
      error: error ? error.message : 'Test failed'
    });
  }
  
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${testName}`);
  if (details) console.log(`    ${details}`);
  if (error) console.log(`    Error: ${error.message}`);
}

// 辅助函数：发送API请求
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

// 测试1：验证API服务器连接
async function testApiConnection() {
  try {
    const response = await apiCall('/dashboard/stats');
    recordTest(
      'API服务器连接',
      true,
      `成功连接到API服务器，返回数据类型: ${typeof response}`
    );
    return true;
  } catch (error) {
    recordTest('API服务器连接', false, '无法连接到API服务器', error);
    return false;
  }
}

// 测试2：验证工作台统计数据API
async function testDashboardStats() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const stats = await apiCall(`/dashboard/stats?date=${today}`);
    
    const hasRequiredFields = stats && 
      typeof stats === 'object' && 
      stats.appointments && 
      stats.schedules;
    
    recordTest(
      '工作台统计数据API',
      hasRequiredFields,
      hasRequiredFields 
        ? `返回完整统计数据: 预约数=${stats.appointments.total || 0}, 排班数=${stats.schedules.today_schedules || 0}`
        : '返回数据结构不完整'
    );
    
    return hasRequiredFields;
  } catch (error) {
    recordTest('工作台统计数据API', false, '获取统计数据失败', error);
    return false;
  }
}

// 测试3：验证门店数据API
async function testStoresData() {
  try {
    const stores = await apiCall('/stores');
    const isArray = Array.isArray(stores.stores || stores);
    const hasData = isArray && (stores.stores || stores).length > 0;
    
    recordTest(
      '门店数据API',
      hasData,
      hasData 
        ? `成功获取 ${(stores.stores || stores).length} 个门店数据`
        : '未获取到门店数据或数据格式错误'
    );
    
    return hasData;
  } catch (error) {
    recordTest('门店数据API', false, '获取门店数据失败', error);
    return false;
  }
}

// 测试4：验证排班数据API
async function testSchedulesData() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const schedules = await apiCall(`/schedules?date=${today}`);
    const isArray = Array.isArray(schedules);
    
    recordTest(
      '排班数据API',
      isArray,
      isArray 
        ? `成功获取 ${schedules.length} 条排班数据`
        : '排班数据格式错误'
    );
    
    return isArray;
  } catch (error) {
    recordTest('排班数据API', false, '获取排班数据失败', error);
    return false;
  }
}

// 测试5：验证护士资源API
async function testNursesData() {
  try {
    const nurses = await apiCall('/profiles/nurses/available');
    const isArray = Array.isArray(nurses);
    const hasData = isArray && nurses.length > 0;
    
    recordTest(
      '护士资源API',
      hasData,
      hasData 
        ? `成功获取 ${nurses.length} 个可用护士数据`
        : '未获取到护士数据'
    );
    
    return hasData;
  } catch (error) {
    recordTest('护士资源API', false, '获取护士数据失败', error);
    return false;
  }
}

// 测试6：验证房间资源API
async function testRoomsData() {
  try {
    const rooms = await apiCall('/resources/rooms/available');
    const isArray = Array.isArray(rooms);
    const hasData = isArray && rooms.length > 0;
    
    recordTest(
      '房间资源API',
      hasData,
      hasData 
        ? `成功获取 ${rooms.length} 个可用房间数据`
        : '未获取到房间数据'
    );
    
    return hasData;
  } catch (error) {
    recordTest('房间资源API', false, '获取房间数据失败', error);
    return false;
  }
}

// 测试7：验证医生资料API
async function testProfilesData() {
  try {
    const profiles = await apiCall('/profiles');
    const isArray = Array.isArray(profiles);
    const hasDoctors = isArray && profiles.some(p => p.role === 'doctor');
    
    recordTest(
      '医生资料API',
      hasDoctors,
      hasDoctors 
        ? `成功获取 ${profiles.length} 个用户资料，包含医生数据`
        : '未获取到医生资料'
    );
    
    return hasDoctors;
  } catch (error) {
    recordTest('医生资料API', false, '获取医生资料失败', error);
    return false;
  }
}

// 测试8：验证任务执行API
async function testTaskExecutionsData() {
  try {
    const tasks = await apiCall('/task-executions?status=in_progress');
    const isArray = Array.isArray(tasks);
    
    recordTest(
      '任务执行API',
      isArray,
      isArray 
        ? `成功获取 ${tasks.length} 个进行中任务`
        : '任务数据格式错误'
    );
    
    return isArray;
  } catch (error) {
    recordTest('任务执行API', false, '获取任务数据失败', error);
    return false;
  }
}

// 测试9：验证数据一致性
async function testDataConsistency() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [stats, schedules] = await Promise.all([
      apiCall(`/dashboard/stats?date=${today}`),
      apiCall(`/schedules?date=${today}`)
    ]);
    
    const statsCount = parseInt(stats.schedules.today_schedules) || 0;
    const schedulesCount = schedules.length;
    const isConsistent = Math.abs(statsCount - schedulesCount) <= 1; // 允许1个误差
    
    recordTest(
      '数据一致性检查',
      isConsistent,
      isConsistent 
        ? `统计数据(${statsCount})与实际排班数据(${schedulesCount})一致`
        : `数据不一致: 统计=${statsCount}, 实际=${schedulesCount}`
    );
    
    return isConsistent;
  } catch (error) {
    recordTest('数据一致性检查', false, '数据一致性检查失败', error);
    return false;
  }
}

// 测试10：验证API响应时间
async function testApiResponseTime() {
  try {
    const startTime = Date.now();
    await apiCall('/dashboard/stats');
    const responseTime = Date.now() - startTime;
    const isAcceptable = responseTime < 2000; // 2秒内响应
    
    recordTest(
      'API响应时间',
      isAcceptable,
      `响应时间: ${responseTime}ms (${isAcceptable ? '可接受' : '过慢'})`
    );
    
    return isAcceptable;
  } catch (error) {
    recordTest('API响应时间', false, 'API响应时间测试失败', error);
    return false;
  }
}

// 主测试函数
async function runDashboardTests() {
  console.log('🚀 开始工作台功能测试...\n');
  
  // 运行所有测试
  await testApiConnection();
  await testDashboardStats();
  await testStoresData();
  await testSchedulesData();
  await testNursesData();
  await testRoomsData();
  await testProfilesData();
  await testTaskExecutionsData();
  await testDataConsistency();
  await testApiResponseTime();
  
  // 保存测试结果
  fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(testResults, null, 2));
  
  // 输出测试总结
  console.log('\n📊 测试总结:');
  console.log(`总测试数: ${testResults.summary.total}`);
  console.log(`通过: ${testResults.summary.passed}`);
  console.log(`失败: ${testResults.summary.failed}`);
  console.log(`成功率: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);
  
  if (testResults.summary.failed > 0) {
    console.log('\n❌ 失败的测试:');
    testResults.summary.errors.forEach(error => {
      console.log(`  - ${error.test}: ${error.error}`);
    });
  }
  
  console.log(`\n📄 详细测试结果已保存到: ${TEST_RESULTS_FILE}`);
  
  return testResults.summary.failed === 0;
}

// 运行测试
runDashboardTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});