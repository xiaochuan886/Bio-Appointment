const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';

// Mock admin token for testing
const mockToken = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3MzM4NjI1NzksImV4cCI6MTczMzk0ODk3OX0.signature';

async function testApiSalesInfo() {
  console.log('🧪 测试API销售信息返回...\n');

  try {
    // 1. 测试护士待排班预约API
    console.log('1️⃣ 测试护士待排班预约API');
    const pendingResponse = await fetch(`${API_BASE}/appointments/nurse-pending`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (pendingResponse.ok) {
      const pendingData = await pendingResponse.json();
      console.log(`   返回 ${pendingData.length} 个待排班预约`);
      
      if (pendingData.length > 0) {
        const sample = pendingData[0];
        console.log('   样本数据:');
        console.log(`     客户: ${sample.customer_name}`);
        console.log(`     服务: ${sample.service_name}`);
        console.log(`     预约人: ${sample.sales_name || '未指定'}`);
        console.log(`     预约人用户名: ${sample.sales_username || '未指定'}`);
        console.log(`     预约人角色: ${sample.sales_role || '未指定'}`);
        console.log(`     客户数量: ${sample.total_people || 1}`);
        if (sample.companion_names && sample.companion_names.length > 0) {
          console.log(`     同行客户: ${sample.companion_names.join(', ')}`);
        }
      }
    } else {
      console.log(`   ❌ API调用失败: ${pendingResponse.status}`);
    }

    console.log('');

    // 2. 测试已取消预约API
    console.log('2️⃣ 测试已取消预约API');
    const cancelledResponse = await fetch(`${API_BASE}/appointments/cancelled`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (cancelledResponse.ok) {
      const cancelledData = await cancelledResponse.json();
      console.log(`   返回 ${cancelledData.length} 个已取消预约`);
      
      if (cancelledData.length > 0) {
        const sample = cancelledData[0];
        console.log('   样本数据:');
        console.log(`     客户: ${sample.customer_name}`);
        console.log(`     服务: ${sample.service_name}`);
        console.log(`     预约人: ${sample.sales_name || '未指定'}`);
        console.log(`     预约人用户名: ${sample.sales_username || '未指定'}`);
        console.log(`     预约人角色: ${sample.sales_role || '未指定'}`);
        console.log(`     客户数量: ${sample.total_people || 1}`);
        if (sample.companion_names && sample.companion_names.length > 0) {
          console.log(`     同行客户: ${sample.companion_names.join(', ')}`);
        }
      }
    } else {
      console.log(`   ❌ API调用失败: ${cancelledResponse.status}`);
    }

    console.log('');

    // 3. 测试排班API
    console.log('3️⃣ 测试排班API');
    const today = new Date().toISOString().split('T')[0];
    const schedulesResponse = await fetch(`${API_BASE}/schedules?date=${today}`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (schedulesResponse.ok) {
      const schedulesData = await schedulesResponse.json();
      console.log(`   返回 ${schedulesData.length} 个排班记录`);
      
      if (schedulesData.length > 0) {
        const sample = schedulesData[0];
        console.log('   样本数据:');
        console.log(`     客户: ${sample.customer_name}`);
        console.log(`     服务: ${sample.service_name}`);
        console.log(`     预约人: ${sample.sales_name || '未指定'}`);
        console.log(`     预约人用户名: ${sample.sales_username || '未指定'}`);
        console.log(`     预约人角色: ${sample.sales_role || '未指定'}`);
        console.log(`     客户数量: ${sample.total_people || 1}`);
        if (sample.companion_names && sample.companion_names.length > 0) {
          console.log(`     同行客户: ${sample.companion_names.join(', ')}`);
        }
        console.log(`     房间: ${sample.room_name || '未分配'}`);
        console.log(`     护士: ${sample.nurse_name || '未分配'}`);
      }
    } else {
      console.log(`   ❌ API调用失败: ${schedulesResponse.status}`);
    }

    console.log('\n✅ API销售信息测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testApiSalesInfo();