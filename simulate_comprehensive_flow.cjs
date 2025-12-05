
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Helper to take screenshot with timestamp
  const takeScreenshot = async (name) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ path: `screenshots/${name}-${timestamp}.png`, fullPage: true });
    console.log(`📸 Screenshot saved: ${name}`);
  };

  try {
    console.log('🚀 开始全流程体验...');

    // ==========================================
    // 1. 销售端流程 (Sales Flow)
    // ==========================================
    console.log('\n--- [角色: 销售] ---');
    
    // 1.1 登录
    console.log('1.1 尝试登录...');
    await page.goto('http://127.0.0.1:5174/login');
    await page.fill('input[name="email"]', 'sales1@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000); // Wait for navigation
    await takeScreenshot('sales-login-result');

    // 1.2 检查是否进入预约页面
    if (page.url().includes('/login')) {
        throw new Error('销售登录失败，仍停留在登录页');
    }
    console.log('✅ 销售登录成功');

    // 1.3 发起普通预约 (未来日期)
    console.log('1.3 发起普通预约 (基础回输)...');
    await page.goto('http://127.0.0.1:5174/sales/appointment');
    await page.waitForSelector('form');
    
    await page.fill('input[name="customer_name"]', '张三丰 (测试)');
    
    // 选择服务 (假设第一个是基础回输，或者根据文本选择)
    // 这里为了稳健，我们先点击 Select，再选第一个
    await page.click('button[role="combobox"]:has-text("请选择服务项目")');
    await page.click('div[role="option"]:has-text("基础回输")');
    
    // 选择日期 (明天)
    await page.click('button:has-text("选择日期")');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const day = tomorrow.getDate().toString();
    // 这是一个简化的日期选择逻辑，可能需要根据实际 UI 调整
    await page.click(`td:has-text("${day}")`, { force: true }); 
    await page.click('body', { position: { x: 0, y: 0 } }); // Close popover

    // 选择时间
    await page.click('button[role="combobox"]:has-text("选择开始时间")');
    await page.click('div[role="option"]:first-child'); // 选第一个可用时间

    await takeScreenshot('sales-appointment-form-filled');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await takeScreenshot('sales-appointment-submitted');
    console.log('✅ 普通预约提交操作完成');

    // 1.4 发起急单 (今天，非采血 - 测试警告)
    console.log('1.4 测试急单警告 (今天 + 基础回输)...');
    await page.reload();
    await page.fill('input[name="customer_name"]', '急急急 (测试)');
    
    await page.click('button[role="combobox"]:has-text("请选择服务项目")');
    await page.click('div[role="option"]:has-text("基础回输")');
    
    await page.click('button:has-text("选择日期")');
    const today = new Date().getDate().toString();
    await page.click(`td:has-text("${today}")`, { force: true }); // Select today
    await page.click('body', { position: { x: 0, y: 0 } });

    await takeScreenshot('sales-urgent-warning-check');
    
    // 检查是否有警告
    const hasWarning = await page.textContent('body').then(text => text.includes('急单仅允许'));
    console.log(`❓ 是否显示急单警告: ${hasWarning ? '是' : '否'}`);

    // 1.5 发起医生面诊
    console.log('1.5 发起医生面诊预约...');
    await page.reload();
    await page.fill('input[name="customer_name"]', '李四 (面诊)');
    
    await page.click('button[role="combobox"]:has-text("请选择服务项目")');
    await page.click('div[role="option"]:has-text("医生面诊")'); // 假设有这个选项
    
    await page.click('button:has-text("选择日期")');
    await page.click(`td:has-text("${day}")`, { force: true }); // Tomorrow
    await page.click('body', { position: { x: 0, y: 0 } });

    await page.click('button[role="combobox"]:has-text("选择开始时间")');
    await page.click('div[role="option"]:first-child');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('✅ 医生面诊预约提交操作完成');

    // 退出登录
    // await page.click('button:has-text("退出")'); // 假设有退出按钮，或者直接清理 cookie
    await page.context().clearCookies();
    console.log('🚪 销售登出');

    // ==========================================
    // 2. 护士长端流程 (Head Nurse Flow)
    // ==========================================
    console.log('\n--- [角色: 护士长] ---');
    console.log('2.1 登录...');
    await page.goto('http://127.0.0.1:5174/login');
    await page.fill('input[name="email"]', 'head_nurse1@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await takeScreenshot('head-nurse-dashboard');

    console.log('2.2 查看排班页面...');
    await page.goto('http://127.0.0.1:5174/head-nurse/schedule');
    await page.waitForTimeout(3000); // Wait for calendar/gantt load
    await takeScreenshot('head-nurse-schedule-page');
    
    // 检查是否有待排班任务
    const hasPendingTasks = await page.textContent('body').then(text => text.includes('待排班') || text.includes('张三丰'));
    console.log(`❓ 是否看到待排班任务: ${hasPendingTasks ? '是' : '否'}`);

    await page.context().clearCookies();
    console.log('🚪 护士长登出');

    // ==========================================
    // 3. 医生端流程 (Doctor Flow)
    // ==========================================
    console.log('\n--- [角色: 医生] ---');
    console.log('3.1 登录...');
    await page.goto('http://127.0.0.1:5174/login');
    await page.fill('input[name="email"]', 'doctor1@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    console.log('3.2 查看预约待办...');
    await page.goto('http://127.0.0.1:5174/doctor/appointments');
    await page.waitForTimeout(2000);
    await takeScreenshot('doctor-appointments-page');

    // 检查是否有面诊申请
    const hasDoctorTask = await page.textContent('body').then(text => text.includes('李四'));
    console.log(`❓ 是否看到面诊申请: ${hasDoctorTask ? '是' : '否'}`);

    if (hasDoctorTask) {
        console.log('3.3 尝试接受预约...');
        // 查找包含“李四”的卡片中的“接受”按钮
        // 这是一个比较模糊的选择器，实际可能需要更精确
        try {
            await page.click('button:has-text("接受")');
            await page.waitForTimeout(1000);
            await takeScreenshot('doctor-accepted-result');
            console.log('✅ 点击接受按钮成功');
        } catch (e) {
            console.log('❌ 点击接受按钮失败:', e.message);
        }
    }

    console.log('🎉 全流程体验结束');

  } catch (error) {
    console.error('❌ 体验过程中发生错误:', error);
    await takeScreenshot('error-state');
  } finally {
    await browser.close();
  }
})();
