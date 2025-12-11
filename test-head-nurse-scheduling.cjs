const axios = require('axios');

const API_BASE = 'http://localhost:3001';

// 测试数据
const HEAD_NURSE_LOGIN = {
  email: 'head_nurse1@example.com',
  password: 'password123' // 根据数据库中的密码
};

const REGULAR_NURSE_LOGIN = {
  email: 'nurse001@hospital.com',
  password: 'password123'
};

async function login(credentials) {
  try {
    const response = await axios.post(`${API_BASE}/api/auth/login`, credentials);
    return response.data.tokens.accessToken;
  } catch (error) {
    console.error('登录失败:', error.response?.data || error.message);
    throw error;
  }
}

async function testHeadNurseScheduling() {
  console.log('🧪 开始测试护士长排班功能...\n');

  try {
    // 1. 护士长登录
    console.log('1. 护士长登录...');
    const headNurseToken = await login(HEAD_NURSE_LOGIN);
    console.log('✅ 护士长登录成功\n');

    // 2. 获取可用护士列表
    console.log('2. 获取可用护士列表...');
    const nursesResponse = await axios.get(`${API_BASE}/api/profiles/nurses/available`, {
      headers: { Authorization: `Bearer ${headNurseToken}` }
    });
    
    const nurses = nursesResponse.data;
    console.log(`✅ 获取到 ${nurses.length} 名护士/护士长`);
    
    // 检查是否包含护士长
    const headNurses = nurses.filter(n => n.role === 'head_nurse');
    console.log(`📋 包含 ${headNurses.length} 名护士长:`);
    headNurses.forEach(n => {
      console.log(`   - ${n.full_name} (${n.username}) - ${n.role}`);
    });
    console.log('');

    // 3. 获取待排班预约
    console.log('3. 获取待排班预约...');
    const pendingAppointmentsResponse = await axios.get(`${API_BASE}/api/appointments/nurse-pending`, {
      headers: { Authorization: `Bearer ${headNurseToken}` }
    });
    
    const pendingAppointments = pendingAppointmentsResponse.data;
    console.log(`✅ 获取到 ${pendingAppointments.length} 个待排班预约`);
    
    if (pendingAppointments.length === 0) {
      console.log('⚠️ 没有待排班的预约，创建一个测试预约...');
      
      // 创建测试预约
      const servicesResponse = await axios.get(`${API_BASE}/api/services`);
      const nursingService = servicesResponse.data.find(s => s.category === 'nursing');
      
      if (nursingService) {
        const newAppointment = {
          customer_name: '测试客户',
          customer_phone: '13800138000',
          service_id: nursingService.id,
          requested_date: '2025-12-11',
          requested_time_start: '09:00:00',
          requested_time_end: '10:00:00',
          notes: '护士长排班测试',
          store_id: headNurses[0]?.store_id || '33e624b3-854d-4889-bcc0-12e7e908b0d5'
        };
        
        const createResponse = await axios.post(`${API_BASE}/api/appointments`, newAppointment, {
          headers: { Authorization: `Bearer ${headNurseToken}` }
        });
        
        console.log('✅ 创建测试预约成功:', createResponse.data.id);
        
        // 重新获取待排班预约
        const updatedPendingResponse = await axios.get(`${API_BASE}/api/appointments/nurse-pending`, {
          headers: { Authorization: `Bearer ${headNurseToken}` }
        });
        pendingAppointments.push(...updatedPendingResponse.data);
      }
    }
    
    console.log('');

    // 4. 获取可用房间
    console.log('4. 获取可用房间...');
    // 获取与护士长同门店的房间
    const storeId = headNurses[0]?.store_id || '33e624b3-854d-4889-bcc0-12e7e908b0d5';
    const roomsResponse = await axios.get(`${API_BASE}/api/resources/rooms/available?store_id=${storeId}`, {
      headers: { Authorization: `Bearer ${headNurseToken}` }
    });
    
    const rooms = roomsResponse.data;
    console.log(`✅ 获取到 ${rooms.length} 个可用房间`);
    console.log('');

    // 5. 测试护士长给自己排班
    if (pendingAppointments.length > 0 && nurses.length > 0 && rooms.length > 0) {
      console.log('5. 测试护士长给自己排班...');
      
      const appointment = pendingAppointments[0];
      const headNurse = headNurses[0]; // 选择第一个护士长
      const room = rooms[0]; // 选择第一个房间
      
      const scheduleData = {
        appointment_id: appointment.id,
        scheduled_date: '2025-12-11',
        scheduled_time_start: '09:00:00',
        scheduled_time_end: '10:00:00',
        room_id: room.id,
        nurse_id: headNurse.id, // 护士长给自己排班
        notes: '护士长给自己排班测试'
      };
      
      console.log(`📝 排班详情:`);
      console.log(`   预约: ${appointment.customer_name} - ${appointment.service?.name}`);
      console.log(`   护士: ${headNurse.full_name} (${headNurse.role})`);
      console.log(`   房间: ${room.name}`);
      console.log(`   时间: 2025-12-11 09:00:00 - 10:00:00`);
      
      const scheduleResponse = await axios.post(`${API_BASE}/api/schedules`, scheduleData, {
        headers: { Authorization: `Bearer ${headNurseToken}` }
      });
      
      console.log('✅ 护士长给自己排班成功!');
      console.log('   排班ID:', scheduleResponse.data.id);
      console.log('');

      // 6. 验证排班记录
      console.log('6. 验证排班记录...');
      const schedulesResponse = await axios.get(`${API_BASE}/api/schedules?date=2025-12-11`, {
        headers: { Authorization: `Bearer ${headNurseToken}` }
      });
      
      const nurseSchedules = schedulesResponse.data.filter(s => s.nurse_id === headNurse.id);
      console.log(`✅ 找到 ${nurseSchedules.length} 个护士长的排班记录`);
      
      nurseSchedules.forEach(schedule => {
        console.log(`   - ${schedule.scheduled_date} ${schedule.scheduled_time_start}-${schedule.scheduled_time_end}`);
        console.log(`     预约: ${schedule.appointment?.customer_name}`);
        console.log(`     房间: ${schedule.room?.name}`);
      });
      
    } else {
      console.log('⚠️ 缺少必要的测试数据 (预约、护士或房间)');
    }

    console.log('\n🎉 护士长排班功能测试完成!');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('详细错误:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 运行测试
testHeadNurseScheduling();