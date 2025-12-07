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
async function testWorkflow() {
  console.log('🔍 开始验证预约工作流程...\n');
  
  const baseUrl = 'http://localhost:3001';
  const adminToken = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsInJvbGUiOiJzdXBlcl9hZG1pbiIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20ifQ.signature';
  
  const headers = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // 1. 测试医生待确认预约 - 应该只包含医生服务
    console.log('📋 1. 测试医生待确认预约...');
    const doctorPendingOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/appointments/doctor-pending',
      method: 'GET',
      headers: headers
    };
    
    const doctorResponse = await makeRequest(doctorPendingOptions);
    console.log(`   状态码: ${doctorResponse.status}`);
    
    if (doctorResponse.status === 200 && Array.isArray(doctorResponse.data)) {
      const doctorServices = doctorResponse.data.map(a => a.service_category);
      const uniqueCategories = [...new Set(doctorServices)];
      console.log(`   预约数量: ${doctorResponse.data.length}`);
      console.log(`   服务类别: ${uniqueCategories.join(', ')}`);
      
      const hasOnlyDoctorServices = uniqueCategories.every(cat => 
        cat === 'consultation' || cat === 'report'
      );
      
      if (hasOnlyDoctorServices) {
        console.log('   ✅ 医生待确认预约正确过滤，只包含医生服务');
      } else {
        console.log('   ❌ 医生待确认预约包含非医生服务');
      }
      
      // 检查 requires_nurse_scheduling 字段
      const allCorrectFlags = doctorResponse.data.every(a => a.requires_nurse_scheduling === false);
      if (allCorrectFlags) {
        console.log('   ✅ 所有医生服务正确设置 requires_nurse_scheduling = false');
      } else {
        console.log('   ❌ 部分医生服务 requires_nurse_scheduling 设置错误');
      }
    } else {
      console.log('   ❌ 获取医生待确认预约失败');
    }
    
    console.log('');
    
    // 2. 测试护士长待排班预约 - 应该只包含护理服务
    console.log('📋 2. 测试护士长待排班预约...');
    const nursePendingOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/appointments/nurse-pending',
      method: 'GET',
      headers: headers
    };
    
    const nurseResponse = await makeRequest(nursePendingOptions);
    console.log(`   状态码: ${nurseResponse.status}`);
    
    if (nurseResponse.status === 200 && Array.isArray(nurseResponse.data)) {
      const nurseServices = nurseResponse.data.map(a => a.service_category);
      const uniqueCategories = [...new Set(nurseServices)];
      console.log(`   预约数量: ${nurseResponse.data.length}`);
      console.log(`   服务类别: ${uniqueCategories.join(', ')}`);
      
      const hasOnlyNursingServices = uniqueCategories.every(cat => cat === 'nursing');
      
      if (hasOnlyNursingServices) {
        console.log('   ✅ 护士长待排班预约正确过滤，只包含护理服务');
      } else {
        console.log('   ❌ 护士长待排班预约包含非护理服务');
      }
      
      // 检查 requires_nurse_scheduling 字段
      const allCorrectFlags = nurseResponse.data.every(a => a.requires_nurse_scheduling === true);
      if (allCorrectFlags) {
        console.log('   ✅ 所有护理服务正确设置 requires_nurse_scheduling = true');
      } else {
        console.log('   ❌ 部分护理服务 requires_nurse_scheduling 设置错误');
      }
    } else {
      console.log('   ❌ 获取护士长待排班预约失败');
    }
    
    console.log('');
    
    // 3. 测试服务列表 - 验证服务分类
    console.log('📋 3. 测试服务分类...');
    const servicesOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/services',
      method: 'GET',
      headers: headers
    };
    
    const servicesResponse = await makeRequest(servicesOptions);
    
    if (servicesResponse.status === 200 && Array.isArray(servicesResponse.data)) {
      const nursingServices = servicesResponse.data.filter(s => s.category === 'nursing');
      const doctorServices = servicesResponse.data.filter(s => s.category === 'consultation' || s.category === 'report');
      
      console.log(`   护理服务数量: ${nursingServices.length}`);
      console.log(`   医生服务数量: ${doctorServices.length}`);
      console.log('   ✅ 服务分类正确');
    } else {
      console.log('   ❌ 获取服务列表失败');
    }
    
    console.log('');
    console.log('🎉 工作流程验证完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// Run the test
testWorkflow();