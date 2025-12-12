const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testExistingDoctors() {
  console.log('🔍 测试现有医生账户的门店隔离...\n');

  try {
    // 1. 获取门店信息
    const storesResponse = await axios.get(`${API_BASE}/stores`);
    const stores = Array.isArray(storesResponse.data) ? storesResponse.data : storesResponse.data.stores || [];
    
    const shanghaiStore = stores.find(s => s.name.includes('上海'));
    const defaultStore = stores.find(s => s.name.includes('默认'));
    
    console.log('门店信息:');
    console.log(`- 上海门店: ${shanghaiStore.id} (${shanghaiStore.name})`);
    console.log(`- 默认门店: ${defaultStore.id} (${defaultStore.name})`);

    // 2. 测试现有医生
    const testDoctors = [
      { username: 'doctor1', name: '陈医生', expectedStoreId: defaultStore.id },
      { username: 'doctor2', name: '赵医生', expectedStoreId: shanghaiStore.id }
    ];

    for (const doctor of testDoctors) {
      console.log(`\n测试医生: ${doctor.name} (${doctor.username})`);
      
      try {
        // 登录
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
          email: doctor.username,
          password: 'doctor123'
        });
        const token = loginResponse.data.tokens.accessToken;
        const userInfo = loginResponse.data.user;
        
        console.log(`✅ 登录成功: ${userInfo.full_name} (role: ${userInfo.role})`);
        
        // 获取详细用户信息
        const profileResponse = await axios.get(`${API_BASE}/profiles/${userInfo.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const profile = profileResponse.data;
        
        console.log(`用户门店: ${profile.store_id} (${profile.store_name || '未知'})`);
        
        // 查看待处理预约
        const appointmentsResponse = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`看到的预约数量: ${appointmentsResponse.data.length}`);
        
        appointmentsResponse.data.forEach(apt => {
          console.log(`- 预约: ${apt.customer_name}`);
          console.log(`  门店ID: ${apt.store_id}`);
          console.log(`  门店名称: ${apt.store?.name || '未知'}`);
          console.log(`  工作流状态: ${apt.workflow_status}`);
          
          // 检查门店匹配
          if (apt.store_id === profile.store_id) {
            console.log(`  ✅ 门店匹配 - 正确`);
          } else {
            console.log(`  🚨 门店不匹配 - BUG! 医生门店: ${profile.store_id}, 预约门店: ${apt.store_id}`);
          }
        });
        
        // 分析跨门店访问问题
        const shanghaiAppointments = appointmentsResponse.data.filter(apt => apt.store_id === shanghaiStore.id);
        const defaultAppointments = appointmentsResponse.data.filter(apt => apt.store_id === defaultStore.id);
        
        console.log(`\n门店访问分析:`);
        console.log(`- 看到上海门店预约: ${shanghaiAppointments.length} 个`);
        console.log(`- 看到默认门店预约: ${defaultAppointments.length} 个`);
        
        if (profile.store_id === shanghaiStore.id) {
          if (defaultAppointments.length > 0) {
            console.log(`🚨 BUG: 上海医生不应该看到默认门店的预约!`);
          }
          if (shanghaiAppointments.length === 0) {
            console.log(`❌ 问题: 上海医生看不到自己门店的预约`);
          }
        } else if (profile.store_id === defaultStore.id) {
          if (shanghaiAppointments.length > 0) {
            console.log(`🚨 BUG: 默认门店医生不应该看到上海门店的预约!`);
          }
          if (defaultAppointments.length === 0) {
            console.log(`❌ 问题: 默认门店医生看不到自己门店的预约`);
          }
        }

      } catch (error) {
        console.log(`❌ 测试医生 ${doctor.username} 失败:`, error.response?.data?.error || error.message);
      }
    }

    // 3. 检查所有待处理预约
    console.log('\n📊 所有待处理预约:');
    const allAppointments = await axios.get(`${API_BASE}/appointments`);
    const pendingAppointments = allAppointments.data.filter(apt => 
      apt.workflow_status === 'pending_doctor_confirmation'
    );
    
    pendingAppointments.forEach(apt => {
      const storeName = apt.store_id === shanghaiStore.id ? '上海门店' : 
                       apt.store_id === defaultStore.id ? '默认门店' : '未知门店';
      console.log(`- ${apt.customer_name}: ${storeName} (${apt.store_id})`);
    });

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testExistingDoctors();