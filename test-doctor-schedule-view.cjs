const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testDoctorScheduleView() {
  console.log('🔍 测试医生排班视图功能...\n');

  try {
    // 1. 获取门店和服务信息
    const storesResponse = await axios.get(`${API_BASE}/stores`);
    const stores = Array.isArray(storesResponse.data) ? storesResponse.data : storesResponse.data.stores || [];
    
    const shanghaiStore = stores.find(s => s.name.includes('上海'));
    const defaultStore = stores.find(s => s.name.includes('默认'));
    
    const servicesResponse = await axios.get(`${API_BASE}/services?category=consultation`);
    const consultationService = servicesResponse.data[0];

    console.log('测试环境:');
    console.log(`- 上海门店: ${shanghaiStore.id}`);
    console.log(`- 默认门店: ${defaultStore.id}`);
    console.log(`- 咨询服务: ${consultationService.id}`);

    // 2. 创建测试预约和排班数据
    console.log('\n📝 创建测试数据...');
    
    const testAppointments = [
      {
        name: '医生排班测试客户A',
        store_id: shanghaiStore.id,
        phone: '13800001001',
        date: '2024-12-16',
        time_start: '09:00',
        time_end: '10:00'
      },
      {
        name: '医生排班测试客户B', 
        store_id: shanghaiStore.id,
        phone: '13800001002',
        date: '2024-12-16',
        time_start: '14:00',
        time_end: '15:00'
      },
      {
        name: '医生排班测试客户C',
        store_id: defaultStore.id,
        phone: '13800002001',
        date: '2024-12-17',
        time_start: '10:00',
        time_end: '11:00'
      }
    ];

    const createdAppointments = [];
    for (const apt of testAppointments) {
      try {
        const response = await axios.post(`${API_BASE}/appointments`, {
          customer_name: apt.name,
          customer_phone: apt.phone,
          service_id: consultationService.id,
          requested_date: apt.date,
          requested_time_start: apt.time_start,
          requested_time_end: apt.time_end,
          total_people: 1,
          estimated_duration: 60,
          store_id: apt.store_id
        });
        createdAppointments.push(response.data);
        console.log(`✅ 创建预约: ${apt.name} -> ${apt.store_id === shanghaiStore.id ? '上海' : '默认'}门店`);
      } catch (error) {
        console.log(`❌ 创建预约失败: ${apt.name}`, error.response?.data?.error);
      }
    }

    // 3. 为预约创建排班
    console.log('\n📅 创建排班数据...');
    
    const createdSchedules = [];
    for (const appointment of createdAppointments) {
      try {
        const scheduleResponse = await axios.post(`${API_BASE}/schedules`, {
          appointment_id: appointment.id,
          scheduled_date: appointment.requested_date,
          scheduled_time_start: appointment.requested_time_start,
          scheduled_time_end: appointment.requested_time_end,
          status: 'scheduled'
        });
        createdSchedules.push(scheduleResponse.data);
        console.log(`✅ 创建排班: ${appointment.customer_name}`);
      } catch (error) {
        console.log(`❌ 创建排班失败: ${appointment.customer_name}`, error.response?.data?.error);
      }
    }

    // 4. 测试医生排班API
    console.log('\n👨‍⚕️ 测试医生排班API...');
    
    const testDoctors = [
      { username: 'doctor1', name: '陈医生', expectedStore: defaultStore.id },
      { username: 'doctor2', name: '赵医生', expectedStore: shanghaiStore.id }
    ];

    for (const doctor of testDoctors) {
      console.log(`\n🔍 测试 ${doctor.name}:`);
      
      try {
        // 登录
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
          email: doctor.username,
          password: 'doctor123'
        });
        const token = loginResponse.data.tokens.accessToken;
        
        // 测试1: 获取所有排班
        console.log('  测试1: 获取所有排班');
        const allSchedulesResponse = await axios.get(`${API_BASE}/schedules/doctor`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`    总排班数: ${allSchedulesResponse.data.length}`);
        
        // 分析排班数据
        const schedulesByDate = {};
        allSchedulesResponse.data.forEach(schedule => {
          const date = schedule.scheduled_date;
          if (!schedulesByDate[date]) schedulesByDate[date] = [];
          schedulesByDate[date].push(schedule);
        });
        
        console.log('    按日期分布:');
        Object.entries(schedulesByDate).forEach(([date, schedules]) => {
          console.log(`      ${date}: ${schedules.length} 个排班`);
          schedules.forEach(s => {
            console.log(`        - ${s.scheduled_time_start}-${s.scheduled_time_end} ${s.appointment?.customer_name}`);
          });
        });

        // 测试2: 按日期查询
        console.log('  测试2: 按日期查询 (2024-12-16)');
        const dateSchedulesResponse = await axios.get(`${API_BASE}/schedules/doctor?date=2024-12-16`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`    2024-12-16 排班数: ${dateSchedulesResponse.data.length}`);

        // 测试3: 按日期范围查询
        console.log('  测试3: 按日期范围查询 (2024-12-16 到 2024-12-17)');
        const rangeSchedulesResponse = await axios.get(`${API_BASE}/schedules/doctor?start_date=2024-12-16&end_date=2024-12-17`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`    日期范围排班数: ${rangeSchedulesResponse.data.length}`);

        // 验证数据完整性
        console.log('  验证数据完整性:');
        allSchedulesResponse.data.forEach(schedule => {
          const appointment = schedule.appointment;
          if (!appointment) {
            console.log(`    ❌ 排班 ${schedule.id} 缺少预约信息`);
            return;
          }
          
          // 检查必要字段
          const requiredFields = ['customer_name', 'service', 'store_id'];
          const missingFields = requiredFields.filter(field => !appointment[field]);
          if (missingFields.length > 0) {
            console.log(`    ❌ 预约 ${appointment.customer_name} 缺少字段: ${missingFields.join(', ')}`);
          }
          
          // 检查门店匹配
          if (appointment.store_id !== doctor.expectedStore) {
            console.log(`    🚨 门店不匹配: ${appointment.customer_name} 预约门店 ${appointment.store_id} != 医生门店 ${doctor.expectedStore}`);
          }
          
          // 检查服务类型
          if (appointment.service?.category !== 'consultation') {
            console.log(`    ⚠️ 服务类型异常: ${appointment.customer_name} 服务类型 ${appointment.service?.category}`);
          }
        });

      } catch (error) {
        console.log(`❌ 测试医生 ${doctor.username} 失败:`, error.response?.data?.error || error.message);
      }
    }

    // 5. 测试权限控制
    console.log('\n🛡️ 测试权限控制...');
    
    // 测试护士访问医生排班API
    try {
      const nurseLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: 'nurse1',
        password: 'nurse123'
      });
      const nurseToken = nurseLoginResponse.data.tokens.accessToken;
      
      try {
        const nurseSchedulesResponse = await axios.get(`${API_BASE}/schedules/doctor`, {
          headers: { 'Authorization': `Bearer ${nurseToken}` }
        });
        console.log('🚨 安全问题: 护士能访问医生排班API!');
      } catch (apiError) {
        if (apiError.response?.status === 403) {
          console.log('✅ 权限控制正确: 护士被拒绝访问医生排班API');
        } else {
          console.log('❌ 意外错误:', apiError.response?.data?.error);
        }
      }
    } catch (loginError) {
      console.log('ℹ️ 无法测试护士权限 (护士账户不存在)');
    }

    // 6. 性能测试
    console.log('\n⚡ 性能测试...');
    
    try {
      const doctorLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: 'doctor1',
        password: 'doctor123'
      });
      const token = doctorLoginResponse.data.tokens.accessToken;
      
      const startTime = Date.now();
      const performanceResponse = await axios.get(`${API_BASE}/schedules/doctor?start_date=2024-12-01&end_date=2024-12-31`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const endTime = Date.now();
      
      console.log(`✅ API响应时间: ${endTime - startTime}ms`);
      console.log(`✅ 返回数据量: ${performanceResponse.data.length} 条排班记录`);
      
    } catch (error) {
      console.log('❌ 性能测试失败:', error.response?.data?.error || error.message);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testDoctorScheduleView();