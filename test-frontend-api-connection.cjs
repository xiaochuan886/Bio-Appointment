#!/usr/bin/env node

const axios = require('axios');

async function testFrontendApiConnection() {
  console.log('🧪 测试前端到API的连接...\n');

  try {
    // 1. 测试API服务器是否可访问
    console.log('1. 测试API服务器连接...');
    const healthResponse = await axios.get('http://localhost:3001/api/health', {
      timeout: 5000
    });
    console.log('✅ API服务器连接正常');

    // 2. 测试登录端点
    console.log('2. 测试登录端点...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin',
      password: 'admin123'
    });
    
    console.log('✅ 登录端点正常');
    console.log('登录响应:', {
      hasUser: !!loginResponse.data.user,
      hasTokens: !!loginResponse.data.tokens,
      userRole: loginResponse.data.user?.role
    });

    // 3. 测试前端服务器是否可访问
    console.log('3. 测试前端服务器连接...');
    const frontendResponse = await axios.get('http://127.0.0.1:5175/', {
      timeout: 5000
    });
    console.log('✅ 前端服务器连接正常');

    console.log('\n🎉 所有连接测试通过！');

  } catch (error) {
    console.error('❌ 连接测试失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('连接被拒绝，请检查服务器是否正在运行');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('连接超时，请检查网络或服务器状态');
    }
    
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testFrontendApiConnection();