const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function debugDoctorScheduleWorkflow() {
  console.log('🔍 诊断医生预约确认后排班显示问题...\n');

  try {
    // 1. 陈医生登录
    console.log('1. 陈医生登录...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'doctor1',
      password: 'doctor123'
    });
    const token = loginResponse.data.tokens.accessToken;
    const userInfo = loginResponse.data.user;
    
    console.log(`✅ 登录成功: ${userInfo.full_name} (ID: ${userInfo.id})`);

    // 2. 检查待处理预约
    console.log('\n2. 检查待处理预约...');
    const pendingResponse = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`待处理预约数量: ${pendingResponse.data.length}`);
    
    if (pendingResponse.data.length > 0) {
      console.log('待处理预约详情:');
      pendingResponse.data.forEach(apt => {
        console.log(`- ${apt.customer_name} (${apt.id})`);
        console.log(`  日期: ${apt.requested_date}`);
        console.log(`  时间: ${apt.requested_time_start} - ${apt.requested_time_end}`);
        console.log(`  状态: ${apt.workflow_status}`);
        console.log(`  医生ID: ${apt.doctor_id || '未分配'}`);
        console.log(`  门店ID: ${apt.store_id}`);
      });
    }

    // 3. 检查已确认的预约
    console.log('\n3. 检查所有预约状态...');
    const allAppointmentsResponse = await axios.get(`${API_BASE}/appointments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const doctorAppointments = allAppointmentsResponse.data.filter(apt => 
      apt.doctor_id === userInfo.id || 
      (apt.service?.category === 'consultation' && apt.store_id === userInfo.store_id)
    );
    
    console.log(`陈医生相关的预约总数: ${doctorAppointments.length}`);
    
    const confirmedAppointments = doctorAppointments.filter(apt => 
      apt.workflow_status === 'doctor_confirmed'
    );
    
    console.log(`已确认的预约数量: ${confirmedAppointments.length}`);
    
    if (confirmedAppointments.length > 0) {
      console.log('已确认预约详情:');
      confirmedAppointments.forEach(apt => {
        console.log(`- ${apt.customer_name} (${apt.id})`);
        console.log(`  日期: ${apt.requested_date}`);
        console.log(`  时间: ${apt.requested_time_start} - ${apt.requested_time_end}`);
        console.log(`  状态: ${apt.workflow_status}`);
        console.log(`  确认时间: ${apt.doctor_confirmed_at || '未记录'}`);
        console.log(`  医生ID: ${apt.doctor_id}`);
      });
    }

    // 4. 检查排班数据
    console.log('\n4. 检查排班数据...');
    
    // 检查所有排班
    const allSchedulesResponse = await axios.get(`${API_BASE}/schedules`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`总排班数量: ${allSchedulesResponse.data.length}`);
    
    // 过滤陈医生的排班
    const doctorSchedules = allSchedulesResponse.data.filter(schedule => {
      const appointment = schedule.appointment;
      return appointment && appointment.doctor_id === userInfo.id;
    });
    
    console.log(`陈医生的排班数量: ${doctorSchedules.length}`);
    
    if (doctorSchedules.length > 0) {
      console.log('陈医生排班详情:');
      doctorSchedules.forEach(schedule => {
        console.log(`- 排班ID: ${schedule.id}`);
        console.log(`  预约ID: ${schedule.appointment_id}`);
        console.log(`  客户: ${schedule.appointment?.customer_name}`);
        console.log(`  日期: ${schedule.scheduled_date}`);
        console.log(`  时间: ${schedule.scheduled_time_start} - ${schedule.scheduled_time_end}`);
        console.log(`  状态: ${schedule.status}`);
      });
    }

    // 5. 使用医生专用排班API
    console.log('\n5. 测试医生专用排班API...');
    const doctorScheduleResponse = await axios.get(`${API_BASE}/schedules/doctor`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`医生专用API返回排班数量: ${doctorScheduleResponse.data.length}`);
    
    if (doctorScheduleResponse.data.length > 0) {
      console.log('医生专用API排班详情:');
      doctorScheduleResponse.data.forEach(schedule => {
        console.log(`- 排班ID: ${schedule.id}`);
        console.log(`  客户: ${schedule.appointment?.customer_name}`);
        console.log(`  日期: ${schedule.scheduled_date}`);
        console.log(`  时间: ${schedule.scheduled_time_start} - ${schedule.scheduled_time_end}`);
        console.log(`  状态: ${schedule.status}`);
        console.log(`  服务类型: ${schedule.appointment?.service?.category}`);
      });
    }

    // 6. 检查今日排班
    const today = new Date().toISOString().split('T')[0];
    console.log(`\n6. 检查今日排班 (${today})...`);
    
    const todayScheduleResponse = await axios.get(`${API_BASE}/schedules/doctor?date=${today}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`今日排班数量: ${todayScheduleResponse.data.length}`);

    // 7. 分析问题
    console.log('\n📊 问题分析:');
    
    if (confirmedAppointments.length > 0 && doctorSchedules.length === 0) {
      console.log('🚨 发现问题: 有已确认的预约但没有对应的排班记录');
      console.log('可能原因:');
      console.log('1. 医生确认预约后没有自动创建排班');
      console.log('2. 排班创建失败');
      console.log('3. 排班查询条件有问题');
      
      // 检查是否需要手动创建排班
      console.log('\n尝试为已确认预约创建排班...');
      for (const apt of confirmedAppointments) {
        try {
          const scheduleData = {
            appointment_id: apt.id,
            scheduled_date: apt.requested_date,
            scheduled_time_start: apt.requested_time_start,
            scheduled_time_end: apt.requested_time_end,
            status: 'scheduled'
          };
          
          const createScheduleResponse = await axios.post(`${API_BASE}/schedules`, scheduleData, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          console.log(`✅ 为预约 ${apt.customer_name} 创建排班成功`);
        } catch (error) {
          console.log(`❌ 为预约 ${apt.customer_name} 创建排班失败:`, error.response?.data?.error);
        }
      }
      
      // 重新检查排班
      console.log('\n重新检查排班...');
      const newScheduleResponse = await axios.get(`${API_BASE}/schedules/doctor`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log(`重新检查后排班数量: ${newScheduleResponse.data.length}`);
    }
    
    if (confirmedAppointments.length === 0) {
      console.log('ℹ️ 没有已确认的预约，这可能是正常的');
    }
    
    if (doctorScheduleResponse.data.length !== doctorSchedules.length) {
      console.log('⚠️ 医生专用API和通用API返回的排班数量不一致');
      console.log(`通用API: ${doctorSchedules.length}, 专用API: ${doctorScheduleResponse.data.length}`);
    }

  } catch (error) {
    console.error('❌ 诊断失败:', error.response?.data || error.message);
  }
}

debugDoctorScheduleWorkflow();