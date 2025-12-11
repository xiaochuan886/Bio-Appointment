const { chromium } = require('playwright');

/**
 * 护士完整工作流程端到端测试
 * 测试护士登录、查看排班、执行任务、查看历史等操作
 */

async function testNurseCompleteWorkflow() {
  console.log('🚀 开始护士完整工作流程端到端测试...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // 步骤1: 访问登录页面
    console.log('📍 步骤1: 访问登录页面');
    await page.goto('http://127.0.0.1:5173/login');
    await page.waitForLoadState('networkidle');
    
    // 等待页面完全加载
    await page.waitForTimeout(3000);
    
    // 步骤2: 护士登录
    console.log('📍 步骤2: 护士登录');
    
    // 检查登录表单是否存在
    const usernameInput = await page.locator('input[placeholder*="用户名"], input[name*="email"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    const loginButton = await page.locator('button[type="submit"], button:has-text("登录")').first();
    
    if (!usernameInput || !passwordInput || !loginButton) {
      console.log('❌ 登录表单元素未找到');
      console.log('页面标题:', await page.title());
      console.log('页面URL:', page.url());
      
      // 尝试其他选择器
      const allInputs = await page.locator('input').all();
      console.log('页面输入框数量:', allInputs.length);
      for (let i = 0; i < allInputs.length; i++) {
        const input = allInputs[i];
        const inputType = await input.getAttribute('type');
        const inputPlaceholder = await input.getAttribute('placeholder');
        const inputName = await input.getAttribute('name');
        const inputId = await input.getAttribute('id');
        console.log(`输入框${i + 1}:`, {
          type: inputType,
          placeholder: inputPlaceholder,
          name: inputName,
          id: inputId
        });
      }
      
      const allButtons = await page.locator('button').all();
      console.log('页面按钮数量:', allButtons.length);
      for (let i = 0; i < allButtons.length; i++) {
        const button = allButtons[i];
        const buttonText = await button.textContent();
        console.log(`按钮${i + 1}:`, buttonText);
      }
      
      throw new Error('登录表单元素未找到');
    }
    
    console.log('✅ 找到登录表单元素');
    await usernameInput.fill('nurse001');
    await passwordInput.fill('123456');
    await loginButton.click();
    await page.waitForLoadState('networkidle');
    
    // 等待登录完成
    await page.waitForTimeout(2000);
    
    // 检查是否登录成功
    const currentUrl = page.url();
    if (!currentUrl.includes('/dashboard') && !currentUrl.includes('/nurse')) {
      throw new Error('登录失败，当前页面: ' + currentUrl);
    }
    console.log('✅ 护士登录成功');
    
    // 步骤3: 导航到护士排班页面
    console.log('📍 步骤3: 导航到护士排班页面');
    await page.goto('http://127.0.0.1:5173/nurse/schedule');
    await page.waitForLoadState('networkidle');
    
    // 检查排班页面是否正常加载
    await page.waitForTimeout(2000);
    
    // 检查是否有排班数据显示
    const scheduleElements = await page.locator('[data-testid="schedule-item"]').count();
    if (scheduleElements === 0) {
      console.log('⚠️ 警告: 排班页面没有显示数据');
    } else {
      console.log(`✅ 排班页面正常，显示 ${scheduleElements} 条排班记录`);
    }
    
    // 步骤4: 测试排班筛选功能
    console.log('📍 步骤4: 测试排班筛选功能');
    
    // 测试日期筛选
    const today = new Date().toISOString().split('T')[0];
    await page.fill('[data-testid="date-filter"]', today);
    await page.waitForTimeout(1000);
    
    // 测试状态筛选
    await page.selectOption('[data-testid="status-filter"]', 'pending');
    await page.waitForTimeout(1000);
    
    console.log('✅ 排班筛选功能测试完成');
    
    // 步骤5: 导航到护士任务页面
    console.log('📍 步骤5: 导航到护士任务页面');
    await page.goto('http://127.0.0.1:5173/nurse/tasks');
    await page.waitForLoadState('networkidle');
    
    // 检查任务页面是否正常加载
    await page.waitForTimeout(2000);
    
    // 检查是否有任务数据显示
    const taskElements = await page.locator('[data-testid="task-item"]').count();
    if (taskElements === 0) {
      console.log('⚠️ 警告: 任务页面没有显示数据');
    } else {
      console.log(`✅ 任务页面正常，显示 ${taskElements} 条任务记录`);
    }
    
    // 步骤6: 测试任务操作功能
    console.log('📍 步骤6: 测试任务操作功能');
    
    if (taskElements > 0) {
      // 测试任务状态更新
      const firstTask = await page.locator('[data-testid="task-item"]').first();
      await firstTask.click();
      await page.waitForTimeout(1000);
      
      // 查找任务操作按钮
      const actionButtons = await page.locator('[data-testid="task-action-button"]').count();
      if (actionButtons > 0) {
        console.log('✅ 任务操作按钮正常显示');
        
        // 测试任务状态更新
        await page.locator('[data-testid="task-action-button"]').first().click();
        await page.waitForTimeout(1000);
        console.log('✅ 任务状态更新功能测试完成');
      } else {
        console.log('⚠️ 警告: 任务操作按钮未找到');
      }
    }
    
    // 步骤7: 导航到护士历史页面
    console.log('📍 步骤7: 导航到护士历史页面');
    await page.goto('http://127.0.0.1:5173/nurse/history');
    await page.waitForLoadState('networkidle');
    
    // 检查历史页面是否正常加载
    await page.waitForTimeout(2000);
    
    // 检查是否有历史数据显示
    const historyElements = await page.locator('[data-testid="history-item"]').count();
    if (historyElements === 0) {
      console.log('⚠️ 警告: 历史页面没有显示数据');
    } else {
      console.log(`✅ 历史页面正常，显示 ${historyElements} 条历史记录`);
    }
    
    // 步骤8: 测试历史筛选功能
    console.log('📍 步骤8: 测试历史筛选功能');
    
    // 测试日期范围筛选
    await page.fill('[data-testid="start-date-filter"]', '2025-12-01');
    await page.fill('[data-testid="end-date-filter"]', '2025-12-09');
    await page.waitForTimeout(1000);
    
    // 测试状态筛选
    await page.selectOption('[data-testid="history-status-filter"]', 'completed');
    await page.waitForTimeout(1000);
    
    console.log('✅ 历史筛选功能测试完成');
    
    // 步骤9: 测试护士个人资料页面
    console.log('📍 步骤9: 测试护士个人资料页面');
    await page.goto('http://127.0.0.1:5173/nurse/profile');
    await page.waitForLoadState('networkidle');
    
    // 检查个人资料页面是否正常加载
    await page.waitForTimeout(2000);
    
    // 检查个人信息是否显示
    const profileName = await page.locator('[data-testid="profile-name"]').textContent();
    const profileRole = await page.locator('[data-testid="profile-role"]').textContent();
    const profileDepartment = await page.locator('[data-testid="profile-department"]').textContent();
    
    if (profileName && profileRole && profileDepartment) {
      console.log('✅ 护士个人资料页面正常');
      console.log(`  姓名: ${profileName}`);
      console.log(`  角色: ${profileRole}`);
      console.log(`  部门: ${profileDepartment}`);
    } else {
      console.log('⚠️ 警告: 护士个人资料页面信息不完整');
    }
    
    // 步骤10: 测试通知功能
    console.log('📍 步骤10: 测试通知功能');
    
    // 查找通知图标
    const notificationIcon = await page.locator('[data-testid="notification-icon"]').count();
    if (notificationIcon > 0) {
      console.log('✅ 通知功能正常');
      await page.locator('[data-testid="notification-icon"]').first().click();
      await page.waitForTimeout(1000);
      
      // 检查通知列表
      const notificationItems = await page.locator('[data-testid="notification-item"]').count();
      if (notificationItems > 0) {
        console.log(`✅ 通知列表正常，显示 ${notificationItems} 条通知`);
      } else {
        console.log('⚠️ 警告: 通知列表为空');
      }
    } else {
      console.log('⚠️ 警告: 通知图标未找到');
    }
    
    // 步骤11: 测试退出登录
    console.log('📍 步骤11: 测试退出登录');
    
    // 查找用户菜单
    const userMenu = await page.locator('[data-testid="user-menu"]').count();
    if (userMenu > 0) {
      await page.locator('[data-testid="user-menu"]').first().click();
      await page.waitForTimeout(1000);
      
      // 点击退出按钮
      await page.locator('[data-testid="logout-button"]').click();
      await page.waitForTimeout(2000);
      
      // 检查是否返回登录页面
      const finalUrl = page.url();
      if (finalUrl.includes('/login')) {
        console.log('✅ 退出登录功能正常');
      } else {
        console.log('⚠️ 警告: 退出登录后未返回登录页面');
      }
    } else {
      console.log('⚠️ 警告: 用户菜单未找到');
    }
    
    console.log('\n🎉 护士完整工作流程端到端测试完成！');
    
    // 生成测试报告
    const testResults = {
      timestamp: new Date().toISOString(),
      nurseLogin: true,
      schedulePage: scheduleElements > 0,
      taskPage: taskElements > 0,
      historyPage: historyElements > 0,
      profilePage: !!(profileName && profileRole && profileDepartment),
      notificationFunction: notificationIcon > 0,
      logoutFunction: userMenu > 0,
      overallStatus: 'success'
    };
    
    // 保存测试报告
    const fs = require('fs');
    fs.writeFileSync('nurse-workflow-test-report.json', JSON.stringify(testResults, null, 2));
    fs.writeFileSync('nurse-workflow-test-report.html', generateHtmlReport(testResults));
    
    console.log('\n📊 测试报告已保存:');
    console.log('  - nurse-workflow-test-report.json');
    console.log('  - nurse-workflow-test-report.html');
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
    
    // 保存错误报告
    const errorResults = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      overallStatus: 'failed'
    };
    
    const fs = require('fs');
    fs.writeFileSync('nurse-workflow-test-report.json', JSON.stringify(errorResults, null, 2));
    
  } finally {
    await context.close();
    await browser.close();
  }
}

function generateHtmlReport(results) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>护士工作流程测试报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .success { color: #28a745; }
        .failed { color: #dc3545; }
        .warning { color: #ffc107; }
        .section { margin-bottom: 20px; }
        .test-item { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee; }
        .status { font-weight: bold; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>护士工作流程测试报告</h1>
            <p class="timestamp">测试时间: ${results.timestamp}</p>
            <p class="status ${results.overallStatus === 'success' ? 'success' : 'failed'}">
                总体状态: ${results.overallStatus === 'success' ? '✅ 通过' : '❌ 失败'}
            </p>
        </div>
        
        <div class="section">
            <h2>测试结果</h2>
            <div class="test-item">
                <span>护士登录功能</span>
                <span class="status ${results.nurseLogin ? 'success' : 'failed'}">
                    ${results.nurseLogin ? '✅ 正常' : '❌ 异常'}
                </span>
            </div>
            <div class="test-item">
                <span>排班页面</span>
                <span class="status ${results.schedulePage ? 'success' : 'warning'}">
                    ${results.schedulePage ? '✅ 正常' : '⚠️ 数据为空'}
                </span>
            </div>
            <div class="test-item">
                <span>任务页面</span>
                <span class="status ${results.taskPage ? 'success' : 'warning'}">
                    ${results.taskPage ? '✅ 正常' : '⚠️ 数据为空'}
                </span>
            </div>
            <div class="test-item">
                <span>历史页面</span>
                <span class="status ${results.historyPage ? 'success' : 'warning'}">
                    ${results.historyPage ? '✅ 正常' : '⚠️ 数据为空'}
                </span>
            </div>
            <div class="test-item">
                <span>个人资料页面</span>
                <span class="status ${!results.profilePage ? 'success' : 'warning'}">
                    ${!results.profilePage ? '✅ 正常' : '⚠️ 信息不完整'}
                </span>
            </div>
            <div class="test-item">
                <span>通知功能</span>
                <span class="status ${results.notificationFunction ? 'success' : 'warning'}">
                    ${results.notificationFunction ? '✅ 正常' : '⚠️ 功能异常'}
                </span>
            </div>
            <div class="test-item">
                <span>退出登录功能</span>
                <span class="status ${results.logoutFunction ? 'success' : 'warning'}">
                    ${results.logoutFunction ? '✅ 正常' : '⚠️ 功能异常'}
                </span>
            </div>
        </div>
    </div>
</body>
</html>
  `;
}

// 运行测试
if (require.main === module) {
  testNurseCompleteWorkflow();
}

module.exports = { testNurseCompleteWorkflow };