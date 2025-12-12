const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testSecurityFix() {
  console.log('🛡️ 测试安全修复效果...\n');

  try {
    // 1. 创建一个没有门店ID的医生账户
    console.log('1. 创建无门店ID的医生账户...');
    
    try {
      const newDoctorResponse = await axios.post(`${API_BASE}/profiles`, {
        username: 'test_doctor_no_store_security',
        email: 'test.doctor.security@test.com',
        full_name: '安全测试医生（无门店）',
        role: 'doctor',
        password: 'test123'
        // 故意不设置 store_id
      });
      
      console.log('✅ 创建无门店医生成功');
      
      // 2. 尝试用这个医生登录
      console.log('\n2. 测试无门店医生登录...');
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: 'test_doctor_no_store_security',
        password: 'test123'
      });
      const token = loginResponse.data.tokens.accessToken;
      const userInfo = loginResponse.data.user;
      
      console.log(`✅ 登录成功: ${userInfo.full_name}`);
      
      // 3. 测试访问医生待处理预约API
      console.log('\n3. 测试访问医生预约API...');
      try {
        const appointmentsResponse = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('🚨 严重安全漏洞: 无门店医生能访问预约API!');
        console.log(`返回预约数量: ${appointmentsResponse.data.length}`);
        
        if (appointmentsResponse.data.length > 0) {
          console.log('预约详情:');
          appointmentsResponse.data.forEach(apt => {
            console.log(`- ${apt.customer_name} (门店: ${apt.store?.name})`);
          });
        }
        
      } catch (apiError) {
        if (apiError.response?.status === 403) {
          console.log('✅ 安全检查生效: 无门店医生被拒绝访问');
          console.log(`错误信息: ${apiError.response.data.message}`);
        } else {
          console.log('❌ 意外错误:', apiError.response?.data?.error || apiError.message);
        }
      }
      
      // 4. 清理测试数据
      console.log('\n4. 清理测试数据...');
      // 注意：这里应该删除测试用户，但我们的API可能没有删除用户的端点
      
    } catch (createError) {
      console.log('❌ 创建测试医生失败:', createError.response?.data?.error || createError.message);
    }

    // 5. 测试正常医生的访问
    console.log('\n5. 验证正常医生仍能正常访问...');
    
    try {
      const normalLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: 'doctor1',
        password: 'doctor123'
      });
      const normalToken = normalLoginResponse.data.tokens.accessToken;
      
      const normalAppointmentsResponse = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
        headers: { 'Authorization': `Bearer ${normalToken}` }
      });
      
      console.log(`✅ 正常医生访问成功，看到 ${normalAppointmentsResponse.data.length} 个预约`);
      
    } catch (normalError) {
      console.log('❌ 正常医生访问失败:', normalError.response?.data?.error || normalError.message);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testSecurityFix();