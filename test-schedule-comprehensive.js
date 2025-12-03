import { chromium } from 'playwright';
import fs from 'fs';

async function testNurseSchedulePage() {
  console.log('开始测试护士排班页面...');

  // 启动浏览器
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();

  // 监听控制台错误
  const consoleMessages = [];
  page.on('console', (msg) => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
    if (msg.type() === 'error') {
      console.log('浏览器控制台错误:', msg.text());
    }
  });

  page.on('pageerror', (error) => {
    console.log('页面错误:', error.message);
  });

  // 监听网络请求
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log('API请求:', request.method(), request.url());
    }
  });

  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log('API响应:', response.status(), response.url());
    }
  });

  try {
    console.log('🔍 第一步：检查是否可以直接访问排班页面...');

    // 尝试直接访问排班页面
    await page.goto('http://127.0.0.1:5175/head-nurse/schedule');
    await page.waitForLoadState('networkidle');

    // 等待几秒钟看看是否被重定向到登录页
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log('当前URL:', currentUrl);

    // 检查是否需要登录
    if (currentUrl.includes('/auth') || currentUrl.includes('/login')) {
      console.log('🔍 需要登录，尝试模拟登录...');

      // 查找登录表单元素
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email"], input[placeholder*="邮箱"]');
      const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="password"], input[placeholder*="密码"]');
      const loginButton = page.locator('button[type="submit"], button:has-text("登录"), button:has-text("Login")');

      if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
        console.log('找到登录表单，尝试登录...');
        // 使用页面显示的测试账号
        await emailInput.fill('admin@test.com');
        await passwordInput.fill('admin123');
        await loginButton.click();
        await page.waitForTimeout(5000); // 增加等待时间确保登录完成
      } else {
        console.log('未找到登录表单，可能需要其他认证方式');
      }
    }

    // 重新尝试访问排班页面
    console.log('🔍 第二步：导航到护士排班页面...');
    await page.goto('http://127.0.0.1:5175/head-nurse/schedule');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // 检查页面是否加载成功
    const pageTitle = await page.title();
    console.log('页面标题:', pageTitle);

    // 检查是否包含排班相关的关键元素
    const scheduleElements = await page.locator('text="智能排班看板", text="资源调度确认", text="排班待办", text="资源看板"').count();
    console.log('排班相关元素数量:', scheduleElements);

    // 也检查其他可能的标识符 - 使用不同的选择器
    const hasScheduleContent = await page.locator('text=/今日总数/', 'text=/待排班/', 'text=/资源看板/', 'text=/排班待办/').count() > 0;
    console.log('页面是否包含排班内容（正则匹配）:', hasScheduleContent);

    // 直接检查页面文本内容
    const pageText = await page.textContent('body');
    const hasTextContent = pageText && (pageText.includes('智能排班看板') && pageText.includes('今日总数'));
    console.log('页面文本是否包含排班内容:', hasTextContent);

    if (!hasTextContent) {
      console.log('⚠️ 页面可能未正确加载，尝试截图当前状态...');
      await page.screenshot({
        path: '/Users/massifserver/app-7u4xlrye46ip/screenshots/page-not-loaded.png',
        fullPage: true
      });

      console.log('页面文本内容（前500字符）:', pageText?.substring(0, 500));

      throw new Error('排班页面未正确加载');
    }

    // 1. 测试初始视图（日视图）并截图
    console.log('🔍 第三步：测试初始视图（日视图）...');
    await page.screenshot({
      path: '/Users/massifserver/app-7u4xlrye46ip/screenshots/day-view-initial.png',
      fullPage: true
    });

    // 检查视图切换器
    const viewSwitcher = page.locator('[data-testid="view-switcher"], .view-switcher');
    if (await viewSwitcher.count() > 0) {
      console.log('找到视图切换器');

      // 检查当前激活的视图
      const activeDayView = page.locator('button[data-state="active"]:has-text("日"), button:has-text("日")[data-state="active"]');
      const dayViewActive = await activeDayView.isVisible();
      console.log('日视图是否激活:', dayViewActive);

      // 2. 测试周视图切换
      console.log('🔍 第四步：切换到周视图...');
      const weekButton = page.locator('button:has-text("周")');
      if (await weekButton.count() > 0) {
        await weekButton.click();
        await page.waitForTimeout(3000);

        await page.screenshot({
          path: '/Users/massifserver/app-7u4xlrye46ip/screenshots/week-view.png',
          fullPage: true
        });

        const weekViewActive = page.locator('button[data-state="active"]:has-text("周")');
        console.log('周视图是否激活:', await weekViewActive.isVisible());
      } else {
        console.log('⚠️ 未找到周视图按钮');
      }

      // 3. 测试月视图切换
      console.log('🔍 第五步：切换到月视图...');
      const monthButton = page.locator('button:has-text("月")');
      if (await monthButton.count() > 0) {
        await monthButton.click();
        await page.waitForTimeout(3000);

        await page.screenshot({
          path: '/Users/massifserver/app-7u4xlrye46ip/screenshots/month-view.png',
          fullPage: true
        });

        const monthViewActive = page.locator('button[data-state="active"]:has-text("月")');
        console.log('月视图是否激活:', await monthViewActive.isVisible());
      } else {
        console.log('⚠️ 未找到月视图按钮');
      }

      // 4. 返回日视图
      console.log('🔍 第六步：返回日视图...');
      const dayButton = page.locator('button:has-text("日")');
      if (await dayButton.count() > 0) {
        await dayButton.click();
        await page.waitForTimeout(3000);
      }
    } else {
      console.log('⚠️ 未找到视图切换器');
    }

    // 5. 检查排班数据
    console.log('🔍 第七步：检查排班数据...');

    // 查找排班卡片
    const scheduleCards = await page.locator('.appointment-card, .schedule-card, [data-testid*="appointment"]').count();
    console.log('排班卡片数量:', scheduleCards);

    // 查找客户名称
    const customerNames = page.locator('text=/^[\\u4e00-\\u9fa5]+$/').filter({ hasText: /^[^\\d\\s]+$/ });
    const customerCount = await customerNames.count();
    console.log('可能的客户名称数量:', customerCount);

    if (customerCount > 0) {
      for (let i = 0; i < Math.min(3, customerCount); i++) {
        const name = await customerNames.nth(i).textContent();
        console.log(`客户名称 ${i + 1}:`, name);
      }
    }

    // 查找服务名称
    const serviceNames = page.locator('text="服务", text="治疗", text="检查", text="护理"').count();
    console.log('可能的服务相关文本数量:', serviceNames);

    // 查找房间信息
    const roomElements = await page.locator('text="房间", text="诊室", [data-testid*="room"]').count();
    console.log('房间相关元素数量:', roomElements);

    // 查找甘特图或其他可视化组件
    const ganttChart = page.locator('.gantt-chart, [data-testid="gantt"], .resource-view').count();
    console.log('甘特图/资源视图元素数量:', ganttChart);

    // 6. 最终截图
    console.log('🔍 第八步：最终截图...');
    await page.screenshot({
      path: '/Users/massifserver/app-7u4xlrye46ip/screenshots/final-view.png',
      fullPage: true
    });

    // 7. 分析控制台消息
    console.log('🔍 第九步：分析控制台消息...');
    const errorMessages = consoleMessages.filter(msg => msg.type === 'error');
    const warningMessages = consoleMessages.filter(msg => msg.type === 'warning');

    console.log('控制台错误数量:', errorMessages.length);
    errorMessages.forEach((msg, index) => {
      console.log(`错误 ${index + 1}:`, msg.text);
    });

    console.log('控制台警告数量:', warningMessages.length);
    warningMessages.forEach((msg, index) => {
      console.log(`警告 ${index + 1}:`, msg.text);
    });

    console.log('✅ 测试完成！所有截图已保存到 screenshots 目录');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);

    // 尝试错误截图
    try {
      await page.screenshot({
        path: '/Users/massifserver/app-7u4xlrye46ip/screenshots/error-screenshot.png',
        fullPage: true
      });
    } catch (screenshotError) {
      console.error('截图失败:', screenshotError);
    }

    // 打印页面内容用于调试
    try {
      const pageContent = await page.textContent('body');
      console.log('当前页面内容（前1000字符）:');
      console.log(pageContent?.substring(0, 1000));
    } catch (contentError) {
      console.error('无法获取页面内容:', contentError);
    }

  } finally {
    await browser.close();
  }
}

// 创建截图目录
const screenshotDir = '/Users/massifserver/app-7u4xlrye46ip/screenshots';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// 运行测试
testNurseSchedulePage().catch(console.error);