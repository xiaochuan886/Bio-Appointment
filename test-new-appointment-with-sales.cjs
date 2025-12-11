const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';
const mockToken = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3MzM4NjI1NzksImV4cCI6MTczMzk0ODk3OX0.signature';

async function testNewAppointmentWithSales() {
  console.log('🧪 测试新预约创建API的销售信息处理...\n');

  try {
    // 1. 获取销售用户ID
    const salesResponse = await fetch(`${API_BASE}/profiles?role=sales`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!salesResponse.ok) {
      throw new Error(`获取销售用户失败: ${salesResponse.status}`);
    }

    const salesUsers = await salesResponse.json();
    if (salesUsers.length === 0) {
      throw new Error('没有找到销售用户');
    }

    const salesUser = salesUsers[0];
    console.log(`✅ 找到销售用户: ${salesUser.full_name} (${salesUser.id})`);

    // 2. 获取服务和门店信息
    const [servicesResponse, storesResponse] = await Promise.all([
      fetch(`${API_BASE}/services?category=nursing`, {
        headers: { 'Authorization': `Bearer ${mockToken}` }
      }),
      fetch(`${API_BASE}/stores`, {
        headers: { 'Authorization': `Bearer ${mockToken}` }
      })
    ]);

    const services = await servicesResponse.json();
    const storesData = await storesResponse.json();
    const stores = storesData.stores || storesData;

    if (services.length === 0 || stores.length === 0) {
      throw new Error('缺少必要的服务或门店数据');
    }

    const service = services[0];
    const store = stores[0];
    console.log(`✅ 使用服务: ${service.name} (${service.id})`);
    console.log(`✅ 使用门店: ${store.name || store.id} (${store.id})`);

    // 3. 创建新预约（包含销售信息）
    const today = new Date().toISOString().split('T')[0];
    const appointmentData = {
      customer_name: '新预约测试客户-销售信息验证',
      customer_phone: '13800000001',
      service_id: service.id,
      requested_date: today,
      requested_time_start: '14:00:00',
      requested_time_end: '15:00:00',
      notes: '测试新预约API的销售信息处理',
      total_people: 2,
      estimated_duration: 60,
      is_urgent: false,
      companion_names: ['同行客户D'],
      store_id: store.id,
      sales_id: salesUser.id  // 关键：包含销售ID
    };

    console.log('\n🔍 创建预约，包含销售信息...');
    console.log(`销售ID: ${appointmentData.sales_id}`);

    const createResponse = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(appointmentData)
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`创建预约失败: ${createResponse.status} - ${errorText}`);
    }

    const newAppointment = await createResponse.json();
    console.log(`✅ 预约创建成功: ${newAppointment.id}`);
    console.log(`   客户: ${newAppointment.customer_name}`);
    console.log(`   销售ID: ${newAppointment.sales_id || 'null'}`);
    console.log(`   创建者ID: ${newAppointment.created_by || 'null'}`);

    // 4. 验证预约是否包含销售信息
    console.log('\n🔍 验证预约的销售信息...');
    
    // 通过已取消预约API验证（因为它包含销售信息查询）
    const cancelledResponse = await fetch(`${API_BASE}/appointments/cancelled`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      }
    });

    // 先取消这个预约，然后通过已取消预约API查看
    await fetch(`${API_BASE}/appointments/${newAppointment.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'cancelled',
        cancelled_reason: '测试用途-验证销售信息'
      })
    });

    // 重新获取已取消预约
    const updatedCancelledResponse = await fetch(`${API_BASE}/appointments/cancelled`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (updatedCancelledResponse.ok) {
      const cancelledAppointments = await updatedCancelledResponse.json();
      const ourAppointment = cancelledAppointments.find(apt => apt.id === newAppointment.id);

      if (ourAppointment) {
        console.log(`✅ 找到已取消的预约:`);
        console.log(`   客户: ${ourAppointment.customer_name}`);
        console.log(`   预约人: ${ourAppointment.sales_name || '未指定'}`);
        console.log(`   销售角色: ${ourAppointment.sales_role || '未知'}`);

        if (ourAppointment.sales_name && ourAppointment.sales_name !== '未指定') {
          console.log('\n🎉 成功！新预约API正确处理销售信息');
          console.log('✅ 新创建的预约包含销售信息');
          console.log('✅ API正确设置了sales_id字段');
          console.log('✅ 排班详情对话框将正确显示预约人');
        } else {
          console.log('\n❌ 失败：新预约仍然缺少销售信息');
          console.log('需要进一步检查API实现');
        }
      } else {
        console.log('❌ 没有找到新创建的预约');
      }
    }

    console.log('\n🎯 结论:');
    console.log('从现在开始，所有新创建的预约都应该包含销售信息');
    console.log('历史数据显示"未指定"是正常的，可以忽略');
    console.log('用户在创建新预约时需要确保传递sales_id参数');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testNewAppointmentWithSales();