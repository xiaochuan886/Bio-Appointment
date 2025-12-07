const fetch = require('node-fetch');

// API基础URL
const API_BASE_URL = 'http://localhost:3001/api';

// 测试用的认证token（使用管理员账号）
const AUTH_TOKEN = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3MzQ1NjQ4MDAsImV4cCI6MTczNDY1MTIwMH0.signature';

// 带认证的API调用函数
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API调用失败: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

// 测试房间管理功能
async function testRoomManagement() {
  console.log('🧪 开始测试房间管理功能...\n');

  try {
    // 1. 获取现有房间列表
    console.log('1️⃣ 获取现有房间列表...');
    const rooms = await apiCall('/rooms');
    console.log(`   找到 ${rooms.length} 个房间:`);
    rooms.forEach(room => {
      console.log(`   - ID: ${room.id}, 名称: ${room.name}, 类型: ${room.room_type}, 可用: ${room.is_available}`);
    });

    if (rooms.length === 0) {
      console.log('   没有找到现有房间，创建一个测试房间...');
      
      // 2. 创建测试房间
      console.log('\n2️⃣ 创建测试房间...');
      const newRoom = await apiCall('/rooms', {
        method: 'POST',
        body: JSON.stringify({
          name: '测试房间-治疗区A',
          type: 'treatment',
          is_available: true
        })
      });
      console.log('   创建成功:', newRoom);
      rooms.push(newRoom);
    }

    // 3. 测试房间更新功能
    if (rooms.length > 0) {
      const testRoom = rooms[0];
      console.log(`\n3️⃣ 测试更新房间 (ID: ${testRoom.id})...`);
      
      const updateData = {
        name: `更新后的房间名称-${Date.now()}`,
        room_type: 'vip',
        is_available: false
      };

      console.log('   更新数据:', updateData);
      
      const updatedRoom = await apiCall(`/rooms/${testRoom.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      console.log('   更新成功:', updatedRoom);
      
      // 验证更新是否正确应用
      console.log('\n4️⃣ 验证更新结果...');
      if (updatedRoom.name === updateData.name) {
        console.log('   ✅ 房间名称更新正确');
      } else {
        console.log('   ❌ 房间名称更新失败');
      }
      
      if (updatedRoom.room_type === updateData.room_type) {
        console.log('   ✅ 房间类型更新正确');
      } else {
        console.log('   ❌ 房间类型更新失败');
      }
      
      if (updatedRoom.is_available === updateData.is_available) {
        console.log('   ✅ 房间可用状态更新正确');
      } else {
        console.log('   ❌ 房间可用状态更新失败');
      }

      // 5. 测试获取单个房间
      console.log('\n5️⃣ 测试获取更新后的房间详情...');
      try {
        // 注意：这个API端点可能不存在，我们主要是测试PUT是否工作
        const roomDetails = await apiCall(`/rooms/${testRoom.id}`);
        console.log('   房间详情:', roomDetails);
      } catch (error) {
        console.log('   ⚠️  获取单个房间的API端点可能不存在，但这不影响更新功能');
      }
    }

    console.log('\n🎉 房间管理功能测试完成！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
testRoomManagement();