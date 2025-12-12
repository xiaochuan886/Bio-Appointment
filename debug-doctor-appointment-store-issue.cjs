const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// 测试医生预约门店隔离问题
async function testDoctorAppointmentStoreIsolation() {
  console.log('🔍 测试医生预约门店隔离问题...\n');

  try {
    // 1. 创建测试数据 - 上海门店的预约
    console.log('1. 创建上海门店的医生咨询预约...');
    
    // 先获取上海门店ID
    const storesResponse = await axios.get(`${API_BASE}/stores`);
    const stores = Array.isArray(storesResponse.data) ? storesResponse.data : storesResponse.data.stores || [];
    console.log('可用门店:', stores.map(s => ({ id: s.id, name: s.name })));
    
    const shanghaiStore = stores.find(s => s.name.includes('上海'));
    const defaultStore = stores.find(s => s.name.includes('默认') || s.name.includes('总店'));
    
    if (!shanghaiStore) {
      console.log('❌ 未找到上海门店，创建测试门店...');
      const createStoreResponse = await axios.post(`${API_BASE}/stores`, {
        name: '上海测试门店',
        address: '上海市测试地址',
        status: 'active'
      });
      shanghaiStore = createStoreResponse.data;
    }
    
    if (!defaultStore) {
      console.log('❌ 未找到默认门店，创建测试门店...');
      const createStoreResponse = await axios.post(`${API_BASE}/stores`, {
        name: '默认门店',
        address: '默认地址',
        status: 'active'
      });
      defaultStore = createStoreResponse.data;
    }

    console.log('上海门店:', { id: shanghaiStore.id, name: shanghaiStore.name });
    console.log('默认门店:', { id: defaultStore.id, name: defaultStore.name });

    // 2. 获取医生咨询服务
    const servicesResponse = await axios.get(`${API_BASE}/services?category=consultation`);
    const consultationService = servicesResponse.data[0];
    
    if (!consultationService) {
      console.log('❌ 未找到医生咨询服务');
      return;
    }
    
    console.log('医生咨询服务:', { id: consultationService.id, name: consultationService.name });

    // 3. 创建上海门店的预约
    const appointmentData = {
      customer_name: '测试客户-上海门店',
      customer_phone: '13800138000',
      service_id: consultationService.id,
      requested_date: '2024-12-15',
      requested_time_start: '10:00',
      requested_time_end: '11:00',
      total_people: 1,
      estimated_duration: 60,
      is_urgent: false,
      store_id: shanghaiStore.id, // 明确指定上海门店
      notes: '测试预约 - 应该只有上海门店的医生能看到'
    };

    const createResponse = await axios.post(`${API_BASE}/appointments`, appointmentData);
    const appointment = createResponse.data;
    
    console.log('✅ 创建预约成功:', {
      id: appointment.id,
      customer_name: appointment.customer_name,
      store_id: appointment.store_id,
      workflow_status: appointment.workflow_status
    });

    // 4. 创建测试医生账户
    console.log('\n2. 创建测试医生账户...');
    
    // 上海门店医生
    const shanghaiDoctor = {
      username: 'doctor_shanghai_test',
      email: 'doctor.shanghai@test.com',
      full_name: '上海医生',
      role: 'doctor',
      password: 'test123',
      store_id: shanghaiStore.id
    };

    // 默认门店医生
    const defaultDoctor = {
      username: 'doctor_default_test',
      email: 'doctor.default@test.com',
      full_name: '默认门店医生',
      role: 'doctor',
      password: 'test123',
      store_id: defaultStore.id
    };

    try {
      await axios.post(`${API_BASE}/profiles`, shanghaiDoctor);
      console.log('✅ 创建上海医生账户成功');
    } catch (error) {
      if (error.response?.data?.error?.includes('already exists')) {
        console.log('ℹ️ 上海医生账户已存在');
      } else {
        throw error;
      }
    }

    try {
      await axios.post(`${API_BASE}/profiles`, defaultDoctor);
      console.log('✅ 创建默认门店医生账户成功');
    } catch (error) {
      if (error.response?.data?.error?.includes('already exists')) {
        console.log('ℹ️ 默认门店医生账户已存在');
      } else {
        throw error;
      }
    }

    // 5. 测试医生登录并查看预约
    console.log('\n3. 测试医生查看预约...');
    
    // 上海医生登录
    const shanghaiLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: shanghaiDoctor.username,
      password: shanghaiDoctor.password
    });
    const shanghaiToken = shanghaiLoginResponse.data.tokens.accessToken;
    
    // 默认门店医生登录
    const defaultLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: defaultDoctor.username,
      password: defaultDoctor.password
    });
    const defaultToken = defaultLoginResponse.data.tokens.accessToken;

    // 6. 上海医生查看待处理预约
    console.log('\n4. 上海医生查看待处理预约...');
    const shanghaiDoctorAppointments = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
      headers: { 'Authorization': `Bearer ${shanghaiToken}` }
    });
    
    console.log('上海医生看到的预约数量:', shanghaiDoctorAppointments.data.length);
    shanghaiDoctorAppointments.data.forEach(apt => {
      console.log('- 预约:', {
        id: apt.id,
        customer_name: apt.customer_name,
        store_id: apt.store_id,
        store_name: apt.store?.name || '未知门店'
      });
    });

    // 7. 默认门店医生查看待处理预约
    console.log('\n5. 默认门店医生查看待处理预约...');
    const defaultDoctorAppointments = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
      headers: { 'Authorization': `Bearer ${defaultToken}` }
    });
    
    console.log('默认门店医生看到的预约数量:', defaultDoctorAppointments.data.length);
    defaultDoctorAppointments.data.forEach(apt => {
      console.log('- 预约:', {
        id: apt.id,
        customer_name: apt.customer_name,
        store_id: apt.store_id,
        store_name: apt.store?.name || '未知门店'
      });
    });

    // 8. 分析问题
    console.log('\n📊 问题分析:');
    
    const shanghaiCanSeeAppointment = shanghaiDoctorAppointments.data.some(apt => apt.id === appointment.id);
    const defaultCanSeeAppointment = defaultDoctorAppointments.data.some(apt => apt.id === appointment.id);
    
    console.log(`上海医生能看到上海门店预约: ${shanghaiCanSeeAppointment ? '✅ 是' : '❌ 否'}`);
    console.log(`默认门店医生能看到上海门店预约: ${defaultCanSeeAppointment ? '❌ 是 (BUG!)' : '✅ 否'}`);
    
    if (defaultCanSeeAppointment) {
      console.log('\n🚨 发现BUG: 默认门店医生不应该看到上海门店的预约!');
      
      // 检查预约信息在不同医生视角下的显示
      const shanghaiViewAppointment = shanghaiDoctorAppointments.data.find(apt => apt.id === appointment.id);
      const defaultViewAppointment = defaultDoctorAppointments.data.find(apt => apt.id === appointment.id);
      
      if (shanghaiViewAppointment && defaultViewAppointment) {
        console.log('\n🔍 预约信息对比:');
        console.log('上海医生看到的门店信息:', {
          store_id: shanghaiViewAppointment.store_id,
          store_name: shanghaiViewAppointment.store?.name
        });
        console.log('默认门店医生看到的门店信息:', {
          store_id: defaultViewAppointment.store_id,
          store_name: defaultViewAppointment.store?.name
        });
        
        if (shanghaiViewAppointment.store_id !== defaultViewAppointment.store_id) {
          console.log('🚨 更严重的BUG: 同一个预约在不同医生视角下显示不同的门店信息!');
        }
      }
    }

    // 9. 检查后端API的门店过滤逻辑
    console.log('\n6. 检查API门店过滤逻辑...');
    
    // 直接查询数据库中的预约信息
    console.log('数据库中的预约信息:');
    const allAppointments = await axios.get(`${API_BASE}/appointments`);
    const dbAppointment = allAppointments.data.find(apt => apt.id === appointment.id);
    if (dbAppointment) {
      console.log('数据库中的预约:', {
        id: dbAppointment.id,
        customer_name: dbAppointment.customer_name,
        store_id: dbAppointment.store_id,
        workflow_status: dbAppointment.workflow_status
      });
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testDoctorAppointmentStoreIsolation();