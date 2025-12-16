const fetch = require('node-fetch');

async function testRoomCreation() {
  console.log('🧪 开始测试房间创建功能...');
  
  try {
    // 测试数据
    const roomData = {
      name: '测试房间VIP-1',
      type: 'vip', // 使用 type 字段
      is_available: true,
      store_id: null // 使用 null 而不是字符串
    };

    // 测试其他房间类型
    const roomTypes = ['vip', 'treatment', 'consultation'];
    
    for (const roomType of roomTypes) {
      console.log(`\n🧪 测试房间类型: ${roomType}`);
      
      const testData = {
        name: `测试房间${roomType.toUpperCase()}-1`,
        type: roomType,
        is_available: true,
        store_id: null
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
        } else {
          console.log(`❌ ${roomType} 房间创建失败:`);
          console.log(`   错误: ${responseData.error}`);
          console.log(`   消息: ${responseData.message}`);
        }
      } catch (error) {
        console.error(`❌ ${roomType} 测试过程中发生错误:`, error.message);
      }
    }

    console.log('📤 发送房间创建请求:', roomData);

    const response = await fetch('http://localhost:3001/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock.admin-token'
      },
      body: JSON.stringify(roomData)
    });

    const responseData = await response.json();
    
    console.log('📥 响应状态:', response.status);
    console.log('📥 响应数据:', responseData);

    if (response.ok) {
      console.log('✅ 房间创建成功！');
      console.log('   房间ID:', responseData.id);
      console.log('   房间名称:', responseData.name);
      console.log('   房间类型:', responseData.room_type);
    } else {
      console.log('❌ 房间创建失败:');
      console.log('   错误:', responseData.error);
      console.log('   消息:', responseData.message);
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testRoomCreation();