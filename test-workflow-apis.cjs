// 测试工作流API的脚本
const clientApi = require('./src/services/api-client.ts').default;

// 模拟用户登录
async function testWorkflowAPIs() {
  console.log('🧪 开始测试工作流API...\n');
  
  try {
    // 1. 测试获取护士长待处理预约
    console.log('📋 测试获取护士长待处理预约...');
    const nurseAppointments = await clientApi.getNursePendingAppointments({
      requested_date_from: '2025-12-07',
      requested_date_to: '2025-12-07'
    });
    console.log(`✅ 获取到 ${nurseAppointments.length} 个护士长待处理预约`);
    
    // 2. 测试获取医生待处理预约
    console.log('\n👨‍⚕️ 测试获取医生待处理预约...');
    const doctorAppointments = await clientApi.getDoctorPendingAppointments({
      store_id: 'test-store-id'
    });
    console.log(`✅ 获取到 ${doctorAppointments.length} 个医生待处理预约`);
    
    // 3. 如果有医生待处理预约，测试确认和拒绝
    if (doctorAppointments.length > 0) {
      const testAppointment = doctorAppointments[0];
      console.log(`\n🔍 测试预约: ${testAppointment.customer_name} (${testAppointment.id})`);
      
      // 测试医生确认预约
      console.log('✅ 测试医生确认预约...');
      try {
        const confirmedAppointment = await clientApi.doctorConfirmAppointment(testAppointment.id, {
          doctor_id: 'test-doctor-id',
          doctor_note: '测试确认备注'
        });
        console.log(`✅ 预约已确认，状态: ${confirmedAppointment.workflow_status}`);
      } catch (error) {
        console.log('❌ 医生确认预约失败:', error.message);
      }
      
      // 测试工作流状态更新
      console.log('\n🔄 测试工作流状态更新...');
      try {
        const updatedAppointment = await clientApi.updateAppointmentWorkflow(testAppointment.id, {
          workflow_status: 'nurse_scheduled',
          note: '测试状态更新'
        });
        console.log(`✅ 工作流状态已更新: ${updatedAppointment.workflow_status}`);
      } catch (error) {
        console.log('❌ 工作流状态更新失败:', error.message);
      }
    }
    
    console.log('\n🎉 所有API测试完成！');
    
  } catch (error) {
    console.error('❌ API测试失败:', error.message);
    console.error(error.stack);
  }
}

// 运行测试
testWorkflowAPIs();