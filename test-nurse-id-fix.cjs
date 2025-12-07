const fetch = require('node-fetch');

// 测试修复后的nurse_id格式问题
async function testNurseIdFix() {
  console.log('🧪 测试nurse_id格式修复...\n');

  try {
    // 1. 首先登录获取token
    console.log('1. 登录获取token...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`登录失败: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.tokens.accessToken;
    console.log('✅ 登录成功，用户信息:', {
      userId: loginData.user.id,
      role: loginData.user.role
    });

    // 2. 测试排班API，使用UUID格式的nurse_id
    console.log('\n2. 测试排班API (UUID格式nurse_id)...');
    const scheduleResponse1 = await fetch('http://localhost:3001/api/schedules?start_date=2025-12-01&end_date=2025-12-07&nurse_id=123e4567-e89b-12d3-a456-426614174000', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (scheduleResponse1.ok) {
      const schedules = await scheduleResponse1.json();
      console.log('✅ UUID格式nurse_id测试成功，返回排班数量:', schedules.length);
    } else {
      const error = await scheduleResponse1.json();
      console.log('❌ UUID格式nurse_id测试失败:', error);
    }

    // 3. 测试排班API，使用admin-id格式的nurse_id（应该被允许）
    console.log('\n3. 测试排班API (admin-id格式nurse_id)...');
    const scheduleResponse2 = await fetch('http://localhost:3001/api/schedules?start_date=2025-12-01&end_date=2025-12-07&nurse_id=admin-id', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (scheduleResponse2.ok) {
      const schedules = await scheduleResponse2.json();
      console.log('✅ admin-id格式nurse_id测试成功，返回排班数量:', schedules.length);
    } else {
      const error = await scheduleResponse2.json();
      console.log('❌ admin-id格式nurse_id测试失败:', error);
    }

    // 4. 测试排班API，使用无效格式的nurse_id（应该被拒绝）
    console.log('\n4. 测试排班API (无效格式nurse_id)...');
    const scheduleResponse3 = await fetch('http://localhost:3001/api/schedules?start_date=2025-12-01&end_date=2025-12-07&nurse_id=invalid-format', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (scheduleResponse3.ok) {
      console.log('❌ 无效格式nurse_id测试失败：应该被拒绝但成功了');
    } else {
      const error = await scheduleResponse3.json();
      console.log('✅ 无效格式nurse_id测试成功：正确拒绝了无效格式', error.error);
    }

    // 5. 测试store_id格式
    console.log('\n5. 测试排班API (store_id格式)...');
    const scheduleResponse4 = await fetch('http://localhost:3001/api/schedules?start_date=2025-12-01&end_date=2025-12-07&store_id=store-001', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (scheduleResponse4.ok) {
      const schedules = await scheduleResponse4.json();
      console.log('✅ store-id格式store_id测试成功，返回排班数量:', schedules.length);
    } else {
      const error = await scheduleResponse4.json();
      console.log('❌ store-id格式store_id测试失败:', error);
    }

    console.log('\n🎉 所有测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testNurseIdFix();