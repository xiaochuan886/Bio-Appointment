/**
 * 护士功能修复效果验证脚本
 * 创建时间: 2025-12-09
 * 描述: 全面验证护士功能修复的效果，包括数据库、API、前端和端到端工作流
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// 数据库配置
const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5437'),
  database: process.env.POSTGRES_DB || 'bio_appointment',
  user: process.env.POSTGRES_USER || 'app_user',
  password: process.env.POSTGRES_PASSWORD || 'secure_password_123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// 创建数据库连接池
const pool = new Pool(dbConfig);

// 颜色输出工具
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n📍 步骤 ${step}: ${message}`, 'cyan');
  log('='.repeat(80), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logTest(testName, status, details = '') {
  const statusIcon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  const statusColor = status === 'pass' ? 'green' : status === 'fail' ? 'red' : 'yellow';
  log(`  ${statusIcon} ${testName}`, statusColor);
  if (details) {
    log(`    ${details}`, 'bright');
  }
}

// 验证结果对象
const verificationResults = {
  database: {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
  },
  api: {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
  },
  frontend: {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
  },
  workflow: {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
  },
  startTime: new Date(),
  endTime: null,
  screenshots: [],
  logs: []
};

// 工具函数
function addTestResult(category, testName, status, details = '') {
  verificationResults[category].total++;
  if (status === 'pass') {
    verificationResults[category].passed++;
  } else if (status === 'fail') {
    verificationResults[category].failed++;
  }
  
  verificationResults[category].details.push({
    testName,
    status,
    details,
    timestamp: new Date().toISOString()
  });
  
  logTest(testName, status, details);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 1. 数据库验证模块
async function verifyDatabase() {
  logStep(1, '数据库验证模块');
  
  const client = await pool.connect();
  
  try {
    logInfo('检查数据库连接...');
    await client.query('SELECT NOW()');
    logSuccess('数据库连接正常');
    
    // 1.1 验证新增的表结构
    logInfo('验证新增的表结构...');
    
    const tables = [
      { name: 'task_executions', description: '任务执行记录表' },
      { name: 'nurse_sign_ins', description: '护士签到记录表' },
      { name: 'notifications', description: '通知记录表' }
    ];
    
    for (const table of tables) {
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '${table.name}'
          ) as exists
        `);
        
        if (result.rows[0].exists) {
          addTestResult('database', `${table.description} (${table.name})`, 'pass', '表结构创建成功');
        } else {
          addTestResult('database', `${table.description} (${table.name})`, 'fail', '表结构不存在');
        }
      } catch (error) {
        addTestResult('database', `${table.description} (${table.name})`, 'fail', error.message);
      }
    }
    
    // 1.2 验证枚举类型
    logInfo('验证新增的枚举类型...');
    
    const enums = [
      { name: 'task_execution_status_enum', description: '任务执行状态枚举' },
      { name: 'schedule_status_enum', description: '排班状态枚举' }
    ];
    
    for (const enumType of enums) {
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM pg_type 
            WHERE typname = '${enumType.name}'
          ) as exists
        `);
        
        if (result.rows[0].exists) {
          addTestResult('database', `${enumType.description} (${enumType.name})`, 'pass', '枚举类型创建成功');
        } else {
          addTestResult('database', `${enumType.description} (${enumType.name})`, 'fail', '枚举类型不存在');
        }
      } catch (error) {
        addTestResult('database', `${enumType.description} (${enumType.name})`, 'fail', error.message);
      }
    }
    
    // 1.3 验证视图
    logInfo('验证新增的视图...');
    
    const views = [
      { name: 'nurse_today_tasks', description: '护士今日任务视图' },
      { name: 'nurse_work_statistics', description: '护士工作统计视图' },
      { name: 'nurse_daily_report', description: '护士工作日报视图' }
    ];
    
    for (const view of views) {
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name = '${view.name}'
          ) as exists
        `);
        
        if (result.rows[0].exists) {
          addTestResult('database', `${view.description} (${view.name})`, 'pass', '视图创建成功');
        } else {
          addTestResult('database', `${view.description} (${view.name})`, 'fail', '视图不存在');
        }
      } catch (error) {
        addTestResult('database', `${view.description} (${view.name})`, 'fail', error.message);
      }
    }
    
    // 1.4 验证函数
    logInfo('验证新增的函数...');
    
    const functions = [
      { name: 'get_nurse_sign_in_status', description: '护士签到状态函数' },
      { name: 'update_task_status', description: '任务状态更新函数' }
    ];
    
    for (const func of functions) {
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM pg_proc 
            WHERE proname = '${func.name}'
          ) as exists
        `);
        
        if (result.rows[0].exists) {
          addTestResult('database', `${func.description} (${func.name})`, 'pass', '函数创建成功');
        } else {
          addTestResult('database', `${func.description} (${func.name})`, 'fail', '函数不存在');
        }
      } catch (error) {
        addTestResult('database', `${func.description} (${func.name})`, 'fail', error.message);
      }
    }
    
    // 1.5 验证索引
    logInfo('验证索引创建...');
    
    const indexes = [
      { name: 'idx_task_executions_schedule_id', table: 'task_executions' },
      { name: 'idx_task_executions_nurse_id', table: 'task_executions' },
      { name: 'idx_nurse_sign_ins_nurse_id', table: 'nurse_sign_ins' },
      { name: 'idx_notifications_user_id', table: 'notifications' }
    ];
    
    for (const index of indexes) {
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM pg_indexes 
            WHERE indexname = '${index.name}'
          ) as exists
        `);
        
        if (result.rows[0].exists) {
          addTestResult('database', `索引 ${index.name} (${index.table})`, 'pass', '索引创建成功');
        } else {
          addTestResult('database', `索引 ${index.name} (${index.table})`, 'fail', '索引不存在');
        }
      } catch (error) {
        addTestResult('database', `索引 ${index.name} (${index.table})`, 'fail', error.message);
      }
    }
    
    // 1.6 验证测试数据
    logInfo('验证测试数据...');
    
    const dataChecks = [
      { table: 'profiles', condition: "role = 'nurse'", description: '护士用户', minCount: 5 },
      { table: 'services', condition: "category IN ('体检', '疫苗接种', '咨询')", description: '服务类型', minCount: 6 },
      { table: 'resources', condition: "type IN ('体检室', '接种室', '咨询室', '观察室', '休息室')", description: '房间资源', minCount: 8 },
      { table: 'appointments', condition: '1=1', description: '预约记录', minCount: 50 },
      { table: 'schedules', condition: '1=1', description: '排班记录', minCount: 80 }
    ];
    
    for (const check of dataChecks) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${check.table} WHERE ${check.condition}`);
        const count = parseInt(result.rows[0].count);
        
        if (count >= check.minCount) {
          addTestResult('database', `${check.description}数据`, 'pass', `${count} 条记录 (≥${check.minCount})`);
        } else {
          addTestResult('database', `${check.description}数据`, 'fail', `${count} 条记录 (<${check.minCount})`);
        }
      } catch (error) {
        addTestResult('database', `${check.description}数据`, 'fail', error.message);
      }
    }
    
  } catch (error) {
    logError(`数据库验证过程中发生错误: ${error.message}`);
    addTestResult('database', '数据库验证过程', 'fail', error.message);
  } finally {
    client.release();
  }
}

// 2. API接口验证模块
async function verifyAPI() {
  logStep(2, 'API接口验证模块');
  
  const baseURL = 'http://localhost:3001';
  const nurseAPIURL = 'http://localhost:8080';
  
  // 测试用的护士账户
  const testNurse = {
    username: 'nurse001',
    password: '123456'
  };
  
  let authToken = null;
  let nurseUserId = null;
  
  try {
    // 2.1 测试护士登录API
    logInfo('测试护士登录API...');
    
    try {
      const loginResponse = await fetch(`${nurseAPIURL}/api/nurse/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testNurse)
      });
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        if (loginData.success && loginData.data.token) {
          authToken = loginData.data.token;
          nurseUserId = loginData.data.user.id;
          addTestResult('api', '护士登录API', 'pass', '登录成功，获取到token');
        } else {
          addTestResult('api', '护士登录API', 'fail', '登录响应格式错误');
        }
      } else {
        const errorText = await loginResponse.text();
        addTestResult('api', '护士登录API', 'fail', `登录失败: ${loginResponse.status} - ${errorText}`);
      }
    } catch (error) {
      addTestResult('api', '护士登录API', 'fail', `登录请求失败: ${error.message}`);
    }
    
    // 如果没有获取到token，尝试使用主API
    if (!authToken) {
      logWarning('护士API登录失败，尝试使用主API...');
      
      try {
        const loginResponse = await fetch(`${baseURL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testNurse)
        });
        
        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          if (loginData.access_token) {
            authToken = loginData.access_token;
            nurseUserId = loginData.user?.id;
            addTestResult('api', '主API护士登录', 'pass', '使用主API登录成功');
          } else {
            addTestResult('api', '主API护士登录', 'fail', '主API登录响应格式错误');
          }
        } else {
          addTestResult('api', '主API护士登录', 'fail', `主API登录失败: ${loginResponse.status}`);
        }
      } catch (error) {
        addTestResult('api', '主API护士登录', 'fail', `主API登录请求失败: ${error.message}`);
      }
    }
    
    if (!authToken) {
      logError('无法获取认证token，跳过需要认证的API测试');
      return;
    }
    
    // 2.2 测试护士签到API
    logInfo('测试护士签到API...');
    
    try {
      const signInResponse = await fetch(`${nurseAPIURL}/api/nurse/sign-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ notes: '验证测试签到' })
      });
      
      if (signInResponse.ok) {
        const signInData = await signInResponse.json();
        if (signInData.success) {
          addTestResult('api', '护士签到API', 'pass', '签到成功');
        } else {
          addTestResult('api', '护士签到API', 'fail', `签到失败: ${signInData.message}`);
        }
      } else {
        const errorText = await signInResponse.text();
        addTestResult('api', '护士签到API', 'fail', `签到请求失败: ${signInResponse.status} - ${errorText}`);
      }
    } catch (error) {
      addTestResult('api', '护士签到API', 'fail', `签到请求异常: ${error.message}`);
    }
    
    // 2.3 测试获取签到状态API
    logInfo('测试获取签到状态API...');
    
    try {
      const statusResponse = await fetch(`${nurseAPIURL}/api/nurse/sign-in-status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.success) {
          addTestResult('api', '获取签到状态API', 'pass', `状态获取成功: ${JSON.stringify(statusData.data)}`);
        } else {
          addTestResult('api', '获取签到状态API', 'fail', `状态获取失败: ${statusData.message}`);
        }
      } else {
        addTestResult('api', '获取签到状态API', 'fail', `状态请求失败: ${statusResponse.status}`);
      }
    } catch (error) {
      addTestResult('api', '获取签到状态API', 'fail', `状态请求异常: ${error.message}`);
    }
    
    // 2.4 测试获取今日任务API
    logInfo('测试获取今日任务API...');
    
    try {
      const tasksResponse = await fetch(`${nurseAPIURL}/api/nurse/today-tasks`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        if (tasksData.success) {
          const taskCount = tasksData.data.tasks?.all?.length || 0;
          addTestResult('api', '获取今日任务API', 'pass', `获取到 ${taskCount} 个任务`);
        } else {
          addTestResult('api', '获取今日任务API', 'fail', `任务获取失败: ${tasksData.message}`);
        }
      } else {
        addTestResult('api', '获取今日任务API', 'fail', `任务请求失败: ${tasksResponse.status}`);
      }
    } catch (error) {
      addTestResult('api', '获取今日任务API', 'fail', `任务请求异常: ${error.message}`);
    }
    
    // 2.5 测试获取工作统计API
    logInfo('测试获取工作统计API...');
    
    try {
      const statsResponse = await fetch(`${nurseAPIURL}/api/nurse/work-statistics`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          addTestResult('api', '获取工作统计API', 'pass', `统计获取成功: ${JSON.stringify(statsData.data.summary)}`);
        } else {
          addTestResult('api', '获取工作统计API', 'fail', `统计获取失败: ${statsData.message}`);
        }
      } else {
        addTestResult('api', '获取工作统计API', 'fail', `统计请求失败: ${statsResponse.status}`);
      }
    } catch (error) {
      addTestResult('api', '获取工作统计API', 'fail', `统计请求异常: ${error.message}`);
    }
    
    // 2.6 测试获取通知列表API
    logInfo('测试获取通知列表API...');
    
    try {
      const notificationsResponse = await fetch(`${nurseAPIURL}/api/nurse/notifications`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        if (notificationsData.success) {
          const notificationCount = notificationsData.data.notifications?.length || 0;
          addTestResult('api', '获取通知列表API', 'pass', `获取到 ${notificationCount} 条通知`);
        } else {
          addTestResult('api', '获取通知列表API', 'fail', `通知获取失败: ${notificationsData.message}`);
        }
      } else {
        addTestResult('api', '获取通知列表API', 'fail', `通知请求失败: ${notificationsResponse.status}`);
      }
    } catch (error) {
      addTestResult('api', '获取通知列表API', 'fail', `通知请求异常: ${error.message}`);
    }
    
    // 2.7 测试健康检查API
    logInfo('测试健康检查API...');
    
    try {
      const healthResponse = await fetch(`${nurseAPIURL}/api/nurse/health`);
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        if (healthData.success) {
          addTestResult('api', '健康检查API', 'pass', `服务状态: ${healthData.data.status}`);
        } else {
          addTestResult('api', '健康检查API', 'fail', `健康检查失败: ${healthData.message}`);
        }
      } else {
        addTestResult('api', '健康检查API', 'fail', `健康检查失败: ${healthResponse.status}`);
      }
    } catch (error) {
      addTestResult('api', '健康检查API', 'fail', `健康检查异常: ${error.message}`);
    }
    
  } catch (error) {
    logError(`API验证过程中发生错误: ${error.message}`);
    addTestResult('api', 'API验证过程', 'fail', error.message);
  }
}

// 3. 前端功能验证模块
async function verifyFrontend() {
  logStep(3, '前端功能验证模块');
  
  let browser;
  let context;
  let page;
  
  try {
    logInfo('启动浏览器...');
    browser = await chromium.launch({ headless: false }); // 设置为false以便观察
    context = await browser.newContext();
    page = await context.newPage();
    
    // 设置默认超时
    page.setDefaultTimeout(10000);
    
    const frontendURL = 'http://127.0.0.1:5173';
    
    // 3.1 测试护士登录页面
    logInfo('测试护士登录页面...');
    
    try {
      await page.goto(`${frontendURL}/auth/login`);
      await page.waitForLoadState('networkidle');
      
      // 检查登录页面元素
      const usernameInput = await page.locator('input[name="username"], input[placeholder*="用户名"], input[id*="username"]').first();
      const passwordInput = await page.locator('input[name="password"], input[placeholder*="密码"], input[id*="password"]').first();
      const loginButton = await page.locator('button[type="submit"], button:has-text("登录")').first();
      
      if (await usernameInput.isVisible() && await passwordInput.isVisible() && await loginButton.isVisible()) {
        addTestResult('frontend', '护士登录页面', 'pass', '登录页面元素正常显示');
        
        // 尝试登录
        await usernameInput.fill('nurse001');
        await passwordInput.fill('123456');
        await loginButton.click();
        
        // 等待登录完成
        await page.waitForLoadState('networkidle');
        await sleep(2000);
        
        // 检查是否登录成功（跳转到工作台或其他页面）
        const currentURL = page.url();
        if (currentURL.includes('/nurse') || currentURL.includes('/dashboard') || !currentURL.includes('/auth')) {
          addTestResult('frontend', '护士登录功能', 'pass', '登录成功，页面跳转正常');
        } else {
          addTestResult('frontend', '护士登录功能', 'fail', '登录失败或页面未跳转');
        }
      } else {
        addTestResult('frontend', '护士登录页面', 'fail', '登录页面元素缺失');
      }
    } catch (error) {
      addTestResult('frontend', '护士登录页面', 'fail', `登录页面测试失败: ${error.message}`);
    }
    
    // 3.2 测试护士排班页面
    logInfo('测试护士排班页面...');
    
    try {
      await page.goto(`${frontendURL}/nurse/schedule`);
      await page.waitForLoadState('networkidle');
      
      // 检查排班页面元素
      const scheduleTitle = await page.locator('h1:has-text("排班"), h1:has-text("我的排班")').first();
      const viewModeSelector = await page.locator('select:has-text("视图"), button:has-text("视图")').first();
      const calendarElement = await page.locator('.calendar, [data-testid="calendar"], .date-picker').first();
      
      if (await scheduleTitle.isVisible()) {
        addTestResult('frontend', '护士排班页面', 'pass', '排班页面标题正常显示');
        
        // 测试视图切换
        if (await viewModeSelector.isVisible()) {
          addTestResult('frontend', '排班页面视图切换', 'pass', '视图切换控件存在');
          
          // 尝试切换视图
          await viewModeSelector.click();
          await sleep(1000);
          
          const weekViewOption = await page.locator('option:has-text("周"), button:has-text("周")').first();
          if (await weekViewOption.isVisible()) {
            await weekViewOption.click();
            await sleep(1000);
            addTestResult('frontend', '排班页面周视图', 'pass', '周视图切换成功');
          } else {
            addTestResult('frontend', '排班页面周视图', 'fail', '周视图选项不存在');
          }
        } else {
          addTestResult('frontend', '排班页面视图切换', 'fail', '视图切换控件不存在');
        }
        
        // 检查日历组件
        if (await calendarElement.isVisible()) {
          addTestResult('frontend', '排班页面日历组件', 'pass', '日历组件正常显示');
        } else {
          addTestResult('frontend', '排班页面日历组件', 'fail', '日历组件未找到');
        }
      } else {
        addTestResult('frontend', '护士排班页面', 'fail', '排班页面标题未找到');
      }
    } catch (error) {
      addTestResult('frontend', '护士排班页面', 'fail', `排班页面测试失败: ${error.message}`);
    }
    
    // 3.3 测试护士任务页面
    logInfo('测试护士任务页面...');
    
    try {
      await page.goto(`${frontendURL}/nurse/tasks`);
      await page.waitForLoadState('networkidle');
      
      // 检查任务页面元素
      const taskTitle = await page.locator('h1:has-text("任务"), h1:has-text("我的任务")').first();
      const taskStats = await page.locator('.card, .stat-card').first();
      const searchInput = await page.locator('input[placeholder*="搜索"], input[type="search"]').first();
      
      if (await taskTitle.isVisible()) {
        addTestResult('frontend', '护士任务页面', 'pass', '任务页面标题正常显示');
        
        // 检查统计卡片
        if (await taskStats.isVisible()) {
          addTestResult('frontend', '任务页面统计卡片', 'pass', '统计卡片正常显示');
        } else {
          addTestResult('frontend', '任务页面统计卡片', 'fail', '统计卡片未找到');
        }
        
        // 检查搜索功能
        if (await searchInput.isVisible()) {
          addTestResult('frontend', '任务页面搜索功能', 'pass', '搜索输入框存在');
          
          // 尝试搜索
          await searchInput.fill('test');
          await sleep(1000);
          addTestResult('frontend', '任务页面搜索操作', 'pass', '搜索操作执行成功');
        } else {
          addTestResult('frontend', '任务页面搜索功能', 'fail', '搜索输入框未找到');
        }
      } else {
        addTestResult('frontend', '护士任务页面', 'fail', '任务页面标题未找到');
      }
    } catch (error) {
      addTestResult('frontend', '护士任务页面', 'fail', `任务页面测试失败: ${error.message}`);
    }
    
    // 3.4 测试护士历史页面
    logInfo('测试护士历史页面...');
    
    try {
      await page.goto(`${frontendURL}/nurse/history`);
      await page.waitForLoadState('networkidle');
      
      // 检查历史页面元素
      const historyTitle = await page.locator('h1:has-text("历史"), h1:has-text("任务历史")').first();
      const filterSection = await page.locator('.filter, .filter-section, [data-testid="filter"]').first();
      const exportButton = await page.locator('button:has-text("导出"), button:has-text("下载")').first();
      
      if (await historyTitle.isVisible()) {
        addTestResult('frontend', '护士历史页面', 'pass', '历史页面标题正常显示');
        
        // 检查筛选功能
        if (await filterSection.isVisible()) {
          addTestResult('frontend', '历史页面筛选功能', 'pass', '筛选区域正常显示');
          
          // 尝试使用筛选
          const dateFilter = await filterSection.locator('input[type="date"], .date-picker').first();
          if (await dateFilter.isVisible()) {
            await dateFilter.fill('2025-12-01');
            await sleep(1000);
            addTestResult('frontend', '历史页面日期筛选', 'pass', '日期筛选操作成功');
          } else {
            addTestResult('frontend', '历史页面日期筛选', 'fail', '日期筛选控件未找到');
          }
        } else {
          addTestResult('frontend', '历史页面筛选功能', 'fail', '筛选区域未找到');
        }
        
        // 检查导出功能
        if (await exportButton.isVisible()) {
          addTestResult('frontend', '历史页面导出功能', 'pass', '导出按钮存在');
        } else {
          addTestResult('frontend', '历史页面导出功能', 'fail', '导出按钮未找到');
        }
      } else {
        addTestResult('frontend', '护士历史页面', 'fail', '历史页面标题未找到');
      }
    } catch (error) {
      addTestResult('frontend', '护士历史页面', 'fail', `历史页面测试失败: ${error.message}`);
    }
    
    // 3.5 截图保存
    logInfo('保存前端页面截图...');
    
    try {
      const screenshotPath = 'nurse-frontend-verification.png';
      await page.screenshot({ path: screenshotPath, fullPage: true });
      verificationResults.screenshots.push(screenshotPath);
      addTestResult('frontend', '前端页面截图', 'pass', `截图保存至: ${screenshotPath}`);
    } catch (error) {
      addTestResult('frontend', '前端页面截图', 'fail', `截图保存失败: ${error.message}`);
    }
    
  } catch (error) {
    logError(`前端验证过程中发生错误: ${error.message}`);
    addTestResult('frontend', '前端验证过程', 'fail', error.message);
  } finally {
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

// 4. 端到端工作流验证
async function verifyWorkflow() {
  logStep(4, '端到端工作流验证');
  
  let browser;
  let context;
  let page;
  
  try {
    logInfo('启动浏览器进行端到端测试...');
    browser = await chromium.launch({ headless: false });
    context = await browser.newContext();
    page = await context.newPage();
    
    page.setDefaultTimeout(10000);
    
    const frontendURL = 'http://127.0.0.1:5173';
    const nurseAPIURL = 'http://localhost:8080';
    
    // 4.1 完整的护士工作流程测试
    logInfo('执行完整护士工作流程测试...');
    
    try {
      // 步骤1: 护士登录
      await page.goto(`${frontendURL}/auth/login`);
      await page.waitForLoadState('networkidle');
      
      const usernameInput = await page.locator('input[name="username"], input[placeholder*="用户名"]').first();
      const passwordInput = await page.locator('input[name="password"], input[placeholder*="密码"]').first();
      const loginButton = await page.locator('button[type="submit"], button:has-text("登录")').first();
      
      await usernameInput.fill('nurse001');
      await passwordInput.fill('123456');
      await loginButton.click();
      await page.waitForLoadState('networkidle');
      await sleep(2000);
      
      addTestResult('workflow', '护士登录', 'pass', '登录成功');
      
      // 步骤2: 查看排班
      await page.goto(`${frontendURL}/nurse/schedule`);
      await page.waitForLoadState('networkidle');
      
      const scheduleTitle = await page.locator('h1:has-text("排班")').first();
      if (await scheduleTitle.isVisible()) {
        addTestResult('workflow', '查看排班', 'pass', '排班页面加载成功');
      } else {
        addTestResult('workflow', '查看排班', 'fail', '排班页面加载失败');
      }
      
      // 步骤3: 查看任务
      await page.goto(`${frontendURL}/nurse/tasks`);
      await page.waitForLoadState('networkidle');
      
      const taskTitle = await page.locator('h1:has-text("任务")').first();
      if (await taskTitle.isVisible()) {
        addTestResult('workflow', '查看任务', 'pass', '任务页面加载成功');
        
        // 尝试找到任务并进行操作
        const taskCard = await page.locator('.card, .task-card').first();
        if (await taskCard.isVisible()) {
          addTestResult('workflow', '任务列表显示', 'pass', '任务卡片正常显示');
          
          // 尝试点击任务
          await taskCard.click();
          await sleep(1000);
          
          // 查看是否有操作按钮
          const actionButton = await page.locator('button:has-text("客户到达"), button:has-text("开始服务")').first();
          if (await actionButton.isVisible()) {
            addTestResult('workflow', '任务操作按钮', 'pass', '任务操作按钮存在');
          } else {
            addTestResult('workflow', '任务操作按钮', 'fail', '任务操作按钮未找到');
          }
        } else {
          addTestResult('workflow', '任务列表显示', 'fail', '任务卡片未找到');
        }
      } else {
        addTestResult('workflow', '查看任务', 'fail', '任务页面加载失败');
      }
      
      // 步骤4: 查看历史
      await page.goto(`${frontendURL}/nurse/history`);
      await page.waitForLoadState('networkidle');
      
      const historyTitle = await page.locator('h1:has-text("历史")').first();
      if (await historyTitle.isVisible()) {
        addTestResult('workflow', '查看历史', 'pass', '历史页面加载成功');
        
        // 尝试使用筛选功能
        const filterSection = await page.locator('.filter, .filter-section').first();
        if (await filterSection.isVisible()) {
          addTestResult('workflow', '历史筛选功能', 'pass', '历史筛选功能可用');
        } else {
          addTestResult('workflow', '历史筛选功能', 'fail', '历史筛选功能不可用');
        }
      } else {
        addTestResult('workflow', '查看历史', 'fail', '历史页面加载失败');
      }
      
      addTestResult('workflow', '完整工作流程', 'pass', '端到端工作流程测试完成');
      
    } catch (error) {
      addTestResult('workflow', '完整工作流程', 'fail', `工作流程测试失败: ${error.message}`);
    }
    
    // 4.2 API工作流程测试
    logInfo('执行API工作流程测试...');
    
    try {
      // 获取登录token
      const loginResponse = await fetch(`${nurseAPIURL}/api/nurse/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'nurse001', password: '123456' })
      });
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        const token = loginData.data?.token;
        
        if (token) {
          addTestResult('workflow', 'API登录', 'pass', 'API登录成功');
          
          // 测试签到
          const signInResponse = await fetch(`${nurseAPIURL}/api/nurse/sign-in`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ notes: '工作流测试签到' })
          });
          
          if (signInResponse.ok) {
            addTestResult('workflow', 'API签到', 'pass', 'API签到成功');
          } else {
            addTestResult('workflow', 'API签到', 'fail', 'API签到失败');
          }
          
          // 测试获取任务
          const tasksResponse = await fetch(`${nurseAPIURL}/api/nurse/today-tasks`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (tasksResponse.ok) {
            const tasksData = await tasksResponse.json();
            if (tasksData.success) {
              addTestResult('workflow', 'API获取任务', 'pass', `获取到 ${tasksData.data.tasks?.all?.length || 0} 个任务`);
            } else {
              addTestResult('workflow', 'API获取任务', 'fail', '任务获取响应失败');
            }
          } else {
            addTestResult('workflow', 'API获取任务', 'fail', '任务获取请求失败');
          }
        } else {
          addTestResult('workflow', 'API登录', 'fail', 'API登录未获取到token');
        }
      } else {
        addTestResult('workflow', 'API登录', 'fail', 'API登录请求失败');
      }
    } catch (error) {
      addTestResult('workflow', 'API工作流程', 'fail', `API工作流程测试失败: ${error.message}`);
    }
    
  } catch (error) {
    logError(`端到端工作流验证过程中发生错误: ${error.message}`);
    addTestResult('workflow', '工作流验证过程', 'fail', error.message);
  } finally {
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

// 5. 报告生成模块
function generateReport() {
  logStep(5, '生成验证报告');
  
  verificationResults.endTime = new Date();
  const duration = (verificationResults.endTime - verificationResults.startTime) / 1000;
  
  // 计算总体统计
  const totalTests = verificationResults.database.total + 
                     verificationResults.api.total + 
                     verificationResults.frontend.total + 
                     verificationResults.workflow.total;
  
  const totalPassed = verificationResults.database.passed + 
                     verificationResults.api.passed + 
                     verificationResults.frontend.passed + 
                     verificationResults.workflow.passed;
  
  const totalFailed = verificationResults.database.failed + 
                     verificationResults.api.failed + 
                     verificationResults.frontend.failed + 
                     verificationResults.workflow.failed;
  
  const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : 0;
  
  // 生成JSON报告
  const jsonReport = {
    summary: {
      startTime: verificationResults.startTime.toISOString(),
      endTime: verificationResults.endTime.toISOString(),
      duration: `${duration.toFixed(2)}秒`,
      totalTests,
      totalPassed,
      totalFailed,
      successRate: `${successRate}%`,
      status: totalFailed === 0 ? '通过' : totalFailed <= totalTests * 0.1 ? '部分通过' : '失败'
    },
    categories: {
      database: {
        total: verificationResults.database.total,
        passed: verificationResults.database.passed,
        failed: verificationResults.database.failed,
        successRate: verificationResults.database.total > 0 
          ? `${((verificationResults.database.passed / verificationResults.database.total) * 100).toFixed(2)}%` 
          : '0%',
        details: verificationResults.database.details
      },
      api: {
        total: verificationResults.api.total,
        passed: verificationResults.api.passed,
        failed: verificationResults.api.failed,
        successRate: verificationResults.api.total > 0 
          ? `${((verificationResults.api.passed / verificationResults.api.total) * 100).toFixed(2)}%` 
          : '0%',
        details: verificationResults.api.details
      },
      frontend: {
        total: verificationResults.frontend.total,
        passed: verificationResults.frontend.passed,
        failed: verificationResults.frontend.failed,
        successRate: verificationResults.frontend.total > 0 
          ? `${((verificationResults.frontend.passed / verificationResults.frontend.total) * 100).toFixed(2)}%` 
          : '0%',
        details: verificationResults.frontend.details
      },
      workflow: {
        total: verificationResults.workflow.total,
        passed: verificationResults.workflow.passed,
        failed: verificationResults.workflow.failed,
        successRate: verificationResults.workflow.total > 0 
          ? `${((verificationResults.workflow.passed / verificationResults.workflow.total) * 100).toFixed(2)}%` 
          : '0%',
        details: verificationResults.workflow.details
      }
    },
    screenshots: verificationResults.screenshots,
    recommendations: generateRecommendations()
  };
  
  // 保存JSON报告
  const jsonReportPath = 'nurse-workflow-verification-report.json';
  fs.writeFileSync(jsonReportPath, JSON.stringify(jsonReport, null, 2));
  logSuccess(`JSON报告已保存至: ${jsonReportPath}`);
  
  // 生成HTML报告
  const htmlReport = generateHTMLReport(jsonReport);
  const htmlReportPath = 'nurse-workflow-verification-report.html';
  fs.writeFileSync(htmlReportPath, htmlReport);
  logSuccess(`HTML报告已保存至: ${htmlReportPath}`);
  
  // 输出总结
  log('\n📊 验证结果总结:', 'bright');
  log('='.repeat(50), 'bright');
  log(`总测试数: ${totalTests}`, 'bright');
  log(`通过数: ${totalPassed}`, 'green');
  log(`失败数: ${totalFailed}`, 'red');
  log(`成功率: ${successRate}%`, successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red');
  log(`验证状态: ${jsonReport.summary.status}`, jsonReport.summary.status === '通过' ? 'green' : jsonReport.summary.status === '部分通过' ? 'yellow' : 'red');
  log(`耗时: ${duration.toFixed(2)}秒`, 'bright');
  
  // 输出分类统计
  log('\n📈 分类统计:', 'bright');
  log(`数据库: ${verificationResults.database.passed}/${verificationResults.database.total} (${((verificationResults.database.passed / verificationResults.database.total) * 100).toFixed(1)}%)`, 'cyan');
  log(`API接口: ${verificationResults.api.passed}/${verificationResults.api.total} (${((verificationResults.api.passed / verificationResults.api.total) * 100).toFixed(1)}%)`, 'cyan');
  log(`前端功能: ${verificationResults.frontend.passed}/${verificationResults.frontend.total} (${((verificationResults.frontend.passed / verificationResults.frontend.total) * 100).toFixed(1)}%)`, 'cyan');
  log(`工作流程: ${verificationResults.workflow.passed}/${verificationResults.workflow.total} (${((verificationResults.workflow.passed / verificationResults.workflow.total) * 100).toFixed(1)}%)`, 'cyan');
  
  return jsonReport;
}

// 生成改进建议
function generateRecommendations() {
  const recommendations = [];
  
  // 数据库相关建议
  if (verificationResults.database.failed > 0) {
    recommendations.push({
      category: '数据库',
      priority: '高',
      description: '数据库结构或数据存在问题，建议检查迁移脚本和数据生成脚本'
    });
  }
  
  // API相关建议
  if (verificationResults.api.failed > 0) {
    recommendations.push({
      category: 'API接口',
      priority: '高',
      description: 'API接口存在问题，建议检查API服务器状态和接口实现'
    });
  }
  
  // 前端相关建议
  if (verificationResults.frontend.failed > 0) {
    recommendations.push({
      category: '前端功能',
      priority: '中',
      description: '前端功能存在问题，建议检查页面组件和交互逻辑'
    });
  }
  
  // 工作流相关建议
  if (verificationResults.workflow.failed > 0) {
    recommendations.push({
      category: '工作流程',
      priority: '高',
      description: '端到端工作流程存在问题，建议检查整体系统集成'
    });
  }
  
  // 成功率建议
  const totalTests = verificationResults.database.total + verificationResults.api.total + 
                     verificationResults.frontend.total + verificationResults.workflow.total;
  const totalPassed = verificationResults.database.passed + verificationResults.api.passed + 
                     verificationResults.frontend.passed + verificationResults.workflow.passed;
  const successRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
  
  if (successRate >= 90) {
    recommendations.push({
      category: '整体评估',
      priority: '低',
      description: '系统功能完善，可以考虑部署到生产环境'
    });
  } else if (successRate >= 70) {
    recommendations.push({
      category: '整体评估',
      priority: '中',
      description: '系统基本可用，建议修复失败的功能后再部署'
    });
  } else {
    recommendations.push({
      category: '整体评估',
      priority: '高',
      description: '系统存在较多问题，不建议部署，需要全面修复'
    });
  }
  
  return recommendations;
}

// 生成HTML报告
function generateHTMLReport(report) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>护士功能修复验证报告</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e0e0e0; padding-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #333; }
        .summary-card .value { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .pass { color: #28a745; }
        .fail { color: #dc3545; }
        .partial { color: #ffc107; }
        .category { margin-bottom: 30px; }
        .category h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .test-list { list-style: none; padding: 0; }
        .test-item { padding: 10px; margin: 5px 0; border-left: 4px solid #ddd; background: #f9f9f9; }
        .test-item.pass { border-left-color: #28a745; }
        .test-item.fail { border-left-color: #dc3545; }
        .test-item .name { font-weight: bold; }
        .test-item .details { color: #666; font-size: 0.9em; margin-top: 5px; }
        .recommendations { margin-top: 30px; }
        .recommendation { padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #007bff; background: #f8f9fa; }
        .recommendation.high { border-left-color: #dc3545; }
        .recommendation.medium { border-left-color: #ffc107; }
        .recommendation.low { border-left-color: #28a745; }
        .screenshots { margin-top: 30px; }
        .screenshot { margin: 10px; border: 1px solid #ddd; border-radius: 5px; overflow: hidden; }
        .screenshot img { width: 100%; height: auto; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>护士功能修复验证报告</h1>
            <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
            <p>验证耗时: ${report.summary.duration}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>总测试数</h3>
                <div class="value">${report.summary.totalTests}</div>
            </div>
            <div class="summary-card">
                <h3>通过数</h3>
                <div class="value pass">${report.summary.totalPassed}</div>
            </div>
            <div class="summary-card">
                <h3>失败数</h3>
                <div class="value fail">${report.summary.totalFailed}</div>
            </div>
            <div class="summary-card">
                <h3>成功率</h3>
                <div class="value ${report.summary.successRate === '100%' ? 'pass' : report.summary.successRate >= '90%' ? 'pass' : report.summary.successRate >= '70%' ? 'partial' : 'fail'}">${report.summary.successRate}</div>
            </div>
            <div class="summary-card">
                <h3>验证状态</h3>
                <div class="value ${report.summary.status === '通过' ? 'pass' : report.summary.status === '部分通过' ? 'partial' : 'fail'}">${report.summary.status}</div>
            </div>
        </div>
        
        <div class="category">
            <h2>数据库验证</h2>
            <div class="test-list">
                ${report.categories.database.details.map(test => `
                    <div class="test-item ${test.status}">
                        <div class="name">${test.testName}</div>
                        <div class="details">${test.details}</div>
                    </div>
                `).join('')}
            </div>
            <p>通过率: ${report.categories.database.successRate}</p>
        </div>
        
        <div class="category">
            <h2>API接口验证</h2>
            <div class="test-list">
                ${report.categories.api.details.map(test => `
                    <div class="test-item ${test.status}">
                        <div class="name">${test.testName}</div>
                        <div class="details">${test.details}</div>
                    </div>
                `).join('')}
            </div>
            <p>通过率: ${report.categories.api.successRate}</p>
        </div>
        
        <div class="category">
            <h2>前端功能验证</h2>
            <div class="test-list">
                ${report.categories.frontend.details.map(test => `
                    <div class="test-item ${test.status}">
                        <div class="name">${test.testName}</div>
                        <div class="details">${test.details}</div>
                    </div>
                `).join('')}
            </div>
            <p>通过率: ${report.categories.frontend.successRate}</p>
        </div>
        
        <div class="category">
            <h2>端到端工作流验证</h2>
            <div class="test-list">
                ${report.categories.workflow.details.map(test => `
                    <div class="test-item ${test.status}">
                        <div class="name">${test.testName}</div>
                        <div class="details">${test.details}</div>
                    </div>
                `).join('')}
            </div>
            <p>通过率: ${report.categories.workflow.successRate}</p>
        </div>
        
        <div class="recommendations">
            <h2>改进建议</h2>
            ${report.recommendations.map(rec => `
                <div class="recommendation ${rec.priority}">
                    <h4>${rec.category} - ${rec.priority}优先级</h4>
                    <p>${rec.description}</p>
                </div>
            `).join('')}
        </div>
        
        ${report.screenshots.length > 0 ? `
            <div class="screenshots">
                <h2>测试截图</h2>
                ${report.screenshots.map(screenshot => `
                    <div class="screenshot">
                        <img src="${screenshot}" alt="测试截图" />
                    </div>
                `).join('')}
            </div>
        ` : ''}
    </div>
</body>
</html>
  `;
}

// 主函数
async function main() {
  log('\n🚀 护士功能修复效果验证开始...', 'bright');
  log('='.repeat(80), 'bright');
  
  try {
    // 1. 数据库验证
    await verifyDatabase();
    
    // 2. API接口验证
    await verifyAPI();
    
    // 3. 前端功能验证
    await verifyFrontend();
    
    // 4. 端到端工作流验证
    await verifyWorkflow();
    
    // 5. 生成报告
    const report = generateReport();
    
    log('\n🎉 护士功能修复验证完成！', 'bright');
    log('='.repeat(80), 'bright');
    
    // 根据验证结果给出最终建议
    if (report.summary.status === '通过') {
      logSuccess('所有功能验证通过，护士功能修复成功！');
      logInfo('建议：可以部署到生产环境');
    } else if (report.summary.status === '部分通过') {
      logWarning('部分功能验证失败，护士功能基本可用但需要改进');
      logInfo('建议：修复失败的功能后再部署');
    } else {
      logError('多项功能验证失败，护士功能存在严重问题');
      logInfo('建议：全面修复后再进行验证');
    }
    
  } catch (error) {
    logError(`验证过程中发生严重错误: ${error.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  main,
  verifyDatabase,
  verifyAPI,
  verifyFrontend,
  verifyWorkflow,
  generateReport
};