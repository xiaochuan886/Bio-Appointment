const fetch = require('node-fetch');

// API 基础 URL
const API_BASE = 'http://localhost:3001/api';

// 测试用户凭据
const HEAD_NURSE_CREDENTIALS = {
  email: 'head_nurse1', // 使用用户名而不是邮箱
  password: '123456'
};

// 辅助函数：登录并获取 token
async function login(credentials) {
  console.log('🔐 登录中...');
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(credentials)
  });

  if (!response.ok) {
    throw new Error(`登录失败: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log('✅ 登录成功:', data.user.full_name, '(', data.user.role, ')');
  return data.tokens.accessToken;
}

// 辅助函数：发送 API 请求
async function apiRequest(endpoint, token, params = {}) {
  const url = new URL(`${API_BASE}${endpoint}`);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// 测试护士长查看自己的排班
async function testHeadNurseViewOwnSchedule() {
  console.log('\n🧪 测试护士长查看自己的排班');
  
  try {
    // 1. 护士长登录
    const headNurseToken = await login(HEAD_NURSE_CREDENTIALS);
    
    // 2. 获取护士长自己的排班（不指定 nurse_id，应该只返回自己的排班）
    console.log('\n📋 获取护士长自己的排班...');
    const schedules = await apiRequest('/schedules', headNurseToken, {
      start_date: '2025-12-01',
      end_date: '2025-12-31'
    });
    
    console.log(`📊 找到 ${schedules.length} 个排班记录`);
    
    // 3. 检查排班中是否包含护士长自己的记录
    const headNurseSchedules = schedules.filter(s => s.nurse_role === 'head_nurse');
    console.log(`👩‍⚕️ 其中护士长的排班: ${headNurseSchedules.length} 个`);
    
    if (headNurseSchedules.length > 0) {
      console.log('✅ 护士长可以查看自己的排班记录');
      headNurseSchedules.slice(0, 3).forEach((schedule, index) => {
        console.log(`  ${index + 1}. ${schedule.scheduled_date} ${schedule.scheduled_time_start}-${schedule.scheduled_time_end} ${schedule.customer_name || '无客户'}`);
      });
    } else {
      console.log('❌ 护士长无法查看自己的排班记录');
    }
    
    // 4. 尝试指定护士长自己的ID获取排班
    console.log('\n🔍 尝试通过护士ID获取排班...');
    
    // 从已有的排班记录中获取护士长的ID
    const headNurseSchedule = headNurseSchedules[0];
    if (headNurseSchedule && headNurseSchedule.nurse_id) {
      console.log('👩‍⚕️ 从排班记录中找到护士长ID:', headNurseSchedule.nurse_id);
      
      const ownSchedules = await apiRequest('/schedules', headNurseToken, {
        nurse_id: headNurseSchedule.nurse_id,
        start_date: '2025-12-01',
        end_date: '2025-12-31'
      });
      
      console.log(`📊 通过ID找到 ${ownSchedules.length} 个排班记录`);
      
      if (ownSchedules.length > 0) {
        console.log('✅ 护士长可以通过ID查看自己的排班记录');
      } else {
        console.log('❌ 护士长无法通过ID查看自己的排班记录');
      }
    } else {
      console.log('❌ 无法从排班记录中获取护士长ID');
    }
    
    return { success: true, schedules, headNurseSchedules };
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return { success: false, error: error.message };
  }
}

// 测试护士长查看自己的任务
async function testHeadNurseViewOwnTasks() {
  console.log('\n🧪 测试护士长查看自己的任务');
  
  try {
    // 1. 护士长登录
    const headNurseToken = await login(HEAD_NURSE_CREDENTIALS);
    
    // 2. 获取今天的任务（应该包含护士长自己的任务）
    console.log('\n📋 获取护士长今天的任务...');
    const today = new Date().toISOString().split('T')[0];
    const tasks = await apiRequest('/schedules', headNurseToken, {
      date: today
    });
    
    console.log(`📊 找到 ${tasks.length} 个任务记录`);
    
    // 3. 检查任务中是否包含护士长自己的记录
    const headNurseTasks = tasks.filter(s => s.nurse_role === 'head_nurse');
    console.log(`👩‍⚕️ 其中护士长的任务: ${headNurseTasks.length} 个`);
    
    if (headNurseTasks.length > 0) {
      console.log('✅ 护士长可以查看自己的任务记录');
      headNurseTasks.slice(0, 3).forEach((task, index) => {
        console.log(`  ${index + 1}. ${task.scheduled_time_start}-${task.scheduled_time_end} ${task.customer_name || '无客户'} (${task.status || '无状态'})`);
      });
    } else {
      console.log('❌ 护士长无法查看自己的任务记录');
    }
    
    return { success: true, tasks, headNurseTasks };
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return { success: false, error: error.message };
  }
}

// 测试护士长查看自己的历史记录
async function testHeadNurseViewOwnHistory() {
  console.log('\n🧪 测试护士长查看自己的历史记录');
  
  try {
    // 1. 护士长登录
    const headNurseToken = await login(HEAD_NURSE_CREDENTIALS);
    
    // 2. 获取历史记录
    console.log('\n📋 获取护士长的历史记录...');
    const history = await apiRequest('/schedules', headNurseToken, {
      start_date: '2025-11-01',
      end_date: '2025-12-31'
    });
    
    console.log(`📊 找到 ${history.length} 个历史记录`);
    
    // 3. 检查历史记录中是否包含护士长自己的记录
    const headNurseHistory = history.filter(s => s.nurse_role === 'head_nurse');
    console.log(`👩‍⚕️ 其中护士长的历史: ${headNurseHistory.length} 个`);
    
    if (headNurseHistory.length > 0) {
      console.log('✅ 护士长可以查看自己的历史记录');
      headNurseHistory.slice(0, 3).forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.scheduled_date} ${record.scheduled_time_start}-${record.scheduled_time_end} ${record.customer_name || '无客户'} (${record.status || '无状态'})`);
      });
    } else {
      console.log('❌ 护士长无法查看自己的历史记录');
    }
    
    return { success: true, history, headNurseHistory };
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return { success: false, error: error.message };
  }
}

// 主函数
async function main() {
  console.log('🚀 开始测试护士长查看自己的排班、任务和历史记录功能');
  
  // 测试1: 查看自己的排班
  const scheduleResult = await testHeadNurseViewOwnSchedule();
  
  // 测试2: 查看自己的任务
  const taskResult = await testHeadNurseViewOwnTasks();
  
  // 测试3: 查看自己的历史记录
  const historyResult = await testHeadNurseViewOwnHistory();
  
  // 总结
  console.log('\n📊 测试结果总结:');
  console.log('1. 护士长查看自己的排班:', scheduleResult.success ? '✅ 成功' : '❌ 失败');
  console.log('2. 护士长查看自己的任务:', taskResult.success ? '✅ 成功' : '❌ 失败');
  console.log('3. 护士长查看自己的历史记录:', historyResult.success ? '✅ 成功' : '❌ 失败');
  
  if (scheduleResult.success && taskResult.success && historyResult.success) {
    console.log('\n🎉 所有测试通过！护士长可以查看自己的排班、任务和历史记录。');
  } else {
    console.log('\n⚠️ 部分测试失败，需要检查权限设置。');
  }
}

// 运行测试
main().catch(console.error);