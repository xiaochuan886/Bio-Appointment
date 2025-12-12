const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testFixedDoctors() {
  console.log('🔍 测试修复后的医生账户...\n');

  try {
    // 测试之前有问题的医生账户
    const testDoctors = [
      { username: 'doctor_shanghai_test', name: '上海医生', expectedStore: '上海门店' },
      { username: 'doctor_default_test', name: '默认门店医生', expectedStore: '默认门店' }
    ];

    for (const doctor of testDoctors) {
      console.log(`测试 ${doctor.name} (${doctor.username}):`);
      
      try {
        // 登录
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
          email: doctor.username,
          password: 'test123'
        });
        const token = loginResponse.data.tokens.accessToken;
        const userInfo = loginResponse.data.user;
        
        console.log(`✅ 登录成功: ${userInfo.full_name}`);
        
        // 获取用户详细信息
        const profileResponse = await axios.get(`${API_BASE}/profiles/${userInfo.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const profile = profileResponse.data;
        
        console.log(`门店分配: ${profile.store_name} (${profile.store_id})`);
        
        // 查看待处理预约
        const appointmentsResponse = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`看到的预约数量: ${appointmentsResponse.data.length}`);
        
        // 分析预约门店分布
        const storeDistribution = {};
        appointmentsResponse.data.forEach(apt => {
          const storeName = apt.store?.name || '未知门店';
          storeDistribution[storeName] = (storeDistribution[storeName] || 0) + 1;
        });
        
        console.log('预约门店分布:');
        Object.entries(storeDistribution).forEach(([store, count]) => {
          console.log(`  - ${store}: ${count} 个`);
        });
        
        // 验证门店隔离
        const expectedStoreName = doctor.expectedStore;
        const hasOnlyExpectedStore = Object.keys(storeDistribution).length === 1 && 
                                   Object.keys(storeDistribution)[0] === expectedStoreName;
        
        if (hasOnlyExpectedStore || appointmentsResponse.data.length === 0) {
          console.log(`✅ 门店隔离正确: 只能看到${expectedStoreName}的预约`);
        } else {
          console.log(`🚨 门店隔离失败: 看到了其他门店的预约!`);
          Object.entries(storeDistribution).forEach(([store, count]) => {
            if (store !== expectedStoreName) {
              console.log(`  ❌ 不应该看到 ${store} 的 ${count} 个预约`);
            }
          });
        }
        
      } catch (error) {
        if (error.response?.status === 403 && error.response?.data?.message?.includes('未分配门店')) {
          console.log(`❌ 仍然存在门店分配问题: ${error.response.data.message}`);
        } else {
          console.log(`❌ 测试失败: ${error.response?.data?.error || error.message}`);
        }
      }
      
      console.log('');
    }

    // 测试后端安全检查
    console.log('🛡️ 测试后端安全检查...');
    
    // 尝试创建一个没有门店ID的医生账户
    try {
      const newDoctorResponse = await axios.post(`${API_BASE}/profiles`, {
        username: 'test_doctor_no_store',
        email: 'test.doctor.nostore@test.com',
        full_name: '测试医生（无门店）',
        role: 'doctor',
        password: 'test123'
        // 故意不设置 store_id
      });
      
      console.log('⚠️ 创建无门店医生成功 - 需要添加前端验证');
      
      // 测试这个医生是否能访问预约
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: 'test_doctor_no_store',
        password: 'test123'
      });
      const token = loginResponse.data.tokens.accessToken;
      
      try {
        const appointmentsResponse = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('🚨 严重安全问题: 无门店医生能访问预约API!');
      } catch (apiError) {
        if (apiError.response?.status === 403) {
          console.log('✅ 后端安全检查生效: 无门店医生被拒绝访问');
        } else {
          console.log('❌ 意外错误:', apiError.response?.data?.error);
        }
      }
      
    } catch (error) {
      console.log('ℹ️ 无法创建无门店医生账户 (这是好事)');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testFixedDoctors();