#!/usr/bin/env node

/**
 * 测试已取消排班过滤功能
 * 验证周视图和月视图是否正确过滤掉已取消的排班
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001';

async function testCancelledScheduleFilter() {
  console.log('🧪 测试已取消排班过滤功能...\n');

  try {
    // 1. 先登录获取token
    console.log('🔐 登录中...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'nurse1@example.com',
      password: 'password123'
    });

    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('✅ 登录成功');

    // 2. 获取所有排班数据
    console.log('📊 获取排班数据...');
    const schedulesResponse = await axios.get(`${API_BASE}/api/schedules`, {
      headers,
      params: {
        start_date: '2025-12-09',
        end_date: '2025-12-15'
      }
    });

    const allSchedules = schedulesResponse.data;
    console.log(`总排班数: ${allSchedules.length}`);

    // 2. 统计各状态的排班
    const statusCounts = {};
    allSchedules.forEach(schedule => {
      const status = schedule.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('\n📈 排班状态统计:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}个`);
    });

    // 3. 特别关注周二(2025-12-10)的数据
    const tuesdaySchedules = allSchedules.filter(schedule => {
      const scheduleDate = new Date(schedule.scheduled_date).toISOString().split('T')[0];
      return scheduleDate === '2025-12-10';
    });

    console.log(`\n📅 周二(2025-12-10)排班详情:`);
    console.log(`  总数: ${tuesdaySchedules.length}个`);
    
    const tuesdayStatusCounts = {};
    tuesdaySchedules.forEach(schedule => {
      const status = schedule.status || 'unknown';
      tuesdayStatusCounts[status] = (tuesdayStatusCounts[status] || 0) + 1;
    });

    Object.entries(tuesdayStatusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}个`);
    });

    // 4. 模拟前端过滤逻辑
    const nonCancelledSchedules = allSchedules.filter(schedule => schedule.status !== 'cancelled');
    const tuesdayNonCancelled = tuesdaySchedules.filter(schedule => schedule.status !== 'cancelled');

    console.log(`\n✅ 过滤后结果:`);
    console.log(`  总排班数(排除已取消): ${nonCancelledSchedules.length}`);
    console.log(`  周二排班数(排除已取消): ${tuesdayNonCancelled.length}`);

    // 5. 检查是否有已取消的排班
    const cancelledSchedules = allSchedules.filter(schedule => schedule.status === 'cancelled');
    const tuesdayCancelled = tuesdaySchedules.filter(schedule => schedule.status === 'cancelled');

    console.log(`\n❌ 已取消排班:`);
    console.log(`  总已取消: ${cancelledSchedules.length}个`);
    console.log(`  周二已取消: ${tuesdayCancelled.length}个`);

    if (tuesdayCancelled.length > 0) {
      console.log(`\n📋 周二已取消排班详情:`);
      tuesdayCancelled.forEach((schedule, index) => {
        console.log(`  ${index + 1}. ID: ${schedule.id}, 客户: ${schedule.appointment?.customer_name || '未知'}, 时间: ${schedule.scheduled_time_start}-${schedule.scheduled_time_end}`);
      });
    }

    // 6. 验证结果
    console.log(`\n🎯 验证结果:`);
    if (tuesdayNonCancelled.length === 22 && tuesdayCancelled.length === 1) {
      console.log(`✅ 正确！周二应显示22个排班(已过滤掉1个已取消排班)`);
    } else {
      console.log(`❌ 异常！周二显示${tuesdayNonCancelled.length}个排班，已取消${tuesdayCancelled.length}个`);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testCancelledScheduleFilter();