#!/usr/bin/env node

/**
 * 通过API为现有预约记录添加预约人数据
 */

const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001/api';

async function addSalesNameViaAPI() {
  console.log('🔍 通过API为预约记录添加预约人数据...\n');

  try {
    // 1. 登录获取token
    console.log('1. 登录...');
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

    const loginData = await loginResponse.json();
    const token = loginData.tokens?.accessToken || loginData.access_token;
    
    if (!token) {
      console.error('❌ 登录失败');
      return;
    }
    console.log('✅ 登录成功');

    // 2. 获取所有销售人员
    console.log('\n2. 获取销售人员...');
    const profilesResponse = await fetch(`${API_BASE_URL}/profiles`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const profiles = await profilesResponse.json();
    const salesPeople = profiles.filter(p => p.role === 'sales');
    
    console.log(`✅ 找到 ${salesPeople.length} 个销售人员`);
    if (salesPeople.length === 0) {
      console.log('❌ 没有找到销售人员，无法分配预约人');
      return;
    }

    salesPeople.forEach((person, index) => {
      console.log(`${index + 1}. ${person.full_name} (${person.username})`);
    });

    // 3. 获取预约记录
    console.log('\n3. 获取预约记录...');
    const appointmentsResponse = await fetch(`${API_BASE_URL}/appointments?limit=20`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const appointments = await appointmentsResponse.json();
    console.log(`✅ 获取到 ${appointments.length} 个预约记录`);

    // 4. 为没有sales_name的预约记录添加预约人
    console.log('\n4. 添加预约人信息...');
    let updateCount = 0;
    
    for (const appointment of appointments) {
      if (!appointment.sales_name) {
        // 随机分配一个销售人员
        const randomIndex = Math.floor(Math.random() * salesPeople.length);
        const salesPerson = salesPeople[randomIndex];
        
        // 更新预约记录
        const updateResponse = await fetch(`${API_BASE_URL}/appointments/${appointment.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sales_name: salesPerson.full_name,
            sales_id: salesPerson.id
          })
        });

        if (updateResponse.ok) {
          updateCount++;
          console.log(`✅ 为客户 ${appointment.customer_name} 分配预约人: ${salesPerson.full_name}`);
        } else {
          const errorText = await updateResponse.text();
          console.error(`❌ 更新客户 ${appointment.customer_name} 失败:`, errorText);
        }
        
        // 添加小延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`\n🎉 成功为 ${updateCount} 个预约记录添加了预约人信息`);

    // 5. 验证更新结果
    console.log('\n5. 验证更新结果...');
    const verifyResponse = await fetch(`${API_BASE_URL}/appointments?limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const updatedAppointments = await verifyResponse.json();
    const withSalesName = updatedAppointments.filter(a => a.sales_name);
    
    console.log(`✅ 现在有 ${withSalesName.length}/${updatedAppointments.length} 个预约记录有预约人信息`);
    
    console.log('\n前5个有预约人的预约记录:');
    withSalesName.slice(0, 5).forEach((appointment, index) => {
      console.log(`${index + 1}. 客户: ${appointment.customer_name}, 预约人: ${appointment.sales_name}`);
    });

    // 6. 测试排班API是否现在返回预约人数据
    console.log('\n6. 测试排班API...');
    const schedulesResponse = await fetch(`${API_BASE_URL}/schedules?date=2025-12-11`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (schedulesResponse.ok) {
      const schedules = await schedulesResponse.json();
      const schedulesWithSalesName = schedules.filter(s => s.appointment?.sales_name);
      
      console.log(`✅ 排班记录中有 ${schedulesWithSalesName.length}/${schedules.length} 个包含预约人信息`);
      
      if (schedulesWithSalesName.length > 0) {
        console.log('\n前3个有预约人的排班记录:');
        schedulesWithSalesName.slice(0, 3).forEach((schedule, index) => {
          console.log(`${index + 1}. 客户: ${schedule.appointment.customer_name}, 预约人: ${schedule.appointment.sales_name}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ 操作失败:', error.message);
  }
}

// 运行脚本
addSalesNameViaAPI();