const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function diagnoseUserIssue() {
  console.log('🔍 诊断用户报告的门店隔离问题...\n');

  try {
    // 1. 检查所有医生账户的配置
    console.log('1. 检查所有医生账户配置...');
    
    const profilesResponse = await axios.get(`${API_BASE}/profiles?role=doctor`);
    const doctors = profilesResponse.data;
    
    console.log('所有医生账户:');
    doctors.forEach(doctor => {
      console.log(`- ${doctor.full_name} (${doctor.username})`);
      console.log(`  ID: ${doctor.id}`);
      console.log(`  门店ID: ${doctor.store_id || 'NULL - 这可能是问题!'}`);
      console.log(`  状态: ${doctor.status || 'unknown'}`);
      console.log('');
    });

    // 2. 检查是否有医生没有分配门店
    const doctorsWithoutStore = doctors.filter(d => !d.store_id);
    if (doctorsWithoutStore.length > 0) {
      console.log('🚨 发现问题: 以下医生没有分配门店:');
      doctorsWithoutStore.forEach(doctor => {
        console.log(`- ${doctor.full_name} (${doctor.username}) - 这些医生可能看到所有预约!`);
      });
    }

    // 3. 检查门店信息
    console.log('\n2. 检查门店信息...');
    const storesResponse = await axios.get(`${API_BASE}/stores`);
    const stores = Array.isArray(storesResponse.data) ? storesResponse.data : storesResponse.data.stores || [];
    
    console.log('所有门店:');
    stores.forEach(store => {
      console.log(`- ${store.name} (${store.id})`);
      console.log(`  状态: ${store.status}`);
      
      // 统计每个门店的医生数量
      const storeDoctor = doctors.filter(d => d.store_id === store.id);
      console.log(`  医生数量: ${storeDoctor.length}`);
      storeDoctor.forEach(d => console.log(`    - ${d.full_name}`));
      console.log('');
    });

    // 4. 检查预约分布
    console.log('3. 检查预约分布...');
    const appointmentsResponse = await axios.get(`${API_BASE}/appointments`);
    const appointments = appointmentsResponse.data.filter(apt => 
      apt.workflow_status === 'pending_doctor_confirmation'
    );
    
    console.log('待医生确认的预约分布:');
    const storeAppointmentCount = {};
    appointments.forEach(apt => {
      const storeName = stores.find(s => s.id === apt.store_id)?.name || '未知门店';
      storeAppointmentCount[storeName] = (storeAppointmentCount[storeName] || 0) + 1;
    });
    
    Object.entries(storeAppointmentCount).forEach(([storeName, count]) => {
      console.log(`- ${storeName}: ${count} 个预约`);
    });

    // 5. 模拟用户可能遇到的问题场景
    console.log('\n4. 模拟问题场景...');
    
    // 场景1: 医生没有门店ID的情况
    if (doctorsWithoutStore.length > 0) {
      console.log('\n场景1: 测试没有门店ID的医生...');
      const doctorWithoutStore = doctorsWithoutStore[0];
      
      try {
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
          email: doctorWithoutStore.username,
          password: 'test123'
        });
        const token = loginResponse.data.tokens.accessToken;
        
        const appointmentsResponse = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`没有门店ID的医生看到预约数量: ${appointmentsResponse.data.length}`);
        
        // 分析预约来源
        const appointmentsByStore = {};
        appointmentsResponse.data.forEach(apt => {
          const storeName = stores.find(s => s.id === apt.store_id)?.name || '未知';
          appointmentsByStore[storeName] = (appointmentsByStore[storeName] || 0) + 1;
        });
        
        console.log('预约来源分布:');
        Object.entries(appointmentsByStore).forEach(([store, count]) => {
          console.log(`  - ${store}: ${count} 个`);
        });
        
        if (Object.keys(appointmentsByStore).length > 1) {
          console.log('🚨 确认BUG: 没有门店ID的医生能看到多个门店的预约!');
        }
        
      } catch (error) {
        console.log('测试没有门店ID的医生失败:', error.response?.data?.error);
      }
    }

    // 6. 检查后端API的门店过滤逻辑
    console.log('\n5. 分析后端API逻辑...');
    console.log('后端API逻辑分析:');
    console.log('- 如果医生有store_id: 只显示该门店的预约 ✅');
    console.log('- 如果医生没有store_id: 可能显示所有预约 ⚠️');
    console.log('- 管理员: 可以查看所有门店 ✅');

    // 7. 提供解决方案
    console.log('\n6. 问题解决方案...');
    
    if (doctorsWithoutStore.length > 0) {
      console.log('🔧 需要修复的问题:');
      console.log('1. 为所有医生分配正确的门店ID');
      console.log('2. 修改后端API，确保没有门店ID的医生无法访问任何预约');
      console.log('3. 添加数据验证，防止创建没有门店ID的医生账户');
      
      console.log('\n建议的修复步骤:');
      doctorsWithoutStore.forEach(doctor => {
        console.log(`- 为医生 ${doctor.full_name} (${doctor.username}) 分配门店ID`);
      });
    } else {
      console.log('✅ 所有医生都有正确的门店ID配置');
    }

  } catch (error) {
    console.error('❌ 诊断失败:', error.response?.data || error.message);
  }
}

diagnoseUserIssue();