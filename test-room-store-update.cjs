#!/usr/bin/env node

/**
 * 测试房间门店信息更新功能
 * 验证房间保存后门店信息是否正确显示
 */

const http = require('http');
const { performance } = require('perf_hooks');

// API服务器配置
const API_BASE = 'http://localhost:3001';
const API_PREFIX = '/api';

// 测试数据
let testStoreId = null;
let testRoomId = null;
let adminToken = null;

// HTTP请求辅助函数
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// 登录获取管理员token
async function loginAsAdmin() {
  console.log('🔐 登录管理员账户...');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'admin@test.com',
      password: 'admin123'
    })
  };
  
  try {
    const response = await makeRequest(options);
    
    if (response.statusCode !== 200) {
      throw new Error(`登录失败: ${response.statusCode} ${JSON.stringify(response.data)}`);
    }
    
    adminToken = response.data.tokens.accessToken;
    console.log('✅ 管理员登录成功');
    return true;
  } catch (error) {
    console.error('❌ 管理员登录失败:', error.message);
    return false;
  }
}

// 创建测试门店
async function createTestStore() {
  console.log('🏪 创建测试门店...');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/stores',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: `测试门店_${Date.now()}`,
      address: '测试地址',
      phone: '12345678901',
      contact_person: '测试联系人',
      status: 'active',
      description: '用于测试房间门店关联的门店'
    })
  };
  
  try {
    const response = await makeRequest(options);
    
    if (response.statusCode !== 201) {
      throw new Error(`创建门店失败: ${response.statusCode} ${JSON.stringify(response.data)}`);
    }
    
    testStoreId = response.data.id;
    console.log(`✅ 测试门店创建成功，ID: ${testStoreId}`);
    return true;
  } catch (error) {
    console.error('❌ 创建测试门店失败:', error.message);
    return false;
  }
}

// 创建测试房间
async function createTestRoom() {
  console.log('🚪 创建测试房间...');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/rooms',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: `测试房间_${Date.now()}`,
      type: 'room',
      is_available: true,
      store_id: testStoreId
    })
  };
  
  try {
    const response = await makeRequest(options);
    
    if (response.statusCode !== 201) {
      throw new Error(`创建房间失败: ${response.statusCode} ${JSON.stringify(response.data)}`);
    }
    
    testRoomId = response.data.id;
    console.log(`✅ 测试房间创建成功，ID: ${testRoomId}`);
    console.log(`   房间名称: ${response.data.name}`);
    console.log(`   门店ID: ${response.data.store_id}`);
    return true;
  } catch (error) {
    console.error('❌ 创建测试房间失败:', error.message);
    return false;
  }
}

// 获取房间详情
async function getRoomDetails(roomId) {
  console.log(`🔍 获取房间详情 (ID: ${roomId})...`);
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/rooms',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  };
  
  try {
    const response = await makeRequest(options);
    
    if (response.statusCode !== 200) {
      throw new Error(`获取房间列表失败: ${response.statusCode} ${JSON.stringify(response.data)}`);
    }
    
    // 从房间列表中查找指定的房间
    const room = response.data.find(r => r.id === roomId);
    
    if (!room) {
      throw new Error(`未找到ID为 ${roomId} 的房间`);
    }
    
    console.log(`✅ 房间详情获取成功:`);
    console.log(`   房间名称: ${room.name}`);
    console.log(`   房间类型: ${room.type}`);
    console.log(`   门店ID: ${room.store_id}`);
    console.log(`   可用状态: ${room.is_available}`);
    
    return room;
  } catch (error) {
    console.error('❌ 获取房间详情失败:', error.message);
    return null;
  }
}

// 更新房间门店信息
async function updateRoomStore(roomId, newStoreId) {
  console.log(`🔄 更新房间门店信息 (房间ID: ${roomId}, 新门店ID: ${newStoreId})...`);
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: `/api/rooms/${roomId}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: `更新后的房间_${Date.now()}`,
      is_available: false,
      store_id: newStoreId
    })
  };
  
  try {
    const response = await makeRequest(options);
    
    if (response.statusCode !== 200) {
      throw new Error(`更新房间失败: ${response.statusCode} ${JSON.stringify(response.data)}`);
    }
    
    console.log(`✅ 房间更新成功:`);
    console.log(`   房间名称: ${response.data.name}`);
    console.log(`   门店ID: ${response.data.store_id}`);
    console.log(`   可用状态: ${response.data.is_available}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ 更新房间失败:', error.message);
    return null;
  }
}

// 创建第二个测试门店
async function createSecondTestStore() {
  console.log('🏪 创建第二个测试门店...');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/stores',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: `第二测试门店_${Date.now()}`,
      address: '第二测试地址',
      phone: '12345678902',
      contact_person: '第二测试联系人',
      status: 'active',
      description: '用于测试房间门店关联更新的第二个门店'
    })
  };
  
  try {
    const response = await makeRequest(options);
    
    if (response.statusCode !== 201) {
      throw new Error(`创建第二门店失败: ${response.statusCode} ${JSON.stringify(response.data)}`);
    }
    
    const secondStoreId = response.data.id;
    console.log(`✅ 第二测试门店创建成功，ID: ${secondStoreId}`);
    return secondStoreId;
  } catch (error) {
    console.error('❌ 创建第二测试门店失败:', error.message);
    return null;
  }
}

// 清理测试数据
async function cleanup() {
  console.log('🧹 清理测试数据...');
  
  // 删除测试房间
  if (testRoomId) {
    try {
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: `/api/rooms/${testRoomId}`,
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      };
      
      const response = await makeRequest(options);
      if (response.statusCode === 200) {
        console.log('✅ 测试房间已删除');
      }
    } catch (error) {
      console.error('❌ 删除测试房间失败:', error.message);
    }
  }
  
  // 删除测试门店
  if (testStoreId) {
    try {
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: `/api/stores/${testStoreId}`,
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      };
      
      const response = await makeRequest(options);
      if (response.statusCode === 200) {
        console.log('✅ 测试门店已删除');
      }
    } catch (error) {
      console.error('❌ 删除测试门店失败:', error.message);
    }
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始房间门店信息更新测试...\n');
  
  try {
    // 1. 登录管理员
    const loginSuccess = await loginAsAdmin();
    if (!loginSuccess) {
      throw new Error('管理员登录失败，测试终止');
    }
    
    // 2. 创建测试门店
    const storeSuccess = await createTestStore();
    if (!storeSuccess) {
      throw new Error('创建测试门店失败，测试终止');
    }
    
    // 3. 创建测试房间
    const roomSuccess = await createTestRoom();
    if (!roomSuccess) {
      throw new Error('创建测试房间失败，测试终止');
    }
    
    // 4. 获取房间详情，验证门店信息
    console.log('\n--- 验证初始房间门店信息 ---');
    const initialRoom = await getRoomDetails(testRoomId);
    if (!initialRoom) {
      throw new Error('获取初始房间信息失败');
    }
    
    if (initialRoom.store_id !== testStoreId) {
      throw new Error(`房间门店ID不匹配! 期望: ${testStoreId}, 实际: ${initialRoom.store_id}`);
    }
    
    console.log('✅ 初始房间门店信息验证通过');
    
    // 5. 创建第二个测试门店
    const secondStoreId = await createSecondTestStore();
    if (!secondStoreId) {
      throw new Error('创建第二测试门店失败，测试终止');
    }
    
    // 6. 更新房间门店信息
    console.log('\n--- 测试房间门店信息更新 ---');
    const updatedRoom = await updateRoomStore(testRoomId, secondStoreId);
    if (!updatedRoom) {
      throw new Error('更新房间门店信息失败');
    }
    
    // 7. 再次获取房间详情，验证更新后的门店信息
    console.log('\n--- 验证更新后的房间门店信息 ---');
    const finalRoom = await getRoomDetails(testRoomId);
    if (!finalRoom) {
      throw new Error('获取更新后房间信息失败');
    }
    
    if (finalRoom.store_id !== secondStoreId) {
      throw new Error(`更新后房间门店ID不匹配! 期望: ${secondStoreId}, 实际: ${finalRoom.store_id}`);
    }
    
    console.log('✅ 更新后房间门店信息验证通过');
    
    // 8. 测试完成
    console.log('\n🎉 所有测试通过！房间门店信息更新功能正常工作。');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  } finally {
    // 清理测试数据
    await cleanup();
  }
}

// 运行测试
runTests().catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});