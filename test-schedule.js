import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function testNurseSchedulePage() {
  console.log('开始测试护士排班页面...');

  // 启动浏览器
  const browser = await chromium.launch({
    headless: false, // 设置为 false 以查看浏览器操作
    slowMo: 1000 // 减慢操作速度以便观察
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // 监听控制台错误
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('浏览器控制台错误:', msg.text());
    }
  });

  page.on('pageerror', (error) => {
    console.log('页面错误:', error.message);
  });

  try {
    // 1. 导航到护士排班页面
    console.log('导航到护士排班页面...');
    await page.goto('http://127.0.0.1:5175/head-nurse/schedule');

    // 等待页面加载
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 2. 测试初始视图（日视图）并截图
    console.log('测试初始视图（日视图）...');
    await page.screenshot({
      path: '/Users/massifserver/app-7u4xlrye46ip/screenshots/day-view-initial.png',
      fullPage: true
    });

    // 检查是否在日视图
    const dayViewActive = await page.locator('[data-state="active"]').filter({ hasText: '日' }).isVisible();
    console.log('日视图是否激活:', dayViewActive);

    // 检查排班数据
    const scheduleCards = await page.locator('[data-testid="schedule-card"], .schedule-card, .appointment-card').count();
    console.log('排班卡片数量:', scheduleCards);

    // 检查客户名称和服务名称
    if (scheduleCards > 0) {
      const firstCard = await page.locator('[data-testid="schedule-card"], .schedule-card, .appointment-card').first();
      const cardText = await firstCard.textContent();
      console.log('第一个排班卡片内容:', cardText);
    }

    // 3. 测试周视图切换
    console.log('切换到周视图...');
    const weekButton = page.locator('button:has-text("周")');
    await weekButton.click();
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: '/Users/massifserver/app-7u4xlrye46ip/screenshots/week-view.png',
      fullPage: true
    });

    // 检查周视图是否激活
    const weekViewActive = await page.locator('[data-state="active"]').filter({ hasText: '周' }).isVisible();
    console.log('周视图是否激活:', weekViewActive);

    // 4. 测试月视图切换
    console.log('切换到月视图...');
    const monthButton = page.locator('button:has-text("月")');
    await monthButton.click();
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: '/Users/massifserver/app-7u4xlrye46ip/screenshots/month-view.png',
      fullPage: true
    });

    // 检查月视图是否激活
    const monthViewActive = await page.locator('[data-state="active"]').filter({ hasText: '月' }).isVisible();
    console.log('月视图是否激活:', monthViewActive);

    // 5. 返回日视图测试房间排班
    console.log('返回日视图测试房间排班...');
    const dayButton = page.locator('button:has-text("日")');
    await dayButton.click();
    await page.waitForTimeout(2000);

    // 查找房间相关的元素
    const roomElements = await page.locator('[data-testid*="room"], .room, .room-card').count();
    console.log('房间相关元素数量:', roomElements);

    if (roomElements > 0) {
      const firstRoom = await page.locator('[data-testid*="room"], .room, .room-card').first();
      const roomText = await firstRoom.textContent();
      console.log('第一个房间元素内容:', roomText);
    }

    await page.screenshot({
      path: '/Users/massifserver/app-7u4xlrye46ip/screenshots/day-view-final.png',
      fullPage: true
    });

    // 6. 检查页面标题和关键元素
    const pageTitle = await page.title();
    console.log('页面标题:', pageTitle);

    // 检查是否有加载指示器或错误信息
    const loadingElements = await page.locator('.loading, .spinner, [data-testid="loading"]').count();
    const errorElements = await page.locator('.error, .error-message, [data-testid="error"]').count();

    console.log('加载指示器数量:', loadingElements);
    console.log('错误元素数量:', errorElements);

    console.log('测试完成！所有截图已保存到 screenshots 目录');

  } catch (error) {
    console.error('测试过程中发生错误:', error);
    // 即使出错也尝试截图
    try {
      await page.screenshot({
        path: '/Users/massifserver/app-7u4xlrye46ip/screenshots/error-screenshot.png',
        fullPage: true
      });
    } catch (screenshotError) {
      console.error('截图失败:', screenshotError);
    }
  } finally {
    // 关闭浏览器
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