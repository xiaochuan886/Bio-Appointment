const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testDuplicateScheduleFix() {
  console.log('🔍 测试重复排班修复...\n');

  try {
    // 1. 清理现有测试数据
    console.log('1. 清理现有测试数据...');
    
    // 管理员登录
    const adminLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin',
      password: 'admin123'
    });
    const adminToken = adminLoginResponse.data.tokens.accessToken;
    
    // 清理预约和排班
    try {
      await axios.delete(`${API_BASE}/test/cleanup`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      console.log('✅ 清理完成');
    } catch (error) {
      console.log('⚠️ 清理失败，继续测试');
    }

    // 2. 创建新的测试预约（不创建排班）
    console.log('\n2. 创建测试预约...');
    
    // 获取基础数据
    const storesResponse = await axios.get(`${API_BASE}/stores`);
    const stores = Array.isArray(storesResponse.data) ? storesResponse.data : storesResponse.data.stores || [];
    const defaultStore = stores.find(s => s.name.includes('默认'));
    
    const servicesResponse = await axios.get(`${API_BASE}/services?category=consultation`);
    const consultationService = servicesResponse.data[0];

    const profilesResponse = await axios.get(`${API_BASE}/profiles?role=doctor`);
    const doctors = profilesResponse.data;
    const chenDoctor = doctors.find(d => d.username === 'doctor1');

    // 创建预约（不创建排班）
    const appointmentResponse = await axios.post(`${API_BASE}/appointments`, {
      customer_name: '测试重复排班修复',
      customer_phone: '13800000000',
      service_id: consultationService.id,
      requested_date: '2024-12-16',
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

    // 3. 陈医生登录
    console.log('\n3. 陈医生登录...');
    const chenLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'doctor1',
      password: 'doctor123'
    });
    const chenToken = chenLoginResponse.data.tokens.accessToken;
    console.log('✅ 陈医生登录成功');

    // 4. 检查确认前的排班数量
    console.log('\n4. 检查确认前的排班数量...');
    const beforeScheduleResponse = await axios.get(`${API_BASE}/schedules/doctor`, {
      headers: { 'Authorization': `Bearer ${chenToken}` }
    });
    console.log(`确认前排班数量: ${beforeScheduleResponse.data.length}`);

    // 5. 第一次确认预约（应该创建排班）
    console.log('\n5. 第一次确认预约...');
    try {
      const confirmResponse = await axios.put(`${API_BASE}/appointments/${appointment.id}/doctor-confirm`, {
        doctor_note: '第一次确认测试'
      }, {
        headers: { 'Authorization': `Bearer ${chenToken}` }
      });
      
      console.log('✅ 第一次确认成功');
      console.log(`新状态: ${confirmResponse.data.workflow_status}`);
    } catch (error) {
      console.log('❌ 第一次确认失败:', error.response?.data?.error);
      return;
    }

    // 6. 检查第一次确认后的排班数量
    console.log('\n6. 检查第一次确认后的排班数量...');
    const afterFirstConfirmResponse = await axios.get(`${API_BASE}/schedules/doctor`, {
      headers: { 'Authorization': `Bearer ${chenToken}` }
    });
    console.log(`第一次确认后排班数量: ${afterFirstConfirmResponse.data.length}`);
    
    const firstConfirmScheduleCount = afterFirstConfirmResponse.data.length - beforeScheduleResponse.data.length;
    console.log(`新增排班数量: ${firstConfirmScheduleCount}`);

    // 7. 模拟重复确认（修改预约状态回到待确认）
    console.log('\n7. 模拟重复确认场景...');
    
    // 先将预约状态改回待确认
    try {
      await axios.put(`${API_BASE}/appointments/${appointment.id}`, {
        workflow_status: 'pending_doctor_confirmation'
      }, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      console.log('✅ 预约状态重置为待确认');
    } catch (error) {
      console.log('⚠️ 无法重置预约状态，跳过重复确认测试');
      return;
    }

    // 8. 第二次确认预约（不应该创建重复排班）
    console.log('\n8. 第二次确认预约（测试重复排班防护）...');
    try {
      const secondConfirmResponse = await axios.put(`${API_BASE}/appointments/${appointment.id}/doctor-confirm`, {
        doctor_note: '第二次确认测试（应该不创建重复排班）'
      }, {
        headers: { 'Authorization': `Bearer ${chenToken}` }
      });
      
      console.log('✅ 第二次确认成功');
      console.log(`新状态: ${secondConfirmResponse.data.workflow_status}`);
    } catch (error) {
      console.log('❌ 第二次确认失败:', error.response?.data?.error);
      return;
    }

    // 9. 检查第二次确认后的排班数量
    console.log('\n9. 检查第二次确认后的排班数量...');
    const afterSecondConfirmResponse = await axios.get(`${API_BASE}/schedules/doctor`, {
      headers: { 'Authorization': `Bearer ${chenToken}` }
    });
    console.log(`第二次确认后排班数量: ${afterSecondConfirmResponse.data.length}`);
    
    const secondConfirmScheduleCount = afterSecondConfirmResponse.data.length - afterFirstConfirmResponse.data.length;
    console.log(`第二次确认新增排班数量: ${secondConfirmScheduleCount}`);

    // 10. 验证结果
    console.log('\n10. 验证结果...');
    
    const totalScheduleIncrease = afterSecondConfirmResponse.data.length - beforeScheduleResponse.data.length;
    
    console.log('\n📊 测试结果:');
    console.log(`- 确认前排班数量: ${beforeScheduleResponse.data.length}`);
    console.log(`- 第一次确认后排班数量: ${afterFirstConfirmResponse.data.length}`);
    console.log(`- 第二次确认后排班数量: ${afterSecondConfirmResponse.data.length}`);
    console.log(`- 总排班增量: ${totalScheduleIncrease}`);
    console.log(`- 第一次确认新增: ${firstConfirmScheduleCount}`);
    console.log(`- 第二次确认新增: ${secondConfirmScheduleCount}`);

    if (firstConfirmScheduleCount === 1 && secondConfirmScheduleCount === 0) {
      console.log('\n🎉 重复排班修复测试成功!');
      console.log('✅ 第一次确认正确创建了排班');
      console.log('✅ 第二次确认正确跳过了重复排班创建');
    } else {
      console.log('\n❌ 重复排班修复测试失败!');
      if (firstConfirmScheduleCount !== 1) {
        console.log(`❌ 第一次确认应该创建1个排班，实际创建了${firstConfirmScheduleCount}个`);
      }
      if (secondConfirmScheduleCount !== 0) {
        console.log(`❌ 第二次确认应该创建0个排班，实际创建了${secondConfirmScheduleCount}个`);
      }
    }

    // 11. 显示排班详情
    console.log('\n11. 排班详情:');
    afterSecondConfirmResponse.data.forEach(schedule => {
      const appointment = schedule.appointment;
      console.log(`- 排班ID: ${schedule.id}`);
      console.log(`  客户: ${appointment?.customer_name}`);
      console.log(`  日期: ${schedule.scheduled_date}`);
      console.log(`  时间: ${schedule.scheduled_time_start} - ${schedule.scheduled_time_end}`);
      console.log(`  状态: ${schedule.status}`);
    });

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testDuplicateScheduleFix();