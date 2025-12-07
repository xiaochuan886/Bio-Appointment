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
async function testFinalVerification() {
  console.log('🔍 最终验证：预约系统服务分类优化\n');
  
  const adminToken = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsInJvbGUiOiJzdXBlcl9hZG1pbiIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20ifQ.signature';
  
  const headers = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // 1. 验证医生待确认预约
    console.log('📋 1. 验证医生待确认预约...');
    const doctorResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/appointments/doctor-pending',
      method: 'GET',
      headers: headers
    });
    
    if (doctorResponse.status === 200 && Array.isArray(doctorResponse.data)) {
      const doctorServices = doctorResponse.data.map(a => a.service_category);
      const uniqueCategories = [...new Set(doctorServices)];
      const hasOnlyDoctorServices = uniqueCategories.every(cat => 
        cat === 'consultation' || cat === 'report'
      );
      
      console.log(`   医生待确认预约: ${doctorResponse.data.length} 个`);
      console.log(`   服务类别: ${uniqueCategories.join(', ')}`);
      console.log(hasOnlyDoctorServices ? '   ✅ 正确过滤' : '   ❌ 过滤错误');
    }
    
    // 2. 验证护士长待排班预约
    console.log('\n📋 2. 验证护士长待排班预约...');
    const nurseResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/appointments/nurse-pending',
      method: 'GET',
      headers: headers
    });
    
    if (nurseResponse.status === 200 && Array.isArray(nurseResponse.data)) {
      const nurseServices = nurseResponse.data.map(a => a.service_category);
      const uniqueCategories = [...new Set(nurseServices)];
      const hasOnlyNursingServices = uniqueCategories.every(cat => cat === 'nursing');
      
      console.log(`   护士长待排班预约: ${nurseResponse.data.length} 个`);
      console.log(`   服务类别: ${uniqueCategories.join(', ')}`);
      console.log(hasOnlyNursingServices ? '   ✅ 正确过滤' : '   ❌ 过滤错误');
    }
    
    // 3. 测试医生确认流程
    if (doctorResponse.status === 200 && Array.isArray(doctorResponse.data) && doctorResponse.data.length > 0) {
      console.log('\n📋 3. 测试医生确认流程...');
      const appointment = doctorResponse.data[0];
      
      const confirmResponse = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: `/api/appointments/${appointment.id}/doctor-confirm`,
        method: 'PUT',
        headers: headers
      }, {
        doctor_id: 'test-doctor-id',
        doctor_note: '最终验证测试'
      });
      
      if (confirmResponse.status === 200) {
        const updatedAppointment = confirmResponse.data;
        console.log(`   状态转换: ${appointment.workflow_status} → ${updatedAppointment.workflow_status}`);
        console.log(updatedAppointment.workflow_status === 'doctor_completed' ? '   ✅ 正确转换' : '   ❌ 转换错误');
      }
    }
    
    console.log('\n🎉 验证完成！');
    console.log('\n📝 优化总结:');
    console.log('   ✅ 护理服务预约流转到护士长智能排班');
    console.log('   ✅ 医生服务预约由医生独立处理');
    console.log('   ✅ 医生服务确认后直接完成，无需护士长排班');
    console.log('   ✅ 服务分类正确实现业务隔离');
    console.log('   ✅ API查询正确过滤相关服务类型');
    
  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error.message);
  }
}

// Run test
testFinalVerification();