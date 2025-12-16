const http = require('http');

// 简化的时长测试
async function testDurationSimple() {
  try {
    console.log('🔍 [简化测试] 开始测试排班时长处理...');
    
    // 1. 获取一个预约
    const appointmentResponse = await makeRequest('GET', '/api/appointments?limit=1');
    if (!appointmentResponse.success || appointmentResponse.data.length === 0) {
      console.log('❌ 没有找到可用的预约');
      return;
    }
    
    const appointment = appointmentResponse.data[0];
    console.log('📋 [简化测试] 找到预约:', {
      id: appointment.id,
      customer_name: appointment.customer_name,
      estimated_duration: appointment.estimated_duration
    });
    
    // 检查预约ID是否正确
    console.log('🔍 [简化测试] 预约ID检查:', appointment.id);
    
    // 2. 创建排班，使用修改后的时长
    const scheduleData = {
      appointment_id: appointment.id,
      scheduled_date: '2025-01-15',
      scheduled_time_start: '09:00:00',
      scheduled_time_end: '10:30:00', // 90分钟
      room_id: null,
      nurse_id: null,
      notes: '测试时长处理'
    };
    
    console.log('🕐 [简化测试] 创建排班数据:', scheduleData);
    
    // 3. 发送排班创建请求
    const createResponse = await makeRequest('POST', '/api/schedules', scheduleData);
    
    if (!createResponse.success) {
      console.log('❌ 排班创建失败:', createResponse.error);
      return;
    }
    
    const createdSchedule = createResponse.data;
    console.log('✅ [简化测试] 排班创建成功:', {
      id: createdSchedule.id,
      scheduled_time_start: createdSchedule.scheduled_time_start,
      scheduled_time_end: createdSchedule.scheduled_time_end
    });
    
    // 4. 检查预约的时长是否被更新
    console.log('🔍 [简化测试] 检查预约时长是否被更新...');
    console.log(`🔍 [简化测试] 请求URL: /api/appointments/${appointment.id}`);
    const updatedAppointmentResponse = await makeRequest('GET', `/api/appointments/${appointment.id}`);
    
    if (!updatedAppointmentResponse.success) {
      console.log('❌ 获取更新后的预约失败:', updatedAppointmentResponse.error);
      console.log('❌ 响应状态:', updatedAppointmentResponse.status);
      return;
    }
    
    const updatedAppointment = updatedAppointmentResponse.data;
    console.log('📊 [简化测试] 预约时长检查:', {
      original_duration: appointment.estimated_duration,
      updated_duration: updatedAppointment.estimated_duration
    });
    
    // 5. 清理测试数据
    await makeRequest('DELETE', `/api/schedules/${createdSchedule.id}`);
    
    // 6. 测试结果分析
    console.log('\n🔍 [简化测试结果分析]');
    if (updatedAppointment.estimated_duration === 90) {
      console.log('✅ 修复成功：预约的estimated_duration已正确更新为90分钟');
    } else {
      console.log('❌ 修复失败：预约的estimated_duration仍为', updatedAppointment.estimated_duration, '分钟');
    }
    
  } catch (error) {
    console.error('❌ 简化测试失败:', error);
  }
}

// 辅助函数：发送HTTP请求
function makeRequest(method, path, data = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock.' + Buffer.from(JSON.stringify({
          userId: 'admin-id',
          email: 'admin@test.com',
          role: 'super_admin'
        })).toString('base64') + '.signature'
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            data: data,
            error: data.error || data.message || null
          });
        } catch (error) {
          resolve({
            success: false,
            status: res.statusCode,
            data: null,
            error: 'Invalid JSON response'
          });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({
        success: false,
        status: 0,
        data: null,
        error: error.message
      });
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

testDurationSimple();