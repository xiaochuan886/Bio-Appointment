const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function comprehensiveDoctorStoreTest() {
  console.log('🔍 全面测试医生门店隔离和边界情况...\n');

  try {
    // 1. 获取门店和服务信息
    const storesResponse = await axios.get(`${API_BASE}/stores`);
    const stores = Array.isArray(storesResponse.data) ? storesResponse.data : storesResponse.data.stores || [];
    
    const shanghaiStore = stores.find(s => s.name.includes('上海'));
    const defaultStore = stores.find(s => s.name.includes('默认'));
    
    const servicesResponse = await axios.get(`${API_BASE}/services?category=consultation`);
    const consultationService = servicesResponse.data[0];

    console.log('测试环境:');
    console.log(`- 上海门店: ${shanghaiStore.id}`);
    console.log(`- 默认门店: ${defaultStore.id}`);
    console.log(`- 咨询服务: ${consultationService.id}`);

    // 2. 创建跨门店预约测试数据
    console.log('\n📝 创建测试预约...');
    
    const testAppointments = [
      {
        name: '上海客户A',
        store_id: shanghaiStore.id,
        phone: '13800001001'
      },
      {
        name: '上海客户B', 
        store_id: shanghaiStore.id,
        phone: '13800001002'
      },
      {
        name: '默认门店客户A',
        store_id: defaultStore.id,
        phone: '13800002001'
      },
      {
        name: '默认门店客户B',
        store_id: defaultStore.id,
        phone: '13800002002'
      }
    ];

    const createdAppointments = [];
    for (const apt of testAppointments) {
      try {
        const response = await axios.post(`${API_BASE}/appointments`, {
          customer_name: apt.name,
          customer_phone: apt.phone,
          service_id: consultationService.id,
          requested_date: '2024-12-16',
          requested_time_start: '10:00',
          requested_time_end: '11:00',
          total_people: 1,
          estimated_duration: 60,
          store_id: apt.store_id
        });
        createdAppointments.push({
          ...response.data,
          expectedStore: apt.store_id
        });
        console.log(`✅ 创建预约: ${apt.name} -> ${apt.store_id === shanghaiStore.id ? '上海' : '默认'}门店`);
      } catch (error) {
        console.log(`❌ 创建预约失败: ${apt.name}`, error.response?.data?.error);
      }
    }

    // 3. 测试不同医生的访问权限
    console.log('\n👨‍⚕️ 测试医生访问权限...');
    
    const testDoctors = [
      { username: 'doctor1', name: '陈医生', expectedStoreId: defaultStore.id, storeName: '默认门店' },
      { username: 'doctor2', name: '赵医生', expectedStoreId: shanghaiStore.id, storeName: '上海门店' }
    ];

    for (const doctor of testDoctors) {
      console.log(`\n🔍 测试 ${doctor.name} (${doctor.storeName}):`);
      
      try {
        // 登录
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
          email: doctor.username,
          password: 'doctor123'
        });
        const token = loginResponse.data.tokens.accessToken;
        
        // 测试1: 不传store_id参数（正常情况）
        console.log('  测试1: 正常API调用（不传store_id）');
        const normalResponse = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const normalAppointments = normalResponse.data;
        console.log(`    看到预约数量: ${normalAppointments.length}`);
        
        // 分析门店分布
        const shanghaiCount = normalAppointments.filter(apt => apt.store_id === shanghaiStore.id).length;
        const defaultCount = normalAppointments.filter(apt => apt.store_id === defaultStore.id).length;
        
        console.log(`    上海门店预约: ${shanghaiCount} 个`);
        console.log(`    默认门店预约: ${defaultCount} 个`);
        
        // 验证权限隔离
        if (doctor.expectedStoreId === shanghaiStore.id) {
          if (defaultCount > 0) {
            console.log(`    🚨 BUG: 上海医生看到了 ${defaultCount} 个默认门店预约!`);
          } else {
            console.log(`    ✅ 权限正确: 上海医生只看到上海门店预约`);
          }
        } else {
          if (shanghaiCount > 0) {
            console.log(`    🚨 BUG: 默认门店医生看到了 ${shanghaiCount} 个上海门店预约!`);
          } else {
            console.log(`    ✅ 权限正确: 默认门店医生只看到默认门店预约`);
          }
        }

        // 测试2: 传递错误的store_id参数（边界情况）
        console.log('  测试2: 传递错误的store_id参数');
        const wrongStoreId = doctor.expectedStoreId === shanghaiStore.id ? defaultStore.id : shanghaiStore.id;
        
        try {
          const wrongStoreResponse = await axios.get(`${API_BASE}/appointments/doctor-pending?store_id=${wrongStoreId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          const wrongStoreAppointments = wrongStoreResponse.data;
          console.log(`    传递错误store_id后看到预约数量: ${wrongStoreAppointments.length}`);
          
          // 检查是否能绕过权限限制
          const wrongShanghaiCount = wrongStoreAppointments.filter(apt => apt.store_id === shanghaiStore.id).length;
          const wrongDefaultCount = wrongStoreAppointments.filter(apt => apt.store_id === defaultStore.id).length;
          
          if (doctor.expectedStoreId === shanghaiStore.id && wrongDefaultCount > 0) {
            console.log(`    🚨 严重BUG: 上海医生通过传递store_id绕过了权限限制!`);
          } else if (doctor.expectedStoreId === defaultStore.id && wrongShanghaiCount > 0) {
            console.log(`    🚨 严重BUG: 默认门店医生通过传递store_id绕过了权限限制!`);
          } else {
            console.log(`    ✅ 安全: 传递错误store_id无法绕过权限限制`);
          }
        } catch (error) {
          console.log(`    ✅ 安全: 传递错误store_id被拒绝 - ${error.response?.data?.error}`);
        }

        // 测试3: 检查预约信息的一致性
        console.log('  测试3: 检查预约信息一致性');
        normalAppointments.forEach(apt => {
          if (apt.store_id !== doctor.expectedStoreId) {
            console.log(`    🚨 数据不一致: 预约 ${apt.customer_name} 的门店ID ${apt.store_id} 与医生门店 ${doctor.expectedStoreId} 不匹配`);
          }
          
          // 检查门店名称是否正确
          const expectedStoreName = apt.store_id === shanghaiStore.id ? '上海门店' : '默认门店';
          if (apt.store?.name !== expectedStoreName) {
            console.log(`    🚨 门店名称错误: 预约 ${apt.customer_name} 显示门店名称 "${apt.store?.name}"，应该是 "${expectedStoreName}"`);
          }
        });

      } catch (error) {
        console.log(`❌ 测试医生 ${doctor.username} 失败:`, error.response?.data?.error || error.message);
      }
    }

    // 4. 测试超级管理员的跨门店访问
    console.log('\n👑 测试超级管理员权限...');
    
    try {
      const adminLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: 'admin',
        password: 'admin123'
      });
      const adminToken = adminLoginResponse.data.tokens.accessToken;
      
      // 测试管理员查看所有门店
      const allAppointmentsResponse = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      console.log(`管理员看到的总预约数: ${allAppointmentsResponse.data.length}`);
      
      // 测试管理员指定门店查看
      const shanghaiOnlyResponse = await axios.get(`${API_BASE}/appointments/doctor-pending?store_id=${shanghaiStore.id}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      const defaultOnlyResponse = await axios.get(`${API_BASE}/appointments/doctor-pending?store_id=${defaultStore.id}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      console.log(`管理员查看上海门店: ${shanghaiOnlyResponse.data.length} 个预约`);
      console.log(`管理员查看默认门店: ${defaultOnlyResponse.data.length} 个预约`);
      
    } catch (error) {
      console.log('❌ 测试管理员权限失败:', error.response?.data?.error || error.message);
    }

    // 5. 总结测试结果
    console.log('\n📊 测试总结:');
    console.log('✅ 门店隔离机制测试完成');
    console.log('✅ 权限边界测试完成');
    console.log('✅ 数据一致性测试完成');

  } catch (error) {
    console.error('❌ 综合测试失败:', error.response?.data || error.message);
  }
}

comprehensiveDoctorStoreTest();