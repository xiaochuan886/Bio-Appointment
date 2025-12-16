const { Pool } = require('pg');

// 数据库连接
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function debugScheduleNotFound() {
  console.log('🔍 调试"Schedule not found"错误...');
  
  try {
    // 步骤1: 检查排班表中的数据
    console.log('\n📋 步骤1: 检查排班表中的数据...');
    const scheduleResult = await pool.query('SELECT COUNT(*) as total FROM schedules');
    console.log(`📊 排班总数: ${scheduleResult.rows[0].total}`);
    
    if (scheduleResult.rows[0].total > 0) {
      const sampleSchedules = await pool.query('SELECT id, appointment_id, scheduled_date, status FROM schedules LIMIT 5');
      console.log('📊 样本排班数据:');
      sampleSchedules.rows.forEach((schedule, index) => {
        console.log(`   ${index + 1}. ID: ${schedule.id}, 预约ID: ${schedule.appointment_id}, 日期: ${schedule.scheduled_date}, 状态: ${schedule.status}`);
      });
    }
    
    // 步骤2: 检查更新排班的API端点
    console.log('\n🔧 步骤2: 检查更新排班的API端点...');
    
    // 获取一个真实的排班ID进行测试
    const existingScheduleResult = await pool.query('SELECT id FROM schedules LIMIT 1');
    
    if (existingScheduleResult.rows.length > 0) {
      const scheduleId = existingScheduleResult.rows[0].id;
      console.log(`📊 使用排班ID进行测试: ${scheduleId}`);
      
      // 模拟更新请求
      const mockToken = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3MzY4OTI4MDAsImV4cCI6MTczNjk3OTIwMH0.signature';
      
      const updateResponse = await fetch(`http://localhost:3001/api/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`
        },
        body: JSON.stringify({
          scheduled_time_start: '09:00:00',
          scheduled_time_end: '10:30:00',
          notes: '测试更新排班'
        })
      });
      
      const updateResult = await updateResponse.json();
      console.log(`📥 更新响应状态: ${updateResponse.status}`);
      console.log(`📥 更新响应数据:`, updateResult);
      
      if (updateResponse.status === 404 && updateResult.error === 'Schedule not found') {
        console.log('❌ 确认存在"Schedule not found"错误');
        
        // 步骤3: 检查API代码中的查询逻辑
        console.log('\n🔍 步骤3: 检查API代码中的查询逻辑...');
        
        // 检查排班是否真的存在
        const checkResult = await pool.query('SELECT * FROM schedules WHERE id = $1', [scheduleId]);
        
        if (checkResult.rows.length > 0) {
          console.log('✅ 排班在数据库中存在');
          console.log('📊 排班详情:', checkResult.rows[0]);
          
          // 检查UUID格式
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(scheduleId)) {
            console.log('✅ 排班ID格式正确');
          } else {
            console.log('❌ 排班ID格式可能有问题');
          }
          
          // 检查权限验证逻辑
          console.log('\n🔐 检查权限验证逻辑...');
          
          // 获取用户信息
          const userResult = await pool.query(
            'SELECT id, role, store_id FROM profiles WHERE id = $1',
            ['admin-id']
          );
          
          if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            console.log(`📊 用户信息: ID=${user.id}, 角色=${user.role}, 门店=${user.store_id}`);
            
            // 检查排班的门店信息
            const scheduleWithStoreResult = await pool.query(
              `SELECT s.*, a.store_id as appointment_store_id
               FROM schedules s
               LEFT JOIN appointments a ON s.appointment_id = a.id
               WHERE s.id = $1`,
              [scheduleId]
            );
            
            if (scheduleWithStoreResult.rows.length > 0) {
              const scheduleWithStore = scheduleWithStoreResult.rows[0];
              console.log(`📊 排班门店信息: ${scheduleWithStore.appointment_store_id}`);
              console.log(`📊 用户门店信息: ${user.store_id}`);
              
              if (user.role === 'super_admin') {
                console.log('✅ 管理员应该有权限访问所有排班');
              } else if (user.store_id === scheduleWithStore.appointment_store_id) {
                console.log('✅ 用户与排班属于同一门店，应该有权限');
              } else {
                console.log('❌ 用户与排班不属于同一门店，可能被权限检查拒绝');
              }
            }
          }
        } else {
          console.log('❌ 排班在数据库中不存在');
        }
      } else {
        console.log('✅ 排班更新成功，没有"Schedule not found"错误');
      }
    } else {
      console.log('⚠️ 没有找到排班数据进行测试');
    }
    
  } catch (error) {
    console.error('❌ 调试失败:', error.message);
  } finally {
    await pool.end();
  }
}

// 运行调试
debugScheduleNotFound().then(() => {
  console.log('\n🎯 调试完成！');
}).catch(error => {
  console.error('💥 调试过程中发生错误:', error);
});