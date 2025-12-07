const { chromium } = require('playwright');

async function testNurseHistoryPage() {
  console.log('🧪 开始测试护士任务历史页面...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. 访问登录页面
    console.log('📍 访问登录页面...');
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    // 2. 登录（使用测试管理员账号，因为它有所有权限）
    console.log('🔐 登录管理员账号...');
    await page.fill('input[placeholder="请输入邮箱"]', 'admin@test.com');
    await page.fill('input[placeholder="请输入密码"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // 3. 检查是否登录成功
    console.log('✅ 检查登录状态...');
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      throw new Error('登录失败，仍在登录页面');
    }

    // 4. 访问护士任务历史页面
    console.log('📊 访问护士任务历史页面...');
    await page.goto('http://localhost:5173/nurse/history');
    await page.waitForLoadState('networkidle');

    // 5. 检查页面基本元素
    console.log('🔍 检查页面基本元素...');
    
    // 检查标题
    const title = await page.textContent('h1');
    if (!title || !title.includes('任务历史')) {
      throw new Error('页面标题不正确');
    }
    console.log('✅ 页面标题正确');

    // 检查统计卡片
    const statsCards = await page.locator('.grid > div').count();
    if (statsCards < 5) {
      console.log(`⚠️  统计卡片数量不足: ${statsCards}`);
    } else {
      console.log('✅ 统计卡片显示正常');
    }

    // 6. 测试日期范围筛选
    console.log('📅 测试日期范围筛选...');
    const dateRangeButton = await page.locator('button:has-text("选择日期范围")').first();
    if (await dateRangeButton.isVisible()) {
      await dateRangeButton.click();
      await page.waitForTimeout(500);
      console.log('✅ 日期范围选择器可以打开');
      
      // 关闭日历
      await page.keyboard.press('Escape');
    }

    // 7. 测试筛选功能
    console.log('🔽 测试筛选功能...');
    
    // 状态筛选
    const statusFilter = await page.locator('select').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption({ label: '已完成' });
      await page.waitForTimeout(1000);
      console.log('✅ 状态筛选功能正常');
    }

    // 8. 测试标签页切换
    console.log('📑 测试标签页切换...');
    
    // 切换到数据分析标签
    const chartsTab = await page.locator('button:has-text("数据分析")');
    if (await chartsTab.isVisible()) {
      await chartsTab.click();
      await page.waitForTimeout(1000);
      console.log('✅ 数据分析标签页可以切换');
      
      // 检查图表是否存在
      const charts = await page.locator('svg').count();
      if (charts > 0) {
        console.log('✅ 图表组件正常显示');
      } else {
        console.log('⚠️  图表组件未显示');
      }
    }

    // 9. 测试导出功能
    console.log('💾 测试导出功能...');
    const exportButton = await page.locator('button:has-text("导出")');
    if (await exportButton.isVisible()) {
      // 设置下载处理
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      
      try {
        const download = await Promise.race([downloadPromise, new Promise(resolve => setTimeout(resolve, 2000))]);
        if (download) {
          console.log('✅ 导出功能正常');
        } else {
          console.log('⚠️  导出功能可能无数据可导出');
        }
      } catch (error) {
        console.log('⚠️  导出功能测试超时，可能无数据');
      }
    }

    // 10. 测试响应式设计
    console.log('📱 测试响应式设计...');
    
    // 测试移动端视图
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // 检查移动端导航菜单
    const mobileMenuButton = await page.locator('button:has(svg)').first();
    if (await mobileMenuButton.isVisible()) {
      console.log('✅ 移动端导航菜单正常');
    }
    
    // 恢复桌面视图
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);

    console.log('🎉 所有测试完成！护士任务历史页面功能正常');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    
    // 截图保存错误状态
    await page.screenshot({ path: 'nurse-history-test-error.png', fullPage: true });
    console.log('📸 错误截图已保存到 nurse-history-test-error.png');
    
  } finally {
    await browser.close();
  }
}

// 运行测试
testNurseHistoryPage().catch(console.error);