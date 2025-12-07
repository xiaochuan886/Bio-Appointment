const axios = require('axios');

// 配置
const BASE_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://127.0.0.1:5174';

// 测试函数
async function testRoomStoreFrontend() {
  console.log('🚀 开始测试前端房间门店信息显示...');
  
  try {
    // 1. 登录管理员
    console.log('🔐 登录管理员账户...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@test.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.tokens.accessToken;
    console.log('✅ 管理员登录成功');
    
    // 2. 获取门店列表
    console.log('🏪 获取门店列表...');
    const storesResponse = await axios.get(`${BASE_URL}/api/stores`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const stores = storesResponse.data.stores;
    console.log(`✅ 获取到 ${stores.length} 个门店`);
    
    if (stores.length === 0) {
      console.log('❌ 没有门店数据，创建测试门店...');
      const createStoreResponse = await axios.post(`${BASE_URL}/api/stores`, {
        name: `测试门店_${Date.now()}`,
        address: '测试地址',
        phone: '123456789',
        contact_person: '测试联系人',
        status: 'active'
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      stores.push(createStoreResponse.data);
      console.log('✅ 测试门店创建成功');
    }
    
    const testStore = stores[0];
    console.log(`📍 使用测试门店: ${testStore.name} (ID: ${testStore.id})`);
    
    // 3. 创建测试房间
    console.log('🚪 创建测试房间...');
    const createRoomResponse = await axios.post(`${BASE_URL}/api/rooms`, {
      name: `测试房间_${Date.now()}`,
      type: 'room',
      is_available: true,
      store_id: testStore.id
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const testRoom = createRoomResponse.data;
    console.log(`✅ 测试房间创建成功:`);
    console.log(`   房间名称: ${testRoom.name}`);
    console.log(`   房间ID: ${testRoom.id}`);
    console.log(`   门店ID: ${testRoom.store_id}`);
    console.log(`   门店名称匹配: ${testRoom.store_id === testStore.id ? '✅' : '❌'}`);
    
    // 4. 获取房间列表验证
    console.log('🔍 获取房间列表验证...');
    const roomsResponse = await axios.get(`${BASE_URL}/api/rooms`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const rooms = roomsResponse.data;
    console.log(`✅ 获取到 ${rooms.length} 个房间`);
    
    // 查找我们创建的房间
    const foundRoom = rooms.find(r => r.id === testRoom.id);
    if (foundRoom) {
      console.log('✅ 找到创建的房间:');
      console.log(`   房间名称: ${foundRoom.name}`);
      console.log(`   房间类型: ${foundRoom.room_type}`);
      console.log(`   门店ID: ${foundRoom.store_id}`);
      console.log(`   可用状态: ${foundRoom.is_available}`);
      
      if (foundRoom.store_id === testStore.id) {
        console.log('✅ 房间门店信息正确关联');
      } else {
        console.log('❌ 房间门店信息关联错误');
      }
    } else {
      console.log('❌ 未找到创建的房间');
    }
    
    // 5. 更新房间门店信息
    console.log('🔄 更新房间门店信息...');
    const updateRoomResponse = await axios.put(`${BASE_URL}/api/rooms/${testRoom.id}`, {
      name: `更新后的房间_${Date.now()}`,
      is_available: false,
      store_id: testStore.id
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const updatedRoom = updateRoomResponse.data;
    console.log('✅ 房间更新成功:');
    console.log(`   房间名称: ${updatedRoom.name}`);
    console.log(`   门店ID: ${updatedRoom.store_id}`);
    console.log(`   可用状态: ${updatedRoom.is_available}`);
    
    // 6. 再次验证房间列表
    console.log('🔍 再次验证房间列表...');
    const updatedRoomsResponse = await axios.get(`${BASE_URL}/api/rooms`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const updatedRooms = updatedRoomsResponse.data;
    const foundUpdatedRoom = updatedRooms.find(r => r.id === testRoom.id);
    
    if (foundUpdatedRoom) {
      console.log('✅ 找到更新后的房间:');
      console.log(`   房间名称: ${foundUpdatedRoom.name}`);
      console.log(`   门店ID: ${foundUpdatedRoom.store_id}`);
      console.log(`   可用状态: ${foundUpdatedRoom.is_available}`);
      
      if (foundUpdatedRoom.store_id === testStore.id) {
        console.log('✅ 更新后房间门店信息正确关联');
      } else {
        console.log('❌ 更新后房间门店信息关联错误');
      }
    } else {
      console.log('❌ 未找到更新后的房间');
    }
    
    // 7. 清理测试数据
    console.log('🧹 清理测试数据...');
    await axios.delete(`${BASE_URL}/api/rooms/${testRoom.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ 测试房间已删除');
    
    console.log('\n🎉 前端房间门店信息测试完成！');
    console.log(`📱 请访问 ${FRONTEND_URL}/admin/system-config 查看房间管理页面`);
    console.log('📋 测试步骤:');
    console.log('   1. 登录管理员账户 (admin@test.com / admin123)');
    console.log('   2. 进入系统配置 > 房间管理');
    console.log('   3. 检查房间列表是否显示门店信息');
    console.log('   4. 编辑房间，检查门店选择是否正确');
    console.log('   5. 保存房间，检查门店信息是否更新');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

// 执行测试
testRoomStoreFrontend();