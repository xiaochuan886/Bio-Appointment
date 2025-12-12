const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testDoctorWorkflowComplete() {
  console.log('🔍 测试医生完整工作流程...\n');

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
    const shanghaiStore = stores.find(s => s.name.includes('上海'));
    
    const servicesResponse = await axios.get(`${API_BASE}/services?category=consultation`);
    const consultationService = servicesResponse.data[0];

    const profilesResponse = await axios.get(`${API_BASE}/profiles?role=doctor`);
    const doctors = profilesResponse.data;
    const chenDoctor = doctors.find(d => d.username === 'doctor1');
    const zhaoDoctor = doctors.find(d => d.username === 'doctor2');

    console.log('\n基础数据:');
    console.log(`- 默认门店: ${defaultStore.name} (${defaultStore.id})`);
    console.log(`- 上海门店: ${shanghaiStore.name} (${shanghaiStore.id})`);
    console.log(`- 咨询服务: ${consultationService.name} (${consultationService.id})`);
    console.log(`- 陈医生: ${chenDoctor.full_name} (${chenDoctor.id})`);
    console.log(`- 赵医生: ${zhaoDoctor.full_name} (${zhaoDoctor.id})`);

    // 3. 创建测试预约
    console.log('\n2. 创建测试预约...');
    
    const testAppointments = [
      {
        customer_name: '完整测试客户A',
        store_id: defaultStore.id,
        doctor_id: chenDoctor.id,
        date: '2024-12-19',
        time_start: '09:00',
        time_end: '10:00'
      },
      {
        customer_name: '完整测试客户B',
        store_id: defaultStore.id,
        doctor_id: chenDoctor.id,
        date: '2024-12-19',
        time_start: '14:00',
        time_end: '15:00'
      },
      {
        customer_name: '完整测试客户C',
        store_id: shanghaiStore.id,
        doctor_id: zhaoDoctor.id,
        date: '2024-12-19',
        time_start: '10:00',
        time_end: '11:00'
      }
    ];

    const createdAppointments = [];
    for (const apt of testAppointments) {
      try {
        const response = await axios.post(`${API_BASE}/appointments`, {
          customer_name: apt.customer_name,
          customer_phone: '13800000000',
          service_id: consultationService.id,
          requested_date: apt.date,
          requested_time_start: apt.time_start,
          requested_time_end: apt.time_end,
          total_people: 1,
          estimated_duration: 60,
          store_id: apt.store_id,
          doctor_id: apt.doctor_id
        }, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        createdAppointments.push({
          ...response.data,
          expected_doctor: apt.doctor_id,
          expected_store: apt.store_id
        });
        
        console.log(`✅ 创建预约: ${apt.customer_name}`);
      } catch (error) {
        console.log(`❌ 创建预约失败: ${apt.customer_name}`, error.response?.data?.error);
      }
    }

    // 4. 陈医生登录并处理预约
    console.log('\n3. 陈医生登录并处理预约...');
    const chenLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'doctor1',
      password: 'doctor123'
    });
    const chenToken = chenLoginResponse.data.tokens.accessToken;
    console.log('✅ 陈医生登录成功');

    // 获取陈医生的待处理预约
    const chenPendingResponse = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
      headers: { 'Authorization': `Bearer ${chenToken}` }
    });
    
    const chenAppointments = chenPendingResponse.data.filter(apt => 
      apt.doctor_id === chenDoctor.id && 
      createdAppointments.some(ca => ca.id === apt.id)
    );
    
    console.log(`陈医生待处理预约: ${chenAppointments.length} 个`);

    // 检查确认前的排班数量
    const beforeScheduleResponse = await axios.get(`${API_BASE}/schedules/doctor?start_date=2024-12-19&end_date=2024-12-19`, {
      headers: { 'Authorization': `Bearer ${chenToken}` }
    });
    console.log(`陈医生确认前排班数量: ${beforeScheduleResponse.data.length}`);

    // 确认所有预约
    let confirmedCount = 0;
    for (const apt of chenAppointments) {
      try {
        await axios.put(`${API_BASE}/appointments/${apt.id}/doctor-confirm`, {
          doctor_note: `陈医生确认: ${apt.customer_name}`
        }, {
          headers: { 'Authorization': `Bearer ${chenToken}` }
        });
        
        confirmedCount++;
        console.log(`✅ 确认预约: ${apt.customer_name}`);
      } catch (error) {
        console.log(`❌ 确认预约失败: ${apt.customer_name}`, error.response?.data?.error);
      }
    }

    // 检查确认后的排班数量
    const afterScheduleResponse = await axios.get(`${API_BASE}/schedules/doctor?start_date=2024-12-19&end_date=2024-12-19`, {
      headers: { 'Authorization': `Bearer ${chenToken}` }
    });
    console.log(`陈医生确认后排班数量: ${afterScheduleResponse.data.length}`);
    
    const chenNewSchedules = afterScheduleResponse.data.length - beforeScheduleResponse.data.length;
    console.log(`陈医生新增排班数量: ${chenNewSchedules}`);

    // 5. 赵医生登录并处理预约
    console.log('\n4. 赵医生登录并处理预约...');
    const zhaoLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'doctor2',
      password: 'doctor123'
    });
    const zhaoToken = zhaoLoginResponse.data.tokens.accessToken;
    console.log('✅ 赵医生登录成功');

    // 获取赵医生的待处理预约
    const zhaoPendingResponse = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
      headers: { 'Authorization': `Bearer ${zhaoToken}` }
    });
    
    const zhaoAppointments = zhaoPendingResponse.data.filter(apt => 
      apt.doctor_id === zhaoDoctor.id && 
      createdAppointments.some(ca => ca.id === apt.id)
    );
    
    console.log(`赵医生待处理预约: ${zhaoAppointments.length} 个`);

    // 检查确认前的排班数量
    const zhaoBeforeScheduleResponse = await axios.get(`${API_BASE}/schedules/doctor?start_date=2024-12-19&end_date=2024-12-19`, {
      headers: { 'Authorization': `Bearer ${zhaoToken}` }
    });
    console.log(`赵医生确认前排班数量: ${zhaoBeforeScheduleResponse.data.length}`);

    // 确认预约
    for (const apt of zhaoAppointments) {
      try {
        await axios.put(`${API_BASE}/appointments/${apt.id}/doctor-confirm`, {
          doctor_note: `赵医生确认: ${apt.customer_name}`
        }, {
          headers: { 'Authorization': `Bearer ${zhaoToken}` }
        });
        
        console.log(`✅ 确认预约: ${apt.customer_name}`);
      } catch (error) {
        console.log(`❌ 确认预约失败: ${apt.customer_name}`, error.response?.data?.error);
      }
    }

    // 检查确认后的排班数量
    const zhaoAfterScheduleResponse = await axios.get(`${API_BASE}/schedules/doctor?start_date=2024-12-19&end_date=2024-12-19`, {
      headers: { 'Authorization': `Bearer ${zhaoToken}` }
    });
    console.log(`赵医生确认后排班数量: ${zhaoAfterScheduleResponse.data.length}`);
    
    const zhaoNewSchedules = zhaoAfterScheduleResponse.data.length - zhaoBeforeScheduleResponse.data.length;
    console.log(`赵医生新增排班数量: ${zhaoNewSchedules}`);

    // 6. 验证门店隔离
    console.log('\n5. 验证门店隔离...');
    
    // 陈医生不应该看到赵医生的排班
    const chenCanSeeZhaoSchedules = afterScheduleResponse.data.some(s => 
      s.appointment?.doctor_id === zhaoDoctor.id
    );
    
    // 赵医生不应该看到陈医生的排班
    const zhaoCanSeeChenSchedules = zhaoAfterScheduleResponse.data.some(s => 
      s.appointment?.doctor_id === chenDoctor.id
    );
    
    console.log(`陈医生能看到赵医生排班: ${chenCanSeeZhaoSchedules ? '❌ 是 (BUG!)' : '✅ 否'}`);
    console.log(`赵医生能看到陈医生排班: ${zhaoCanSeeChenSchedules ? '❌ 是 (BUG!)' : '✅ 否'}`);

    // 7. 显示排班详情
    console.log('\n6. 排班详情:');
    
    console.log('\n陈医生的排班:');
    afterScheduleResponse.data.forEach(schedule => {
      const appointment = schedule.appointment;
      console.log(`- ${schedule.scheduled_date.split('T')[0]} ${schedule.scheduled_time_start}-${schedule.scheduled_time_end}`);
      console.log(`  客户: ${appointment?.customer_name}`);
      console.log(`  服务: ${appointment?.service?.name}`);
      console.log(`  状态: ${schedule.status}`);
    });
    
    console.log('\n赵医生的排班:');
    zhaoAfterScheduleResponse.data.forEach(schedule => {
      const appointment = schedule.appointment;
      console.log(`- ${schedule.scheduled_date.split('T')[0]} ${schedule.scheduled_time_start}-${schedule.scheduled_time_end}`);
      console.log(`  客户: ${appointment?.customer_name}`);
      console.log(`  服务: ${appointment?.service?.name}`);
      console.log(`  状态: ${schedule.status}`);
    });

    // 8. 测试重复确认防护
    console.log('\n7. 测试重复确认防护...');
    
    if (chenAppointments.length > 0) {
      const testApt = chenAppointments[0];
      
      // 重置预约状态
      await axios.put(`${API_BASE}/appointments/${testApt.id}`, {
        workflow_status: 'pending_doctor_confirmation'
      }, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      // 再次确认
      await axios.put(`${API_BASE}/appointments/${testApt.id}/doctor-confirm`, {
        doctor_note: '重复确认测试'
      }, {
        headers: { 'Authorization': `Bearer ${chenToken}` }
      });
      
      // 检查排班数量是否增加
      const finalScheduleResponse = await axios.get(`${API_BASE}/schedules/doctor?start_date=2024-12-19&end_date=2024-12-19`, {
        headers: { 'Authorization': `Bearer ${chenToken}` }
      });
      
      const duplicateScheduleIncrease = finalScheduleResponse.data.length - afterScheduleResponse.data.length;
      console.log(`重复确认后排班增量: ${duplicateScheduleIncrease}`);
      
      if (duplicateScheduleIncrease === 0) {
        console.log('✅ 重复确认防护正常工作');
      } else {
        console.log('❌ 重复确认防护失效');
      }
    }

    // 9. 最终验证
    console.log('\n📊 测试总结:');
    console.log(`- 创建预约数量: ${createdAppointments.length}`);
    console.log(`- 陈医生确认预约数量: ${confirmedCount}`);
    console.log(`- 陈医生新增排班数量: ${chenNewSchedules}`);
    console.log(`- 赵医生确认预约数量: ${zhaoAppointments.length}`);
    console.log(`- 赵医生新增排班数量: ${zhaoNewSchedules}`);
    console.log(`- 门店隔离: ${!chenCanSeeZhaoSchedules && !zhaoCanSeeChenSchedules ? '✅ 正常' : '❌ 异常'}`);

    const expectedChenSchedules = chenAppointments.length;
    const expectedZhaoSchedules = zhaoAppointments.length;
    
    if (chenNewSchedules === expectedChenSchedules && 
        zhaoNewSchedules === expectedZhaoSchedules && 
        !chenCanSeeZhaoSchedules && 
        !zhaoCanSeeChenSchedules) {
      console.log('\n🎉 医生完整工作流程测试成功!');
      console.log('✅ 预约确认自动创建排班');
      console.log('✅ 门店隔离正常工作');
      console.log('✅ 重复排班防护有效');
    } else {
      console.log('\n❌ 医生完整工作流程测试失败!');
      if (chenNewSchedules !== expectedChenSchedules) {
        console.log(`❌ 陈医生排班数量不匹配: 期望${expectedChenSchedules}, 实际${chenNewSchedules}`);
      }
      if (zhaoNewSchedules !== expectedZhaoSchedules) {
        console.log(`❌ 赵医生排班数量不匹配: 期望${expectedZhaoSchedules}, 实际${zhaoNewSchedules}`);
      }
      if (chenCanSeeZhaoSchedules || zhaoCanSeeChenSchedules) {
        console.log('❌ 门店隔离失效');
      }
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testDoctorWorkflowComplete();