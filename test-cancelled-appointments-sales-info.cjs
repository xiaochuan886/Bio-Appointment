const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';

// Mock admin token for testing
const mockToken = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3MzM4NjI1NzksImV4cCI6MTczMzk0ODk3OX0.signature';

async function testCancelledAppointmentsSalesInfo() {
  console.log('🧪 测试已取消预约的销售信息...\n');

  try {
    // 1. 获取已取消预约
    console.log('1️⃣ 获取已取消预约数据');
    const cancelledResponse = await fetch(`${API_BASE}/appointments/cancelled`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (cancelledResponse.ok) {
      const cancelledData = await cancelledResponse.json();
      console.log(`   返回 ${cancelledData.length} 个已取消预约`);
      
      // 查找有销售信息的已取消预约
      const appointmentsWithSales = cancelledData.filter(apt => 
        apt.sales_name && apt.sales_name !== '未指定' && apt.sales_name !== null
      );
      
      console.log(`   有销售信息的已取消预约: ${appointmentsWithSales.length} 个`);
      
      if (appointmentsWithSales.length > 0) {
        console.log('\n✅ 找到有销售信息的已取消预约:');
        appointmentsWithSales.forEach((apt, index) => {
          console.log(`   ${index + 1}. 客户: ${apt.customer_name}`);
          console.log(`      预约人: ${apt.sales_name} (${apt.sales_role})`);
          console.log(`      服务: ${apt.service_name}`);
          console.log(`      取消原因: ${apt.cancelled_reason || '未提供'}`);
          console.log('');
        });
      } else {
        console.log('\n⚠️  没有找到有销售信息的已取消预约');
        
        // 显示前3个已取消预约的详细信息
        console.log('\n前3个已取消预约的详细信息:');
        cancelledData.slice(0, 3).forEach((apt, index) => {
          console.log(`   ${index + 1}. 客户: ${apt.customer_name}`);
          console.log(`      预约ID: ${apt.id}`);
          console.log(`      sales_id: ${apt.sales_id || 'null'}`);
          console.log(`      created_by: ${apt.created_by || 'null'}`);
          console.log(`      sales_name: ${apt.sales_name || 'null'}`);
          console.log(`      sales_username: ${apt.sales_username || 'null'}`);
          console.log(`      sales_role: ${apt.sales_role || 'null'}`);
          console.log('');
        });
      }
      
      // 检查我们之前创建的测试预约
      const testAppointment = cancelledData.find(apt => 
        apt.customer_name === '测试客户-已取消预约'
      );
      
      if (testAppointment) {
        console.log('✅ 找到测试创建的已取消预约:');
        console.log(`   客户: ${testAppointment.customer_name}`);
        console.log(`   预约人: ${testAppointment.sales_name || '未指定'}`);
        console.log(`   sales_id: ${testAppointment.sales_id}`);
        console.log(`   created_by: ${testAppointment.created_by}`);
        
        if (testAppointment.sales_name && testAppointment.sales_name !== '未指定') {
          console.log('   ✅ 测试预约有正确的销售信息');
        } else {
          console.log('   ❌ 测试预约缺少销售信息');
        }
      } else {
        console.log('⚠️  没有找到测试创建的已取消预约');
      }
      
    } else {
      console.log(`   ❌ API调用失败: ${cancelledResponse.status}`);
    }

    console.log('\n📋 问题分析:');
    console.log('   1. 检查已取消预约API的SQL查询是否包含销售信息JOIN');
    console.log('   2. 检查数据库中已取消预约的sales_id和created_by字段');
    console.log('   3. 验证COALESCE逻辑是否正确工作');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testCancelledAppointmentsSalesInfo();