const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testMultipleDoctorConfirmations() {
  console.log('🔍 测试多个医生确认预约功能...\n');

  try {
    // 测试陈医生确认更多预约
    console.log('1. 陈医生确认更多预约...');
    const chenLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'doctor1',
      password: 'doctor123'
    });
    const chenToken = chenLoginResponse.data.tokens.accessToken;
    
    const chenPendingResponse = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
      headers: { 'Authorization': `Bearer ${chenToken}` }
    });
    
    const chenAppointments = chenPendingResponse.data.filter(apt => 
      apt.doctor_id === chenLoginResponse.data.user.id
    );
    
    console.log(`陈医生还有 ${chenAppointments.length} 个待处理预约`);
    
    // 确认前两个预约
    for (let i = 0; i < Math.min(2, chenAppointments.length); i++) {
      const apt = chenAppointments[i];
      try {
        await axios.put(`${API_BASE}/appointments/${apt.id}/doctor-confirm`, {
          doctor_note: `批量确认测试 ${i + 1}`
        }, {
          headers: { 'Authorization': `Bearer ${chenToken}` }
        });
        console.log(`✅ 确认预约: ${apt.customer_name}`);
      } catch (error) {
        console.log(`❌ 确认预约失败: ${apt.customer_name}`, error.response?.data?.error);
      }
    }

    // 测试赵医生
    console.log('\n2. 赵医生确认预约...');
    const zhaoLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'doctor2',
      password: 'doctor123'
    });
    const zhaoToken = zhaoLoginResponse.data.tokens.accessToken;
    
    const zhaoPendingResponse = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
      headers: { 'Authorization': `Bearer ${zhaoToken}` }
    });
    
    const zhaoAppointments = zhaoPendingResponse.data.filter(apt => 
      apt.doctor_id === zhaoLoginResponse.data.user.id
    );
    
    console.log(`赵医生有 ${zhaoAppointments.length} 个待处理预约`);
    
    // 确认一个预约
    if (zhaoAppointments.length > 0) {
      const apt = zhaoAppointments[0];
      try {
        await axios.put(`${API_BASE}/appointments/${apt.id}/doctor-confirm`, {
          doctor_note: '赵医生确认测试'
        }, {
          headers: { 'Authorization': `Bearer ${zhaoToken}` }
        });
        console.log(`✅ 确认预约: ${apt.customer_name}`);
      } catch (error) {
        console.log(`❌ 确认预约失败: ${apt.customer_name}`, error.response?.data?.error);
      }
    }

    // 3. 检查两个医生的排班情况
    console.log('\n3. 检查医生排班情况...');
    
    // 陈医生排班
    const chenScheduleResponse = await axios.get(`${API_BASE}/schedules/doctor`, {
      headers: { 'Authorization': `Bearer ${chenToken}` }
    });
    console.log(`陈医生排班数量: ${chenScheduleResponse.data.length}`);
    
    // 赵医生排班
    const zhaoScheduleResponse = await axios.get(`${API_BASE}/schedules/doctor`, {
      headers: { 'Authorization': `Bearer ${zhaoToken}` }
    });
    console.log(`赵医生排班数量: ${zhaoScheduleResponse.data.length}`);

    // 4. 显示排班详情
    console.log('\n4. 排班详情:');
    
    console.log('\n陈医生的排班:');
    chenScheduleResponse.data.forEach(schedule => {
      console.log(`- ${schedule.scheduled_date.split('T')[0]} ${schedule.scheduled_time_start}-${schedule.scheduled_time_end} ${schedule.appointment?.customer_name}`);
    });
    
    console.log('\n赵医生的排班:');
    zhaoScheduleResponse.data.forEach(schedule => {
      console.log(`- ${schedule.scheduled_date.split('T')[0]} ${schedule.scheduled_time_start}-${schedule.scheduled_time_end} ${schedule.appointment?.customer_name}`);
    });

    // 5. 测试门店隔离
    console.log('\n5. 验证门店隔离...');
    
    // 陈医生不应该看到赵医生的排班
    const chenCanSeeZhaoSchedules = chenScheduleResponse.data.some(s => 
      s.appointment?.doctor_id === zhaoLoginResponse.data.user.id
    );
    
    // 赵医生不应该看到陈医生的排班
    const zhaoCanSeeChenSchedules = zhaoScheduleResponse.data.some(s => 
      s.appointment?.doctor_id === chenLoginResponse.data.user.id
    );
    
    console.log(`陈医生能看到赵医生排班: ${chenCanSeeZhaoSchedules ? '❌ 是 (BUG!)' : '✅ 否'}`);
    console.log(`赵医生能看到陈医生排班: ${zhaoCanSeeChenSchedules ? '❌ 是 (BUG!)' : '✅ 否'}`);

    console.log('\n📊 测试总结:');
    console.log(`- 陈医生排班数量: ${chenScheduleResponse.data.length}`);
    console.log(`- 赵医生排班数量: ${zhaoScheduleResponse.data.length}`);
    console.log(`- 门店隔离: ${!chenCanSeeZhaoSchedules && !zhaoCanSeeChenSchedules ? '✅ 正常' : '❌ 异常'}`);

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testMultipleDoctorConfirmations();