const puppeteer = require('puppeteer');
const { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } = require('date-fns');

// 配置
const FRONTEND_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:3001/api';

// 测试结果收集器
const testResults = {
  pageLoad: [],
  viewModes: [],
  dateFilters: [],
  userInteractions: [],
  responsive: [],
  errors: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0
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
    testResults.errors.push(`${category}: ${testName} - ${details}`);
  }
  
  log(`${passed ? 'PASS' : 'FAIL'}: ${testName} - ${details}`, passed ? 'success' : 'error');
}

// 页面加载测试
async function testPageLoad(browser) {
  try {
    const page = await browser.newPage();
    
    // 监听控制台消息
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });
    
    // 监听网络请求
    const networkRequests = [];
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: new Date().toISOString()
      });
    });
    
    // 监听响应
    const networkResponses = [];
    page.on('response', response => {
      networkResponses.push({
        url: response.url(),
        status: response.status(),
        timestamp: new Date().toISOString()
      });
    });
    
    // 导航到护士排期页面
    const startTime = Date.now();
    await page.goto(`${FRONTEND_URL}/nurse/schedule`, { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    const loadTime = Date.now() - startTime;
    
    // 检查页面是否加载成功
    const pageTitle = await page.title();
    const hasCorrectTitle = pageTitle.includes('排班') || pageTitle.includes('Schedule');
    
    recordTest('pageLoad', '页面标题检查', hasCorrectTitle,
      `页面标题: ${pageTitle}`);
    
    // 检查页面加载时间
    const isLoadTimeAcceptable = loadTime < 5000; // 5秒内加载
    recordTest('pageLoad', '页面加载时间', isLoadTimeAcceptable,
      `加载时间: ${loadTime}ms`);
    
    // 检查关键元素是否存在
    const elements = await page.evaluate(() => {
      return {
        container: !!document.querySelector('.container'),
        scheduleCards: !!document.querySelector('[data-testid="schedule-cards"]'),
        viewModeSelector: !!document.querySelector('[data-testid="view-mode-selector"]'),
        dateFilter: !!document.querySelector('[data-testid="date-filter"]'),
        calendar: !!document.querySelector('[data-testid="calendar"]')
      };
    });
    
    recordTest('pageLoad', '关键元素检查', 
      elements.container && elements.viewModeSelector,
      `容器: ${elements.container ? '✓' : '✗'}, 视图选择器: ${elements.viewModeSelector ? '✓' : '✗'}`);
    
    // 检查控制台错误
    const errors = consoleMessages.filter(msg => msg.type === 'error');
    const hasNoConsoleErrors = errors.length === 0;
    
    recordTest('pageLoad', '控制台错误检查', hasNoConsoleErrors,
      `控制台错误数量: ${errors.length}`);
    
    if (errors.length > 0) {
      errors.forEach(error => {
        log(`控制台错误: ${error.text} at ${error.location.url}:${error.location.lineNumber}`, 'error');
      });
    }
    
    // 检查网络请求
    const scheduleRequests = networkRequests.filter(req => 
      req.url.includes('/schedules') || req.url.includes('/appointments')
    );
    
    recordTest('pageLoad', 'API请求检查', scheduleRequests.length > 0,
      `API请求数量: ${scheduleRequests.length}`);
    
    // 检查网络响应状态
    const failedResponses = networkResponses.filter(res => 
      res.status >= 400 && (res.url.includes('/schedules') || res.url.includes('/appointments'))
    );
    
    const hasNoFailedResponses = failedResponses.length === 0;
    recordTest('pageLoad', 'API响应状态检查', hasNoFailedResponses,
      `失败响应数量: ${failedResponses.length}`);
    
    if (failedResponses.length > 0) {
      failedResponses.forEach(response => {
        log(`失败响应: ${response.url} - ${response.status}`, 'error');
      });
    }
    
    await page.close();
    
    return {
      loadTime,
      consoleMessages,
      networkRequests,
      networkResponses
    };
    
  } catch (error) {
    recordTest('pageLoad', '页面加载测试', false, `错误: ${error.message}`);
    return null;
  }
}

// 视图模式测试
async function testViewModes(browser) {
  try {
    const page = await browser.newPage();
    await page.goto(`${FRONTEND_URL}/nurse/schedule`, { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    // 等待页面完全加载
    await page.waitForSelector('[data-testid="view-mode-selector"]', { timeout: 5000 });
    
    // 测试视图模式切换
    const viewModes = ['day', 'week', 'month'];
    
    for (const mode of viewModes) {
      try {
        // 点击视图模式选择器
        await page.select('[data-testid="view-mode-selector"]', mode);
        
        // 等待视图更新
        await page.waitForTimeout(1000);
        
        // 检查视图是否正确切换
        const currentView = await page.evaluate(() => {
          const viewSelector = document.querySelector('[data-testid="view-mode-selector"]');
          return viewSelector ? viewSelector.value : null;
        });
        
        const isViewCorrect = currentView === mode;
        recordTest('viewModes', `${mode}视图切换`, isViewCorrect,
          `当前视图: ${currentView}, 期望: ${mode}`);
        
        // 检查视图内容是否正确显示
        const viewContent = await page.evaluate(() => {
          const dayView = document.querySelector('[data-testid="day-view"]');
          const weekView = document.querySelector('[data-testid="week-view"]');
          const monthView = document.querySelector('[data-testid="month-view"]');
          
          return {
            day: !!dayView,
            week: !!weekView,
            month: !!monthView
          };
        });
        
        const expectedViewKey = `${mode}View`;
        const isContentCorrect = viewContent[expectedViewKey];
        
        recordTest('viewModes', `${mode}视图内容显示`, isContentCorrect,
          `${mode}视图内容: ${isContentCorrect ? '✓' : '✗'}`);
        
      } catch (error) {
        recordTest('viewModes', `${mode}视图测试`, false, `错误: ${error.message}`);
      }
    }
    
    await page.close();
    
  } catch (error) {
    recordTest('viewModes', '视图模式测试', false, `错误: ${error.message}`);
  }
}

// 日期过滤测试
async function testDateFilters(browser) {
  try {
    const page = await browser.newPage();
    await page.goto(`${FRONTEND_URL}/nurse/schedule`, { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    // 等待页面完全加载
    await page.waitForSelector('[data-testid="date-filter"]', { timeout: 5000 });
    
    // 测试日期选择器
    try {
      // 点击日期选择器
      await page.click('[data-testid="date-picker"]');
      await page.waitForTimeout(500);
      
      // 检查日历是否显示
      const calendarVisible = await page.evaluate(() => {
        const calendar = document.querySelector('[data-testid="calendar"]');
        return calendar && calendar.style.display !== 'none';
      });
      
      recordTest('dateFilters', '日期选择器显示', calendarVisible,
        `日历显示: ${calendarVisible ? '✓' : '✗'}`);
      
      // 测试日期范围选择
      await page.click('[data-testid="date-range-picker"]');
      await page.waitForTimeout(500);
      
      const rangePickerVisible = await page.evaluate(() => {
        const rangePicker = document.querySelector('[data-testid="date-range-picker"]');
        return rangePicker && rangePicker.style.display !== 'none';
      });
      
      recordTest('dateFilters', '日期范围选择器显示', rangePickerVisible,
        `范围选择器显示: ${rangePickerVisible ? '✓' : '✗'}`);
      
    } catch (error) {
      recordTest('dateFilters', '日期选择器测试', false, `错误: ${error.message}`);
    }
    
    // 测试日期导航
    try {
      // 获取当前日期
      const currentDate = await page.evaluate(() => {
        const dateDisplay = document.querySelector('[data-testid="current-date"]');
        return dateDisplay ? dateDisplay.textContent : null;
      });
      
      // 点击前一天按钮
      await page.click('[data-testid="previous-day"]');
      await page.waitForTimeout(500);
      
      const prevDate = await page.evaluate(() => {
        const dateDisplay = document.querySelector('[data-testid="current-date"]');
        return dateDisplay ? dateDisplay.textContent : null;
      });
      
      const dateChanged = currentDate !== prevDate;
      recordTest('dateFilters', '日期导航-前一天', dateChanged,
        `日期变化: ${dateChanged ? '✓' : '✗'}`);
      
      // 点击后一天按钮
      await page.click('[data-testid="next-day"]');
      await page.waitForTimeout(500);
      
      const nextDate = await page.evaluate(() => {
        const dateDisplay = document.querySelector('[data-testid="current-date"]');
        return dateDisplay ? dateDisplay.textContent : null;
      });
      
      const dateRestored = nextDate === currentDate;
      recordTest('dateFilters', '日期导航-后一天', dateRestored,
        `日期恢复: ${dateRestored ? '✓' : '✗'}`);
      
    } catch (error) {
      recordTest('dateFilters', '日期导航测试', false, `错误: ${error.message}`);
    }
    
    await page.close();
    
  } catch (error) {
    recordTest('dateFilters', '日期过滤测试', false, `错误: ${error.message}`);
  }
}

// 用户交互测试
async function testUserInteractions(browser) {
  try {
    const page = await browser.newPage();
    await page.goto(`${FRONTEND_URL}/nurse/schedule`, { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    // 等待页面完全加载
    await page.waitForSelector('[data-testid="schedule-cards"]', { timeout: 5000 });
    
    // 测试排班卡片点击
    try {
      // 查找第一个排班卡片
      const firstCard = await page.$('[data-testid="schedule-card"]');
      
      if (firstCard) {
        // 点击排班卡片
        await firstCard.click();
        await page.waitForTimeout(500);
        
        // 检查详情对话框是否显示
        const dialogVisible = await page.evaluate(() => {
          const dialog = document.querySelector('[data-testid="schedule-detail-dialog"]');
          return dialog && dialog.style.display !== 'none';
        });
        
        recordTest('userInteractions', '排班详情对话框', dialogVisible,
          `对话框显示: ${dialogVisible ? '✓' : '✗'}`);
        
        // 如果对话框显示，测试关闭
        if (dialogVisible) {
          await page.click('[data-testid="close-dialog"]');
          await page.waitForTimeout(500);
          
          const dialogClosed = await page.evaluate(() => {
            const dialog = document.querySelector('[data-testid="schedule-detail-dialog"]');
            return !dialog || dialog.style.display === 'none';
          });
          
          recordTest('userInteractions', '关闭详情对话框', dialogClosed,
            `对话框关闭: ${dialogClosed ? '✓' : '✗'}`);
        }
      } else {
        recordTest('userInteractions', '排班卡片查找', false, '未找到排班卡片');
      }
      
    } catch (error) {
      recordTest('userInteractions', '排班卡片交互', false, `错误: ${error.message}`);
    }
    
    // 测试统计信息
    try {
      const statsVisible = await page.evaluate(() => {
        const statsContainer = document.querySelector('[data-testid="schedule-stats"]');
        return !!statsContainer;
      });
      
      recordTest('userInteractions', '统计信息显示', statsVisible,
        `统计信息: ${statsVisible ? '✓' : '✗'}`);
      
      if (statsVisible) {
        const statsText = await page.evaluate(() => {
          const statsContainer = document.querySelector('[data-testid="schedule-stats"]');
          return statsContainer ? statsContainer.textContent : null;
        });
        
        const hasValidStats = statsText && statsText.length > 0;
        recordTest('userInteractions', '统计信息内容', hasValidStats,
          `统计内容: ${hasValidStats ? '✓' : '✗'}`);
      }
      
    } catch (error) {
      recordTest('userInteractions', '统计信息测试', false, `错误: ${error.message}`);
    }
    
    await page.close();
    
  } catch (error) {
    recordTest('userInteractions', '用户交互测试', false, `错误: ${error.message}`);
  }
}

// 响应式设计测试
async function testResponsive(browser) {
  try {
    const page = await browser.newPage();
    
    // 测试不同屏幕尺寸
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];
    
    for (const viewport of viewports) {
      try {
        // 设置视口大小
        await page.setViewport({ width: viewport.width, height: viewport.height });
        await page.goto(`${FRONTEND_URL}/nurse/schedule`, { 
          waitUntil: 'networkidle2',
          timeout: 10000 
        });
        
        // 等待页面加载
        await page.waitForTimeout(2000);
        
        // 检查布局是否适应
        const layoutInfo = await page.evaluate(() => {
          const container = document.querySelector('.container');
          const scheduleCards = document.querySelector('[data-testid="schedule-cards"]');
          
          return {
            containerWidth: container ? container.offsetWidth : 0,
            cardsContainer: !!scheduleCards,
            hasHorizontalScroll: container ? container.scrollWidth > container.clientWidth : false
          };
        });
        
        const isLayoutResponsive = layoutInfo.containerWidth > 0 && layoutInfo.cardsContainer;
        recordTest('responsive', `${viewport.name}布局`, isLayoutResponsive,
          `容器宽度: ${layoutInfo.containerWidth}px, 卡片容器: ${layoutInfo.cardsContainer ? '✓' : '✗'}`);
        
        // 检查是否有横向滚动条
        const hasNoHorizontalScroll = !layoutInfo.hasHorizontalScroll;
        recordTest('responsive', `${viewport.name}横向滚动`, hasNoHorizontalScroll,
          `横向滚动: ${layoutInfo.hasHorizontalScroll ? '✗' : '✓'}`);
        
      } catch (error) {
        recordTest('responsive', `${viewport.name}响应式测试`, false, `错误: ${error.message}`);
      }
    }
    
    await page.close();
    
  } catch (error) {
    recordTest('responsive', '响应式设计测试', false, `错误: ${error.message}`);
  }
}

// 生成测试报告
function generateFrontendReport() {
  const report = `
# 护士排期查看功能前端测试报告

## 测试概览
- 总测试数: ${testResults.summary.total}
- 通过测试: ${testResults.summary.passed}
- 失败测试: ${testResults.summary.failed}
- 成功率: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(2)}%

## 详细测试结果

### 页面加载测试
${testResults.pageLoad.map(test => 
  `- ${test.passed ? '✅' : '❌'} ${test.name}: ${test.details}`
).join('\n')}

### 视图模式测试
${testResults.viewModes.map(test => 
  `- ${test.passed ? '✅' : '❌'} ${test.name}: ${test.details}`
).join('\n')}

### 日期过滤测试
${testResults.dateFilters.map(test => 
  `- ${test.passed ? '✅' : '❌'} ${test.name}: ${test.details}`
).join('\n')}

### 用户交互测试
${testResults.userInteractions.map(test => 
  `- ${test.passed ? '✅' : '❌'} ${test.name}: ${test.details}`
).join('\n')}

### 响应式设计测试
${testResults.responsive.map(test => 
  `- ${test.passed ? '✅' : '❌'} ${test.name}: ${test.details}`
).join('\n')}

## 失败测试详情
${testResults.errors.map(error => 
  `- ❌ ${error}`
).join('\n')}

## 建议修复方案
${generateFrontendRecommendations()}

## 测试环境
- 前端服务器: ${FRONTEND_URL}
- API服务器: ${API_BASE_URL}
- 测试时间: ${new Date().toISOString()}
`;

  return report;
}

function generateFrontendRecommendations() {
  const recommendations = [];
  
  // 基于失败测试生成建议
  testResults.errors.forEach(error => {
    if (error.includes('页面加载')) {
      recommendations.push('1. 检查页面路由配置和组件加载');
      recommendations.push('2. 验证API调用和错误处理逻辑');
    }
    if (error.includes('视图模式')) {
      recommendations.push('3. 检查视图模式切换的状态管理');
      recommendations.push('4. 验证不同视图的渲染逻辑');
    }
    if (error.includes('日期')) {
      recommendations.push('5. 检查日期处理组件和状态更新');
      recommendations.push('6. 验证日期格式化和计算逻辑');
    }
    if (error.includes('交互')) {
      recommendations.push('7. 检查事件处理和对话框组件');
      recommendations.push('8. 验证用户交互的响应逻辑');
    }
    if (error.includes('响应式')) {
      recommendations.push('9. 检查CSS媒体查询和布局适配');
      recommendations.push('10. 验证不同屏幕尺寸的显示效果');
    }
  });
  
  if (recommendations.length === 0) {
    recommendations.push('✅ 所有前端测试通过，UI功能运行正常');
    recommendations.push('建议定期运行此测试以确保用户体验');
  }
  
  return recommendations.join('\n');
}

// 主测试函数
async function runFrontendTests() {
  log('开始护士排期查看功能前端测试...', 'info');
  
  let browser;
  try {
    // 启动浏览器
    browser = await puppeteer.launch({
      headless: false, // 设置为true可以无头模式运行
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // 1. 页面加载测试
    log('步骤1: 测试页面加载...', 'info');
    await testPageLoad(browser);
    
    // 2. 视图模式测试
    log('步骤2: 测试视图模式...', 'info');
    await testViewModes(browser);
    
    // 3. 日期过滤测试
    log('步骤3: 测试日期过滤...', 'info');
    await testDateFilters(browser);
    
    // 4. 用户交互测试
    log('步骤4: 测试用户交互...', 'info');
    await testUserInteractions(browser);
    
    // 5. 响应式设计测试
    log('步骤5: 测试响应式设计...', 'info');
    await testResponsive(browser);
    
    // 6. 生成报告
    log('步骤6: 生成测试报告...', 'info');
    const report = generateFrontendReport();
    
    // 保存报告
    require('fs').writeFileSync('nurse-schedule-frontend-test-report.md', report);
    
    log('前端测试完成！', 'success');
    log(`通过: ${testResults.summary.passed}/${testResults.summary.total}`, 'success');
    log(`报告已保存到: nurse-schedule-frontend-test-report.md`, 'info');
    
    if (testResults.summary.failed > 0) {
      log('发现的问题需要修复，请查看详细报告', 'warning');
    }
    
  } catch (error) {
    log(`前端测试过程中发生错误: ${error.message}`, 'error');
    console.error(error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 运行测试
if (require.main === module) {
  runFrontendTests();
}

module.exports = {
  runFrontendTests,
  testResults,
  generateFrontendReport
};