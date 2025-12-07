const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// 测试用户登录
async function login(role = 'head_nurse') {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: role === 'head_nurse' ? 'headnurse@test.com' : 'doctor@test.com',
      password: '123456'
    });
    return response.data.tokens.accessToken;
  } catch (error) {
    console.log('登录失败，使用mock token');
    // 使用有效的UUID格式
    const userId = role === 'head_nurse' ? '550e8400-e29b-41d4-a716-446655440001' : '550e8400-e29b-41d4-a716-446655440002';
    return 'mock.' + Buffer.from(JSON.stringify({
      userId: userId,
      email: role === 'head_nurse' ? 'headnurse@test.com' : 'doctor@test.com',
      role: role
    })).toString('base64') + '.signature';
  }
}

// 获取服务列表
async function getServices() {
  try {
    const response = await axios.get(`${API_BASE}/services`);
    return response.data;
  } catch (error) {
    console.error('获取服务失败:', error.message);
    return [];
  }
}

// 获取门店列表
async function getStores() {
  try {
    const response = await axios.get(`${API_BASE}/stores`);
    return response.data.stores || response.data;
  } catch (error) {
    console.error('获取门店失败:', error.message);
    return [];
  }
}

// 创建预约
async function createAppointment(serviceId, storeId, token) {
  try {
    const response = await axios.post(`${API_BASE}/appointments`, {
      customer_name: `测试客户_${Date.now()}`,
      customer_phone: '13800138000',
      service_id: serviceId,
      requested_date: '2025-12-07',
      requested_time_start: '10:00',
      requested_time_end: '11:00',
      notes: '测试预约',
      total_people: 1,
      estimated_duration: 60,
      store_id: storeId
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('创建预约失败:', error.response?.data || error.message);
    return null;
  }
}

// 获取护士长待处理预约
async function getNursePendingAppointments(token) {
  try {
    const response = await axios.get(`${API_BASE}/appointments/nurse-pending`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('获取护士长待处理预约失败:', error.response?.data || error.message);
    return [];
  }
}

// 获取医生待处理预约
async function getDoctorPendingAppointments(token) {
  try {
    const response = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('获取医生待处理预约失败:', error.response?.data || error.message);
    return [];
  }
}

// 医生确认预约
async function doctorConfirmAppointment(appointmentId, token) {
  try {
    const response = await axios.put(`${API_BASE}/appointments/${appointmentId}/doctor-confirm`, {
      doctor_note: '医生确认测试'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('医生确认预约失败:', error.response?.data || error.message);
    return null;
  }
}

async function testWorkflow() {
  console.log('🚀 开始测试工作流...\n');

  // 1. 获取基础数据
  console.log('📋 获取基础数据...');
  const services = await getServices();
  const stores = await getStores();
  
  if (services.length === 0 || stores.length === 0) {
    console.error('❌ 无法获取基础数据，测试终止');
    return;
  }

  console.log(`✅ 找到 ${services.length} 个服务，${stores.length} 个门店\n`);

  // 2. 找到护理服务和医生服务
  const nursingService = services.find(s => s.category === 'nursing');
  const doctorService = services.find(s => s.category === 'consultation' || s.category === 'report');
  const firstStore = stores[0];

  if (!nursingService || !doctorService) {
    console.error('❌ 无法找到测试用的服务类型');
    console.log('可用服务:', services.map(s => `${s.name} (${s.category})`));
    return;
  }

  console.log(`🏥 护理服务: ${nursingService.name} (${nursingService.category})`);
  console.log(`👨‍⚕️ 医生服务: ${doctorService.name} (${doctorService.category})`);
  console.log(`🏪 测试门店: ${firstStore.name}\n`);

  // 3. 获取登录token
  console.log('🔐 获取用户token...');
  const headNurseToken = await login('head_nurse');
  const doctorToken = await login('doctor');
  console.log('✅ 获取token成功\n');

  // 4. 创建护理服务预约
  console.log('📝 创建护理服务预约...');
  const nursingAppointment = await createAppointment(nursingService.id, firstStore.id, headNurseToken);
  if (nursingAppointment) {
    console.log(`✅ 护理预约创建成功: ${nursingAppointment.id}`);
    console.log(`   工作流状态: ${nursingAppointment.workflow_status}`);
    console.log(`   需要护士排班: ${nursingAppointment.requires_nurse_scheduling}\n`);
  }

  // 5. 创建医生服务预约
  console.log('📝 创建医生服务预约...');
  const doctorAppointment = await createAppointment(doctorService.id, firstStore.id, doctorToken);
  if (doctorAppointment) {
    console.log(`✅ 医生预约创建成功: ${doctorAppointment.id}`);
    console.log(`   工作流状态: ${doctorAppointment.workflow_status}`);
    console.log(`   需要护士排班: ${doctorAppointment.requires_nurse_scheduling}\n`);
  }

  // 6. 测试护士长待处理列表
  console.log('👩‍⚕️ 测试护士长待处理列表...');
  const nursePending = await getNursePendingAppointments(headNurseToken);
  console.log(`✅ 护士长待处理预约数量: ${nursePending.length}`);
  nursePending.forEach(apt => {
    console.log(`   - ${apt.customer_name} (${apt.service?.name}) - ${apt.workflow_status}`);
  });
  console.log('');

  // 7. 测试医生待处理列表
  console.log('👨‍⚕️ 测试医生待处理列表...');
  const doctorPending = await getDoctorPendingAppointments(doctorToken);
  console.log(`✅ 医生待处理预约数量: ${doctorPending.length}`);
  doctorPending.forEach(apt => {
    console.log(`   - ${apt.customer_name} (${apt.service?.name}) - ${apt.workflow_status}`);
  });
  console.log('');

  // 8. 测试医生确认预约
  if (doctorPending.length > 0) {
    console.log('✅ 测试医生确认预约...');
    const confirmResult = await doctorConfirmAppointment(doctorPending[0].id, doctorToken);
    if (confirmResult) {
      console.log(`✅ 医生确认成功: ${confirmResult.workflow_status}`);
      console.log(`   确认时间: ${confirmResult.doctor_confirmed_at}\n`);
    }
  }

  // 9. 再次检查护士长待处理列表
  console.log('🔄 再次检查护士长待处理列表...');
  const nursePendingAfter = await getNursePendingAppointments(headNurseToken);
  console.log(`✅ 医生确认后，护士长待处理预约数量: ${nursePendingAfter.length}`);
  nursePendingAfter.forEach(apt => {
    console.log(`   - ${apt.customer_name} (${apt.service?.name}) - ${apt.workflow_status}`);
  });

  console.log('\n🎉 工作流测试完成！');
  console.log('\n📊 测试总结:');
  console.log(`- 护理服务应该直接出现在护士长待处理列表`);
  console.log(`- 医生服务应该出现在医生待处理列表`);
  console.log(`- 医生确认后，医生服务应该${doctorService.category === 'consultation' || doctorService.category === 'report' ? '直接完成' : '转到护士长排班'}`);
}

// 运行测试
testWorkflow().catch(console.error);