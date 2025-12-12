const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testDoctorConfirmScheduleFix() {
  console.log('🔍 测试医生确认预约后自动创建排班功能...\n');

  try {
    // 1. 陈医生登录
    console.log('1. 陈医生登录...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'doctor1',
      password: 'doctor123'
    });
    const token = loginResponse.data.tokens.accessToken;
    const userInfo = loginResponse.data.user;
    
    console.log(`✅ 登录成功: ${userInfo.full_name}`);

    // 2. 获取待处理预约
    console.log('\n2. 获取待处理预约...');
    const pendingResponse = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`待处理预约数量: ${pendingResponse.data.length}`);
    
    if (pendingResponse.data.length === 0) {
      console.log('❌ 没有待处理预约，无法测试');
      return;
    }

    // 选择第一个分配给陈医生的预约
    const doctorAppointments = pendingResponse.data.filter(apt => apt.doctor_id === userInfo.id);
    
    if (doctorAppointments.length === 0) {
      console.log('❌ 没有分配给陈医生的预约，无法测试');
      return;
    }

    const testAppointment = doctorAppointments[0];
    console.log(`选择测试预约: ${testAppointment.customer_name} (${testAppointment.id})`);
    console.log(`预约时间: ${testAppointment.requested_date} ${testAppointment.requested_time_start}-${testAppointment.requested_time_end}`);

    // 3. 确认预约前检查排班数量
    console.log('\n3. 确认预约前检查排班数量...');
    const beforeScheduleResponse = await axios.get(`${API_BASE}/schedules/doctor`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`确认前排班数量: ${beforeScheduleResponse.data.length}`);

    // 4. 医生确认预约
    console.log('\n4. 医生确认预约...');
    try {
      const confirmResponse = await axios.put(`${API_BASE}/appointments/${testAppointment.id}/doctor-confirm`, {
        doctor_note: '测试确认预约并自动创建排班'
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('✅ 预约确认成功');
      console.log(`新状态: ${confirmResponse.data.workflow_status}`);
      console.log(`确认时间: ${confirmResponse.data.doctor_confirmed_at}`);
      
    } catch (error) {
      console.log('❌ 预约确认失败:', error.response?.data?.error || error.message);
      return;
    }

    // 5. 确认预约后检查排班数量
    console.log('\n5. 确认预约后检查排班数量...');
    const afterScheduleResponse = await axios.get(`${API_BASE}/schedules/doctor`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`确认后排班数量: ${afterScheduleResponse.data.length}`);
    
    const newSchedules = afterScheduleResponse.data.length - beforeScheduleResponse.data.length;
    console.log(`新增排班数量: ${newSchedules}`);

    if (newSchedules > 0) {
      console.log('✅ 自动创建排班成功!');
      
      // 显示新创建的排班详情
      console.log('\n新创建的排班详情:');
      afterScheduleResponse.data.slice(-newSchedules).forEach(schedule => {
        console.log(`- 排班ID: ${schedule.id}`);
        console.log(`  客户: ${schedule.appointment?.customer_name}`);
        console.log(`  日期: ${schedule.scheduled_date}`);
        console.log(`  时间: ${schedule.scheduled_time_start} - ${schedule.scheduled_time_end}`);
        console.log(`  状态: ${schedule.status}`);
        console.log(`  服务: ${schedule.appointment?.service?.name}`);
      });
    } else {
      console.log('❌ 没有自动创建排班');
    }

    // 6. 检查今日排班
    const today = new Date().toISOString().split('T')[0];
    console.log(`\n6. 检查今日排班 (${today})...`);
    
    const todayScheduleResponse = await axios.get(`${API_BASE}/schedules/doctor?date=${today}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`今日排班数量: ${todayScheduleResponse.data.length}`);
    
    if (todayScheduleResponse.data.length > 0) {
      console.log('今日排班详情:');
      todayScheduleResponse.data.forEach(schedule => {
        console.log(`- ${schedule.scheduled_time_start}-${schedule.scheduled_time_end} ${schedule.appointment?.customer_name}`);
      });
    }

    // 7. 测试日期范围查询
    console.log('\n7. 测试日期范围查询...');
    const rangeScheduleResponse = await axios.get(`${API_BASE}/schedules/doctor?start_date=2024-12-15&end_date=2024-12-17`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`日期范围内排班数量: ${rangeScheduleResponse.data.length}`);

    // 8. 验证数据完整性
    console.log('\n8. 验证数据完整性...');
    let dataIntegrityOk = true;
    
    afterScheduleResponse.data.forEach(schedule => {
      const appointment = schedule.appointment;
      if (!appointment) {
        console.log(`❌ 排班 ${schedule.id} 缺少预约信息`);
        dataIntegrityOk = false;
        return;
      }
      
      if (appointment.doctor_id !== userInfo.id) {
        console.log(`❌ 排班 ${schedule.id} 的医生ID不匹配`);
        dataIntegrityOk = false;
      }
      
      if (!appointment.service || appointment.service.category !== 'consultation') {
        console.log(`❌ 排班 ${schedule.id} 的服务类型不是咨询服务`);
        dataIntegrityOk = false;
      }
    });
    
    if (dataIntegrityOk) {
      console.log('✅ 数据完整性验证通过');
    }

    console.log('\n📊 测试总结:');
    console.log(`- 确认前排班数量: ${beforeScheduleResponse.data.length}`);
    console.log(`- 确认后排班数量: ${afterScheduleResponse.data.length}`);
    console.log(`- 新增排班数量: ${newSchedules}`);
    console.log(`- 今日排班数量: ${todayScheduleResponse.data.length}`);
    console.log(`- 数据完整性: ${dataIntegrityOk ? '✅ 通过' : '❌ 失败'}`);

    if (newSchedules > 0 && dataIntegrityOk) {
      console.log('\n🎉 医生确认预约自动创建排班功能测试成功!');
    } else {
      console.log('\n❌ 功能测试失败，需要进一步检查');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testDoctorConfirmScheduleFix();