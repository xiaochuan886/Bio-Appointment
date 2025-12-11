#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testNursePendingAPI() {
  console.log('🔍 测试护士长待排班API...\n');

  try {
    // 1. 先登录获取护士长token
    console.log('1. 登录护士长账户...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'head_nurse2@company.local',
      password: 'password123'
    });

    const token = loginResponse.data.tokens.accessToken;
    console.log('✅ 登录成功，获得token');

    // 2. 调用护士长待排班API
    console.log('\n2. 调用护士长待排班API...');
    const pendingResponse = await axios.get(`${API_BASE}/appointments/nurse-pending`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        requested_date_from: '2025-12-10',
        requested_date_to: '2025-12-15'
      }
    });

    const appointments = pendingResponse.data;
    console.log(`📋 API返回 ${appointments.length} 个待排班预约:`);

    if (appointments.length > 0) {
      appointments.forEach((apt, index) => {
        console.log(`\n预约 ${index + 1}:`);
        console.log(`  ID: ${apt.id}`);
        console.log(`  客户: ${apt.customer_name}`);
        console.log(`  门店: ${apt.store_name} (ID: ${apt.store_id})`);
        console.log(`  服务: ${apt.service_name} (类别: ${apt.service_category})`);
        console.log(`  预约日期: ${apt.requested_date}`);
        console.log(`  工作流状态: ${apt.workflow_status}`);
        console.log(`  需要护士排班: ${apt.requires_nurse_scheduling}`);
        console.log(`  状态: ${apt.status}`);
      });

      // 检查是否包含李三的预约
      const liSanAppointment = appointments.find(apt => apt.customer_name === '李三');
      if (liSanAppointment) {
        console.log('\n✅ 找到李三的预约！');
      } else {
        console.log('\n❌ 没有找到李三的预约');
      }
    } else {
      console.log('❌ API没有返回任何预约');
    }

    // 3. 检查护士长的门店信息
    console.log('\n3. 检查护士长的门店信息...');
    const profileResponse = await axios.get(`${API_BASE}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const profile = profileResponse.data;
    console.log('👩‍⚕️ 护士长信息:');
    console.log(`  姓名: ${profile.full_name}`);
    console.log(`  角色: ${profile.role}`);
    console.log(`  门店ID: ${profile.store_id}`);

    // 4. 直接查询李三的预约详情
    console.log('\n4. 直接查询李三的预约详情...');
    const allAppointmentsResponse = await axios.get(`${API_BASE}/appointments`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        customer_name: '李三'
      }
    });

    const liSanAppointments = allAppointmentsResponse.data;
    console.log(`📋 找到李三的 ${liSanAppointments.length} 个预约:`);
    
    liSanAppointments.forEach((apt, index) => {
      console.log(`\n李三预约 ${index + 1}:`);
      console.log(`  ID: ${apt.id}`);
      console.log(`  门店ID: ${apt.store_id}`);
      console.log(`  服务ID: ${apt.service_id}`);
      console.log(`  工作流状态: ${apt.workflow_status}`);
      console.log(`  需要护士排班: ${apt.requires_nurse_scheduling}`);
      console.log(`  状态: ${apt.status}`);
      console.log(`  预约日期: ${apt.requested_date}`);
    });

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testNursePendingAPI();