#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testHeadNurseAccessNurseFeatures() {
  console.log('🔍 测试护士长访问护士功能...\n');

  try {
    // 1. 登录护士长
    console.log('1. 登录护士长账户...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'head_nurse2@company.local',
      password: 'password123'
    });

    const token = loginResponse.data.tokens.accessToken;
    const headNurseProfile = loginResponse.data.user;
    console.log('✅ 护士长登录成功:', headNurseProfile.full_name);

    // 2. 测试访问任务执行API
    console.log('\n2. 测试访问任务执行API...');
    try {
      const taskResponse = await axios.get(`${API_BASE}/task-executions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log(`✅ 任务执行API访问成功，返回 ${taskResponse.data.length} 条记录`);
    } catch (error) {
      console.log('❌ 任务执行API访问失败:', error.response?.data || error.message);
    }

    // 3. 测试获取护士排班
    console.log('\n3. 测试获取护士排班...');
    try {
      const scheduleResponse = await axios.get(`${API_BASE}/schedules`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: {
          nurse_id: headNurseProfile.id, // 查询护士长自己的排班
          date: '2025-12-11'
        }
      });
      console.log(`✅ 护士排班API访问成功，返回 ${scheduleResponse.data.length} 条记录`);
      
      if (scheduleResponse.data.length > 0) {
        console.log('📋 护士长的排班记录:');
        scheduleResponse.data.forEach((schedule, index) => {
          console.log(`  ${index + 1}. 日期: ${schedule.scheduled_date}, 时间: ${schedule.scheduled_time_start}-${schedule.scheduled_time_end}, 状态: ${schedule.status}`);
        });
      }
    } catch (error) {
      console.log('❌ 护士排班API访问失败:', error.response?.data || error.message);
    }

    // 4. 测试护士长给自己分配任务
    console.log('\n4. 测试护士长给自己分配任务...');
    
    // 首先获取待排班的预约
    const pendingResponse = await axios.get(`${API_BASE}/appointments/nurse-pending`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (pendingResponse.data.length > 0) {
      const appointment = pendingResponse.data[0];
      console.log(`📋 找到待排班预约: ${appointment.customer_name} - ${appointment.service_name}`);
      
      // 尝试给自己创建排班
      try {
        const scheduleData = {
          appointment_id: appointment.id,
          scheduled_date: appointment.requested_date.split('T')[0],
          scheduled_time_start: appointment.requested_time_start,
          scheduled_time_end: appointment.requested_time_end,
          nurse_id: headNurseProfile.id, // 分配给自己
          status: 'scheduled',
          notes: '护士长自分配任务测试'
        };
        
        const createScheduleResponse = await axios.post(`${API_BASE}/schedules`, scheduleData, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('✅ 护士长成功给自己分配任务');
        console.log('📋 新创建的排班:', createScheduleResponse.data);
        
        // 5. 测试开始执行任务
        console.log('\n5. 测试开始执行任务...');
        const scheduleId = createScheduleResponse.data.id;
        
        try {
          const startTaskResponse = await axios.put(`${API_BASE}/schedules/${scheduleId}`, {
            status: 'in_progress',
            notes: '护士长开始执行任务'
          }, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          console.log('✅ 护士长成功开始执行任务');
          
          // 6. 测试完成任务
          console.log('\n6. 测试完成任务...');
          const completeTaskResponse = await axios.put(`${API_BASE}/schedules/${scheduleId}`, {
            status: 'completed',
            notes: '护士长完成任务'
          }, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          console.log('✅ 护士长成功完成任务');
          
        } catch (error) {
          console.log('❌ 任务执行失败:', error.response?.data || error.message);
        }
        
      } catch (error) {
        console.log('❌ 创建排班失败:', error.response?.data || error.message);
      }
    } else {
      console.log('⚠️  没有找到待排班的预约');
    }

    // 7. 测试查看任务历史
    console.log('\n7. 测试查看任务历史...');
    try {
      const historyResponse = await axios.get(`${API_BASE}/schedules`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: {
          nurse_id: headNurseProfile.id,
          status: 'completed'
        }
      });
      console.log(`✅ 任务历史查询成功，找到 ${historyResponse.data.length} 条已完成任务`);
    } catch (error) {
      console.log('❌ 任务历史查询失败:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testHeadNurseAccessNurseFeatures();