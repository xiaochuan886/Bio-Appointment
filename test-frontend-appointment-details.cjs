#!/usr/bin/env node

const { chromium } = require('playwright');

async function testFrontendAppointmentDetails() {
  console.log('🧪 测试前端预约详情显示功能...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. 访问登录页面
    console.log('1. 访问登录页面...');
    await page.goto('http://127.0.0.1:5175/login');
    await page.waitForLoadState('networkidle');

    // 2. 登录 - 使用默认填充的凭据
    console.log('2. 执行登录...');
    
    // 检查是否已经有默认值
    const emailInput = await page.locator('input[name="email"]').first();
    const passwordInput = await page.locator('input[name="password"]').first();
    
    const emailValue = await emailInput.inputValue();
    const passwordValue = await passwordInput.inputValue();
    
    console.log(`当前邮箱值: ${emailValue}`);
    console.log(`当前密码值: ${passwordValue ? '***' : '空'}`);
    
    // 如果没有默认值，手动填入
    if (!emailValue) {
      await emailInput.fill('admin');
    }
    if (!passwordValue) {
      await passwordInput.fill('admin123');
    }
    
    await page.click('button[type="submit"], button:has-text("登录")');
    
    // 等待登录完成 - 等待页面跳转
    try {
      await page.waitForURL('**/', { timeout: 5000 });
      console.log('✅ 登录成功，跳转到首页');
    } catch {
      // 检查是否跳转到其他页面
      await page.waitForTimeout(3000);
      const currentUrl = page.url();
      console.log(`当前URL: ${currentUrl}`);
      
      // 检查是否还在登录页面
      if (currentUrl.includes('/login')) {
        // 检查是否有错误消息
        const errorMessage = await page.locator('[role="alert"], .error, .text-red').first();
        if (await errorMessage.isVisible()) {
          const errorText = await errorMessage.textContent();
          throw new Error(`登录失败: ${errorText}`);
        } else {
          throw new Error('登录失败，仍在登录页面');
        }
      } else {
        console.log('✅ 登录成功');
      }
    }

    // 3. 导航到排班页面
    console.log('3. 导航到排班页面...');
    await page.goto('http://127.0.0.1:5175/head-nurse/schedule');
    await page.waitForLoadState('networkidle');

    // 4. 查找并点击预约详情
    console.log('4. 查找预约详情...');
    
    // 等待排班数据加载
    await page.waitForTimeout(2000);
    
    // 查找包含测试数据的排班项
    const scheduleItems = await page.locator('[data-testid="schedule-item"], .schedule-item, .gantt-item').all();
    
    if (scheduleItems.length === 0) {
      // 尝试查找其他可能的排班元素
      const allClickableElements = await page.locator('div:has-text("测试客户"), div:has-text("张三"), [role="button"]').all();
      console.log(`找到 ${allClickableElements.length} 个可能的排班元素`);
      
      if (allClickableElements.length > 0) {
        console.log('5. 点击第一个排班项...');
        await allClickableElements[0].click();
      } else {
        console.log('⚠️  未找到排班项，尝试截图查看页面状态');
        await page.screenshot({ path: 'schedule-page-debug.png', fullPage: true });
        throw new Error('未找到排班项');
      }
    } else {
      console.log(`找到 ${scheduleItems.length} 个排班项`);
      console.log('5. 点击第一个排班项...');
      await scheduleItems[0].click();
    }

    // 6. 等待详情对话框出现
    console.log('6. 等待详情对话框...');
    await page.waitForSelector('[role="dialog"], .dialog, [data-testid="schedule-detail-dialog"]', { timeout: 5000 });

    // 7. 验证预约人信息显示
    console.log('7. 验证预约人信息...');
    const salesInfo = await page.locator('text=预约人').first();
    if (await salesInfo.isVisible()) {
      const salesText = await page.locator('text=预约人').locator('..').textContent();
      console.log(`✅ 预约人信息: ${salesText}`);
    } else {
      console.log('❌ 预约人信息未显示');
    }

    // 8. 验证客户信息显示
    console.log('8. 验证客户信息...');
    const customerInfo = await page.locator('text=主客户').first();
    if (await customerInfo.isVisible()) {
      const customerText = await page.locator('text=主客户').locator('..').textContent();
      console.log(`✅ 主客户信息: ${customerText}`);
    } else {
      console.log('❌ 主客户信息未显示');
    }

    // 9. 验证客户数量显示
    const customerCountInfo = await page.locator('text=客户数量').first();
    if (await customerCountInfo.isVisible()) {
      const countText = await page.locator('text=客户数量').locator('..').textContent();
      console.log(`✅ 客户数量信息: ${countText}`);
    } else {
      console.log('❌ 客户数量信息未显示');
    }

    // 10. 验证同行客户显示
    const companionInfo = await page.locator('text=同行客户').first();
    if (await companionInfo.isVisible()) {
      const companionText = await page.locator('text=同行客户').locator('..').textContent();
      console.log(`✅ 同行客户信息: ${companionText}`);
    } else {
      console.log('ℹ️  无同行客户信息（可能是单客户预约）');
    }

    // 11. 截图保存结果
    console.log('11. 保存截图...');
    await page.screenshot({ path: 'appointment-details-test.png', fullPage: true });

    console.log('\n✅ 前端预约详情显示功能测试完成');
    console.log('截图已保存为: appointment-details-test.png');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    
    // 保存错误截图
    try {
      await page.screenshot({ path: 'appointment-details-error.png', fullPage: true });
      console.log('错误截图已保存为: appointment-details-error.png');
    } catch (screenshotError) {
      console.error('截图失败:', screenshotError.message);
    }
  } finally {
    await browser.close();
  }
}

testFrontendAppointmentDetails();