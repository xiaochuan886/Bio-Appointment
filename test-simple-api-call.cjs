#!/usr/bin/env node

/**
 * 简单测试API调用
 */

const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001/api';

async function testSimpleAPI() {
  console.log('🔍 简单API测试...\n');

  try {
    // 1. 测试登录
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

    console.log('登录响应状态:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('登录响应数据:', loginData);

    const token = loginData.tokens?.accessToken || loginData.access_token;
    if (token) {
      console.log('✅ 获得token:', token.substring(0, 20) + '...');
      
      // 2. 测试简单的API调用
      console.log('\n2. 测试services API...');
      const servicesResponse = await fetch(`${API_BASE_URL}/services`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Services响应状态:', servicesResponse.status);
      if (servicesResponse.ok) {
        const services = await servicesResponse.json();
        console.log('✅ 获取到', services.length, '个服务');
      } else {
        const errorText = await servicesResponse.text();
        console.log('❌ Services API失败:', errorText);
      }
      
      // 3. 测试profiles API
      console.log('\n3. 测试profiles API...');
      const profilesResponse = await fetch(`${API_BASE_URL}/profiles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Profiles响应状态:', profilesResponse.status);
      if (profilesResponse.ok) {
        const profiles = await profilesResponse.json();
        console.log('✅ 获取到', profiles.length, '个用户');
        
        // 找一个护士用户
        const nurse = profiles.find(p => p.role === 'nurse');
        if (nurse) {
          console.log('找到护士用户:', nurse.username, nurse.full_name);
          
          // 4. 测试schedules API (不指定nurse_id，查看所有排班)
          console.log('\n4. 测试schedules API...');
          const schedulesResponse = await fetch(`${API_BASE_URL}/schedules?date=2025-12-11`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          });
          
          console.log('Schedules响应状态:', schedulesResponse.status);
          if (schedulesResponse.ok) {
            const schedules = await schedulesResponse.json();
            console.log('✅ 获取到', schedules.length, '个排班记录');
            
            if (schedules.length > 0) {
              console.log('\n📋 前3个排班记录的预约人信息:');
              schedules.slice(0, 3).forEach((schedule, index) => {
                console.log(`${index + 1}. 客户: ${schedule.customer_name || schedule.appointment?.customer_name}`);
                console.log(`   - sales_name (直接): ${schedule.sales_name || '未设置'}`);
                console.log(`   - appointment.sales_name: ${schedule.appointment?.sales_name || '未设置'}`);
                console.log(`   - appointment_id: ${schedule.appointment_id}`);
              });
              
              // 5. 测试appointments API看看原始数据
              console.log('\n5. 测试appointments API...');
              const appointmentsResponse = await fetch(`${API_BASE_URL}/appointments?limit=5`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                }
              });
              
              if (appointmentsResponse.ok) {
                const appointments = await appointmentsResponse.json();
                console.log(`✅ 获取到 ${appointments.length} 个预约记录`);
                
                console.log('\n📋 前3个预约记录的预约人信息:');
                appointments.slice(0, 3).forEach((appointment, index) => {
                  console.log(`${index + 1}. 客户: ${appointment.customer_name}`);
                  console.log(`   - sales_name: ${appointment.sales_name || '未设置'}`);
                  console.log(`   - created_by: ${appointment.created_by || '未设置'}`);
                  console.log(`   - sales_id: ${appointment.sales_id || '未设置'}`);
                });
              }
            }
          } else {
            const errorText = await schedulesResponse.text();
            console.log('❌ Schedules API失败:', errorText);
          }
        }
      } else {
        const errorText = await profilesResponse.text();
        console.log('❌ Profiles API失败:', errorText);
      }
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testSimpleAPI();