const fetch = require('node-fetch');

async function testRoomCreationWithStore() {
  console.log('🧪 开始测试房间创建功能（带门店ID）...');
  
  try {
    // 首先获取可用的门店
    console.log('\n📋 获取可用门店...');
    const storesResponse = await fetch('http://localhost:3001/api/stores', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock.admin-token'
      }
    });
    
    if (!storesResponse.ok) {
      throw new Error('获取门店失败');
    }
    
    const stores = await storesResponse.json();
    console.log('可用门店:', stores.stores || stores);
    
    // 使用第一个门店ID
    const storeId = stores.stores ? stores.stores[0].id : '33e624b3-854d-4889-bcc0-12e7e908b0d5';
    console.log(`使用门店ID: ${storeId}`);
    
    // 测试不同类型的房间创建
    const roomTypes = ['vip', 'treatment', 'consultation'];
    const createdRooms = [];
    
    for (const roomType of roomTypes) {
      console.log(`\n🧪 测试房间类型: ${roomType}`);
      
      const testData = {
        name: `测试房间${roomType.toUpperCase()}-${Date.now()}`,
        type: roomType,
        is_available: true,
        store_id: storeId // 使用有效的门店ID
      };
      
      try {
        const response = await fetch('http://localhost:3001/api/rooms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock.admin-token'
          },
          body: JSON.stringify(testData)
        });
        
        const responseData = await response.json();
        
        console.log(`📥 响应状态: ${response.status}`);
        
        if (response.ok) {
          console.log(`✅ ${roomType} 房间创建成功！`);
          console.log(`   房间ID: ${responseData.id}`);
          console.log(`   房间名称: ${responseData.name}`);
          console.log(`   房间类型: ${responseData.room_type}`);
          console.log(`   门店ID: ${responseData.store_id}`);
          createdRooms.push(responseData);
        } else {
          console.log(`❌ ${roomType} 房间创建失败:`);
          console.log(`   错误: ${responseData.error}`);
          console.log(`   消息: ${responseData.message}`);
        }
      } catch (error) {
        console.error(`❌ ${roomType} 测试过程中发生错误:`, error.message);
      }
    }
    
    // 验证房间是否真的保存到数据库
    console.log('\n🔍 验证房间是否保存到数据库...');
    
    const verifyResponse = await fetch('http://localhost:3001/api/rooms', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock.admin-token'
      }
    });
    
    if (verifyResponse.ok) {
      const allRooms = await verifyResponse.json();
      console.log(`📊 数据库中总共有 ${allRooms.length} 个房间:`);
      allRooms.forEach((room, index) => {
        console.log(`  ${index + 1}. ${room.name} (${room.room_type}) - 门店: ${room.store_id || '无'}`);
      });
      
      // 检查新创建的房间是否在列表中
      const foundRooms = createdRooms.filter(createdRoom => 
        allRooms.some(dbRoom => dbRoom.id === createdRoom.id)
      );
      
      console.log(`\n✅ 成功创建并保存了 ${foundRooms.length} 个房间`);
      
      if (foundRooms.length < createdRooms.length) {
        console.log('❌ 有些房间创建成功但没有保存到数据库！');
      }
    } else {
      console.log('❌ 无法获取房间列表进行验证');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testRoomCreationWithStore();