const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

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

// 获取用户列表
async function getUsers() {
  try {
    const response = await axios.get(`${API_BASE}/profiles`);
    return response.data;
  } catch (error) {
    console.error('获取用户失败:', error.message);
    return [];
  }
}

// 创建预约（不需要认证）
async function createAppointment(serviceId, storeId) {
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
    });
    return response.data;
  } catch (error) {
    console.error('创建预约失败:', error.response?.data || error.message);
    return null;
  }
}

// 获取所有预约
async function getAllAppointments() {
  try {
    const response = await axios.get(`${API_BASE}/appointments`);
    return response.data;
  } catch (error) {
    console.error('获取预约失败:', error.message);
    return [];
  }
}

async function testWorkflow() {
  console.log('🚀 开始测试工作流...\n');

  // 1. 获取基础数据
  console.log('📋 获取基础数据...');
  const services = await getServices();
  const stores = await getStores();
  const users = await getUsers();
  
  if (services.length === 0 || stores.length === 0) {
    console.error('❌ 无法获取基础数据，测试终止');
    return;
  }

  console.log(`✅ 找到 ${services.length} 个服务，${stores.length} 个门店，${users.length} 个用户\n`);

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

  console.log('👥 用户列表:');
  users.forEach(user => {
    console.log(`   - ${user.full_name} (${user.role}) - ${user.email || user.username}`);
  });
  console.log('');

  // 3. 创建护理服务预约
  console.log('📝 创建护理服务预约...');
  const nursingAppointment = await createAppointment(nursingService.id, firstStore.id);
  if (nursingAppointment) {
    console.log(`✅ 护理预约创建成功: ${nursingAppointment.id}`);
    console.log(`   工作流状态: ${nursingAppointment.workflow_status}`);
    console.log(`   需要护士排班: ${nursingAppointment.requires_nurse_scheduling}\n`);
  }

  // 4. 创建医生服务预约
  console.log('📝 创建医生服务预约...');
  const doctorAppointment = await createAppointment(doctorService.id, firstStore.id);
  if (doctorAppointment) {
    console.log(`✅ 医生预约创建成功: ${doctorAppointment.id}`);
    console.log(`   工作流状态: ${doctorAppointment.workflow_status}`);
    console.log(`   需要护士排班: ${doctorAppointment.requires_nurse_scheduling}\n`);
  }

  // 5. 获取所有预约并分析
  console.log('📊 分析所有预约...');
  const allAppointments = await getAllAppointments();
  console.log(`✅ 总预约数量: ${allAppointments.length}`);
  
  const nursingAppointments = allAppointments.filter(a => a.service?.category === 'nursing');
  const doctorAppointments = allAppointments.filter(a => a.service?.category === 'consultation' || a.service?.category === 'report');
  
  console.log(`🏥 护理预约数量: ${nursingAppointments.length}`);
  nursingAppointments.forEach(apt => {
    console.log(`   - ${apt.customer_name} (${apt.service?.name}) - ${apt.workflow_status} - 需要护士排班: ${apt.requires_nurse_scheduling}`);
  });
  
  console.log(`👨‍⚕️ 医生预约数量: ${doctorAppointments.length}`);
  doctorAppointments.forEach(apt => {
    console.log(`   - ${apt.customer_name} (${apt.service?.name}) - ${apt.workflow_status} - 需要护士排班: ${apt.requires_nurse_scheduling}`);
  });

  console.log('\n🎉 工作流测试完成！');
  console.log('\n📊 测试总结:');
  console.log(`- 护理服务状态: ${nursingAppointments.map(a => a.workflow_status).join(', ')}`);
  console.log(`- 医生服务状态: ${doctorAppointments.map(a => a.workflow_status).join(', ')}`);
  console.log(`- 护理服务需要护士排班: ${nursingAppointments.every(a => a.requires_nurse_scheduling)}`);
  console.log(`- 医生服务需要护士排班: ${doctorAppointments.every(a => a.requires_nurse_scheduling)}`);
}

// 运行测试
testWorkflow().catch(console.error);