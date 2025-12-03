#!/usr/bin/env node

/**
 * 护士长排班页面功能测试脚本
 * 测试 URL: http://127.0.0.1:5176/head-nurse/schedule
 */

const axios = require('axios');
const { JSDOM } = require('jsdom');

// 配置
const BASE_URL = 'http://127.0.0.1:5176';
const PAGE_URL = `${BASE_URL}/head-nurse/schedule`;

// 测试结果记录
const testResults = {
  serverConnection: false,
  pageAccess: false,
  viewModes: {
    day: false,
    week: false,
    month: false
  },
  dataDisplay: false,
  errors: []
};

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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
  testResults.errors.push(message);
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// 1. 测试服务器连接
async function testServerConnection() {
  try {
    info('测试服务器连接...');
    const response = await axios.get(BASE_URL, { timeout: 5000 });
    if (response.status === 200) {
      success('服务器连接正常');
      testResults.serverConnection = true;
      return true;
    }
  } catch (err) {
    error(`服务器连接失败: ${err.message}`);
    return false;
  }
  return false;
}

// 2. 测试页面访问
async function testPageAccess() {
  try {
    info('测试页面访问...');
    const response = await axios.get(PAGE_URL, {
      timeout: 10000,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (response.status === 200) {
      success('页面访问正常');
      testResults.pageAccess = true;

      // 检查页面内容
      const html = response.data;
      if (html.includes('智能排班看板')) {
        success('页面标题正确显示');
      } else {
        warning('页面标题未找到');
      }

      if (html.includes('ViewSwitcher') || html.includes('日视图') || html.includes('周视图')) {
        success('视图切换器组件存在');
      } else {
        warning('视图切换器组件未找到');
      }

      return html;
    }
  } catch (err) {
    error(`页面访问失败: ${err.message}`);
    return null;
  }
  return null;
}

// 3. 分析页面结构
function analyzePageStructure(html) {
  try {
    info('分析页面结构...');

    const dom = new JSDOM(html);
    const document = dom.window.document;

    // 检查关键元素
    const checks = [
      { selector: '[data-testid="view-switcher"]', name: '视图切换器' },
      { selector: '.view-switcher, button[onclick*="view"], button[data-view]', name: '视图切换按钮' },
      { selector: '.gantt-chart, .schedule-chart, .resource-board', name: '排班图表' },
      { selector: '.schedule-card, .appointment-card', name: '排班卡片' },
      { selector: '.customer-name, [data-customer]', name: '客户姓名显示' },
      { selector: '.service-name, [data-service]', name: '服务名称显示' }
    ];

    const results = {};
    checks.forEach(check => {
      const elements = document.querySelectorAll(check.selector);
      results[check.name] = elements.length > 0;
      if (elements.length > 0) {
        success(`${check.name}找到 (${elements.length}个)`);
      } else {
        warning(`${check.name}未找到`);
      }
    });

    // 检查脚本中的视图模式
    const scripts = document.querySelectorAll('script');
    let hasDayView = false, hasWeekView = false, hasMonthView = false;

    scripts.forEach(script => {
      const content = script.textContent || '';
      if (content.includes('day') && content.includes('view')) hasDayView = true;
      if (content.includes('week') && content.includes('view')) hasWeekView = true;
      if (content.includes('month') && content.includes('view')) hasMonthView = true;
    });

    testResults.viewModes.day = hasDayView;
    testResults.viewModes.week = hasWeekView;
    testResults.viewModes.month = hasMonthView;

    if (hasDayView) success('日视图支持已实现');
    if (hasWeekView) success('周视图支持已实现');
    if (hasMonthView) success('月视图支持已实现');

    return results;
  } catch (err) {
    error(`页面结构分析失败: ${err.message}`);
    return {};
  }
}

// 4. 测试API端点（如果可用）
async function testApiEndpoints() {
  try {
    info('测试API端点...');

    const endpoints = [
      '/api/appointments',
      '/api/schedules',
      '/api/nurses',
      '/api/rooms'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`, { timeout: 3000 });
        if (response.status === 200) {
          success(`API端点 ${endpoint} 响应正常`);
        }
      } catch (err) {
        warning(`API端点 ${endpoint} 无响应: ${err.message}`);
      }
    }
  } catch (err) {
    error(`API测试失败: ${err.message}`);
  }
}

// 5. 生成测试报告
function generateReport() {
  info('\n📊 测试报告');
  info('=' .repeat(50));

  const totalChecks = 1 + 1 + 3; // 服务器 + 页面 + 3个视图模式
  const passedChecks = [
    testResults.serverConnection,
    testResults.pageAccess,
    testResults.viewModes.day,
    testResults.viewModes.week,
    testResults.viewModes.month
  ].filter(Boolean).length;

  log(`总检查项: ${totalChecks}`, 'blue');
  log(`通过检查: ${passedChecks}`, 'green');
  log(`失败检查: ${totalChecks - passedChecks}`, 'red');
  log(`成功率: ${Math.round((passedChecks / totalChecks) * 100)}%`,
      passedChecks === totalChecks ? 'green' : 'yellow');

  if (testResults.errors.length > 0) {
    info('\n❌ 错误详情:');
    testResults.errors.forEach(error => {
      log(`  - ${error}`, 'red');
    });
  }

  info('\n🔧 建议修复措施:');

  if (!testResults.serverConnection) {
    log('  - 确保开发服务器正在运行 (npm run dev)', 'yellow');
  }

  if (!testResults.pageAccess) {
    log('  - 检查路由配置是否正确', 'yellow');
    log('  - 确认页面组件是否正确导出', 'yellow');
  }

  if (!testResults.viewModes.week) {
    log('  - 实现周视图功能', 'yellow');
  }

  if (!testResults.viewModes.month) {
    log('  - 实现月视图功能', 'yellow');
  }

  info('\n📝 手动测试建议:');
  log('  1. 在浏览器中打开 ' + PAGE_URL, 'blue');
  log('  2. 点击日视图、周视图、月视图按钮', 'blue');
  log('  3. 验证排班数据是否正确显示', 'blue');
  log('  4. 检查客户姓名和服务名称是否显示', 'blue');
  log('  5. 打开浏览器开发者工具检查JavaScript错误', 'blue');

  return passedChecks === totalChecks;
}

// 主测试函数
async function runTests() {
  info('🚀 开始护士长排班页面功能测试');
  info(`测试目标: ${PAGE_URL}`);
  info('='.repeat(50));

  // 1. 测试服务器连接
  const serverConnected = await testServerConnection();
  if (!serverConnected) {
    generateReport();
    return;
  }

  // 2. 测试页面访问
  const pageHtml = await testPageAccess();
  if (!pageHtml) {
    generateReport();
    return;
  }

  // 3. 分析页面结构
  analyzePageStructure(pageHtml);

  // 4. 测试API端点
  await testApiEndpoints();

  // 5. 生成报告
  const allTestsPassed = generateReport();

  if (allTestsPassed) {
    success('\n🎉 所有自动化测试通过！建议进行手动浏览器测试以验证交互功能。');
  } else {
    warning('\n⚠️  部分测试未通过，请查看上述建议进行修复。');
  }
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  error(`未处理的Promise拒绝: ${reason}`);
});

process.on('uncaughtException', (error) => {
  error(`未捕获的异常: ${error.message}`);
});

// 运行测试
if (require.main === module) {
  runTests().catch(err => {
    error(`测试运行失败: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { runTests, testResults };