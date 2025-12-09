const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testScheduleRooms() {
  try {
    // 1. 登录获取令牌
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'head_nurse1@example.com',
      password: '123456'
    });
    
    const token = loginResponse.data.tokens.accessToken;
    console.log('✅ 登录成功');
    
    // 2. 获取排班数据
    const scheduleResponse = await axios.get(`${API_BASE}/schedules?date=2025-12-08`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const schedules = scheduleResponse.data;
    console.log(`📊 排班总数: ${schedules.length}`);
    
    if (schedules.length > 0) {
      console.log('排班详情:');
      schedules.forEach((schedule, index) => {
        console.log(`${index + 1}. 客户: ${schedule.customer_name}`);
        console.log(`   房间: ${schedule.room_name} (ID: ${schedule.room_id})`);
        console.log(`   护士: ${schedule.nurse_name} (ID: ${schedule.nurse_id})`);
        console.log(`   时间: ${schedule.scheduled_time_start} - ${schedule.scheduled_time_end}`);
        console.log('---');
      });
    } else {
      console.log('暂无排班数据');
    }
    
    // 3. 获取房间数据
    const roomResponse = await axios.get(`${API_BASE}/rooms`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const rooms = roomResponse.data;
    console.log(`🏠 房间总数: ${rooms.length}`);
    
    console.log('房间列表:');
    rooms.forEach((room, index) => {
      console.log(`${index + 1}. ${room.name} (${room.room_type}) - ID: ${room.id}`);
    });
    
    // 4. 检查房间名称重复
    const roomNames = rooms.map(r => r.name);
    const uniqueNames = [...new Set(roomNames)];
    
    if (roomNames.length !== uniqueNames.length) {
      console.log('❌ 发现重复的房间名称:');
      const duplicates = roomNames.filter((name, index) => roomNames.indexOf(name) !== index);
      console.log(duplicates);
    } else {
      console.log('✅ 房间名称无重复');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testScheduleRooms();