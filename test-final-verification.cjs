const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// 测试用户登录
async function testLogin() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'head_nurse1@example.com',
      password: '123456'
    });
    
    console.log('✅ 登录成功:', response.data.user.full_name);
    return response.data.tokens.accessToken;
  } catch (error) {
    console.error('❌ 登录失败:', error.response?.data || error.message);
    return null;
  }
}

// 测试房间数据去重
async function testRoomDeduplication() {
  try {
    const response = await axios.get(`${API_BASE}/rooms`);
    const rooms = response.data;
    
    console.log(`📊 房间总数: ${rooms.length}`);
    
    // 检查是否有重复的房间名称
    const roomNames = rooms.map(r => r.name);
    const uniqueNames = [...new Set(roomNames)];
    
    if (roomNames.length === uniqueNames.length) {
      console.log('✅ 房间数据去重成功 - 无重复房间名称');
    } else {
      console.log('❌ 房间数据仍有重复');
      console.log('重复的房间:', roomNames.filter((name, index) => roomNames.indexOf(name) !== index));
    }
    
    console.log('房间列表:');
    rooms.forEach(room => {
      console.log(`  - ${room.name} (${room.room_type})`);
    });
    
    return rooms;
  } catch (error) {
    console.error('❌ 获取房间数据失败:', error.response?.data || error.message);
    return [];
  }
}

// 测试护士数据过滤
async function testNurseFiltering(token) {
  try {
    const response = await axios.get(`${API_BASE}/profiles/nurses/available`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const nurses = response.data;
    
    console.log(`👩‍⚕️ 护士总数: ${nurses.length}`);
    
    nurses.forEach(nurse => {
      console.log(`  - ${nurse.full_name} (门店: ${nurse.store_id})`);
    });
    
    return nurses;
  } catch (error) {
    console.error('❌ 获取护士数据失败:', error.response?.data || error.message);
    return [];
  }
}

// 测试护士长待排班预约
async function testNursePendingAppointments(token) {
  try {
    const response = await axios.get(`${API_BASE}/appointments/nurse-pending`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const appointments = response.data;
    
    console.log(`📋 待排班预约数: ${appointments.length}`);
    
    appointments.forEach(appointment => {
      console.log(`  - ${appointment.customer_name} | ${appointment.service_name} | ${appointment.workflow_status}`);
    });
    
    return appointments;
  } catch (error) {
    console.error('❌ 获取待排班预约失败:', error.response?.data || error.message);
    return [];
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始最终验证测试...\n');
  
  // 1. 测试登录
  const token = await testLogin();
  if (!token) {
    console.log('❌ 无法获取登录令牌，跳过需要认证的测试');
    return;
  }
  
  console.log('\n' + '='.repeat(50));
  
  // 2. 测试房间数据去重
  await testRoomDeduplication();
  
  console.log('\n' + '='.repeat(50));
  
  // 3. 测试护士数据过滤
  await testNurseFiltering(token);
  
  console.log('\n' + '='.repeat(50));
  
  // 4. 测试护士长待排班预约
  await testNursePendingAppointments(token);
  
  console.log('\n🎉 测试完成！');
}

// 运行测试
runTests().catch(console.error);