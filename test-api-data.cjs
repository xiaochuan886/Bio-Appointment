#!/usr/bin/env node

/**
 * API数据测试脚本
 * 测试护士长排班页面所需的数据接口
 */

const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:5176';

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function header(message) {
  log(`🔍 ${message}`, 'cyan');
}

// 格式化JSON输出
function formatJson(data) {
  return JSON.stringify(data, null, 2);
}

// 测试API端点
async function testApiEndpoint(endpoint, description, params = {}) {
  try {
    header(`测试 ${description} (${endpoint})`);

    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      params,
      timeout: 10000
    });

    if (response.status === 200) {
      success(`API响应正常 (状态码: ${response.status})`);

      const data = response.data;

      // 分析数据结构
      if (Array.isArray(data)) {
        info(`返回数组，长度: ${data.length}`);

        if (data.length > 0) {
          info('示例数据结构:');
          const sample = data[0];
          Object.keys(sample).forEach(key => {
            const value = sample[key];
            const type = typeof value;
            const preview = type === 'object' ? JSON.stringify(value, null, 2) : String(value);
            log(`  ${key}: ${type} = ${preview.substring(0, 100)}${preview.length > 100 ? '...' : ''}`, 'blue');
          });
        }
      } else {
        info('返回对象数据');
        Object.keys(data).forEach(key => {
          log(`  ${key}: ${typeof data[key]}`, 'blue');
        });
      }

      return data;
    }
  } catch (err) {
    error(`${description} 测试失败: ${err.message}`);
    if (err.response) {
      error(`状态码: ${err.response.status}`);
      error(`响应数据: ${formatJson(err.response.data)}`);
    }
    return null;
  }
  return null;
}

// 测试不同日期范围的预约数据
async function testDateRangeQueries() {
  header('测试不同日期范围的预约数据');

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // 获取本周范围
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1); // 周一
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  // 获取本月范围
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const monthStartStr = monthStart.toISOString().split('T')[0];
  const monthEndStr = monthEnd.toISOString().split('T')[0];

  info(`今日日期: ${todayStr}`);
  info(`本周范围: ${weekStartStr} 到 ${weekEndStr}`);
  info(`本月范围: ${monthStartStr} 到 ${monthEndStr}`);

  // 测试不同视图模式的数据获取
  const testCases = [
    {
      name: '日视图数据',
      params: { status: 'pending', requested_date_from: todayStr, requested_date_to: todayStr }
    },
    {
      name: '周视图数据',
      params: { status: 'pending', requested_date_from: weekStartStr, requested_date_to: weekEndStr }
    },
    {
      name: '月视图数据',
      params: { status: 'pending', requested_date_from: monthStartStr, requested_date_to: monthEndStr }
    }
  ];

  for (const testCase of testCases) {
    info(`\n测试 ${testCase.name}:`);
    const data = await testApiEndpoint(
      '/api/appointments',
      `${testCase.name} - 预约数据`,
      testCase.params
    );

    if (data && Array.isArray(data)) {
      // 分析客户和服务名称
      const customerNames = data
        .map(apt => apt.customer_name)
        .filter(Boolean);

      const serviceNames = data
        .map(apt => apt.service?.name)
        .filter(Boolean);

      const urgentCount = data.filter(apt => apt.is_urgent).length;

      info(`  客户数量: ${customerNames.length}`);
      info(`  服务数量: ${serviceNames.length}`);
      info(`  急单数量: ${urgentCount}`);

      if (customerNames.length > 0) {
        log(`  客户姓名示例: ${customerNames.slice(0, 3).join(', ')}`, 'blue');
      }

      if (serviceNames.length > 0) {
        log(`  服务名称示例: ${serviceNames.slice(0, 3).join(', ')}`, 'blue');
      }
    }
  }
}

// 测试排班数据
async function testScheduleData() {
  header('测试排班数据');

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // 获取本周和本月范围
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const testCases = [
    {
      name: '日排班',
      params: { date: todayStr }
    },
    {
      name: '周排班',
      params: { start_date: weekStartStr, end_date: weekEndStr }
    }
  ];

  for (const testCase of testCases) {
    info(`\n测试 ${testCase.name}:`);
    const data = await testApiEndpoint('/api/schedules', testCase.name, testCase.params);

    if (data && Array.isArray(data)) {
      // 分析排班数据
      const customerNames = data
        .map(s => s.appointment?.customer_name)
        .filter(Boolean);

      const serviceNames = data
        .map(s => s.appointment?.service?.name)
        .filter(Boolean);

      info(`  排班数量: ${data.length}`);
      info(`  涉及客户: ${customerNames.length}`);
      info(`  涉及服务: ${serviceNames.length}`);

      if (customerNames.length > 0) {
        log(`  客户姓名示例: ${customerNames.slice(0, 3).join(', ')}`, 'blue');
      }

      if (serviceNames.length > 0) {
        log(`  服务名称示例: ${serviceNames.slice(0, 3).join(', ')}`, 'blue');
      }

      // 检查时间格式
      const timeSlots = data
        .map(s => `${s.scheduled_time_start?.substring(0, 5)}-${s.scheduled_time_end?.substring(0, 5)}`)
        .filter(Boolean);

      if (timeSlots.length > 0) {
        log(`  时间段示例: ${timeSlots.slice(0, 3).join(', ')}`, 'blue');
      }
    }
  }
}

// 主测试函数
async function runTests() {
  log('🚀 开始API数据测试', 'cyan');
  log('='.repeat(50), 'cyan');

  // 1. 测试基础数据
  await testApiEndpoint('/api/nurses', '护士数据');
  await testApiEndpoint('/api/rooms', '房间数据');

  // 2. 测试预约数据
  await testApiEndpoint('/api/appointments', '待处理预约数据', { status: 'pending' });

  // 3. 测试排班数据
  await testApiEndpoint('/api/schedules', '排班数据');

  // 4. 测试日期范围查询
  await testDateRangeQueries();

  // 5. 测试排班数据
  await testScheduleData();

  log('\n📊 API测试完成', 'cyan');
  log('=' .repeat(50), 'cyan');

  info('🔧 手动浏览器测试建议:');
  log('  1. 打开 http://127.0.0.1:5176/head-nurse/schedule', 'blue');
  log('  2. 检查页面是否正常加载', 'blue');
  log('  3. 点击视图切换按钮（日/周/月）', 'blue');
  log('  4. 验证排班卡片是否显示客户和服务信息', 'blue');
  log('  5. 使用浏览器开发者工具检查网络请求', 'blue');
  log('  6. 检查控制台是否有JavaScript错误', 'blue');
}

// 运行测试
if (require.main === module) {
  runTests().catch(err => {
    error(`测试运行失败: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { runTests };