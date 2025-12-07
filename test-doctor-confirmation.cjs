const axios = require('axios');

// API基础配置
const API_BASE = 'http://localhost:3001/api';

// 测试医生确认预约流程
async function testDoctorConfirmation() {
  console.log('\n=== 测试医生确认预约流程 ===');
  
  try {
    // 使用医生token登录
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'doctor@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.tokens.accessToken;
    console.log('医生登录成功');
    
    // 1. 获取医生待确认预约
    console.log('\n1. 获取医生待确认预约...');
    const pendingResponse = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const pendingAppointments = pendingResponse.data;
    console.log(`医生待确认预约数量: ${pendingAppointments.length}`);
    
    if (pendingAppointments.length === 0) {
      console.log('❌ 没有待确认的医生预约，创建一个测试预约...');
      
      // 创建一个医生服务预约
      const servicesResponse = await axios.get(`${API_BASE}/services`);
      const services = servicesResponse.data;
      const consultationService = services.find(s => s.category === 'consultation');
      const storesResponse = await axios.get(`${API_BASE}/stores`);
      const stores = storesResponse.data.stores;
      const store = stores[0];
      
      if (!consultationService || !store) {
        console.log('❌ 缺少必要的测试数据');
        return;
      }
      
      console.log(`创建医生服务预约: ${consultationService.name}`);
      
      const createResponse = await axios.post(`${API_BASE}/appointments`, {
        customer_name: '医生确认测试客户',
        customer_phone: '13800138002',
        service_id: consultationService.id,
        requested_date: '2025-12-08',
        requested_time_start: '15:00',
        requested_time_end: '16:00',
        store_id: store.id
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const newAppointment = createResponse.data;
      console.log('✅ 新预约创建成功:');
      console.log(`   工作流状态: ${newAppointment.workflow_status}`);
      console.log(`   需要护士排班: ${newAppointment.requires_nurse_scheduling}`);
      
      // 2. 重新获取医生待确认预约
      console.log('\n2. 重新获取医生待确认预约...');
      const newPendingResponse = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const newPendingAppointments = newPendingResponse.data;
      console.log(`医生待确认预约数量: ${newPendingAppointments.length}`);
      
      if (newPendingAppointments.length > 0) {
        const appointmentToConfirm = newPendingAppointments[0];
        console.log('\n3. 确认医生预约:');
        console.log(`   客户: ${appointmentToConfirm.customer_name}`);
        console.log(`   服务: ${appointmentToConfirm.service?.name} (${appointmentToConfirm.service?.category})`);
        console.log(`   状态: ${appointmentToConfirm.workflow_status}`);
        console.log(`   需要护士排班: ${appointmentToConfirm.requires_nurse_scheduling}`);
        
        // 3. 医生确认预约
        const confirmResponse = await axios.put(`${API_BASE}/appointments/${appointmentToConfirm.id}/doctor-confirm`, {
          doctor_note: '医生确认测试'
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const confirmedAppointment = confirmResponse.data;
        console.log('\n✅ 医生确认成功:');
        console.log(`   新状态: ${confirmedAppointment.workflow_status}`);
        console.log(`   需要护士排班: ${confirmedAppointment.requires_nurse_scheduling}`);
        
        // 4. 检查护士长待排班预约（应该不包含这个医生服务）
        console.log('\n4. 检查护士长待排班预约...');
        const nurseResponse = await axios.get(`${API_BASE}/appointments/nurse-pending`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const nurseAppointments = nurseResponse.data;
        console.log(`护士长待排班预约数量: ${nurseAppointments.length}`);
        
        // 检查是否有医生服务出现在护士长排班中
        const doctorServicesInNurseList = nurseAppointments.filter(apt => 
          apt.service && (apt.service.category === 'consultation' || apt.service.category === 'report')
        );
        
        if (doctorServicesInNurseList.length > 0) {
          console.log('\n❌ 发现问题：医生服务出现在护士长排班中！');
          doctorServicesInNurseList.forEach(apt => {
            console.log(`   - ${apt.customer_name}: ${apt.service?.name} (${apt.service?.category})`);
          });
        } else {
          console.log('\n✅ 正确：护士长排班中不包含医生服务');
        }
        
        // 5. 检查医生待确认预约（应该不包含已确认的预约）
        console.log('\n5. 检查医生待确认预约...');
        const finalPendingResponse = await axios.get(`${API_BASE}/appointments/doctor-pending`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const finalPendingAppointments = finalPendingResponse.data;
        console.log(`最终医生待确认预约数量: ${finalPendingAppointments.length}`);
        
        const stillPendingAppointment = finalPendingAppointments.find(apt => apt.id === appointmentToConfirm.id);
        if (stillPendingAppointment) {
          console.log('\n❌ 发现问题：已确认的预约仍然出现在医生待确认列表中！');
        } else {
          console.log('\n✅ 正确：已确认的预约不再出现在医生待确认列表中');
        }
      } else {
        console.log('❌ 没有找到待确认的预约');
      }
    } else {
      console.log('✅ 已有待确认的医生预约');
      
      // 测试确认第一个预约
      const appointmentToConfirm = pendingAppointments[0];
      console.log('\n测试确认现有预约:');
      console.log(`   客户: ${appointmentToConfirm.customer_name}`);
      console.log(`   服务: ${appointmentToConfirm.service?.name} (${appointmentToConfirm.service?.category})`);
      console.log(`   状态: ${appointmentToConfirm.workflow_status}`);
      console.log(`   需要护士排班: ${appointmentToConfirm.requires_nurse_scheduling}`);
      
      const confirmResponse = await axios.put(`${API_BASE}/appointments/${appointmentToConfirm.id}/doctor-confirm`, {
        doctor_note: '医生确认测试'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const confirmedAppointment = confirmResponse.data;
      console.log('\n✅ 医生确认成功:');
      console.log(`   新状态: ${confirmedAppointment.workflow_status}`);
      console.log(`   需要护士排班: ${confirmedAppointment.requires_nurse_scheduling}`);
    }
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

// 主测试函数
async function runTest() {
  console.log('🧪 开始测试医生确认流程...');
  
  try {
    await testDoctorConfirmation();
    console.log('\n🎉 测试完成！');
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
runTest();