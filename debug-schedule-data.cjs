#!/usr/bin/env node

const axios = require('axios');

async function debugScheduleData() {
  console.log('🔍 调试排班数据结构...\n');

  try {
    // 1. 登录
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin',
      password: 'admin123'
    });

    const token = loginResponse.data.tokens?.accessToken;
    const headers = { Authorization: `Bearer ${token}` };

    // 2. 获取排班数据
    const schedulesResponse = await axios.get('http://localhost:3001/api/schedules', {
      headers,
      params: {
        date: '2024-12-15'
      }
    });

    const schedules = schedulesResponse.data;
    console.log(`找到 ${schedules.length} 条排班记录\n`);

    if (schedules.length > 0) {
      const schedule = schedules[0];
      console.log('第一条排班记录的完整数据结构:');
      console.log(JSON.stringify(schedule, null, 2));
      
      console.log('\n关键字段检查:');
      console.log('- customer_name:', schedule.customer_name);
      console.log('- companion_names:', schedule.companion_names);
      console.log('- total_people:', schedule.total_people);
      console.log('- sales_name:', schedule.sales_name);
      console.log('- sales_username:', schedule.sales_username);
      console.log('- sales_role:', schedule.sales_role);
      
      if (schedule.appointment) {
        console.log('\nappointment 子对象:');
        console.log('- appointment.customer_name:', schedule.appointment.customer_name);
        console.log('- appointment.companion_names:', schedule.appointment.companion_names);
        console.log('- appointment.total_people:', schedule.appointment.total_people);
        console.log('- appointment.is_urgent:', schedule.appointment.is_urgent);
      }
    }

  } catch (error) {
    console.error('❌ 调试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

debugScheduleData();