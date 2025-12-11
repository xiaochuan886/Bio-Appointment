#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testDateFilterFix() {
  console.log('🔍 测试日期过滤修复效果...\n');

  try {
    // 1. 登录护士长
    console.log('1. 登录护士长账户...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'head_nurse2@company.local',
      password: 'password123'
    });

    const token = loginResponse.data.tokens.accessToken;
    console.log('✅ 登录成功');

    // 2. 测试不传日期参数
    console.log('\n2. 测试不传日期参数...');
    const noDateResponse = await axios.get(`${API_BASE}/appointments/nurse-pending`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`📋 不传日期参数: 返回 ${noDateResponse.data.length} 个预约`);

    // 3. 测试传递今天的日期
    console.log('\n3. 测试传递今天的日期 (2025-12-10)...');
    const todayResponse = await axios.get(`${API_BASE}/appointments/nurse-pending`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: {
        requested_date_from: '2025-12-10',
        requested_date_to: '2025-12-10'
      }
    });
    console.log(`📋 传递今天日期: 返回 ${todayResponse.data.length} 个预约`);

    // 4. 测试传递明天的日期
    console.log('\n4. 测试传递明天的日期 (2025-12-11)...');
    const tomorrowResponse = await axios.get(`${API_BASE}/appointments/nurse-pending`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: {
        requested_date_from: '2025-12-11',
        requested_date_to: '2025-12-11'
      }
    });
    console.log(`📋 传递明天日期: 返回 ${tomorrowResponse.data.length} 个预约`);

    // 5. 测试传递过去的日期
    console.log('\n5. 测试传递过去的日期 (2025-12-01)...');
    const pastResponse = await axios.get(`${API_BASE}/appointments/nurse-pending`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: {
        requested_date_from: '2025-12-01',
        requested_date_to: '2025-12-01'
      }
    });
    console.log(`📋 传递过去日期: 返回 ${pastResponse.data.length} 个预约`);

    // 验证结果
    console.log('\n📊 验证结果:');
    const allCounts = [
      noDateResponse.data.length,
      todayResponse.data.length,
      tomorrowResponse.data.length,
      pastResponse.data.length
    ];

    const allSame = allCounts.every(count => count === allCounts[0]);
    
    if (allSame) {
      console.log('✅ 修复成功！所有情况都返回相同数量的预约');
      console.log('✅ 日期过滤器不再影响待排班预约的显示');
      
      // 显示预约详情
      console.log('\n📋 待排班预约列表:');
      noDateResponse.data.forEach((apt, index) => {
        console.log(`  ${index + 1}. ${apt.customer_name} - ${apt.requested_date} - ${apt.service_name}`);
      });
    } else {
      console.log('❌ 修复失败！不同日期参数返回了不同数量的预约');
      console.log('数量对比:', allCounts);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testDateFilterFix();