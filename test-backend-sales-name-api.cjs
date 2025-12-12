#!/usr/bin/env node

/**
 * 测试后端API是否正确返回sales_name数据
 * 检查前后端数据结构是否匹配
 */

const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001/api';

async function testBackendSalesNameAPI() {
  console.log('🔍 测试后端API sales_name数据返回...\n');

  try {
    // 1. 测试登录获取token
    console.log('1. 测试登录...');
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'nurse1',
        password: '123456'
      })
    });

    if (!loginResponse.ok) {
      console.error('❌ 登录失败:', loginResponse.status, loginResponse.statusText);
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.access_token;
    console.log('✅ 登录成功，获得token');

    // 2. 测试获取排班数据
    console.log('\n2. 测试获取排班数据...');
    const schedulesResponse = await fetch(`${API_BASE_URL}/schedules?date=2025-12-11`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!schedulesResponse.ok) {
      console.error('❌ 获取排班数据失败:', schedulesResponse.status, schedulesResponse.statusText);
      return;
    }

    const schedules = await schedulesResponse.json();
    console.log(`✅ 获取到 ${schedules.length} 个排班记录`);

    // 检查排班数据结构
    if (schedules.length > 0) {
      console.log('\n📋 排班数据结构分析:');
      const firstSchedule = schedules[0];
      console.log('第一个排班记录的字段:');
      console.log('- id:', firstSchedule.id);
      console.log('- appointment_id:', firstSchedule.appointment_id);
      console.log('- sales_name (直接字段):', firstSchedule.sales_name);
      console.log('- customer_name (直接字段):', firstSchedule.customer_name);
      console.log('- appointment 对象:', firstSchedule.appointment ? '存在' : '不存在');
      
      if (firstSchedule.appointment) {
        console.log('- appointment.sales_name:', firstSchedule.appointment.sales_name);
        console.log('- appointment.customer_name:', firstSchedule.appointment.customer_name);
      }

      // 统计有sales_name的记录
      const withDirectSalesName = schedules.filter(s => s.sales_name).length;
      const withAppointmentSalesName = schedules.filter(s => s.appointment?.sales_name).length;
      
      console.log(`\n📊 数据统计:`);
      console.log(`- 有直接sales_name字段的记录: ${withDirectSalesName}/${schedules.length}`);
      console.log(`- 有appointment.sales_name字段的记录: ${withAppointmentSalesName}/${schedules.length}`);
    }

    // 3. 测试获取预约数据
    console.log('\n3. 测试获取预约数据...');
    const appointmentsResponse = await fetch(`${API_BASE_URL}/appointments?limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!appointmentsResponse.ok) {
      console.error('❌ 获取预约数据失败:', appointmentsResponse.status, appointmentsResponse.statusText);
      return;
    }

    const appointments = await appointmentsResponse.json();
    console.log(`✅ 获取到 ${appointments.length} 个预约记录`);

    // 检查预约数据结构
    if (appointments.length > 0) {
      console.log('\n📋 预约数据结构分析:');
      const firstAppointment = appointments[0];
      console.log('第一个预约记录的字段:');
      console.log('- id:', firstAppointment.id);
      console.log('- customer_name:', firstAppointment.customer_name);
      console.log('- sales_name:', firstAppointment.sales_name);
      console.log('- sales_username:', firstAppointment.sales_username);
      console.log('- sales_role:', firstAppointment.sales_role);

      // 统计有sales_name的记录
      const withSalesName = appointments.filter(a => a.sales_name).length;
      
      console.log(`\n📊 预约数据统计:`);
      console.log(`- 有sales_name字段的记录: ${withSalesName}/${appointments.length}`);
      
      // 显示前3个记录的sales_name
      console.log('\n前3个预约记录的sales_name:');
      appointments.slice(0, 3).forEach((appointment, index) => {
        console.log(`  ${index + 1}. 客户: ${appointment.customer_name}, 预约人: ${appointment.sales_name || '未设置'}`);
      });
    }

    // 4. 测试护士待处理预约API
    console.log('\n4. 测试护士待处理预约API...');
    const nursePendingResponse = await fetch(`${API_BASE_URL}/appointments/nurse-pending?requested_date_from=2025-12-11&requested_date_to=2025-12-11`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!nursePendingResponse.ok) {
      console.error('❌ 获取护士待处理预约失败:', nursePendingResponse.status, nursePendingResponse.statusText);
    } else {
      const nursePending = await nursePendingResponse.json();
      console.log(`✅ 获取到 ${nursePending.length} 个护士待处理预约`);
      
      if (nursePending.length > 0) {
        const withSalesName = nursePending.filter(a => a.sales_name).length;
        console.log(`- 有sales_name字段的记录: ${withSalesName}/${nursePending.length}`);
      }
    }

    console.log('\n🎉 后端API测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testBackendSalesNameAPI();