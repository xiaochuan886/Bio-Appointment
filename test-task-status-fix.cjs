// 任务状态管理修复验证脚本
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';

// 模拟护士登录获取token
async function getNurseToken() {
  console.log('🔍 [TEST] 获取护士token...');
  
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'nurse@example.com',
      password: 'password123'
    }),
  });

  if (!response.ok) {
    throw new Error('登录失败');
  }

  const data = await response.json();
  console.log('🔍 [TEST] 登录成功，获取token');
  return data.accessToken;
}

// 获取任务列表
async function getTasks(token) {
  console.log('🔍 [TEST] 获取任务列表...');
  
  const response = await fetch(`${API_BASE}/schedules?date=2025-12-09`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('获取任务失败');
  }

  const tasks = await response.json();
  console.log(`🔍 [TEST] 获取到 ${tasks.length} 个任务`);
  return tasks;
}

// 模拟快速点击两个任务完成
async function simulateRapidClicks(token, tasks) {
  console.log('🔍 [TEST] 模拟快速点击两个任务完成...');
  
  if (tasks.length < 2) {
    console.log('🔍 [TEST] 任务数量不足，跳过测试');
    return;
  }

  const task1 = tasks[0];
  const task2 = tasks[1];

  console.log(`🔍 [TEST] 选择任务1: ${task1.id}, 状态: ${task1.status}`);
  console.log(`🔍 [TEST] 选择任务2: ${task2.id}, 状态: ${task2.status}`);

  // 模拟快速连续点击（间隔100ms）
  const promises = [
    updateTaskStatus(token, task1.id, 'completed'),
    new Promise(resolve => setTimeout(() => resolve(updateTaskStatus(token, task2.id, 'completed')), 100))
  ];

  const results = await Promise.allSettled(promises);
  
  console.log('🔍 [TEST] 并发更新结果:');
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`  任务${index + 1}: 更新成功`);
    } else {
      console.log(`  任务${index + 1}: 更新失败 - ${result.reason.message}`);
    }
  });

  return results;
}

// 更新任务状态
async function updateTaskStatus(token, taskId, status) {
  console.log(`🔍 [TEST] 更新任务 ${taskId} 状态为 ${status}`);
  
  const response = await fetch(`${API_BASE}/schedules/${taskId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: status,
      notes: '测试状态更新'
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '更新失败');
  }

  const result = await response.json();
  console.log(`🔍 [TEST] 任务 ${taskId} 更新成功，新状态: ${result.status}`);
  return result;
}

// 验证最终状态
async function verifyFinalState(token, originalTasks) {
  console.log('🔍 [TEST] 验证最终状态...');
  
  const finalTasks = await getTasks(token);
  
  console.log('🔍 [TEST] 最终状态对比:');
  originalTasks.forEach(originalTask => {
    const finalTask = finalTasks.find(t => t.id === originalTask.id);
    if (finalTask) {
      const changed = originalTask.status !== finalTask.status;
      console.log(`  任务 ${originalTask.id}: ${originalTask.status} -> ${finalTask.status} ${changed ? '✓' : '✗'}`);
    } else {
      console.log(`  任务 ${originalTask.id}: 消失了 ✗`);
    }
  });

  return finalTasks;
}

// 主测试函数
async function runTest() {
  try {
    console.log('🔍 [TEST] 开始任务状态管理修复验证测试');
    console.log('=' .repeat(60));

    // 1. 获取token
    const token = await getNurseToken();

    // 2. 获取初始任务列表
    const originalTasks = await getTasks(token);
    
    if (originalTasks.length === 0) {
      console.log('🔍 [TEST] 没有任务，创建测试任务...');
      // 这里可以创建测试任务，但为了简化，我们跳过
      console.log('🔍 [TEST] 测试结束：没有可用的任务');
      return;
    }

    // 3. 模拟快速点击
    await simulateRapidClicks(token, originalTasks);

    // 4. 等待一段时间让状态稳定
    console.log('🔍 [TEST] 等待2秒让状态稳定...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. 验证最终状态
    const finalTasks = await verifyFinalState(token, originalTasks);

    // 6. 分析结果
    console.log('=' .repeat(60));
    console.log('🔍 [TEST] 测试结果分析:');
    
    const completedCount = finalTasks.filter(t => t.status === 'completed').length;
    const originalCompletedCount = originalTasks.filter(t => t.status === 'completed').length;
    const newlyCompleted = completedCount - originalCompletedCount;

    console.log(`🔍 [TEST] 原始完成任务数: ${originalCompletedCount}`);
    console.log(`🔍 [TEST] 最终完成任务数: ${completedCount}`);
    console.log(`🔍 [TEST] 新增完成任务数: ${newlyCompleted}`);

    if (newlyCompleted === 2) {
      console.log('🔍 [TEST] ✅ 测试通过：正确更新了2个任务状态');
    } else if (newlyCompleted > 2) {
      console.log(`🔍 [TEST] ❌ 测试失败：更新了${newlyCompleted}个任务，可能存在状态同步问题`);
    } else if (newlyCompleted < 2) {
      console.log(`🔍 [TEST] ❌ 测试失败：只更新了${newlyCompleted}个任务，可能存在防抖过度问题`);
    } else {
      console.log('🔍 [TEST] ⚠️  测试结果不明确');
    }

  } catch (error) {
    console.error('🔍 [TEST] 测试过程中发生错误:', error.message);
  }
}

// 运行测试
runTest();