const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function debugDoctorStoreIssue() {
  console.log('🔍 详细调试医生门店隔离问题...\n');

  try {
    // 1. 检查现有医生账户的门店信息
    console.log('1. 检查现有医生账户...');
    
    const profilesResponse = await axios.get(`${API_BASE}/profiles?role=doctor`);
    const doctors = profilesResponse.data;
    
    console.log('现有医生账户:');
    doctors.forEach(doctor => {
      console.log(`- ${doctor.full_name} (${doctor.username}): store_id = ${doctor.store_id || 'NULL'}`);
    });

    // 2. 更新医生账户的门店信息
    console.log('\n2. 更新医生账户的门店信息...');
    
    const storesResponse = await axios.get(`${API_BASE}/stores`);
    const stores = Array.isArray(storesResponse.data) ? storesResponse.data : storesResponse.data.stores || [];
    
    const shanghaiStore = stores.find(s => s.name.includes('上海'));
    const defaultStore = stores.find(s => s.name.includes('默认'));
    
    if (!shanghaiStore || !defaultStore) {
      console.log('❌ 门店信息不完整');
      return;
    }

    // 直接更新数据库中的医生门店信息
    console.log('更新医生门店信息...');
    
    // 这里我们需要直接操作数据库，因为API可能没有更新用户的端点
    // 让我们先检查是否有更新用户的API

    // 3. 创建测试预约
    console.log('\n3. 创建测试预约...');
    
    const servicesResponse = await axios.get(`${API_BASE}/services?category=consultation`);
    const consultationService = servicesResponse.data[0];
    
    if (!consultationService) {
      console.log('❌ 未找到医生咨询服务');
      return;
    }

    // 创建上海门店预约
    const shanghaiAppointment = {
      customer_name: '上海客户',
      customer_phone: '13800138001',
      service_id: consultationService.id,
      requested_date: '2024-12-15',
      requested_time_start: '10:00',
      requested_time_end: '11:00',
      total_people: 1,
      estimated_duration: 60,
      store_id: shanghaiStore.id
    };

    // 创建默认门店预约
    const defaultAppointment = {
      customer_name: '默认门店客户',
      customer_phone: '13800138002',
      service_id: consultationService.id,
      requested_date: '2024-12-15',
      requested_time_start: '14:00',
      requested_time_end: '15:00',
      total_people: 1,
      estimated_duration: 60,
      store_id: defaultStore.id
    };

    const shanghaiAptResponse = await axios.post(`${API_BASE}/appointments`, shanghaiAppointment);
    const defaultAptResponse = await axios.post(`${API_BASE}/appointments`, defaultAppointment);

    console.log('✅ 创建预约成功:');
    console.log(`- 上海预约: ${shanghaiAptResponse.data.id} (store: ${shanghaiAptResponse.data.store_id})`);
    console.log(`- 默认预约: ${defaultAptResponse.data.id} (store: ${defaultAptResponse.data.store_id})`);

    // 4. 测试不同医生的登录和查看
    console.log('\n4. 测试医生查看预约...');

    // 使用现有的医生账户进行测试
    const testDoctors = [
      { username: 'doctor_shanghai_test', expectedStore: shanghaiStore.id },
      { username: 'doctor_default_test', expectedStore: defaultStore.id }
    ];

    for (const testDoctor of testDoctors) {
      try {
        console.log(`\n测试医生: ${testDoctor.username}`);
        
        // 登录
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
          email: testDoctor.username,
          password: 'test123'
        });
        const token = loginResponse.data.tokens.accessToken;
        
        // 获取用户详细信息
        const userInfo = loginResponse.data.user;
        console.log(`用户信息: role=${userInfo.role}, id=${userInfo.id}`);
        
        // 查看待处理预约
        const appointmentsResponse = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`看到的预约数量: ${appointmentsResponse.data.length}`);
        appointmentsResponse.data.forEach(apt => {
          console.log(`- ${apt.customer_name} (store: ${apt.store_id}, store_name: ${apt.store?.name})`);
        });

        // 检查是否能看到不应该看到的预约
        const canSeeShanghai = appointmentsResponse.data.some(apt => apt.id === shanghaiAptResponse.data.id);
        const canSeeDefault = appointmentsResponse.data.some(apt => apt.id === defaultAptResponse.data.id);
        
        console.log(`能看到上海预约: ${canSeeShanghai}`);
        console.log(`能看到默认预约: ${canSeeDefault}`);
        
        // 分析问题
        if (testDoctor.expectedStore === shanghaiStore.id) {
          if (!canSeeShanghai) console.log('❌ 上海医生看不到上海预约');
          if (canSeeDefault) console.log('🚨 BUG: 上海医生能看到默认门店预约!');
        } else {
          if (!canSeeDefault) console.log('❌ 默认医生看不到默认预约');
          if (canSeeShanghai) console.log('🚨 BUG: 默认医生能看到上海门店预约!');
        }

      } catch (error) {
        console.log(`❌ 测试医生 ${testDoctor.username} 失败:`, error.response?.data?.error || error.message);
      }
    }

    // 5. 检查数据库中的实际数据
    console.log('\n5. 检查数据库数据一致性...');
    
    const allAppointments = await axios.get(`${API_BASE}/appointments`);
    console.log('所有预约:');
    allAppointments.data.forEach(apt => {
      if (apt.workflow_status === 'pending_doctor_confirmation') {
        console.log(`- ${apt.customer_name}: store_id=${apt.store_id}, workflow_status=${apt.workflow_status}`);
      }
    });

  } catch (error) {
    console.error('❌ 调试失败:', error.response?.data || error.message);
  }
}

debugDoctorStoreIssue();