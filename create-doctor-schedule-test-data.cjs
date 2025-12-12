const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function createDoctorScheduleTestData() {
  console.log('🔧 创建医生排班测试数据...\n');

  try {
    // 1. 获取基础数据
    const storesResponse = await axios.get(`${API_BASE}/stores`);
    const stores = Array.isArray(storesResponse.data) ? storesResponse.data : storesResponse.data.stores || [];
    
    const shanghaiStore = stores.find(s => s.name.includes('上海'));
    const defaultStore = stores.find(s => s.name.includes('默认'));
    
    const servicesResponse = await axios.get(`${API_BASE}/services?category=consultation`);
    const consultationService = servicesResponse.data[0];

    const profilesResponse = await axios.get(`${API_BASE}/profiles?role=doctor`);
    const doctors = profilesResponse.data;
    
    const chenDoctor = doctors.find(d => d.username === 'doctor1');
    const zhaoDoctor = doctors.find(d => d.username === 'doctor2');

    console.log('基础数据:');
    console.log(`- 上海门店: ${shanghaiStore.name} (${shanghaiStore.id})`);
    console.log(`- 默认门店: ${defaultStore.name} (${defaultStore.id})`);
    console.log(`- 咨询服务: ${consultationService.name} (${consultationService.id})`);
    console.log(`- 陈医生: ${chenDoctor.full_name} (${chenDoctor.id}) - 门店: ${chenDoctor.store_id}`);
    console.log(`- 赵医生: ${zhaoDoctor.full_name} (${zhaoDoctor.id}) - 门店: ${zhaoDoctor.store_id}`);

    // 2. 管理员登录
    console.log('\n🔑 管理员登录...');
    const adminLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin',
      password: 'admin123'
    });
    const adminToken = adminLoginResponse.data.tokens.accessToken;
    console.log('✅ 管理员登录成功');

    // 3. 创建测试预约并分配给医生
    console.log('\n📝 创建测试预约...');
    
    const testAppointments = [
      // 陈医生（默认门店）的预约
      {
        customer_name: '陈医生的客户A',
        store_id: defaultStore.id,
        doctor_id: chenDoctor.id,
        date: '2024-12-16',
        time_start: '09:00',
        time_end: '10:00'
      },
      {
        customer_name: '陈医生的客户B',
        store_id: defaultStore.id,
        doctor_id: chenDoctor.id,
        date: '2024-12-16',
        time_start: '14:00',
        time_end: '15:00'
      },
      {
        customer_name: '陈医生的客户C',
        store_id: defaultStore.id,
        doctor_id: chenDoctor.id,
        date: '2024-12-17',
        time_start: '10:00',
        time_end: '11:00'
      },
      // 赵医生（上海门店）的预约
      {
        customer_name: '赵医生的客户A',
        store_id: shanghaiStore.id,
        doctor_id: zhaoDoctor.id,
        date: '2024-12-16',
        time_start: '10:00',
        time_end: '11:00'
      },
      {
        customer_name: '赵医生的客户B',
        store_id: shanghaiStore.id,
        doctor_id: zhaoDoctor.id,
        date: '2024-12-17',
        time_start: '15:00',
        time_end: '16:00'
      }
    ];

    const createdAppointments = [];
    for (const apt of testAppointments) {
      try {
        const response = await axios.post(`${API_BASE}/appointments`, {
          customer_name: apt.customer_name,
          customer_phone: '13800000000',
          service_id: consultationService.id,
          requested_date: apt.date,
          requested_time_start: apt.time_start,
          requested_time_end: apt.time_end,
          total_people: 1,
          estimated_duration: 60,
          store_id: apt.store_id,
          doctor_id: apt.doctor_id
        }, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        createdAppointments.push({
          ...response.data,
          expected_doctor: apt.doctor_id,
          expected_store: apt.store_id
        });
        
        console.log(`✅ 创建预约: ${apt.customer_name} -> ${apt.doctor_id === chenDoctor.id ? '陈医生' : '赵医生'}`);
      } catch (error) {
        console.log(`❌ 创建预约失败: ${apt.customer_name}`, error.response?.data?.error);
      }
    }

    // 4. 为预约创建排班
    console.log('\n📅 创建排班...');
    
    const createdSchedules = [];
    for (const appointment of createdAppointments) {
      try {
        const scheduleResponse = await axios.post(`${API_BASE}/schedules`, {
          appointment_id: appointment.id,
          scheduled_date: appointment.requested_date,
          scheduled_time_start: appointment.requested_time_start,
          scheduled_time_end: appointment.requested_time_end,
          status: 'scheduled'
        }, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        createdSchedules.push(scheduleResponse.data);
        console.log(`✅ 创建排班: ${appointment.customer_name} (${appointment.requested_date} ${appointment.requested_time_start})`);
      } catch (error) {
        console.log(`❌ 创建排班失败: ${appointment.customer_name}`, error.response?.data?.error);
      }
    }

    // 5. 验证医生排班数据
    console.log('\n🔍 验证医生排班数据...');
    
    const testDoctors = [
      { username: 'doctor1', name: '陈医生', id: chenDoctor.id, expectedCount: 3 },
      { username: 'doctor2', name: '赵医生', id: zhaoDoctor.id, expectedCount: 2 }
    ];

    for (const doctor of testDoctors) {
      try {
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
          email: doctor.username,
          password: 'doctor123'
        });
        const token = loginResponse.data.tokens.accessToken;
        
        const schedulesResponse = await axios.get(`${API_BASE}/schedules/doctor`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`\n${doctor.name} 的排班:`);
        console.log(`  总数: ${schedulesResponse.data.length} (期望: ${doctor.expectedCount})`);
        
        if (schedulesResponse.data.length !== doctor.expectedCount) {
          console.log(`  ⚠️ 排班数量不匹配!`);
        }
        
        schedulesResponse.data.forEach(schedule => {
          const appointment = schedule.appointment;
          console.log(`  - ${schedule.scheduled_date} ${schedule.scheduled_time_start}-${schedule.scheduled_time_end}`);
          console.log(`    客户: ${appointment?.customer_name}`);
          console.log(`    服务: ${appointment?.service?.name}`);
          console.log(`    状态: ${schedule.status}`);
          
          // 验证数据完整性
          if (appointment?.doctor_id !== doctor.id) {
            console.log(`    🚨 医生ID不匹配: ${appointment?.doctor_id} != ${doctor.id}`);
          }
        });
        
      } catch (error) {
        console.log(`❌ 验证 ${doctor.name} 失败:`, error.response?.data?.error || error.message);
      }
    }

    console.log('\n✅ 医生排班测试数据创建完成!');
    console.log('\n📊 数据统计:');
    console.log(`- 创建预约: ${createdAppointments.length} 个`);
    console.log(`- 创建排班: ${createdSchedules.length} 个`);
    console.log(`- 陈医生预约: ${createdAppointments.filter(a => a.expected_doctor === chenDoctor.id).length} 个`);
    console.log(`- 赵医生预约: ${createdAppointments.filter(a => a.expected_doctor === zhaoDoctor.id).length} 个`);

  } catch (error) {
    console.error('❌ 创建测试数据失败:', error.response?.data || error.message);
  }
}

createDoctorScheduleTestData();