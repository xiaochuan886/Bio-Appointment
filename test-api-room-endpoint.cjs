const http = require('http');

// 测试API端点
async function testAPIRoomEndpoint() {
  console.log('🔍 开始测试API房间端点...\n');

  try {
    // 测试1: 获取房间列表
    console.log('📋 测试1: 获取房间列表');
    const getRoomsResponse = await makeRequest('GET', '/api/rooms');
    console.log(`📊 状态码: ${getRoomsResponse.statusCode}`);
    console.log(`📊 房间数量: ${getRoomsResponse.data.length}`);
    
    if (getRoomsResponse.data.length > 0) {
      console.log('📊 房间样本:');
      getRoomsResponse.data.slice(0, 3).forEach((room, index) => {
        console.log(`  ${index + 1}. ${room.name} (${room.room_type}) - ${room.is_available ? '可用' : '不可用'}`);
      });
    }

    // 测试2: 创建新房间
    console.log('\n📋 测试2: 创建新房间');
    const newRoom = {
      name: `API测试VIP房间-${Date.now()}`,
      room_type: 'vip',
      is_available: true,
      store_id: '4ceaa988-7946-45c7-befa-d3e9ea409969'
    };

    const createRoomResponse = await makeRequest('POST', '/api/rooms', newRoom);
    console.log(`📊 创建状态码: ${createRoomResponse.statusCode}`);
    if (createRoomResponse.statusCode === 400) {
      console.log(`❌ 创建失败: ${JSON.stringify(createRoomResponse.data)}`);
    } else {
      console.log(`📊 创建的房间: ${createRoomResponse.data.name} (${createRoomResponse.data.room_type})`);
    }

    // 测试3: 再次获取房间列表，验证新创建的房间
    console.log('\n📋 测试3: 验证新创建的房间');
    const getRoomsAfterResponse = await makeRequest('GET', '/api/rooms');
    console.log(`📊 更新后房间数量: ${getRoomsAfterResponse.data.length}`);
    
    const newRoomInList = getRoomsAfterResponse.data.find(room => room.id === createRoomResponse.data.id);
    if (newRoomInList) {
      console.log(`✅ 新房间在列表中找到: ${newRoomInList.name} (${newRoomInList.room_type})`);
    } else {
      console.log('❌ 新房间未在列表中找到');
    }

    console.log('\n✅ API房间端点测试完成！');

  } catch (error) {
    console.error('❌ API测试失败:', error);
  }
}

// 辅助函数：发送HTTP请求
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve({ statusCode: res.statusCode, data: data });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 运行测试
testAPIRoomEndpoint();