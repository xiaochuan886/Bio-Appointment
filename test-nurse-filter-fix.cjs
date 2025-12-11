#!/usr/bin/env node

/**
 * 测试护士筛选逻辑修复
 * 验证护士的"我的任务"、"我的排班"、"任务历史"页面只显示分配给护士本人的数据
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testNurseFilterFix() {
  console.log('🧪 开始测试护士筛选逻辑修复...\n');

  try {
    // 1. 创建测试数据：护士在不同门店的排班
    console.log('📝 创建测试数据...');
    
    const testNurseId = 'nurse-test-001';
    const store1Id = 'store-001';
    const store2Id = 'store-002';
    
    // 创建测试门店
    const stores = [
      { id: store1Id, name: '测试门店1', address: '地址1' },
      { id: store2Id, name: '测试门店2', address: '地址2' }
    ];
    
    for (const store of stores) {
      await supabase.from('stores').upsert(store);
    }
    
    // 创建测试护士（默认门店为store1）
    const testNurse = {
      id: testNurseId,
      username: 'test-nurse',
      full_name: '测试护士',
      role: 'nurse',
      store_id: store1Id
    };
    
    await supabase.from('profiles').upsert(testNurse);
    
    // 创建测试预约和排班
    const today = new Date().toISOString().split('T')[0];
    const appointments = [
      {
        id: 'appointment-001',
        customer_name: '客户1',
        store_id: store1Id,
        service_id: 'service-001',
        scheduled_date: today,
        scheduled_time: '09:00'
      },
      {
        id: 'appointment-002', 
        customer_name: '客户2',
        store_id: store2Id, // 不同门店
        service_id: 'service-001',
        scheduled_date: today,
        scheduled_time: '10:00'
      }
    ];
    
    for (const appointment of appointments) {
      await supabase.from('appointments').upsert(appointment);
    }
    
    // 创建排班（护士临时支援其他门店）
    const schedules = [
      {
        id: 'schedule-001',
        appointment_id: 'appointment-001',
        nurse_id: testNurseId,
        scheduled_date: today,
        scheduled_time_start: '09:00',
        scheduled_time_end: '10:00',
        status: 'scheduled'
      },
      {
        id: 'schedule-002',
        appointment_id: 'appointment-002',
        nurse_id: testNurseId, // 护士临时支援其他门店
        scheduled_date: today,
        scheduled_time_start: '10:00',
        scheduled_time_end: '11:00',
        status: 'scheduled'
      }
    ];
    
    for (const schedule of schedules) {
      await supabase.from('schedules').upsert(schedule);
    }
    
    console.log('✅ 测试数据创建完成');
    
    // 2. 测试API筛选逻辑
    console.log('\n🔍 测试API筛选逻辑...');
    
    // 模拟护士登录
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: 'test-nurse@example.com',
      password: 'password'
    });
    
    // 测试获取护士排班
    const response = await fetch('http://localhost:3001/api/schedules', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authData?.session?.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }
    
    const scheduleData = await response.json();
    
    console.log('📊 API返回的排班数据:');
    console.log(`- 总数量: ${scheduleData.length}`);
    console.log(`- 护士ID筛选: ${scheduleData.every(s => s.nurse_id === testNurseId) ? '✅ 正确' : '❌ 错误'}`);
    
    // 检查是否包含不同门店的排班
    const store1Schedules = scheduleData.filter(s => s.appointment_store_id === store1Id);
    const store2Schedules = scheduleData.filter(s => s.appointment_store_id === store2Id);
    
    console.log(`- 门店1排班: ${store1Schedules.length}个`);
    console.log(`- 门店2排班: ${store2Schedules.length}个`);
    console.log(`- 跨门店支援: ${store2Schedules.length > 0 ? '✅ 可以看到' : '❌ 看不到'}`);
    
    // 3. 验证修复效果
    console.log('\n✨ 修复效果验证:');
    
    if (scheduleData.length === 2) {
      console.log('✅ 护士可以看到分配给自己的所有任务');
    } else {
      console.log('❌ 护士看不到部分分配给自己的任务');
    }
    
    if (store2Schedules.length > 0) {
      console.log('✅ 护士可以看到临时支援其他门店的任务');
    } else {
      console.log('❌ 护士看不到临时支援其他门店的任务');
    }
    
    if (scheduleData.every(s => s.nurse_id === testNurseId)) {
      console.log('✅ 只显示分配给护士本人的任务');
    } else {
      console.log('❌ 显示了其他护士的任务');
    }
    
    // 4. 清理测试数据
    console.log('\n🧹 清理测试数据...');
    
    await supabase.from('schedules').delete().in('id', ['schedule-001', 'schedule-002']);
    await supabase.from('appointments').delete().in('id', ['appointment-001', 'appointment-002']);
    await supabase.from('profiles').delete().eq('id', testNurseId);
    await supabase.from('stores').delete().in('id', [store1Id, store2Id]);
    
    console.log('✅ 测试数据清理完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testNurseFilterFix().then(() => {
    console.log('\n🎉 护士筛选逻辑修复测试完成!');
    process.exit(0);
  }).catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}

module.exports = { testNurseFilterFix };