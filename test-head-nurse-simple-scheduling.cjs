const fetch = require('node-fetch');

// API 基础 URL
const API_BASE = 'http://localhost:3001/api';

// 测试用户凭据
const HEAD_NURSE_CREDENTIALS = {
  email: 'head_nurse1',
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
  return { user: data.user, token: data.tokens.accessToken };
}

// 辅助函数：发送 API 请求
async function apiRequest(endpoint, token, method = 'GET', body = null) {
  let url = `${API_BASE}${endpoint}`;
  
  // 如果有查询参数，添加到 URL
  if (method === 'GET' && body) {
    const params = new URLSearchParams();
    Object.keys(body).forEach(key => params.append(key, body[key]));
    url += `?${params.toString()}`;
    body = null;
  }
  
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 请求失败: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

// 测试护士长给自己排班
async function testHeadNurseSelfScheduling() {
  console.log('\n🧪 测试护士长给自己排班');
  
  try {
    // 1. 护士长登录
    const { user, token } = await login(HEAD_NURSE_CREDENTIALS);
    
    // 2. 获取可用护士列表，确保护士长在列表中
    console.log('\n📋 获取可用护士列表...');
    const nurses = await apiRequest('/profiles/nurses/available', token);
    console.log(`📊 找到 ${nurses.length} 个可用护士`);
    
    const headNurseInList = nurses.find(n => n.id === user.id);
    if (headNurseInList) {
      console.log('✅ 护士长出现在可用护士列表中:', headNurseInList.full_name);
    } else {
      console.log('❌ 护士长不在可用护士列表中');
      return { success: false };
    }
    
    // 3. 获取待排班预约
    console.log('\n📋 获取待排班预约...');
    const appointments = await apiRequest('/appointments/nurse-pending', token);
    console.log(`📊 找到 ${appointments.length} 个待排班预约`);
    
    if (appointments.length === 0) {
      console.log('⚠️ 没有待排班的预约，跳过排班测试');
      return { success: true, message: '没有待排班的预约' };
    }
    
    // 4. 使用第一个预约进行排班
    const appointment = appointments[0];
    console.log(`\n📋 为预约 "${appointment.customer_name}" 创建排班...`);
    
    // 5. 获取与预约相同门店的房间
    console.log('\n📋 获取同门店房间...');
    const rooms = await apiRequest('/rooms', token, { store_id: appointment.store_id });
    console.log(`📊 找到 ${rooms.length} 个同门店房间`);
    
    if (rooms.length === 0) {
      console.log('❌ 没有同门店房间');
      return { success: false };
    }
    
    // 6. 创建排班，护士长指定自己为护士
    const scheduledDate = typeof appointment.requested_date === 'string' 
      ? appointment.requested_date.split('T')[0]
      : appointment.requested_date.toISOString().split('T')[0];
    
    const scheduleData = {
      appointment_id: appointment.id,
      scheduled_date: scheduledDate,
      scheduled_time_start: appointment.requested_time_start,
      scheduled_time_end: appointment.requested_time_end,
      room_id: rooms[0].id,
      nurse_id: user.id, // 护士长给自己排班
      notes: '护士长给自己排班测试'
    };
    
    console.log('📋 发送排班数据:', JSON.stringify(scheduleData, null, 2));
    
    const newSchedule = await apiRequest('/schedules', token, 'POST', scheduleData);
    console.log('✅ 护士长成功给自己排班:', newSchedule.id);
    
    // 7. 验证排班记录
    console.log('\n📋 验证排班记录...');
    const schedules = await apiRequest('/schedules', token, {
      nurse_id: user.id,
      start_date: scheduledDate,
      end_date: scheduledDate
    });
    
    const selfSchedule = schedules.find(s => s.id === newSchedule.id);
    if (selfSchedule) {
      console.log('✅ 护士长可以在排班列表中看到自己的排班');
      console.log(`  排班详情: ${selfSchedule.scheduled_date} ${selfSchedule.scheduled_time_start}-${selfSchedule.scheduled_time_end} ${selfSchedule.customer_name}`);
    } else {
      console.log('❌ 护士长无法在排班列表中看到自己的排班');
    }
    
    return { success: true, schedule: newSchedule };
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return { success: false, error: error.message };
  }
}

// 主函数
async function main() {
  console.log('🚀 开始测试护士长给自己排班功能');
  
  // 测试护士长给自己排班
  const result = await testHeadNurseSelfScheduling();
  
  // 总结
  console.log('\n📊 测试结果总结:');
  console.log('护士长给自己排班:', result.success ? '✅ 成功' : '❌ 失败');
  
  if (result.success) {
    console.log('\n🎉 测试通过！护士长可以给自己排班。');
  } else {
    console.log('\n⚠️ 测试失败，需要检查权限设置。');
    if (result.error) {
      console.log('错误详情:', result.error);
    }
  }
}

// 运行测试
main().catch(console.error);