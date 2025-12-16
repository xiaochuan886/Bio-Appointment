const { Pool } = require('pg');

// 模拟前端验证流程
async function debugUserStoreIssue() {
  const pool = new Pool({
    host: '127.0.0.1',
    port: 5437,
    database: 'bio_appointment',
    user: 'app_user',
    password: 'secure_password_123',
  });

  try {
    console.log('=== 调试用户门店问题 ===');
    
    // 1. 模拟获取用户信息（类似后端API）
    const userId = '2d03beb2-f261-4b95-8e78-d89bf70d9b25';
    console.log('\n1. 模拟API调用获取用户信息...');
    
    const userResult = await pool.query(
      `SELECT p.id, p.username, p.email, p.full_name, p.role, p.department, p.status,
              p.created_at, p.updated_at, p.dingtalk_userid, p.store_id,
              s.name as store_name
       FROM profiles p
       LEFT JOIN stores s ON p.store_id = s.id
       WHERE p.id = $1`, 
      [userId]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ 用户未找到');
      return;
    }

    const userProfile = userResult.rows[0];
    console.log('✅ 后端API返回的用户信息:');
    console.log('  ID:', userProfile.id);
    console.log('  用户名:', userProfile.username);
    console.log('  姓名:', userProfile.full_name);
    console.log('  角色:', userProfile.role);
    console.log('  门店ID:', userProfile.store_id);
    console.log('  门店名称:', userProfile.store_name);
    console.log('  状态:', userProfile.status);

    // 2. 模拟前端验证逻辑
    console.log('\n2. 模拟前端验证逻辑...');
    
    // 模拟 BaseUser 接口
    const baseUser = {
      id: userProfile.id,
      role: userProfile.role,
      store_id: userProfile.store_id
    };

    console.log('🔍 [DEBUG] 前端验证 - 用户对象:', {
      id: baseUser.id,
      role: baseUser.role,
      store_id: baseUser.store_id,
      hasStoreId: !!baseUser.store_id
    });

    // 模拟 validateStoreAccess 函数逻辑
    if (!baseUser) {
      console.log('❌ 验证失败: 用户未登录');
      return;
    }

    if (baseUser.role === 'super_admin') {
      console.log('✅ 验证通过: 超级管理员');
      return;
    }

    if (!baseUser.store_id) {
      console.log('❌ 验证失败: 用户未分配门店');
      console.log('🔍 [DEBUG] 用户完整信息:', JSON.stringify(baseUser, null, 2));
      return;
    }

    console.log('✅ 验证通过: 用户有门店分配');
    console.log('  门店ID:', baseUser.store_id);

    // 3. 检查时序问题
    console.log('\n3. 检查可能的时序问题...');
    
    // 模拟用户信息还未完全加载的情况
    const incompleteUser = {
      id: userProfile.id,
      role: userProfile.role,
      // store_id: undefined // 模拟未加载
    };

    console.log('🔍 [DEBUG] 模拟不完整的用户对象:', {
      id: incompleteUser.id,
      role: incompleteUser.role,
      store_id: incompleteUser.store_id,
      hasStoreId: !!incompleteUser.store_id
    });

    if (!incompleteUser.store_id) {
      console.log('❌ 这就是问题！用户信息不完整时会出现"用户未分配门店"错误');
    }

    // 4. 检查数据库连接和查询性能
    console.log('\n4. 检查数据库查询性能...');
    const startTime = Date.now();
    
    const performanceTest = await pool.query(
      `SELECT p.id, p.store_id, s.name as store_name
       FROM profiles p
       LEFT JOIN stores s ON p.store_id = s.id
       WHERE p.id = $1`, 
      [userId]
    );
    
    const endTime = Date.now();
    console.log(`⏱️ 查询耗时: ${endTime - startTime}ms`);
    console.log('🔍 [DEBUG] 性能测试结果:', performanceTest.rows[0]);

    await pool.end();
    
  } catch (error) {
    console.error('❌ 调试过程中出错:', error);
  }
}

debugUserStoreIssue();