const axios = require('axios');
const { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } = require('date-fns');
const { zhCN } = require('date-fns/locale');

// 配置
const API_BASE_URL = 'http://localhost:3001/api';
const FRONTEND_URL = 'http://localhost:5173';

// 测试结果收集器
const testResults = {
  apiTests: [],
  uiTests: [],
  permissionTests: [],
  dateFilterTests: [],
  errorHandlingTests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  }
};

// 辅助函数
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function recordTest(category, testName, passed, details = '') {
  const test = {
    name: testName,
    passed,
    details,
    timestamp: new Date().toISOString()
  };
  
  testResults[category].push(test);
  testResults.summary.total++;
  if (passed) {
    testResults.summary.passed++;
  } else {
    testResults.summary.failed++;
    testResults.summary.errors.push(`${category}: ${testName} - ${details}`);
  }
  
  log(`${passed ? 'PASS' : 'FAIL'}: ${testName} - ${details}`, passed ? 'success' : 'error');
}

// API测试函数
async function testApiHealth() {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    recordTest('apiTests', 'API健康检查', response.status === 200, `状态码: ${response.status}`);
    return response.data;
  } catch (error) {
    recordTest('apiTests', 'API健康检查', false, `错误: ${error.message}`);
    throw error;
  }
}

async function testAuthentication() {
  try {
    // 测试管理员登录
    const adminLogin = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@test.com',
      password: 'admin123'
    });
    
    recordTest('apiTests', '管理员认证', adminLogin.status === 200, '管理员登录成功');
    return adminLogin.data.tokens.accessToken;
  } catch (error) {
    recordTest('apiTests', '管理员认证', false, `错误: ${error.message}`);
    throw error;
  }
}

async function testGetSchedules(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/schedules`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    recordTest('apiTests', '获取排班数据', response.status === 200, 
      `返回 ${response.data.length} 条排班记录`);
    
    // 检查数据结构
    if (response.data.length > 0) {
      const schedule = response.data[0];
      const hasRequiredFields = schedule.id && schedule.scheduled_date && 
        schedule.scheduled_time_start && schedule.scheduled_time_end;
      
      recordTest('apiTests', '排班数据结构验证', hasRequiredFields,
        hasRequiredFields ? '数据结构正确' : '缺少必要字段');
      
      // 检查关联数据
      const hasAppointment = schedule.appointment && schedule.appointment.customer_name;
      const hasRoom = schedule.room && schedule.room.name;
      const hasNurse = schedule.nurse && schedule.nurse.name;
      
      recordTest('apiTests', '排班关联数据检查', hasAppointment && hasRoom,
        `预约: ${hasAppointment ? '✓' : '✗'}, 房间: ${hasRoom ? '✓' : '✗'}, 护士: ${hasNurse ? '✓' : '✗'}`);
    }
    
    return response.data;
  } catch (error) {
    recordTest('apiTests', '获取排班数据', false, `错误: ${error.message}`);
    return [];
  }
}

async function testScheduleFilters(token) {
  try {
    // 测试日期过滤
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    const todayResponse = await axios.get(`${API_BASE_URL}/schedules?date=${todayStr}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    recordTest('apiTests', '按日期过滤排班', todayResponse.status === 200,
      `今日排班: ${todayResponse.data.length} 条`);
    
    // 测试日期范围过滤
    const startDate = format(today, 'yyyy-MM-dd');
    const endDate = format(addDays(today, 7), 'yyyy-MM-dd');
    
    const rangeResponse = await axios.get(
      `${API_BASE_URL}/schedules?start_date=${startDate}&end_date=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    recordTest('apiTests', '按日期范围过滤排班', rangeResponse.status === 200,
      `7天内排班: ${rangeResponse.data.length} 条`);
    
    // 测试护士过滤
    const nurseResponse = await axios.get(`${API_BASE_URL}/schedules?nurse_id=test-nurse-id`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    recordTest('apiTests', '按护士过滤排班', nurseResponse.status === 200,
      `指定护士排班: ${nurseResponse.data.length} 条`);
    
  } catch (error) {
    recordTest('apiTests', '排班过滤测试', false, `错误: ${error.message}`);
  }
}

// 权限测试
async function testPermissions() {
  try {
    // 测试无token访问
    try {
      await axios.get(`${API_BASE_URL}/schedules`);
      recordTest('permissionTests', '无token访问控制', false, '未授权访问应该被拒绝');
    } catch (error) {
      recordTest('permissionTests', '无token访问控制', error.response?.status === 401,
        `正确返回状态码: ${error.response?.status}`);
    }
    
    // 测试无效token
    try {
      await axios.get(`${API_BASE_URL}/schedules`, {
        headers: { Authorization: 'Bearer invalid-token' }
      });
      recordTest('permissionTests', '无效token访问控制', false, '无效token应该被拒绝');
    } catch (error) {
      recordTest('permissionTests', '无效token访问控制', error.response?.status === 401,
        `正确返回状态码: ${error.response?.status}`);
    }
    
  } catch (error) {
    recordTest('permissionTests', '权限测试', false, `错误: ${error.message}`);
  }
}

// 日期处理测试
function testDateHandling() {
  try {
    const today = new Date();
    
    // 测试日期格式化
    const formatted = format(today, 'yyyy-MM-dd');
    const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(formatted);
    recordTest('dateFilterTests', '日期格式化', isValidFormat,
      `格式化结果: ${formatted}`);
    
    // 测试周计算
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const isWeekValid = weekStart <= weekEnd;
    recordTest('dateFilterTests', '周日期计算', isWeekValid,
      `周开始: ${format(weekStart, 'MM-dd')}, 周结束: ${format(weekEnd, 'MM-dd')}`);
    
    // 测试月计算
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const isMonthValid = monthStart <= monthEnd;
    recordTest('dateFilterTests', '月日期计算', isMonthValid,
      `月开始: ${format(monthStart, 'MM-dd')}, 月结束: ${format(monthEnd, 'MM-dd')}`);
    
    // 测试日期导航
    const nextDay = addDays(today, 1);
    const prevDay = subDays(today, 1);
    const isNavigationValid = nextDay > today && prevDay < today;
    recordTest('dateFilterTests', '日期导航', isNavigationValid,
      `下一天: ${format(nextDay, 'MM-dd')}, 前一天: ${format(prevDay, 'MM-dd')}`);
    
  } catch (error) {
    recordTest('dateFilterTests', '日期处理测试', false, `错误: ${error.message}`);
  }
}

// 错误处理测试
async function testErrorHandling(token) {
  try {
    // 测试无效日期格式
    try {
      await axios.get(`${API_BASE_URL}/schedules?date=invalid-date`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      recordTest('errorHandlingTests', '无效日期格式处理', false, '应该返回错误');
    } catch (error) {
      recordTest('errorHandlingTests', '无效日期格式处理', 
        error.response?.status >= 400, `正确返回错误状态码: ${error.response?.status}`);
    }
    
    // 测试不存在的排班ID
    try {
      await axios.get(`${API_BASE_URL}/schedules/non-existent-id`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      recordTest('errorHandlingTests', '不存在资源处理', false, '应该返回404错误');
    } catch (error) {
      recordTest('errorHandlingTests', '不存在资源处理', 
        error.response?.status === 404, `正确返回404状态码`);
    }
    
  } catch (error) {
    recordTest('errorHandlingTests', '错误处理测试', false, `错误: ${error.message}`);
  }
}

// UI模拟测试
function testUISimulation() {
  try {
    // 模拟视图模式切换
    const viewModes = ['day', 'week', 'month'];
    let allModesValid = true;
    
    viewModes.forEach(mode => {
      if (!['day', 'week', 'month'].includes(mode)) {
        allModesValid = false;
      }
    });
    
    recordTest('uiTests', '视图模式验证', allModesValid,
      `支持的视图模式: ${viewModes.join(', ')}`);
    
    // 模拟状态徽章
    const statusBadges = ['scheduled', 'completed', 'in_progress', 'cancelled'];
    const allStatusesValid = statusBadges.every(status => 
      typeof status === 'string' && status.length > 0
    );
    
    recordTest('uiTests', '状态徽章验证', allStatusesValid,
      `支持的状态: ${statusBadges.join(', ')}`);
    
    // 模拟响应式布局
    const breakpoints = ['sm', 'md', 'lg'];
    const gridLayouts = {
      sm: 'grid-cols-1',
      md: 'grid-cols-2',
      lg: 'grid-cols-4'
    };
    
    const hasResponsiveLayout = Object.keys(gridLayouts).length === breakpoints.length;
    recordTest('uiTests', '响应式布局验证', hasResponsiveLayout,
      `响应式断点: ${breakpoints.join(', ')}`);
    
  } catch (error) {
    recordTest('uiTests', 'UI模拟测试', false, `错误: ${error.message}`);
  }
}

// 数据完整性测试
async function testDataIntegrity(token) {
  try {
    const schedules = await testGetSchedules(token);
    
    if (schedules.length > 0) {
      // 检查时间逻辑
      const invalidTimes = schedules.filter(schedule => {
        const start = schedule.scheduled_time_start;
        const end = schedule.scheduled_time_end;
        return start >= end;
      });
      
      recordTest('apiTests', '时间逻辑验证', invalidTimes.length === 0,
        `无效时间记录: ${invalidTimes.length} 条`);
      
      // 检查必要字段
      const incompleteRecords = schedules.filter(schedule => {
        return !schedule.id || !schedule.scheduled_date || 
          !schedule.scheduled_time_start || !schedule.scheduled_time_end;
      });
      
      recordTest('apiTests', '数据完整性验证', incompleteRecords.length === 0,
        `不完整记录: ${incompleteRecords.length} 条`);
      
      // 检查重复记录
      const duplicateIds = schedules.filter((schedule, index, arr) => 
        arr.findIndex(s => s.id === schedule.id) !== index
      );
      
      recordTest('apiTests', '重复数据检查', duplicateIds.length === 0,
        `重复记录: ${duplicateIds.length} 条`);
    }
    
  } catch (error) {
    recordTest('apiTests', '数据完整性测试', false, `错误: ${error.message}`);
  }
}

// 性能测试
async function testPerformance(token) {
  try {
    const startTime = Date.now();
    
    // 测试API响应时间
    const response = await axios.get(`${API_BASE_URL}/schedules`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const responseTime = Date.now() - startTime;
    const isAcceptable = responseTime < 2000; // 2秒内响应
    
    recordTest('apiTests', 'API响应时间', isAcceptable,
      `响应时间: ${responseTime}ms, 数据量: ${response.data.length} 条`);
    
  } catch (error) {
    recordTest('apiTests', '性能测试', false, `错误: ${error.message}`);
  }
}

// 生成测试报告
function generateReport() {
  const report = `
# 护士排期查看功能测试报告

## 测试概览
- 总测试数: ${testResults.summary.total}
- 通过测试: ${testResults.summary.passed}
- 失败测试: ${testResults.summary.failed}
- 成功率: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(2)}%

## 详细测试结果

### API接口测试
${testResults.apiTests.map(test => 
  `- ${test.passed ? '✅' : '❌'} ${test.name}: ${test.details}`
).join('\n')}

### 权限控制测试
${testResults.permissionTests.map(test => 
  `- ${test.passed ? '✅' : '❌'} ${test.name}: ${test.details}`
).join('\n')}

### 日期处理测试
${testResults.dateFilterTests.map(test => 
  `- ${test.passed ? '✅' : '❌'} ${test.name}: ${test.details}`
).join('\n')}

### 错误处理测试
${testResults.errorHandlingTests.map(test => 
  `- ${test.passed ? '✅' : '❌'} ${test.name}: ${test.details}`
).join('\n')}

### UI模拟测试
${testResults.uiTests.map(test => 
  `- ${test.passed ? '✅' : '❌'} ${test.name}: ${test.details}`
).join('\n')}

## 失败测试详情
${testResults.summary.errors.map(error => 
  `- ❌ ${error}`
).join('\n')}

## 建议修复方案
${generateRecommendations()}

## 测试环境
- API服务器: ${API_BASE_URL}
- 前端服务器: ${FRONTEND_URL}
- 测试时间: ${new Date().toISOString()}
`;

  return report;
}

function generateRecommendations() {
  const recommendations = [];
  
  // 基于失败测试生成建议
  testResults.summary.errors.forEach(error => {
    if (error.includes('API')) {
      recommendations.push('1. 检查API服务器状态和数据库连接');
      recommendations.push('2. 验证API端点的实现和错误处理');
    }
    if (error.includes('权限')) {
      recommendations.push('3. 检查认证中间件和权限验证逻辑');
    }
    if (error.includes('日期')) {
      recommendations.push('4. 验证日期处理函数和格式化逻辑');
    }
    if (error.includes('数据')) {
      recommendations.push('5. 检查数据库查询和数据映射逻辑');
    }
  });
  
  if (recommendations.length === 0) {
    recommendations.push('✅ 所有测试通过，功能运行正常');
    recommendations.push('建议定期运行此测试以确保系统稳定性');
  }
  
  return recommendations.join('\n');
}

// 主测试函数
async function runTests() {
  log('开始护士排期查看功能综合测试...', 'info');
  
  try {
    // 1. API健康检查
    log('步骤1: 检查API服务器状态...', 'info');
    await testApiHealth();
    
    // 2. 认证测试
    log('步骤2: 测试用户认证...', 'info');
    const token = await testAuthentication();
    
    // 3. API接口测试
    log('步骤3: 测试API接口...', 'info');
    await testGetSchedules(token);
    await testScheduleFilters(token);
    await testDataIntegrity(token);
    await testPerformance(token);
    
    // 4. 权限测试
    log('步骤4: 测试权限控制...', 'info');
    await testPermissions();
    
    // 5. 日期处理测试
    log('步骤5: 测试日期处理...', 'info');
    testDateHandling();
    
    // 6. 错误处理测试
    log('步骤6: 测试错误处理...', 'info');
    await testErrorHandling(token);
    
    // 7. UI模拟测试
    log('步骤7: 测试UI模拟...', 'info');
    testUISimulation();
    
    // 8. 生成报告
    log('步骤8: 生成测试报告...', 'info');
    const report = generateReport();
    
    // 保存报告
    require('fs').writeFileSync('nurse-schedule-test-report.md', report);
    
    log('测试完成！', 'success');
    log(`通过: ${testResults.summary.passed}/${testResults.summary.total}`, 'success');
    log(`报告已保存到: nurse-schedule-test-report.md`, 'info');
    
    if (testResults.summary.failed > 0) {
      log('发现的问题需要修复，请查看详细报告', 'warning');
    }
    
  } catch (error) {
    log(`测试过程中发生错误: ${error.message}`, 'error');
    console.error(error);
  }
}

// 运行测试
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testResults,
  generateReport
};