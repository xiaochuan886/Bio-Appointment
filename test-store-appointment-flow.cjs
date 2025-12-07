// 测试门店预约流程的脚本
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001/api';

// 测试用户登录
async function login(username, password) {
  console.log(`\n=== 登录测试用户: ${username} ===`);
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: username,
        password: password,
      }),
    });

    if (!response.ok) {
      throw new Error(`登录失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('登录成功:', data.user?.full_name || data.user?.username);
    console.log('返回的token类型:', typeof data.accessToken);
    console.log('token长度:', data.accessToken ? data.accessToken.length : 'null');
    return data.accessToken || data.tokens?.accessToken;
  } catch (error) {
    console.error('登录错误:', error.message);
    return null;
  }
}

// 测试获取门店列表
async function getStores(token) {
  console.log('\n=== 获取门店列表 ===');
  try {
    const response = await fetch(`${API_BASE_URL}/stores`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`获取门店列表失败: ${response.status} ${response.statusText}`);
    }

    const stores = await response.json();
    console.log('门店列表:');
    
    // 检查返回的数据结构
    console.log('返回的数据类型:', typeof stores);
    console.log('是否为数组:', Array.isArray(stores));
    console.log('返回的数据:', stores);
    
    if (stores && stores.stores && Array.isArray(stores.stores)) {
      stores.stores.forEach(store => {
        console.log(`- ${store.name} (${store.id}) - 状态: ${store.status}`);
      });
      return stores.stores;
    } else if (Array.isArray(stores)) {
      stores.forEach(store => {
        console.log(`- ${store.name} (${store.id}) - 状态: ${store.status}`);
      });
      return stores;
    } else {
      console.log('没有找到门店数据');
      return [];
    }
  } catch (error) {
    console.error('获取门店列表错误:', error.message);
    return [];
  }
}

// 测试创建预约
async function createAppointment(token, appointmentData) {
  console.log('\n=== 创建预约 ===');
  console.log('预约数据:', JSON.stringify(appointmentData, null, 2));
  
  try {
    const response = await fetch(`${API_BASE_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`创建预约失败: ${response.status} ${response.statusText} - ${errorData.error || ''}`);
    }

    const appointment = await response.json();
    console.log('预约创建成功:', appointment.id);
    console.log('预约门店:', appointment.store?.name || '未设置');
    return appointment;
  } catch (error) {
    console.error('创建预约错误:', error.message);
    return null;
  }
}

// 测试获取预约列表
async function getAppointments(token, storeId) {
  console.log('\n=== 获取预约列表 ===');
  try {
    const url = storeId 
      ? `${API_BASE_URL}/appointments?store_id=${storeId}`
      : `${API_BASE_URL}/appointments`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`获取预约列表失败: ${response.status} ${response.statusText}`);
    }

    const appointments = await response.json();
    console.log(`预约列表 (${storeId ? '门店: ' + storeId : '所有门店'}):`);
    appointments.forEach(appointment => {
      console.log(`- ${appointment.id} - ${appointment.customer_name} - 门店: ${appointment.store?.name || '未设置'}`);
    });
    return appointments;
  } catch (error) {
    console.error('获取预约列表错误:', error.message);
    return [];
  }
}

// 测试获取门店资源
async function getStoreResources(token, storeId) {
  console.log('\n=== 获取门店资源 ===');
  try {
    const response = await fetch(`${API_BASE_URL}/stores/${storeId}/resources`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`获取门店资源失败: ${response.status} ${response.statusText}`);
    }

    const resources = await response.json();
    console.log(`门店资源 (${storeId}):`);
    resources.forEach(resource => {
      console.log(`- ${resource.name} (${resource.type}) - 状态: ${resource.status}`);
    });
    return resources;
  } catch (error) {
    console.error('获取门店资源错误:', error.message);
    return [];
  }
}

// 测试获取门店员工
async function getStoreStaff(token, storeId) {
  console.log('\n=== 获取门店员工 ===');
  try {
    const response = await fetch(`${API_BASE_URL}/stores/${storeId}/staff`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`获取门店员工失败: ${response.status} ${response.statusText}`);
    }

    const staff = await response.json();
    console.log(`门店员工 (${storeId}):`);
    staff.forEach(member => {
      console.log(`- ${member.full_name} (${member.role}) - 状态: ${member.status}`);
    });
    return staff;
  } catch (error) {
    console.error('获取门店员工错误:', error.message);
    return [];
  }
}

// 创建测试用户的辅助函数
async function createTestUsers(adminToken) {
  console.log('\n=== 创建测试用户 ===');
  
  const testUsers = [
    {
      username: 'sales',
      password: '123456',
      full_name: '销售',
      email: 'sales@example.com',
      role: 'sales'
    },
    {
      username: 'nurse_manager',
      password: '123456',
      full_name: '护士长',
      email: 'nurse_manager@example.com',
      role: 'head_nurse'
    },
    {
      username: 'doctor',
      password: '123456',
      full_name: '医生',
      email: 'doctor@example.com',
      role: 'doctor'
    },
    {
      username: 'nurse',
      password: '123456',
      full_name: '护士',
      email: 'nurse@example.com',
      role: 'nurse'
    }
  ];

  for (const user of testUsers) {
    try {
      const response = await fetch(`${API_BASE_URL}/profiles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      });

      if (response.ok) {
        console.log(`✅ 用户 ${user.username} 创建成功`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log(`❌ 用户 ${user.username} 创建失败:`, errorData.error || '未知错误');
      }
    } catch (error) {
      console.log(`❌ 用户 ${user.username} 创建异常:`, error.message);
    }
  }
}

// 主测试函数
async function runTests() {
  console.log('开始门店预约流程测试...\n');

  // 1. 管理员登录
  const adminToken = await login('admin@test.com', 'admin123');
  if (!adminToken) {
    console.log('管理员登录失败，终止测试');
    return;
  }
  
  console.log('✅ 管理员登录成功，token:', adminToken.substring(0, 20) + '...');

  // 2. 创建测试用户
  await createTestUsers(adminToken);

  // 3. 销售用户登录
  const salesToken = await login('sales', '123456');
  if (!salesToken) {
    console.log('销售用户登录失败，终止测试');
    return;
  }

  // 2. 获取门店列表
  const stores = await getStores(salesToken);
  if (stores.length === 0) {
    console.log('没有可用门店，终止测试');
    return;
  }

  const testStore = stores[0];
  console.log(`\n选择测试门店: ${testStore.name} (${testStore.id})`);

  // 3. 获取门店资源
  const resources = await getStoreResources(salesToken, testStore.id);

  // 4. 获取门店员工
  const staff = await getStoreStaff(salesToken, testStore.id);

  // 5. 创建预约（带门店ID）
  const appointmentData = {
    customer_name: '测试客户',
    customer_phone: '13800138000',
    service_id: '550e8400-e29b-41d4-a716-446655440005', // 使用健康检查服务ID
    requested_date: '2025-12-07',
    requested_time_start: '10:00:00',
    requested_time_end: '11:00:00',
    total_people: 1,
    estimated_duration: 60,
    is_urgent: false,
    notes: '门店预约流程测试',
    store_id: testStore.id
  };

  const appointment = await createAppointment(salesToken, appointmentData);
  if (!appointment) {
    console.log('预约创建失败，终止测试');
    return;
  }

  // 6. 获取预约列表（按门店过滤）
  await getAppointments(salesToken, testStore.id);

  // 7. 测试护士长权限
  console.log('\n\n=== 测试护士长权限 ===');
  const nurseToken = await login('nurse_manager', '123456');
  if (nurseToken) {
    // 护士长应该只能看到自己门店的预约
    await getAppointments(nurseToken);
  }

  // 8. 测试医生权限
  console.log('\n\n=== 测试医生权限 ===');
  const doctorToken = await login('doctor', '123456');
  if (doctorToken) {
    // 医生应该只能看到自己相关的预约
    await getAppointments(doctorToken);
  }

  console.log('\n\n测试完成！');
}

// 运行测试
runTests().catch(console.error);