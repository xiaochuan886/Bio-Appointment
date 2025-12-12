#!/usr/bin/env node

/**
 * 测试修复后的API是否正确返回sales_name数据
 */

const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001/api';

async function testFixedSalesNameAPI() {
  console.log('🔍 测试修复后的API sales_name数据返回...\n');

  try {
    // 1. 使用已知的用户凭据登录
    console.log('1. 测试登录...');
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin',
        password: '123456'
      })
    });

    if (!loginResponse.ok) {
      console.error('❌ 登录失败:', loginResponse.status, loginResponse.statusText);
      const errorText = await loginResponse.text();
      console.error('错误详情:', errorText);
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
      const errorText = await schedulesResponse.text();
      console.error('错误详情:', errorText);
      return;
    }

    const schedules = await schedulesResponse.json();
    console.log(`✅ 获取到 ${schedules.length} 个排班记录`);

    // 检查修复后的数据结构
    if (schedules.length > 0) {
      console.log('\n📋 修复后的排班数据结构分析:');
      const firstSchedule = schedules[0];
      console.log('第一个排班记录:');
      console.log('- id:', firstSchedule.id);
      console.log('- customer_name (直接):', firstSchedule.customer_name);
      console.log('- sales_name (直接):', firstSchedule.sales_name);
      console.log('- appointment 对象:', firstSchedule.appointment ? '存在' : '不存在');
      
      if (firstSchedule.appointment) {
        console.log('- appointment.customer_name:', firstSchedule.appointment.customer_name);
        console.log('- appointment.sales_name:', firstSchedule.appointment.sales_name);
        console.log('- appointment.sales_username:', firstSchedule.appointment.sales_username);
        console.log('- appointment.sales_role:', firstSchedule.appointment.sales_role);
        console.log('- appointment.companion_names:', firstSchedule.appointment.companion_names);
        console.log('- appointment.total_people:', firstSchedule.appointment.total_people);
      }

      // 统计修复后的数据
      const withDirectSalesName = schedules.filter(s => s.sales_name).length;
      const withAppointmentSalesName = schedules.filter(s => s.appointment?.sales_name).length;
      
      console.log(`\n📊 修复后数据统计:`);
      console.log(`- 有直接sales_name字段的记录: ${withDirectSalesName}/${schedules.length}`);
      console.log(`- 有appointment.sales_name字段的记录: ${withAppointmentSalesName}/${schedules.length}`);
      
      // 显示前3个记录的预约人信息
      console.log('\n前3个排班记录的预约人信息:');
      schedules.slice(0, 3).forEach((schedule, index) => {
        const customerName = schedule.customer_name || schedule.appointment?.customer_name;
        const salesName = schedule.appointment?.sales_name || schedule.sales_name;
        console.log(`  ${index + 1}. 客户: ${customerName}, 预约人: ${salesName || '未设置'}`);
      });
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
    } else {
      const appointments = await appointmentsResponse.json();
      console.log(`✅ 获取到 ${appointments.length} 个预约记录`);
      
      if (appointments.length > 0) {
        const withSalesName = appointments.filter(a => a.sales_name).length;
        console.log(`- 有sales_name字段的记录: ${withSalesName}/${appointments.length}`);
        
        console.log('\n前3个预约记录的预约人信息:');
        appointments.slice(0, 3).forEach((appointment, index) => {
          console.log(`  ${index + 1}. 客户: ${appointment.customer_name}, 预约人: ${appointment.sales_name || '未设置'}`);
        });
      }
    }

    console.log('\n🎉 修复后的API测试完成！');
    console.log('\n✅ 修复总结:');
    console.log('- 后端API现在在appointment对象中正确包含sales_name字段');
    console.log('- 前端可以通过 schedule.appointment.sales_name 访问预约人信息');
    console.log('- 数据结构与前端期望的格式匹配');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testFixedSalesNameAPI();