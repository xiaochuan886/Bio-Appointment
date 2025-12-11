/**
 * 护士完整工作流程Playwright测试
 * 创建时间: 2025-12-09
 * 描述: 使用Playwright自动化测试护士工作流程的所有前端功能
 */

const { chromium } = require('playwright');
const path = require('path');

// 测试配置
const TEST_CONFIG = {
  baseURL: 'http://localhost:5173',
  nurseCredentials: {
    username: 'nurse001',
    password: '123456'
  },
  timeout: 30000,
  screenshotPath: './test-screenshots',
  reportPath: './test-reports'
};

// 测试结果记录
const testResults = {
  login: { passed: false, error: null, screenshots: [] },
  schedule: { passed: false, error: null, screenshots: [] },
  tasks: { passed: false, error: null, screenshots: [] },
  history: { passed: false, error: null, screenshots: [] },
  navigation: { passed: false, error: null, screenshots: [] },
  overall: { passed: false, error: null, screenshots: [] }
};

// 创建目录
const fs = require('fs');
if (!fs.existsSync(TEST_CONFIG.screenshotPath)) {
  fs.mkdirSync(TEST_CONFIG.screenshotPath, { recursive: true });
}
if (!fs.existsSync(TEST_CONFIG.reportPath)) {
  fs.mkdirSync(TEST_CONFIG.reportPath, { recursive: true });
}

// 截图函数
async function takeScreenshot(page, name, category) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${category}-${name}-${timestamp}.png`;
  const filepath = path.join(TEST_CONFIG.screenshotPath, filename);
  
  await page.screenshot({ path: filepath, fullPage: true });
  testResults[category].screenshots.push(filename);
  
  console.log(`📸 截图已保存: ${filename}`);
  return filepath;
}

// 登录测试
async function testLogin(page) {
  console.log('🔐 开始测试护士登录功能...');
  
  try {
    // 访问登录页面
    await page.goto(`${TEST_CONFIG.baseURL}/login`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'login-page', 'login');
    
    // 填写登录表单
    await page.fill('input[name="username"]', TEST_CONFIG.nurseCredentials.username);
    await page.fill('input[name="password"]', TEST_CONFIG.nurseCredentials.password);
    await takeScreenshot(page, 'login-form-filled', 'login');
    
    // 点击登录按钮
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'login-button-clicked', 'login');
    
    // 等待页面跳转
    await page.waitForURL(/\/(nurse|dashboard)/, { timeout: 10000 });
    await takeScreenshot(page, 'login-success', 'login');
    
    testResults.login.passed = true;
    console.log('✅ 护士登录测试通过');
    return true;
    
  } catch (error) {
    testResults.login.error = error.message;
    console.error('❌ 护士登录测试失败:', error.message);
    await takeScreenshot(page, 'login-error', 'login');
    return false;
  }
}

// 排班页面测试
async function testSchedulePage(page) {
  console.log('📅 开始测试护士排班页面...');
  
  try {
    // 导航到排班页面
    await page.goto(`${TEST_CONFIG.baseURL}/nurse/schedule`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'schedule-page-loaded', 'schedule');
    
    // 检查页面标题
    const title = await page.textContent('h1');
    if (!title.includes('排班')) {
      throw new Error('页面标题不正确');
    }
    
    // 检查统计信息
    await page.waitForSelector('[data-testid="schedule-stats"]', { timeout: 5000 });
    await takeScreenshot(page, 'schedule-stats-visible', 'schedule');
    
    // 检查视图切换按钮
    const viewButtons = await page.locator('button[data-testid*="view-"]').count();
    if (viewButtons < 3) {
      throw new Error('视图切换按钮数量不足');
    }
    
    // 测试视图切换
    await page.click('button[data-testid="view-day"]');
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'schedule-day-view', 'schedule');
    
    await page.click('button[data-testid="view-week"]');
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'schedule-week-view', 'schedule');
    
    await page.click('button[data-testid="view-month"]');
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'schedule-month-view', 'schedule');
    
    // 检查排班列表
    await page.waitForSelector('[data-testid="schedule-list"]', { timeout: 5000 });
    await takeScreenshot(page, 'schedule-list-visible', 'schedule');
    
    // 检查是否有排班数据
    const scheduleItems = await page.locator('[data-testid="schedule-item"]').count();
    console.log(`📊 发现 ${scheduleItems} 个排班项目`);
    
    if (scheduleItems > 0) {
      // 点击第一个排班项目查看详情
      await page.click('[data-testid="schedule-item"]:first-child');
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'schedule-detail-modal', 'schedule');
      
      // 关闭详情弹窗
      const closeButton = await page.locator('button[aria-label="Close"]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    testResults.schedule.passed = true;
    console.log('✅ 护士排班页面测试通过');
    return true;
    
  } catch (error) {
    testResults.schedule.error = error.message;
    console.error('❌ 护士排班页面测试失败:', error.message);
    await takeScreenshot(page, 'schedule-error', 'schedule');
    return false;
  }
}

// 任务页面测试
async function testTasksPage(page) {
  console.log('📋 开始测试护士任务页面...');
  
  try {
    // 导航到任务页面
    await page.goto(`${TEST_CONFIG.baseURL}/nurse/tasks`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'tasks-page-loaded', 'tasks');
    
    // 检查页面标题
    const title = await page.textContent('h1');
    if (!title.includes('任务')) {
      throw new Error('页面标题不正确');
    }
    
    // 检查任务状态标签页
    const tabs = await page.locator('[data-testid*="task-tab"]').count();
    if (tabs < 3) {
      throw new Error('任务状态标签页数量不足');
    }
    
    // 测试标签页切换
    await page.click('[data-testid="task-tab-pending"]');
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'tasks-pending-tab', 'tasks');
    
    await page.click('[data-testid="task-tab-in-progress"]');
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'tasks-in-progress-tab', 'tasks');
    
    await page.click('[data-testid="task-tab-completed"]');
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'tasks-completed-tab', 'tasks');
    
    // 检查任务列表
    await page.waitForSelector('[data-testid="task-list"]', { timeout: 5000 });
    await takeScreenshot(page, 'task-list-visible', 'tasks');
    
    // 检查任务数量
    const taskItems = await page.locator('[data-testid="task-item"]').count();
    console.log(`📊 发现 ${taskItems} 个任务项目`);
    
    if (taskItems > 0) {
      // 测试任务操作按钮
      const firstTask = await page.locator('[data-testid="task-item"]:first-child');
      
      // 检查操作按钮
      const actionButtons = await firstTask.locator('[data-testid*="task-action"]').count();
      if (actionButtons > 0) {
        await takeScreenshot(page, 'task-actions-visible', 'tasks');
        
        // 尝试点击第一个操作按钮
        await firstTask.locator('[data-testid*="task-action"]:first-child').click();
        await page.waitForTimeout(1000);
        await takeScreenshot(page, 'task-action-clicked', 'tasks');
        
        // 处理可能的确认弹窗
        const confirmButton = await page.locator('button[data-testid="confirm-action"]').first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await page.waitForTimeout(1000);
          await takeScreenshot(page, 'task-action-confirmed', 'tasks');
        }
      }
    }
    
    testResults.tasks.passed = true;
    console.log('✅ 护士任务页面测试通过');
    return true;
    
  } catch (error) {
    testResults.tasks.error = error.message;
    console.error('❌ 护士任务页面测试失败:', error.message);
    await takeScreenshot(page, 'tasks-error', 'tasks');
    return false;
  }
}

// 历史页面测试
async function testHistoryPage(page) {
  console.log('📚 开始测试护士历史页面...');
  
  try {
    // 导航到历史页面
    await page.goto(`${TEST_CONFIG.baseURL}/nurse/history`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'history-page-loaded', 'history');
    
    // 检查页面标题
    const title = await page.textContent('h1');
    if (!title.includes('历史')) {
      throw new Error('页面标题不正确');
    }
    
    // 检查筛选控件
    await page.waitForSelector('[data-testid="filter-controls"]', { timeout: 5000 });
    await takeScreenshot(page, 'filter-controls-visible', 'history');
    
    // 检查日期范围选择器
    const datePickers = await page.locator('[data-testid*="date-picker"]').count();
    if (datePickers < 2) {
      throw new Error('日期选择器数量不足');
    }
    
    // 检查状态筛选器
    const statusFilters = await page.locator('[data-testid*="status-filter"]').count();
    if (statusFilters < 3) {
      throw new Error('状态筛选器数量不足');
    }
    
    // 测试快速筛选按钮
    const quickFilters = await page.locator('[data-testid*="quick-filter"]').count();
    if (quickFilters < 3) {
      throw new Error('快速筛选按钮数量不足');
    }
    
    await takeScreenshot(page, 'filters-visible', 'history');
    
    // 测试筛选功能
    await page.click('[data-testid="quick-filter-today"]');
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'today-filter-applied', 'history');
    
    // 检查历史记录列表
    await page.waitForSelector('[data-testid="history-list"]', { timeout: 5000 });
    await takeScreenshot(page, 'history-list-visible', 'history');
    
    // 检查历史记录数量
    const historyItems = await page.locator('[data-testid="history-item"]').count();
    console.log(`📊 发现 ${historyItems} 个历史记录项目`);
    
    if (historyItems > 0) {
      // 测试导出功能
      const exportButton = await page.locator('[data-testid="export-button"]').first();
      if (await exportButton.isVisible()) {
        await takeScreenshot(page, 'export-button-visible', 'history');
        // 注意：不实际点击导出，避免下载文件
      }
    }
    
    testResults.history.passed = true;
    console.log('✅ 护士历史页面测试通过');
    return true;
    
  } catch (error) {
    testResults.history.error = error.message;
    console.error('❌ 护士历史页面测试失败:', error.message);
    await takeScreenshot(page, 'history-error', 'history');
    return false;
  }
}

// 导航测试
async function testNavigation(page) {
  console.log('🧭 开始测试页面导航功能...');
  
  try {
    // 测试侧边栏导航
    const sidebar = await page.locator('[data-testid="sidebar"]').first();
    if (await sidebar.isVisible()) {
      await takeScreenshot(page, 'sidebar-visible', 'navigation');
      
      // 测试导航链接
      const navLinks = await sidebar.locator('a[data-testid*="nav-link"]').count();
      if (navLinks >= 4) {
        console.log(`📊 发现 ${navLinks} 个导航链接`);
        
        // 测试护士相关导航
        const nurseLinks = await sidebar.locator('a[data-testid*="nav-link"][data-testid*="nurse"]').count();
        if (nurseLinks >= 3) {
          await takeScreenshot(page, 'nurse-nav-visible', 'navigation');
        }
      }
    }
    
    // 测试顶部导航栏
    const topNav = await page.locator('[data-testid="top-nav"]').first();
    if (await topNav.isVisible()) {
      await takeScreenshot(page, 'top-nav-visible', 'navigation');
    }
    
    // 测试面包屑导航
    const breadcrumb = await page.locator('[data-testid="breadcrumb"]').first();
    if (await breadcrumb.isVisible()) {
      await takeScreenshot(page, 'breadcrumb-visible', 'navigation');
    }
    
    testResults.navigation.passed = true;
    console.log('✅ 页面导航功能测试通过');
    return true;
    
  } catch (error) {
    testResults.navigation.error = error.message;
    console.error('❌ 页面导航功能测试失败:', error.message);
    await takeScreenshot(page, 'navigation-error', 'navigation');
    return false;
  }
}

// 生成测试报告
function generateTestReport() {
  const report = {
    timestamp: new Date().toISOString(),
    testConfig: TEST_CONFIG,
    results: testResults,
    summary: {
      totalTests: Object.keys(testResults).length,
      passedTests: Object.values(testResults).filter(result => result.passed).length,
      failedTests: Object.values(testResults).filter(result => !result.passed).length,
      successRate: Math.round((Object.values(testResults).filter(result => result.passed).length / Object.keys(testResults).length) * 100)
    }
  };
  
  const reportPath = path.join(TEST_CONFIG.reportPath, `nurse-workflow-test-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📋 测试报告已生成: ${reportPath}`);
  return report;
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始护士工作流程完整测试...');
  console.log(`📡 测试目标: ${TEST_CONFIG.baseURL}`);
  
  let browser;
  let page;
  
  try {
    // 启动浏览器
    browser = await chromium.launch({
      headless: false, // 设置为false以便观察测试过程
      slowMo: 100, // 减慢操作以便观察
      args: ['--start-maximized', '--disable-web-security'] // 禁用网络安全检查
    });
    
    page = await browser.newPage();
    
    // 设置视口大小
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // 执行测试序列
    const tests = [
      { name: '登录测试', fn: testLogin },
      { name: '排班页面测试', fn: testSchedulePage },
      { name: '任务页面测试', fn: testTasksPage },
      { name: '历史页面测试', fn: testHistoryPage },
      { name: '导航功能测试', fn: testNavigation }
    ];
    
    for (const test of tests) {
      console.log(`\n--- 开始执行: ${test.name} ---`);
      await test.fn(page);
      
      // 在测试之间稍作停顿
      await page.waitForTimeout(2000);
    }
    
    // 生成最终截图
    if (page) {
      await page.screenshot({
        path: path.join(TEST_CONFIG.screenshotPath, `final-state-${Date.now()}.png`),
        fullPage: true
      });
    }
    
    // 生成测试报告
    const report = generateTestReport();
    
    console.log('\n🎉 测试完成！');
    console.log(`📊 总体通过率: ${report.summary.successRate}%`);
    console.log(`📊 通过测试: ${report.summary.passedTests}/${report.summary.totalTests}`);
    console.log(`📊 失败测试: ${report.summary.failedTests}/${report.summary.totalTests}`);
    
    if (report.summary.failedTests > 0) {
      console.log('\n❌ 失败的测试:');
      Object.entries(testResults).forEach(([name, result]) => {
        if (!result.passed) {
          console.log(`  - ${name}: ${result.error}`);
        }
      });
    }
    
    return report;
    
  } catch (error) {
    console.error('💥 测试执行失败:', error);
    throw error;
    
  } finally {
    // 清理资源
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 测试脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = { runTests, TEST_CONFIG, testResults };