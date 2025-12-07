const http = require('http');

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
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

// Test function
async function testDoctorWorkflow() {
  console.log('🔍 开始测试医生确认工作流程...\n');
  
  const baseUrl = 'http://localhost:3001';
  const adminToken = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsInJvbGUiOiJzdXBlcl9hZG1pbiIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20ifQ.signature';
  
  const headers = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // 1. 获取一个医生待确认预约
    console.log('📋 1. 获取医生待确认预约...');
    const doctorPendingOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/appointments/doctor-pending',
      method: 'GET',
      headers: headers
    };
    
    const doctorResponse = await makeRequest(doctorPendingOptions);
    
    if (doctorResponse.status !== 200 || !Array.isArray(doctorResponse.data) || doctorResponse.data.length === 0) {
      console.log('   ❌ 没有找到医生待确认预约');
      return;
    }
    
    const appointment = doctorResponse.data[0];
    console.log(`   选择预约: ${appointment.customer_name} - ${appointment.service_name}`);
    console.log(`   当前状态: ${appointment.workflow_status}`);
    console.log(`   服务类别: ${appointment.service_category}`);
    console.log(`   需要护士排班: ${appointment.requires_nurse_scheduling}`);
    
    console.log('');
    
    // 2. 医生确认预约
    console.log('📋 2. 医生确认预约...');
    const confirmOptions = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/appointments/${appointment.id}/doctor-confirm`,
      method: 'PUT',
      headers: headers
    };
    
    const confirmData = {
      doctor_id: 'test-doctor-id',
      doctor_note: '测试医生确认'
    };
    
    const confirmResponse = await makeRequest(confirmOptions, confirmData);
    console.log(`   状态码: ${confirmResponse.status}`);
    
    if (confirmResponse.status === 200) {
      const updatedAppointment = confirmResponse.data;
      console.log(`   新状态: ${updatedAppointment.workflow_status}`);
      console.log(`   医生备注: ${updatedAppointment.doctor_note || '无'}`);
      
      // 验证状态转换
      if (appointment.service_category === 'consultation' || appointment.service_category === 'report') {
        // 医生服务应该直接完成
        if (updatedAppointment.workflow_status === 'doctor_completed') {
          console.log('   ✅ 医生服务正确转换为 doctor_completed 状态');
        } else {
          console.log(`   ❌ 医生服务状态转换错误: ${updatedAppointment.workflow_status}`);
        }
      }
    } else {
      console.log('   ❌ 医生确认失败');
      console.log(`   错误信息: ${confirmResponse.data.error || confirmResponse.data}`);
    }
    
    console.log('');
    
    // 3. 验证预约不再出现在医生待确认列表中
    console.log('📋 3. 验证预约已从医生待确认列表移除...');
    const doctorPendingAfterOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/appointments/doctor-pending',
      method: 'GET',
      headers: headers
    };
    
    const afterResponse = await makeRequest(doctorPendingAfterOptions);
    
    if (afterResponse.status === 200 && Array.isArray(afterResponse.data)) {
      const stillPending = afterResponse.data.find(a => a.id === appointment.id);
      if (!stillPending) {
        console.log('   ✅ 预约已从医生待确认列表移除');
      } else {
        console.log('   ❌ 预约仍在医生待确认列表中');
      }
    }
    
    console.log('');
    
    // 4. 验证预约不会出现在护士长待排班列表中（医生服务不需要护士排班）
    console.log('📋 4. 验证医生服务不会出现在护士长待排班列表...');
    const nursePendingOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/appointments/nurse-pending',
      method: 'GET',
      headers: headers
    };
    
    const nurseResponse = await makeRequest(nursePendingOptions);
    
    if (nurseResponse.status === 200 && Array.isArray(nurseResponse.data)) {
      const inNurseList = nurseResponse.data.find(a => a.id === appointment.id);
      if (!inNurseList) {
        console.log('   ✅ 医生服务正确地没有出现在护士长待排班列表中');
      } else {
        console.log('   ❌ 医生服务错误地出现在护士长待排班列表中');
      }
    }
    
    console.log('');
    console.log('🎉 医生确认工作流程测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// Run the test
testDoctorWorkflow();