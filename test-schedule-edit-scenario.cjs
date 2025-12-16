const { Pool } = require('pg');

// 数据库连接
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function testScheduleEditScenario() {
  console.log('🎭 测试排班编辑场景...');
  
  try {
    // 步骤1: 获取一个真实的排班和相关信息
    console.log('\n📋 步骤1: 获取真实的排班数据...');
    
    const scheduleResult = await pool.query(`
      SELECT s.*, a.store_id as appointment_store_id, a.customer_name
       FROM schedules s
       LEFT JOIN appointments a ON s.appointment_id = a.id
       WHERE s.status != 'cancelled'
       ORDER BY s.created_at DESC
       LIMIT 1
    `);
    
    if (scheduleResult.rows.length === 0) {
      console.log('❌ 没有找到排班数据');
      return;
    }
    
    const schedule = scheduleResult.rows[0];
    console.log(`📊 找到排班: ID=${schedule.id}, 客户=${schedule.customer_name}, 门店=${schedule.appointment_store_id}`);
    
    // 步骤2: 获取不同角色的用户token进行测试
    console.log('\n👥 步骤2: 测试不同角色的用户...');
    
    // 获取管理员用户
    const adminResult = await pool.query(
      "SELECT id, role, store_id FROM profiles WHERE role = 'super_admin' LIMIT 1"
    );
    
    // 获取护士长用户
    const headNurseResult = await pool.query(
      "SELECT id, role, store_id FROM profiles WHERE role = 'head_nurse' LIMIT 1"
    );
    
    // 获取护士用户
    const nurseResult = await pool.query(
      "SELECT id, role, store_id FROM profiles WHERE role = 'nurse' LIMIT 1"
    );
    
    const users = {
      admin: adminResult.rows[0],
      headNurse: headNurseResult.rows[0],
      nurse: nurseResult.rows[0]
    };
    
    console.log('📊 测试用户:');
    console.log(`   管理员: ${users.admin?.id} (${users.admin?.store_id})`);
    console.log(`   护士长: ${users.headNurse?.id} (${users.headNurse?.store_id})`);
    console.log(`   护士: ${users.nurse?.id} (${users.nurse?.store_id})`);
    
    // 步骤3: 测试不同用户编辑排班
    console.log('\n🧪 步骤3: 测试编辑排班...');
    
    for (const [userType, user] of Object.entries(users)) {
      if (!user) {
        console.log(`⚠️ 跳过${userType}测试 - 用户不存在`);
        continue;
      }
      
      console.log(`\n🔍 测试${userType}用户编辑排班...`);
      
      // 生成mock token
      const mockToken = `mock.${Buffer.from(JSON.stringify({
        userId: user.id,
        email: `${userType}@test.com`,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60
      })).toString('base64')}.signature`;
      
      // 测试更新请求
      const updateData = {
        scheduled_time_start: '09:00:00',
        scheduled_time_end: '11:00:00',
        notes: `${userType}用户编辑测试`
      };
      
      try {
        const updateResponse = await fetch(`http://localhost:3001/api/schedules/${schedule.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`
          },
          body: JSON.stringify(updateData)
        });
        
        const updateResult = await updateResponse.json();
        
        console.log(`📥 ${userType}响应状态: ${updateResponse.status}`);
        console.log(`📥 ${userType}响应:`, updateResult.error || updateResult.message || '成功');
        
        if (updateResponse.status === 404 && updateResult.error === 'Schedule not found') {
          console.log(`❌ ${userType}用户遇到"Schedule not found"错误`);
          
          // 详细分析
          console.log('\n🔍 详细分析:');
          
          // 检查排班是否真的存在
          const checkResult = await pool.query('SELECT * FROM schedules WHERE id = $1', [schedule.id]);
          
          if (checkResult.rows.length > 0) {
            console.log('✅ 排班在数据库中确实存在');
            console.log('📊 排班详情:', checkResult.rows[0]);
            
            // 检查UUID格式
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(schedule.id)) {
              console.log('✅ 排班ID格式正确');
            } else {
              console.log('❌ 排班ID格式可能有问题');
              console.log(`📊 排班ID: ${schedule.id}`);
            }
            
            // 检查权限验证逻辑
            console.log(`📊 用户门店: ${user.store_id}`);
            console.log(`📊 排班门店: ${schedule.appointment_store_id}`);
            
            if (user.role === 'super_admin') {
              console.log('✅ 管理员应该有权限访问所有排班');
            } else if (user.store_id === schedule.appointment_store_id) {
              console.log('✅ 用户与排班属于同一门店，应该有权限');
            } else {
              console.log('❌ 用户与排班不属于同一门店，可能被权限检查拒绝');
            }
          } else {
            console.log('❌ 排班在数据库中不存在');
          }
        } else if (updateResponse.status === 200) {
          console.log(`✅ ${userType}用户编辑成功`);
        } else if (updateResponse.status === 403) {
          console.log(`⚠️ ${userType}用户权限不足（这是正常的）`);
        } else {
          console.log(`⚠️ ${userType}用户遇到其他错误: ${updateResponse.status}`);
        }
        
      } catch (fetchError) {
        console.error(`❌ ${userType}用户请求失败:`, fetchError.message);
      }
    }
    
    console.log('\n🎯 排班编辑场景测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    await pool.end();
  }
}

// 运行测试
testScheduleEditScenario().then(() => {
  console.log('\n🎉 所有测试完成！');
}).catch(error => {
  console.error('💥 测试过程中发生错误:', error);
});