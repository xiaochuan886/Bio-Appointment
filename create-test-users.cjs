// 创建测试用户的脚本
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001/api';

// 创建用户
async function createUser(userData) {
  console.log(`\n=== 创建用户: ${userData.username} ===`);
  try {
    const response = await fetch(`${API_BASE_URL}/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`创建用户失败: ${response.status} ${response.statusText} - ${errorData.error || ''}`);
    }

    const user = await response.json();
    console.log('用户创建成功:', user.username || user.email);
    return user;
  } catch (error) {
    console.error('创建用户错误:', error.message);
    return null;
  }
}

// 主函数
async function createTestUsers() {
  console.log('开始创建测试用户...\n');

  try {
    // 首先获取门店列表
    const storesResponse = await fetch(`${API_BASE_URL}/stores`);
    if (!storesResponse.ok) {
      throw new Error('获取门店列表失败');
    }
    const storesData = await storesResponse.json();
    const stores = storesData.stores || storesData;
    
    console.log('可用门店:', stores.map(s => `${s.name} (${s.id})`));
    
    // 查找测试门店
    const testStore = stores.find(store => store.name === '测试门店');
    if (!testStore) {
      console.error('未找到测试门店，跳过创建带门店的用户');
    }
    
    const testUsers = [
      {
        username: 'admin',
        password: '123456',
        full_name: '管理员',
        email: 'admin@example.com',
        role: 'super_admin'
      },
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
        role: 'head_nurse',
        store_id: testStore ? testStore.id : null
      },
      {
        username: 'doctor',
        password: '123456',
        full_name: '医生',
        email: 'doctor@example.com',
        role: 'doctor',
        store_id: testStore ? testStore.id : null
      },
      {
        username: 'nurse',
        password: '123456',
        full_name: '护士',
        email: 'nurse@example.com',
        role: 'nurse',
        store_id: testStore ? testStore.id : null
      }
    ];

    for (const user of testUsers) {
      await createUser(user);
    }

    console.log('\n测试用户创建完成！');
    console.log('现在可以运行测试脚本: node test-store-appointment-flow.cjs');
  } catch (error) {
    console.error('创建测试用户失败:', error);
  }
}

// 运行脚本
createTestUsers().catch(console.error);