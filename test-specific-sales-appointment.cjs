const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';

// Mock admin token for testing
const mockToken = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3MzM4NjI1NzksImV4cCI6MTczMzk0ODk3OX0.signature';

async function testSpecificSalesAppointment() {
  console.log('🧪 测试特定销售信息预约...\n');

  try {
    // 1. 测试护士待排班预约API - 查找带销售信息的预约
    console.log('1️⃣ 测试护士待排班预约API - 查找带销售信息的预约');
    const pendingResponse = await fetch(`${API_BASE}/appointments/nurse-pending`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (pendingResponse.ok) {
      const pendingData = await pendingResponse.json();
      console.log(`   返回 ${pendingData.length} 个待排班预约`);
      
      // 查找带销售信息的预约
      const appointmentWithSales = pendingData.find(apt => 
        apt.sales_name && apt.sales_name !== '未指定' && apt.sales_name !== null
      );

      if (appointmentWithSales) {
        console.log('   ✅ 找到带销售信息的预约:');
        console.log(`     客户: ${appointmentWithSales.customer_name}`);
        console.log(`     服务: ${appointmentWithSales.service_name}`);
        console.log(`     预约人: ${appointmentWithSales.sales_name}`);
        console.log(`     预约人用户名: ${appointmentWithSales.sales_username}`);
        console.log(`     预约人角色: ${appointmentWithSales.sales_role}`);
        console.log(`     客户数量: ${appointmentWithSales.total_people}`);
        if (appointmentWithSales.companion_names && appointmentWithSales.companion_names.length > 0) {
          console.log(`     同行客户: ${appointmentWithSales.companion_names.join(', ')}`);
        }
      } else {
        console.log('   ⚠️  没有找到带销售信息的待排班预约');
        // 显示前3个预约的销售信息状态
        console.log('   前3个预约的销售信息状态:');
        pendingData.slice(0, 3).forEach((apt, index) => {
          console.log(`     ${index + 1}. ${apt.customer_name} - 预约人: ${apt.sales_name || '未指定'}`);
        });
      }
    } else {
      console.log(`   ❌ API调用失败: ${pendingResponse.status}`);
    }

    console.log('');

    // 2. 测试已取消预约API - 查找带销售信息的预约
    console.log('2️⃣ 测试已取消预约API - 查找带销售信息的预约');
    const cancelledResponse = await fetch(`${API_BASE}/appointments/cancelled`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (cancelledResponse.ok) {
      const cancelledData = await cancelledResponse.json();
      console.log(`   返回 ${cancelledData.length} 个已取消预约`);
      
      // 查找带销售信息的预约
      const cancelledWithSales = cancelledData.find(apt => 
        apt.sales_name && apt.sales_name !== '未指定' && apt.sales_name !== null
      );

      if (cancelledWithSales) {
        console.log('   ✅ 找到带销售信息的已取消预约:');
        console.log(`     客户: ${cancelledWithSales.customer_name}`);
        console.log(`     服务: ${cancelledWithSales.service_name}`);
        console.log(`     预约人: ${cancelledWithSales.sales_name}`);
        console.log(`     预约人用户名: ${cancelledWithSales.sales_username}`);
        console.log(`     预约人角色: ${cancelledWithSales.sales_role}`);
        console.log(`     客户数量: ${cancelledWithSales.total_people}`);
        if (cancelledWithSales.companion_names && cancelledWithSales.companion_names.length > 0) {
          console.log(`     同行客户: ${cancelledWithSales.companion_names.join(', ')}`);
        }
        if (cancelledWithSales.cancelled_reason) {
          console.log(`     取消原因: ${cancelledWithSales.cancelled_reason}`);
        }
      } else {
        console.log('   ⚠️  没有找到带销售信息的已取消预约');
        // 显示前3个预约的销售信息状态
        console.log('   前3个已取消预约的销售信息状态:');
        cancelledData.slice(0, 3).forEach((apt, index) => {
          console.log(`     ${index + 1}. ${apt.customer_name} - 预约人: ${apt.sales_name || '未指定'}`);
        });
      }
    } else {
      console.log(`   ❌ API调用失败: ${cancelledResponse.status}`);
    }

    console.log('\n✅ 特定销售信息预约测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testSpecificSalesAppointment();