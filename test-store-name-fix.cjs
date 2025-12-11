const fetch = require('node-fetch');

async function testStoreNameFix() {
  console.log('🧪 测试门店名称显示修复...\n');

  try {
    // 1. 先登录获取token
    console.log('1. 登录获取token...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'head_nurse2@company.local',
        password: 'password123'
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`登录失败: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ 登录成功');
    console.log('用户信息:', {
      id: loginData.user.id,
      full_name: loginData.user.full_name,
      role: loginData.user.role,
      store_id: loginData.user.store_id,
      store_name: loginData.user.store_name
    });

    // 2. 使用token获取用户详细信息
    console.log('\n2. 获取用户详细信息...');
    const profileResponse = await fetch(`http://localhost:3001/api/profiles/${loginData.user.id}`, {
      headers: {
        'Authorization': `Bearer ${loginData.tokens.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!profileResponse.ok) {
      throw new Error(`获取用户信息失败: ${profileResponse.status}`);
    }

    const profileData = await profileResponse.json();
    console.log('✅ 获取用户详细信息成功');
    console.log('详细信息:', {
      id: profileData.id,
      full_name: profileData.full_name,
      role: profileData.role,
      store_id: profileData.store_id,
      store_name: profileData.store_name
    });

    // 3. 验证修复结果
    console.log('\n3. 验证修复结果...');
    if (profileData.store_name) {
      console.log('✅ 门店名称显示修复成功！');
      console.log(`   门店ID: ${profileData.store_id}`);
      console.log(`   门店名称: ${profileData.store_name}`);
    } else if (profileData.store_id) {
      console.log('❌ 门店名称仍然缺失');
      console.log(`   只有门店ID: ${profileData.store_id}`);
      console.log('   可能需要检查数据库中是否有对应的门店记录');
    } else {
      console.log('ℹ️  该用户没有关联门店');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testStoreNameFix();