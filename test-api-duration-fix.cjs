// 直接测试API服务器的排班时长修复功能
const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(result);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// 登录获取token
async function loginAndGetToken() {
  console.log('🔐 登录获取认证token...');
  
  const loginOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const loginData = {
    email: 'admin',
    password: 'admin123'
  };
  
  try {
    const loginResponse = await makeRequest(loginOptions, loginData);
    
    if (loginResponse.statusCode !== 200) {
      console.error('❌ 登录失败:', loginResponse.statusCode, loginResponse.body);
      return null;
    }
    
    const token = loginResponse.body.tokens.accessToken;
    console.log('✅ 登录成功，获取到token');
    return token;
  } catch (error) {
    console.error('❌ 登录过程中发生错误:', error);
    return null;
  }
}

async function testApiDurationFix() {
  console.log('🔍 测试API服务器的排班时长修复功能\n');
  
  try {
    // 0. 先登录获取token
    const token = await loginAndGetToken();
    if (!token) {
      console.error('❌ 无法获取认证token，测试终止');
      return;
    }
    
    console.log('✅ 成功获取认证token，开始测试...\n');
    
    // 1. 测试获取排班数据
    console.log('📊 测试获取排班数据...');
    
    const listOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/schedules?date=2025-12-16',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const listResponse = await makeRequest(listOptions);
    
    if (listResponse.statusCode !== 200) {
      console.error('❌ 获取排班列表失败:', listResponse.statusCode, listResponse.body);
      return;
    }
    
    const schedules = listResponse.body;
    console.log(`✅ 获取到 ${schedules.length} 个排班记录`);
    
    if (schedules.length > 0) {
      console.log('\n📋 现有排班数据示例:');
      const schedule = schedules[0];
      console.log(`  ID: ${schedule.id}`);
      console.log(`  客户: ${schedule.customer_name}`);
      console.log(`  开始时间: ${schedule.scheduled_time_start}`);
      console.log(`  结束时间: ${schedule.scheduled_time_end}`);
      console.log(`  调整时长: ${schedule.adjusted_duration || '未设置'} 分钟`);
      console.log(`  调整原因: ${schedule.adjustment_reason || '未设置'}`);
      
      // 计算实际时长
      if (schedule.scheduled_time_start && schedule.scheduled_time_end) {
        const [startHours, startMinutes] = schedule.scheduled_time_start.split(':').map(Number);
        const [endHours, endMinutes] = schedule.scheduled_time_end.split(':').map(Number);
        const actualDuration = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
        
        console.log(`  📏 计算实际时长: ${actualDuration} 分钟`);
        
        if (schedule.adjusted_duration) {
          if (actualDuration === schedule.adjusted_duration) {
            console.log(`  ✅ 时长一致`);
          } else {
            console.log(`  ❌ 时长不一致`);
          }
        }
      }
    }
    
    // 2. 测试获取可用房间
    console.log('\n🏠 测试获取可用房间...');
    
    const roomsOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/resources/rooms/available',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const roomsResponse = await makeRequest(roomsOptions);
    
    if (roomsResponse.statusCode !== 200) {
      console.error('❌ 获取房间失败:', roomsResponse.statusCode, roomsResponse.body);
      return;
    }
    
    const rooms = roomsResponse.body;
    console.log(`✅ 获取到 ${rooms.length} 个可用房间`);
    
    if (rooms.length > 0) {
      console.log(`  示例房间: ${rooms[0].name} (ID: ${rooms[0].id})`);
    }
    
    // 3. 测试获取可用护士
    console.log('\n👷 测试获取可用护士...');
    
    const nursesOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/profiles/nurses/available',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const nursesResponse = await makeRequest(nursesOptions);
    
    if (nursesResponse.statusCode !== 200) {
      console.error('❌ 获取护士失败:', nursesResponse.statusCode, nursesResponse.body);
      return;
    }
    
    const nurses = nursesResponse.body;
    console.log(`✅ 获取到 ${nurses.length} 个可用护士`);
    
    if (nurses.length > 0) {
      console.log(`  示例护士: ${nurses[0].full_name} (ID: ${nurses[0].id}, 门店: ${nurses[0].store_id})`);
    }
    
    // 4. 测试获取待排班预约
    console.log('\n📝 测试获取待排班预约...');
    
    const pendingOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/appointments/nurse-pending',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const pendingResponse = await makeRequest(pendingOptions);
    
    if (pendingResponse.statusCode !== 200) {
      console.error('❌ 获取待排班预约失败:', pendingResponse.statusCode, pendingResponse.body);
      return;
    }
    
    const pendingAppointments = pendingResponse.body;
    console.log(`✅ 获取到 ${pendingAppointments.length} 个待排班预约`);
    
    if (pendingAppointments.length > 0) {
      const appointment = pendingAppointments[0];
      console.log(`  示例预约: ${appointment.customer_name} (ID: ${appointment.id})`);
      console.log(`  预计时长: ${appointment.estimated_duration} 分钟`);
      console.log(`  服务: ${appointment.service_name}`);
      console.log(`  门店ID: ${appointment.store_id}`);
      
      // 找到与预约同一门店的护士
      const targetStoreId = appointment.store_id;
      const sameStoreNurses = nurses.filter(nurse => nurse.store_id === targetStoreId);
      
      if (sameStoreNurses.length > 0) {
        console.log(`✅ 找到 ${sameStoreNurses.length} 个同门店护士，选择: ${sameStoreNurses[0].full_name}`);
        nurses.length = 0; // 清空数组
        nurses.push(sameStoreNurses[0]); // 只保留同门店的护士
      } else {
        console.log(`⚠️ 没有找到同门店的护士 (预约门店: ${targetStoreId})`);
        console.log('  所有护士的门店ID:', nurses.map(n => `${n.full_name}: ${n.store_id}`));
      }
      
      // 5. 测试创建排班
      if (rooms.length > 0 && nurses.length > 0) {
        console.log('\n🔧 测试创建排班...');
        
        const adjustedDuration = 45; // 调整时长为45分钟
        const scheduledTimeStart = '15:00:00';
        
        // 计算结束时间
        const [hours, minutes] = scheduledTimeStart.split(':').map(Number);
        const totalEndMinutes = minutes + adjustedDuration;
        const totalEndHours = hours + Math.floor(totalEndMinutes / 60);
        const finalEndMinutes = totalEndMinutes % 60;
        const scheduledTimeEnd = `${String(totalEndHours).padStart(2, '0')}:${String(finalEndMinutes).padStart(2, '0')}:00`;
        
        const createData = {
          appointment_id: appointment.id,
          nurse_id: nurses[0].id,
          room_id: rooms[0].id,
          scheduled_date: appointment.requested_date.split('T')[0],
          scheduled_time_start: scheduledTimeStart,
          scheduled_time_end: scheduledTimeEnd,
          adjusted_duration: adjustedDuration,
          adjustment_reason: 'API测试',
          status: 'scheduled'
        };
        
        console.log('📤 发送排班数据:', JSON.stringify(createData, null, 2));
        
        const createOptions = {
          hostname: 'localhost',
          port: 3001,
          path: '/api/schedules',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        };
        
        const createResponse = await makeRequest(createOptions, createData);
        
        if (createResponse.statusCode !== 200 && createResponse.statusCode !== 201) {
          console.error('❌ 创建排班失败:', createResponse.statusCode, createResponse.body);
          return;
        }
        
        const createdSchedule = createResponse.body;
        console.log('✅ 排班创建成功:', createdSchedule);
        
        // 6. 验证创建的排班数据
        console.log('\n🔍 验证创建的排班数据...');
        
        if (createdSchedule.adjusted_duration === adjustedDuration) {
          console.log(`✅ adjusted_duration 正确保存: ${createdSchedule.adjusted_duration} 分钟`);
        } else {
          console.log(`❌ adjusted_duration 保存错误: 期望 ${adjustedDuration}, 实际 ${createdSchedule.adjusted_duration}`);
        }
        
        if (createdSchedule.adjustment_reason === 'API测试') {
          console.log(`✅ adjustment_reason 正确保存: ${createdSchedule.adjustment_reason}`);
        } else {
          console.log(`❌ adjustment_reason 保存错误: 期望 'API测试', 实际 ${createdSchedule.adjustment_reason}`);
        }
        
        // 计算实际时长
        if (createdSchedule.scheduled_time_start && createdSchedule.scheduled_time_end) {
          const [startHours, startMinutes] = createdSchedule.scheduled_time_start.split(':').map(Number);
          const [endHours, endMinutes] = createdSchedule.scheduled_time_end.split(':').map(Number);
          const actualDuration = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
          
          console.log(`📏 计算实际时长: ${actualDuration} 分钟`);
          
          if (actualDuration === adjustedDuration) {
            console.log(`✅ 时间计算正确`);
          } else {
            console.log(`❌ 时间计算错误: 期望 ${adjustedDuration}, 实际 ${actualDuration}`);
          }
        }
        
        // 7. 测试更新排班
        console.log('\n🔄 测试更新排班...');
        
        const newAdjustedDuration = 60;
        const newScheduledTimeEnd = '16:00:00';
        
        const updateData = {
          scheduled_time_start: '15:00:00',
          scheduled_time_end: newScheduledTimeEnd,
          adjusted_duration: newAdjustedDuration,
          adjustment_reason: 'API更新测试'
        };
        
        const updateOptions = {
          hostname: 'localhost',
          port: 3001,
          path: `/api/schedules/${createdSchedule.id}`,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        };
        
        const updateResponse = await makeRequest(updateOptions, updateData);
        
        if (updateResponse.statusCode !== 200) {
          console.error('❌ 更新排班失败:', updateResponse.statusCode, updateResponse.body);
          return;
        }
        
        const updatedSchedule = updateResponse.body;
        console.log('✅ 排班更新成功:', updatedSchedule);
        
        // 验证更新后的数据
        if (updatedSchedule.adjusted_duration === newAdjustedDuration) {
          console.log(`✅ 更新后 adjusted_duration 正确: ${updatedSchedule.adjusted_duration} 分钟`);
        } else {
          console.log(`❌ 更新后 adjusted_duration 错误: 期望 ${newAdjustedDuration}, 实际 ${updatedSchedule.adjusted_duration}`);
        }
      }
    }
    
    console.log('\n🎉 API测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
testApiDurationFix();