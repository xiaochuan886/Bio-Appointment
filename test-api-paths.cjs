const { clientApi } = require('./src/services/api-client.ts');

// 测试API路径是否正确
async function testApiPaths() {
  console.log('🧪 测试API路径修复效果...\n');
  
  try {
    // 模拟护士长登录获取token
    console.log('1. 尝试护士长登录...');
    const loginResult = await clientApi.login({
      username: 'head_nurse1@example.com',
      password: '123456'
    });
    
    if (loginResult.accessToken) {
      console.log('✅ 登录成功');
      
      // 手动设置token用于测试
      global.localStorage = {
        getItem: (key) => {
          if (key === 'bio_appointment_access_token') return loginResult.accessToken;
          if (key === 'bio_appointment_refresh_token') return loginResult.refreshToken;
          return null;
        },
        setItem: () => {},
        removeItem: () => {}
      };
      
      console.log('\n2. 测试获取护士待排班预约API...');
      try {
        const pendingAppointments = await clientApi.getNursePendingAppointments({
          requested_date_from: '2025-12-08',
          requested_date_to: '2025-12-08'
        });
        console.log('✅ API调用成功');
        console.log('📊 返回数据:', pendingAppointments);
      } catch (error) {
        console.log('❌ API调用失败:', error.message);
        if (error.message.includes('404')) {
          console.log('🔍 这可能是正常的，因为今天可能没有待排班预约');
        } else {
          console.log('🚨 还有其他问题需要排查');
        }
      }
      
    } else {
      console.log('❌ 登录失败');
    }
    
  } catch (error) {
    console.log('❌ 测试失败:', error.message);
  }
}

testApiPaths();