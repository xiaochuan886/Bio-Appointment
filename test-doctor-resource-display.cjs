const API_BASE_URL = 'http://localhost:3001/api';

// 简单的API调用函数
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

async function testDoctorResourceDisplay() {
  try {
    console.log('🔍 开始测试医生资源显示功能...');
    
    // 1. 获取医生数据
    console.log('\n1. 获取医生数据...');
    const profiles = await apiCall('/profiles');
    const doctors = profiles.filter(profile => profile.role === 'doctor');
    console.log(`找到 ${doctors.length} 个医生:`);
    doctors.forEach(doctor => {
      console.log(`  - ${doctor.full_name} (ID: ${doctor.id})`);
    });
    
    // 2. 获取排班数据
    console.log('\n2. 获取排班数据...');
    const today = new Date().toISOString().split('T')[0];
    const schedules = await apiCall(`/schedules?date=${today}`);
    console.log(`找到 ${schedules.length} 个排班`);
    
    // 3. 检查排班中的医生数据
    console.log('\n3. 检查排班中的医生数据...');
    const doctorSchedules = schedules.filter(schedule => 
      schedule.appointment?.doctor_id
    );
    
    console.log(`找到 ${doctorSchedules.length} 个有医生的排班:`);
    doctorSchedules.forEach(schedule => {
      const doctor = doctors.find(d => d.id === schedule.appointment.doctor_id);
      console.log(`  - 排班ID: ${schedule.id}`);
      console.log(`    医生ID: ${schedule.appointment.doctor_id}`);
      console.log(`    医生姓名: ${doctor?.full_name || '未找到'}`);
      console.log(`    客户: ${schedule.appointment?.customer_name}`);
      console.log(`    时间: ${schedule.scheduled_time_start} - ${schedule.scheduled_time_end}`);
    });
    
    // 4. 测试资源筛选逻辑
    console.log('\n4. 测试资源筛选逻辑...');
    
    // 模拟visibleDoctors计算
    const resourceFilters = ['room', 'nurse', 'doctor'];
    const visibleDoctors = resourceFilters.includes('doctor') ? doctors : [];
    console.log(`visibleDoctors数量: ${visibleDoctors.length}`);
    
    // 模拟getSchedulesForResource函数
    const testDoctorId = doctors[0]?.id;
    if (testDoctorId) {
      const doctorSchedulesForTest = schedules.filter(schedule => 
        schedule.appointment?.doctor_id === testDoctorId
      );
      console.log(`医生 ${doctors[0].full_name} 的排班数量: ${doctorSchedulesForTest.length}`);
    }
    
    console.log('\n✅ 测试完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testDoctorResourceDisplay();