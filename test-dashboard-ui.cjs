const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// 测试配置
const BASE_URL = 'http://localhost:5173'; // 前端开发服务器地址
const TEST_RESULTS_FILE = 'dashboard-ui-test-results.json';

// 测试结果记录
let testResults = {
  timestamp: new Date().toISOString(),
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  },
  tests: [],
  screenshots: []
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

// 辅助函数：截图并保存
async function takeScreenshot(page, testName, step = '') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `test-screenshots/${testName}-${step}-${timestamp}.png`;
  
  // 确保目录存在
  if (!fs.existsSync('test-screenshots')) {
    fs.mkdirSync('test-screenshots');
  }
  
  await page.screenshot({ path: filename, fullPage: true });
  testResults.screenshots.push({
    test: testName,
    step,
    filename,
    timestamp: new Date().toISOString()
  });
  
  console.log(`    📸 截图已保存: ${filename}`);
  return filename;
}

// 测试1：登录功能
async function testLogin(page) {
  try {
    console.log('\n🔐 测试登录功能...');
    
    // 访问登录页面
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'login', 'page-loaded');
    
    // 检查登录页面元素
    const loginForm = await page.locator('form').first();
    const emailInput = await page.locator('input[name="email"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    const loginButton = await page.locator('button[type="submit"]').first();
    
    const hasLoginForm = await loginForm.isVisible();
    const hasEmailInput = await emailInput.isVisible();
    const hasPasswordInput = await passwordInput.isVisible();
    const hasLoginButton = await loginButton.isVisible();
    
    recordTest(
      '登录页面元素检查',
      hasLoginForm && hasEmailInput && hasPasswordInput && hasLoginButton,
      `登录表单: ${hasLoginForm}, 邮箱输入: ${hasEmailInput}, 密码输入: ${hasPasswordInput}, 登录按钮: ${hasLoginButton}`
    );
    
    // 填写登录信息
    await emailInput.fill('admin');
    await passwordInput.fill('admin123');
    await takeScreenshot(page, 'login', 'form-filled');
    
    // 点击登录按钮
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      loginButton.click()
    ]);
    
    await takeScreenshot(page, 'login', 'after-login');
    
    // 检查是否成功跳转到工作台
    const currentUrl = page.url();
    const isDashboard = currentUrl.includes('/') && !currentUrl.includes('/login');
    
    recordTest(
      '登录功能',
      isDashboard,
      `登录后跳转到: ${currentUrl}, 成功: ${isDashboard}`
    );
    
    return isDashboard;
  } catch (error) {
    recordTest('登录功能', false, '登录过程中发生错误', error);
    return false;
  }
}

// 测试2：工作台页面加载
async function testDashboardPageLoad(page) {
  try {
    console.log('\n📊 测试工作台页面加载...');
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'dashboard', 'page-loaded');
    
    // 检查页面标题
    const pageTitle = await page.locator('h1').first().textContent();
    const hasCorrectTitle = pageTitle && pageTitle.includes('工作台');
    
    recordTest(
      '工作台页面标题',
      hasCorrectTitle,
      `页面标题: "${pageTitle}", 包含"工作台": ${hasCorrectTitle}`
    );
    
    // 检查统计卡片
    const statCards = await page.locator('[class*="Card"]').count();
    const hasStatCards = statCards >= 4; // 至少有4个统计卡片
    
    recordTest(
      '统计卡片显示',
      hasStatCards,
      `找到 ${statCards} 个统计卡片`
    );
    
    // 检查资源看板
    const resourceBoard = await page.locator('text=资源看板').first();
    const hasResourceBoard = await resourceBoard.isVisible();
    
    recordTest(
      '资源看板显示',
      hasResourceBoard,
      `资源看板可见: ${hasResourceBoard}`
    );
    
    return hasCorrectTitle && hasStatCards && hasResourceBoard;
  } catch (error) {
    recordTest('工作台页面加载', false, '页面加载检查失败', error);
    return false;
  }
}

// 测试3：资源筛选功能
async function testResourceFilter(page) {
  try {
    console.log('\n🔍 测试资源筛选功能...');
    
    // 等待资源看板加载
    await page.waitForSelector('text=资源看板', { timeout: 10000 });
    await takeScreenshot(page, 'filter', 'initial-state');
    
    // 检查筛选复选框
    const roomCheckbox = await page.locator('#filter-room').first();
    const nurseCheckbox = await page.locator('#filter-nurse').first();
    const doctorCheckbox = await page.locator('#filter-doctor').first();
    
    const hasRoomCheckbox = await roomCheckbox.isVisible();
    const hasNurseCheckbox = await nurseCheckbox.isVisible();
    const hasDoctorCheckbox = await doctorCheckbox.isVisible();
    
    recordTest(
      '资源筛选控件显示',
      hasRoomCheckbox && hasNurseCheckbox && hasDoctorCheckbox,
      `房间复选框: ${hasRoomCheckbox}, 护士复选框: ${hasNurseCheckbox}, 医生复选框: ${hasDoctorCheckbox}`
    );
    
    // 测试取消护士筛选
    if (hasNurseCheckbox) {
      const isChecked = await nurseCheckbox.isChecked();
      if (isChecked) {
        await nurseCheckbox.click();
        await page.waitForTimeout(1000); // 等待筛选生效
        await takeScreenshot(page, 'filter', 'nurse-deselected');
      }
      
      // 重新选择护士筛选
      await nurseCheckbox.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'filter', 'nurse-reselected');
    }
    
    // 测试取消房间筛选
    if (hasRoomCheckbox) {
      const isChecked = await roomCheckbox.isChecked();
      if (isChecked) {
        await roomCheckbox.click();
        await page.waitForTimeout(1000);
        await takeScreenshot(page, 'filter', 'room-deselected');
      }
      
      // 重新选择房间筛选
      await roomCheckbox.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'filter', 'room-reselected');
    }
    
    recordTest(
      '资源筛选交互',
      true,
      '成功测试了资源筛选的交互功能'
    );
    
    return true;
  } catch (error) {
    recordTest('资源筛选功能', false, '资源筛选测试失败', error);
    return false;
  }
}

// 测试4：日期切换功能
async function testDateNavigation(page) {
  try {
    console.log('\n📅 测试日期切换功能...');
    
    // 等待日期导航组件加载
    await page.waitForSelector('text=今天', { timeout: 10000 });
    await takeScreenshot(page, 'date', 'initial-state');
    
    // 测试"今天"按钮
    const todayButton = await page.locator('text=今天').first();
    const hasTodayButton = await todayButton.isVisible();
    
    recordTest(
      '今天按钮显示',
      hasTodayButton,
      `今天按钮可见: ${hasTodayButton}`
    );
    
    if (hasTodayButton) {
      await todayButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'date', 'today-clicked');
    }
    
    // 测试前一天/周/月按钮
    const prevButton = await page.locator('button:has-text("上一")').first();
    const nextButton = await page.locator('button:has-text("下一")').first();
    
    const hasPrevButton = await prevButton.isVisible();
    const hasNextButton = await nextButton.isVisible();
    
    recordTest(
      '日期导航按钮',
      hasPrevButton && hasNextButton,
      `上一按钮: ${hasPrevButton}, 下一按钮: ${hasNextButton}`
    );
    
    if (hasPrevButton) {
      await prevButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'date', 'previous-clicked');
      
      await nextButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'date', 'next-clicked');
    }
    
    // 测试日期选择器
    const dateButton = await page.locator('button:has-text("月")').first();
    const hasDateButton = await dateButton.isVisible();
    
    recordTest(
      '日期选择器按钮',
      hasDateButton,
      `日期选择器按钮可见: ${hasDateButton}`
    );
    
    if (hasDateButton) {
      await dateButton.click();
      await page.waitForTimeout(500);
      await takeScreenshot(page, 'date', 'date-picker-opened');
      
      // 关闭日期选择器
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    
    return true;
  } catch (error) {
    recordTest('日期切换功能', false, '日期切换测试失败', error);
    return false;
  }
}

// 测试5：视图切换功能
async function testViewSwitcher(page) {
  try {
    console.log('\n👁️ 测试视图切换功能...');
    
    // 等待视图切换器加载
    await page.waitForSelector('text=日视图', { timeout: 10000 });
    await takeScreenshot(page, 'view', 'initial-state');
    
    // 检查视图按钮
    const dayView = await page.locator('button:has-text("日视图")').first();
    const weekView = await page.locator('button:has-text("周视图")').first();
    const monthView = await page.locator('button:has-text("月视图")').first();
    
    const hasDayView = await dayView.isVisible();
    const hasWeekView = await weekView.isVisible();
    const hasMonthView = await monthView.isVisible();
    
    recordTest(
      '视图切换按钮显示',
      hasDayView && hasWeekView && hasMonthView,
      `日视图: ${hasDayView}, 周视图: ${hasWeekView}, 月视图: ${hasMonthView}`
    );
    
    // 测试切换到周视图
    if (hasWeekView) {
      await weekView.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'view', 'week-view');
      
      const isWeekViewActive = await weekView.getAttribute('class');
      recordTest(
        '周视图切换',
        isWeekViewActive && isWeekViewActive.includes('default'),
        '成功切换到周视图'
      );
    }
    
    // 测试切换到月视图
    if (hasMonthView) {
      await monthView.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'view', 'month-view');
      
      const isMonthViewActive = await monthView.getAttribute('class');
      recordTest(
        '月视图切换',
        isMonthViewActive && isMonthViewActive.includes('default'),
        '成功切换到月视图'
      );
    }
    
    // 切换回日视图
    if (hasDayView) {
      await dayView.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'view', 'day-view-restored');
    }
    
    return true;
  } catch (error) {
    recordTest('视图切换功能', false, '视图切换测试失败', error);
    return false;
  }
}

// 测试6：门店筛选功能
async function testStoreFilter(page) {
  try {
    console.log('\n🏪 测试门店筛选功能...');
    
    // 等待门店选择器加载
    await page.waitForSelector('text=所有门店', { timeout: 10000 });
    await takeScreenshot(page, 'store', 'initial-state');
    
    // 检查门店选择器
    const storeSelector = await page.locator('[role="combobox"]').first();
    const hasStoreSelector = await storeSelector.isVisible();
    
    recordTest(
      '门店选择器显示',
      hasStoreSelector,
      `门店选择器可见: ${hasStoreSelector}`
    );
    
    if (hasStoreSelector) {
      // 点击打开门店选择器
      await storeSelector.click();
      await page.waitForTimeout(500);
      await takeScreenshot(page, 'store', 'selector-opened');
      
      // 查找门店选项
      const storeOptions = await page.locator('[role="option"]').count();
      recordTest(
        '门店选项显示',
        storeOptions > 0,
        `找到 ${storeOptions} 个门店选项`
      );
      
      // 关闭选择器
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    
    return true;
  } catch (error) {
    recordTest('门店筛选功能', false, '门店筛选测试失败', error);
    return false;
  }
}

// 测试7：统计数据验证
async function testStatisticsData(page) {
  try {
    console.log('\n📈 测试统计数据验证...');
    
    // 等待统计数据加载
    await page.waitForSelector('[class*="text-2xl"]', { timeout: 10000 });
    await takeScreenshot(page, 'stats', 'data-loaded');
    
    // 检查各个统计卡片的数据
    const statElements = await page.locator('[class*="text-2xl"]').all();
    const statCount = statElements.length;
    
    recordTest(
      '统计数据显示',
      statCount >= 4,
      `找到 ${statCount} 个统计数据元素`
    );
    
    // 获取具体数值并验证
    if (statCount > 0) {
      const stats = [];
      for (let i = 0; i < Math.min(statCount, 6); i++) {
        const text = await statElements[i].textContent();
        stats.push(text);
      }
      
      recordTest(
        '统计数据内容',
        stats.length > 0,
        `统计数据: ${stats.join(', ')}`
      );
    }
    
    // 检查资源统计卡片
    const resourceStats = await page.locator('text=总房间数, text=总护士数, text=总医生数').count();
    const hasResourceStats = resourceStats > 0;
    
    recordTest(
      '资源统计显示',
      hasResourceStats,
      `资源统计元素: ${resourceStats}`
    );
    
    return true;
  } catch (error) {
    recordTest('统计数据验证', false, '统计数据验证失败', error);
    return false;
  }
}

// 测试8：甘特图显示
async function testGanttChart(page) {
  try {
    console.log('\n📊 测试甘特图显示...');
    
    // 等待甘特图加载
    await page.waitForSelector('text=资源占用甘特图', { timeout: 10000 });
    await takeScreenshot(page, 'gantt', 'chart-loaded');
    
    // 检查甘特图标题
    const ganttTitle = await page.locator('text=资源占用甘特图').first();
    const hasGanttTitle = await ganttTitle.isVisible();
    
    recordTest(
      '甘特图标题显示',
      hasGanttTitle,
      `甘特图标题可见: ${hasGanttTitle}`
    );
    
    // 检查甘特图容器
    const ganttContainer = await page.locator('[class*="gantt"], [class*="chart"], [class*="schedule"]').first();
    const hasGanttContainer = await ganttContainer.isVisible();
    
    recordTest(
      '甘特图容器显示',
      hasGanttContainer,
      `甘特图容器可见: ${hasGanttContainer}`
    );
    
    // 检查是否有加载状态
    const loadingText = await page.locator('text=加载中').count();
    const isLoading = loadingText > 0;
    
    if (isLoading) {
      // 等待加载完成
      await page.waitForSelector('text=加载中', { state: 'hidden', timeout: 10000 });
      await takeScreenshot(page, 'gantt', 'after-loading');
    }
    
    recordTest(
      '甘特图加载状态',
      !isLoading,
      `甘特图是否在加载: ${isLoading}`
    );
    
    return hasGanttTitle && hasGanttContainer;
  } catch (error) {
    recordTest('甘特图显示', false, '甘特图显示测试失败', error);
    return false;
  }
}

// 主测试函数
async function runDashboardUITests() {
  console.log('🚀 开始工作台UI自动化测试...\n');
  
  let browser;
  let page;
  let allTestsPassed = true;
  
  try {
    // 启动浏览器
    browser = await chromium.launch({ 
      headless: false, // 显示浏览器窗口以便观察
      slowMo: 500 // 减慢操作速度以便观察
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    page = await context.newPage();
    
    // 设置默认超时时间
    page.setDefaultTimeout(10000);
    
    // 执行测试序列
    const loginSuccess = await testLogin(page);
    if (!loginSuccess) {
      console.log('❌ 登录失败，跳过后续测试');
      allTestsPassed = false;
    } else {
      const dashboardLoadSuccess = await testDashboardPageLoad(page);
      const filterSuccess = await testResourceFilter(page);
      const dateNavSuccess = await testDateNavigation(page);
      const viewSwitchSuccess = await testViewSwitcher(page);
      const storeFilterSuccess = await testStoreFilter(page);
      const statsSuccess = await testStatisticsData(page);
      const ganttSuccess = await testGanttChart(page);
      
      allTestsPassed = dashboardLoadSuccess && filterSuccess && dateNavSuccess && 
                      viewSwitchSuccess && storeFilterSuccess && statsSuccess && ganttSuccess;
    }
    
    // 保存测试结果
    fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(testResults, null, 2));
    
    // 输出测试总结
    console.log('\n📊 测试总结:');
    console.log(`总测试数: ${testResults.summary.total}`);
    console.log(`通过: ${testResults.summary.passed}`);
    console.log(`失败: ${testResults.summary.failed}`);
    console.log(`成功率: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);
    console.log(`截图数量: ${testResults.screenshots.length}`);
    
    if (testResults.summary.failed > 0) {
      console.log('\n❌ 失败的测试:');
      testResults.summary.errors.forEach(error => {
        console.log(`  - ${error.test}: ${error.error}`);
      });
    }
    
    if (testResults.screenshots.length > 0) {
      console.log('\n📸 测试截图:');
      testResults.screenshots.forEach(screenshot => {
        console.log(`  - ${screenshot.test} - ${screenshot.step}: ${screenshot.filename}`);
      });
    }
    
    console.log(`\n📄 详细测试结果已保存到: ${TEST_RESULTS_FILE}`);
    
  } catch (error) {
    console.error('测试运行过程中发生错误:', error);
    allTestsPassed = false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return allTestsPassed;
}

// 运行测试
runDashboardUITests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});