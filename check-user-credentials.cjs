#!/usr/bin/env node

/**
 * 检查数据库中的用户凭据
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserCredentials() {
  console.log('🔍 检查用户凭据...\n');

  try {
    // 检查profiles表中的用户
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, role, status')
      .eq('role', 'nurse')
      .limit(5);

    if (error) {
      console.error('❌ 查询用户失败:', error);
      return;
    }

    console.log(`✅ 找到 ${profiles.length} 个护士用户:`);
    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. 用户名: ${profile.username}, 姓名: ${profile.full_name}, 状态: ${profile.status}`);
    });

    // 尝试使用第一个护士用户登录
    if (profiles.length > 0) {
      const testUser = profiles[0];
      console.log(`\n🔑 尝试使用用户 ${testUser.username} 登录...`);
      
      // 使用API测试登录
      const fetch = require('node-fetch');
      const API_BASE_URL = 'http://localhost:3001/api';
      
      const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.username,
          password: '123456'
        })
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log('✅ 登录成功！');
        
        // 测试获取排班数据
        const token = loginData.access_token;
        const schedulesResponse = await fetch(`${API_BASE_URL}/schedules?date=2025-12-11`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (schedulesResponse.ok) {
          const schedules = await schedulesResponse.json();
          console.log(`✅ 获取到 ${schedules.length} 个排班记录`);
          
          if (schedules.length > 0) {
            const firstSchedule = schedules[0];
            console.log('\n📋 第一个排班记录的sales_name相关字段:');
            console.log('- sales_name (直接):', firstSchedule.sales_name);
            console.log('- appointment.sales_name:', firstSchedule.appointment?.sales_name);
            console.log('- customer_name:', firstSchedule.customer_name || firstSchedule.appointment?.customer_name);
          }
        } else {
          console.error('❌ 获取排班数据失败:', schedulesResponse.status);
        }
      } else {
        const errorData = await loginResponse.text();
        console.error('❌ 登录失败:', loginResponse.status, errorData);
      }
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

// 运行检查
checkUserCredentials();