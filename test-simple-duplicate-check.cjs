const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testSimpleDuplicateCheck() {
  console.log('🔍 简单重复排班检查测试...\n');

  try {
    // 1. 管理员登录
    console.log('1. 管理员登录...');
    const adminLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin',
      password: 'admin123'
    });
    const adminToken = adminLoginResponse.data.tokens.accessToken;
    console.log('✅ 管理员登录成功');

    // 2. 获取基础数据
    const storesResponse = await axios.get(`${API_BASE}/stores`);
    const stores = Array.isArray(storesResponse.data) ? storesResponse.data : storesResponse.data.stores || [];
    const defaultStore = stores.find(s => s.name.includes('默认'));
    
    const servicesResponse = await axios.get(`${API_BASE}/services?category=consultation`);
    const consultationService = servicesResponse.data[0];

    const profilesResponse = await axios.get(`${API_BASE}/profiles?role=doctor`);
    const doctors = profilesResponse.data;
    const chenDoctor = doctors.find(d => d.username === 'doctor1');

    // 3. 创建一个全新的预约
    console.log('\n2. 创建全新预约...');
    const appointmentResponse = await axios.post(`${API_BASE}/appointments`, {
      customer_name: '简单重复测试客户',
      customer_phone: '13800000000',
      service_id: consultationService.id,
      requested_date: '2024-12-18',
      requested_time_start: '09:00',
      requested_time_end: '10:00',
      total_people: 1,
      estimated_duration: 60,
      store_id: defaultStore.id,
      doctor_id: chenDoctor.id
    }, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const appointment = appointmentResponse.data;
    console.log(`✅ 创建预约: ${appointment.customer_name} (${appointment.id})`);

    // 4. 陈医生登录
    console.log('\n3. 陈医生登录...');
    const chenLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'doctor1',
      password: 'doctor123'
    });
    const chenToken = chenLoginResponse.data.tokens.accessToken;
    console.log('✅ 陈医生登录成功');

    // 5. 第一次确认预约
    console.log('\n4. 第一次确认预约...');
    const firstConfirmResponse = await axios.put(`${API_BASE}/appointments/${appointment.id}/doctor-confirm`, {
      doctor_note: '第一次确认'
    }, {
      headers: { 'Authorization': `Bearer ${chenToken}` }
    });
    
    console.log('✅ 第一次确认成功');
    console.log(`状态: ${firstConfirmResponse.data.workflow_status}`);

    // 6. 检查排班数量
    console.log('\n5. 检查排班数量...');
    const schedulesResponse = await axios.get(`${API_BASE}/schedules/doctor?start_date=2024-12-18&end_date=2024-12-18`, {
      headers: { 'Authorization': `Bearer ${chenToken}` }
    });
    
    const schedulesForThisAppointment = schedulesResponse.data.filter(s => 
      s.appointment && s.appointment.id === appointment.id
    );
    
    console.log(`该预约的排班数量: ${schedulesForThisAppointment.length}`);
    
    schedulesForThisAppointment.forEach(schedule => {
      console.log(`- 排班ID: ${schedule.id}`);
      console.log(`  客户: ${schedule.appointment?.customer_name}`);
      console.log(`  日期: ${schedule.scheduled_date}`);
      console.log(`  时间: ${schedule.scheduled_time_start} - ${schedule.scheduled_time_end}`);
    });

    // 7. 重置预约状态并再次确认
    console.log('\n6. 重置预约状态...');
    await axios.put(`${API_BASE}/appointments/${appointment.id}`, {
      workflow_status: 'pending_doctor_confirmation'
    }, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log('✅ 预约状态重置为待确认');

    // 8. 第二次确认预约
    console.log('\n7. 第二次确认预约...');
    const secondConfirmResponse = await axios.put(`${API_BASE}/appointments/${appointment.id}/doctor-confirm`, {
      doctor_note: '第二次确认（应该不创建重复排班）'
    }, {
      headers: { 'Authorization': `Bearer ${chenToken}` }
    });
    
    console.log('✅ 第二次确认成功');
    console.log(`状态: ${secondConfirmResponse.data.workflow_status}`);

    // 9. 再次检查排班数量
    console.log('\n8. 再次检查排班数量...');
    const schedulesResponse2 = await axios.get(`${API_BASE}/schedules/doctor?start_date=2024-12-18&end_date=2024-12-18`, {
      headers: { 'Authorization': `Bearer ${chenToken}` }
    });
    
    const schedulesForThisAppointment2 = schedulesResponse2.data.filter(s => 
      s.appointment && s.appointment.id === appointment.id
    );
    
    console.log(`第二次确认后该预约的排班数量: ${schedulesForThisAppointment2.length}`);
    
    schedulesForThisAppointment2.forEach(schedule => {
      console.log(`- 排班ID: ${schedule.id}`);
      console.log(`  客户: ${schedule.appointment?.customer_name}`);
      console.log(`  日期: ${schedule.scheduled_date}`);
      console.log(`  时间: ${schedule.scheduled_time_start} - ${schedule.scheduled_time_end}`);
    });

    // 10. 验证结果
    console.log('\n📊 测试结果:');
    console.log(`- 第一次确认后排班数量: ${schedulesForThisAppointment.length}`);
    console.log(`- 第二次确认后排班数量: ${schedulesForThisAppointment2.length}`);
    
    if (schedulesForThisAppointment.length === 1 && schedulesForThisAppointment2.length === 1) {
      console.log('\n🎉 重复排班检查测试成功!');
      console.log('✅ 没有创建重复排班');
    } else {
      console.log('\n❌ 重复排班检查测试失败!');
      console.log(`❌ 期望排班数量保持为1，实际从${schedulesForThisAppointment.length}变为${schedulesForThisAppointment2.length}`);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testSimpleDuplicateCheck();