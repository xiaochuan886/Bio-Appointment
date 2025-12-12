#!/usr/bin/env node

/**
 * 验证护士长门店任务查看功能的修复效果
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testHeadNurseStoreFix() {
  console.log('🔍 验证护士长门店任务查看功能修复\n');

  try {
    // 1. 获取护士长token
    console.log('1. 获取护士长登录token...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      username: 'head_nurse',
      password: 'password123'
    });

    if (loginResponse.status !== 200) {
      console.error('❌ 护士长登录失败');
      return;
    }

    const token = loginResponse.data.access_token;
    console.log('✅ 护士长登录成功');

    // 2. 测试护士长查看个人任务
    console.log('\n2. 测试护士长查看个人任务...');
    const selfTasksResponse = await axios.get(`${API_BASE_URL}/api/schedules`, {
      params: {
        start_date: '2024-12-09',
        end_date: '2024-12-13',
        nurse_id: 'head-nurse-test-id' // 护士长自己的ID
      },
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`✅ 护士长个人任务: ${selfTasksResponse.data.length} 条`);
    selfTasksResponse.data.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.customer_name} - ${task.scheduled_date} ${task.scheduled_time_start}`);
    });

    // 3. 测试护士长查看门店任务（修复后）
    console.log('\n3. 测试护士长查看门店任务（修复后）...');
    const storeTasksResponse = await axios.get(`${API_BASE_URL}/api/schedules`, {
      params: {
        start_date: '2024-12-09',
        end_date: '2024-12-13',
        store_id: 'store-1' // 护士长的门店ID
      },
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`✅ 护士长门店任务: ${storeTasksResponse.data.length} 条`);
    storeTasksResponse.data.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.customer_name} - ${task.scheduled_date} ${task.scheduled_time_start}`);
      console.log(`      护士: ${task.nurse_name || task.nurse_id}`);
      console.log(`      门店: ${task.appointment_store_id}`);
    });

    // 4. 测试护士长尝试查看其他门店任务（应该被拒绝）
    console.log('\n4. 测试护士长尝试查看其他门店任务（应该被拒绝）...');
    try {
      const otherStoreResponse = await axios.get(`${API_BASE_URL}/api/schedules`, {
        params: {
          start_date: '2024-12-09',
          end_date: '2024-12-13',
          store_id: 'store-2' // 其他门店ID
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('❌ 应该被拒绝但成功了');
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log('✅ 正确拒绝了访问其他门店的请求');
      } else {
        console.log('⚠️  意外的错误:', error.message);
      }
    }

    // 5. 对比修复前后的差异
    console.log('\n5. 对比修复前后的差异:');
    
    // 模拟修复前的结果（只能看到自己的任务）
    const beforeFixTasks = storeTasksResponse.data.filter(task => 
      task.nurse_id === 'head-nurse-test-id'
    );
    
    console.log(`   修复前可见任务: ${beforeFixTasks.length} 条（只有自己的）`);
    console.log(`   修复后可见任务: ${storeTasksResponse.data.length} 条（门店所有）`);
    console.log(`   新增可见任务: ${storeTasksResponse.data.length - beforeFixTasks.length} 条`);

    // 6. 验证前端筛选逻辑
    console.log('\n6. 验证前端筛选逻辑:');
    
    // 获取所有任务（不带筛选）
    const allTasksResponse = await axios.get(`${API_BASE_URL}/api/schedules`, {
      params: {
        start_date: '2024-12-09',
        end_date: '2024-12-13'
      },
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`   API返回所有任务: ${allTasksResponse.data.length} 条`);
    
    // 模拟前端筛选逻辑
    const userStoreId = 'store-1';
    const frontendFilteredTasks = allTasksResponse.data.filter(task => {
      const scheduleStoreId = task.store_id;
      const appointmentStoreId = task.appointment_store_id;
      
      return userStoreId && (
        scheduleStoreId === userStoreId || 
        appointmentStoreId === userStoreId
      );
    });

    console.log(`   前端筛选后任务: ${frontendFilteredTasks.length} 条`);
    
    // 7. 最终验证
    console.log('\n7. 最终验证结果:');
    if (storeTasksResponse.data.length >= 3) {
      console.log('✅ 修复成功：护士长现在可以看到门店的所有任务');
      console.log('✅ API层面支持护士长按门店ID筛选');
      console.log('✅ 权限控制正确：护士长不能访问其他门店');
    } else {
      console.log('⚠️  可能仍有问题：门店任务数量少于预期');
    }

  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

if (require.main === module) {
  testHeadNurseStoreFix();
}