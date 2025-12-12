const http = require('http');
const { URL } = require('url');

// 发送HTTP请求的辅助函数
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:3001');
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            data: jsonBody
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testDoctorConfirm() {
  console.log('=== 测试医生确认预约 ===\n');

  try {
    // 1. 获取赵医生的用户信息
    console.log('1. 获取赵医生的用户信息...');
    const usersResponse = await makeRequest('/api/users');
    
    if (usersResponse.statusCode !== 200) {
      console.error('❌ 获取用户信息失败:', usersResponse.data);
      return;
    }

    // 处理不同的响应格式
    let users;
    if (Array.isArray(usersResponse.data)) {
      users = usersResponse.data;
    } else if (usersResponse.data && usersResponse.data.data) {
      users = usersResponse.data.data;
    } else {
      console.error('❌ 无法解析用户数据:', usersResponse.data);
      return;
    }

    const doctor = users.find(u => u.full_name === '赵医生' && u.role === 'doctor');
    
    if (!doctor) {
      console.error('❌ 没有找到赵医生');
      return;
    }

    console.log(`✅ 找到医生: ${doctor.full_name} (ID: ${doctor.id})`);

    // 2. 创建测试预约
    console.log('\n2. 创建测试预约...');
    const testAppointment = {
      customer_name: '测试排班客户',
      customer_phone: '13800138000',
      store_id: '4694c828-114e-4212-9b84-2a92dc1014ec', // 上海门店
      service_id: '94077be0-fc4d-4e20-bb03-1954a91c771e', // 健康咨询
      requested_date: '2024-12-15',
      requested_time_start: '10:00',
      requested_time_end: '11:00',
      doctor_id: doctor.id,
      status: 'pending'
    };

    const createResponse = await makeRequest('/api/appointments', 'POST', testAppointment);
    
    // 创建预约可能返回200或201状态码
    if (createResponse.statusCode !== 200 && createResponse.statusCode !== 201) {
      console.error('❌ 创建测试预约失败:', createResponse.data);
      return;
    }

    // 处理不同的响应格式
    let newAppointment;
    if (createResponse.data.id) {
      newAppointment = createResponse.data;
    } else if (createResponse.data.data && createResponse.data.data.id) {
      newAppointment = createResponse.data.data;
    } else {
      console.error('❌ 无法解析创建的预约数据:', createResponse.data);
      return;
    }

    console.log(`✅ 创建测试预约成功: ${newAppointment.customer_name} (ID: ${newAppointment.id})`);

    // 3. 确认预约
    console.log('\n3. 确认测试预约...');
    const confirmResponse = await makeRequest(`/api/appointments/${newAppointment.id}/doctor-confirm`, 'POST');
    
    if (confirmResponse.statusCode !== 200) {
      console.error('❌ 确认预约失败:', confirmResponse.data);
      return;
    }

    console.log('✅ 预约确认成功');

    // 4. 检查是否创建了排班
    console.log('\n4. 检查是否创建了排班...');
    const newSchedulesResponse = await makeRequest(`/api/schedules?appointment_id=${newAppointment.id}`);
    
    if (newSchedulesResponse.statusCode !== 200) {
      console.error('❌ 查询新排班失败:', newSchedulesResponse.data);
      return;
    }

    let newSchedules;
    if (Array.isArray(newSchedulesResponse.data)) {
      newSchedules = newSchedulesResponse.data;
    } else if (newSchedulesResponse.data && newSchedulesResponse.data.data) {
      newSchedules = newSchedulesResponse.data.data;
    } else {
      console.error('❌ 无法解析排班数据:', newSchedulesResponse.data);
      return;
    }

    if (newSchedules.length === 0) {
      console.log(`  ❌ 确认预约后没有创建排班记录`);
    } else {
      console.log(`  ✅ 确认预约后创建了 ${newSchedules.length} 个排班记录:`);
      newSchedules.forEach((schedule, index) => {
        console.log(`    ${index + 1}. 排班ID: ${schedule.id}, 医生ID: ${schedule.doctor_id}, 日期: ${schedule.date}, 状态: ${schedule.status}`);
      });
    }

    // 5. 检查医生的所有排班
    console.log('\n5. 检查赵医生的所有排班...');
    const doctorSchedulesResponse = await makeRequest(`/api/schedules/doctor?doctor_id=${doctor.id}`);
    
    if (doctorSchedulesResponse.statusCode !== 200) {
      console.error('❌ 查询医生排班失败:', doctorSchedulesResponse.data);
      return;
    }

    let doctorSchedules;
    if (Array.isArray(doctorSchedulesResponse.data)) {
      doctorSchedules = doctorSchedulesResponse.data;
    } else if (doctorSchedulesResponse.data && doctorSchedulesResponse.data.data) {
      doctorSchedules = doctorSchedulesResponse.data.data;
    } else {
      console.error('❌ 无法解析医生排班数据:', doctorSchedulesResponse.data);
      return;
    }

    console.log(`✅ 赵医生共有 ${doctorSchedules.length} 个排班:`);
    doctorSchedules.forEach((schedule, index) => {
      console.log(`  ${index + 1}. 日期: ${schedule.date}, 时间: ${schedule.start_time}-${schedule.end_time}, 状态: ${schedule.status}, 预约ID: ${schedule.appointment_id}`);
    });

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

testDoctorConfirm();