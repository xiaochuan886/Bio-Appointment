const axios = require('axios');

// API基础配置
const API_BASE = 'http://localhost:3001/api';

// 测试函数：获取护士长待排班预约
async function testNursePendingAppointments() {
  console.log('\n=== 测试护士长待排班预约 ===');
  
  try {
    // 使用护士长token登录
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'nurse_manager@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.tokens.accessToken;
    console.log('护士长登录成功');
    
    // 获取护士长待排班预约
    const pendingResponse = await axios.get(`${API_BASE}/appointments/nurse-pending`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const appointments = pendingResponse.data;
    console.log(`\n护士长待排班预约数量: ${appointments.length}`);
    
    if (appointments.length > 0) {
      console.log('\n预约详情:');
      appointments.forEach((apt, index) => {
        console.log(`${index + 1}. 客户: ${apt.customer_name}`);
        console.log(`   服务: ${apt.service?.name} (${apt.service?.category})`);
        console.log(`   状态: ${apt.workflow_status}`);
        console.log(`   需要护士排班: ${apt.requires_nurse_scheduling}`);
        console.log('---');
      });
    }
    
    // 检查是否有医生服务错误地出现在护士长排班中
    const doctorServices = appointments.filter(apt => 
      apt.service && (apt.service.category === 'consultation' || apt.service.category === 'report')
    );
    
    if (doctorServices.length > 0) {
      console.log('\n❌ 发现问题：医生服务出现在护士长排班中！');
      doctorServices.forEach(apt => {
        console.log(`   - ${apt.customer_name}: ${apt.service?.name} (${apt.service?.category})`);
      });
    } else {
      console.log('\n✅ 正确：护士长排班中只包含护理服务');
    }
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

// 测试函数：获取医生待确认预约
async function testDoctorPendingAppointments() {
  console.log('\n=== 测试医生待确认预约 ===');
  
  try {
    // 使用医生token登录
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'doctor@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.tokens.accessToken;
    console.log('医生登录成功');
    
    // 获取医生待确认预约
    const pendingResponse = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const appointments = pendingResponse.data;
    console.log(`\n医生待确认预约数量: ${appointments.length}`);
    
    if (appointments.length > 0) {
      console.log('\n预约详情:');
      appointments.forEach((apt, index) => {
        console.log(`${index + 1}. 客户: ${apt.customer_name}`);
        console.log(`   服务: ${apt.service?.name} (${apt.service?.category})`);
        console.log(`   状态: ${apt.workflow_status}`);
        console.log(`   需要护士排班: ${apt.requires_nurse_scheduling}`);
        console.log('---');
      });
    }
    
    // 检查是否有护理服务错误地出现在医生确认中
    const nursingServices = appointments.filter(apt => 
      apt.service && apt.service.category === 'nursing'
    );
    
    if (nursingServices.length > 0) {
      console.log('\n❌ 发现问题：护理服务出现在医生确认中！');
      nursingServices.forEach(apt => {
        console.log(`   - ${apt.customer_name}: ${apt.service?.name} (${apt.service?.category})`);
      });
    } else {
      console.log('\n✅ 正确：医生确认中只包含医生服务');
    }
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

// 测试函数：创建不同类型的预约
async function testCreateAppointments() {
  console.log('\n=== 测试创建不同类型预约 ===');
  
  try {
    // 使用销售token登录
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'sales@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.tokens.accessToken;
    console.log('销售登录成功');
    
    // 获取服务和门店信息
    const [servicesResponse, storesResponse] = await Promise.all([
      axios.get(`${API_BASE}/services`),
      axios.get(`${API_BASE}/stores`)
    ]);
    
    const services = servicesResponse.data;
    const stores = storesResponse.data.stores;
    
    const nursingService = services.find(s => s.category === 'nursing');
    const consultationService = services.find(s => s.category === 'consultation');
    const store = stores[0];
    
    if (!nursingService || !consultationService || !store) {
      console.log('❌ 缺少必要的测试数据');
      return;
    }
    
    console.log(`\n创建测试预约...`);
    console.log(`护理服务: ${nursingService.name}`);
    console.log(`医生服务: ${consultationService.name}`);
    console.log(`门店: ${store.name}`);
    
    // 创建护理服务预约
    const nursingAppointment = await axios.post(`${API_BASE}/appointments`, {
      customer_name: '测试护理客户',
      customer_phone: '13800138000',
      service_id: nursingService.id,
      requested_date: '2025-12-08',
      requested_time_start: '10:00',
      requested_time_end: '11:00',
      store_id: store.id
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`\n✅ 护理服务预约创建成功:`);
    console.log(`   工作流状态: ${nursingAppointment.data.workflow_status}`);
    console.log(`   需要护士排班: ${nursingAppointment.data.requires_nurse_scheduling}`);
    
    // 创建医生服务预约
    const consultationAppointment = await axios.post(`${API_BASE}/appointments`, {
      customer_name: '测试医生客户',
      customer_phone: '13800138001',
      service_id: consultationService.id,
      requested_date: '2025-12-08',
      requested_time_start: '14:00',
      requested_time_end: '15:00',
      store_id: store.id
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`\n✅ 医生服务预约创建成功:`);
    console.log(`   工作流状态: ${consultationAppointment.data.workflow_status}`);
    console.log(`   需要护士排班: ${consultationAppointment.data.requires_nurse_scheduling}`);
    
    return {
      nursingAppointment: nursingAppointment.data,
      consultationAppointment: consultationAppointment.data
    };
    
  } catch (error) {
    console.error('创建预约失败:', error.response?.data || error.message);
  }
}

// 主测试函数
async function runTests() {
  console.log('🧪 开始测试预约工作流修复...');
  
  try {
    // 1. 测试创建不同类型预约
    const createdAppointments = await testCreateAppointments();
    
    // 2. 测试护士长待排班预约
    await testNursePendingAppointments();
    
    // 3. 测试医生待确认预约
    await testDoctorPendingAppointments();
    
    console.log('\n🎉 测试完成！');
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
runTests();