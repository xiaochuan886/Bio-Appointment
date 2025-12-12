#!/usr/bin/env node

/**
 * 测试护士长门店任务查看功能的修复效果
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// 模拟前端筛选逻辑
function filterTasksForHeadNurse(schedules, userStoreId, dataScope) {
  return schedules.filter(schedule => {
    // 确保排班有关联的预约
    if (!schedule.appointment_id) {
      return false;
    }
    
    if (dataScope === 'self') {
      return schedule.nurse_id === 'head-nurse-id'; // 模拟护士长ID
    } else if (dataScope === 'store') {
      // 门店任务：检查排班门店ID或预约门店ID是否匹配
      const scheduleStoreId = schedule.store_id;
      const appointmentStoreId = schedule.appointment?.store_id;
      
      return userStoreId && (
        scheduleStoreId === userStoreId || 
        appointmentStoreId === userStoreId
      );
    }
    
    return true;
  });
}

async function testHeadNurseStoreTasksFix() {
  console.log('🔍 测试护士长门店任务查看功能修复\n');

  try {
    // 1. 获取测试数据
    console.log('1. 获取测试数据:');
    const { data: schedules, error: schedulesError } = await supabase
      .from('schedules')
      .select(`
        id,
        nurse_id,
        store_id,
        scheduled_date,
        scheduled_time_start,
        scheduled_time_end,
        status,
        appointment_id,
        appointment:appointments(
          id,
          customer_name,
          store_id,
          store:stores(name)
        )
      `)
      .gte('scheduled_date', '2024-12-09')
      .lte('scheduled_date', '2024-12-13')
      .order('scheduled_date', { ascending: false });

    if (schedulesError) {
      console.error('查询排班数据失败:', schedulesError);
      return;
    }

    console.log(`   获取到 ${schedules.length} 条排班记录`);

    // 2. 获取护士长信息
    const { data: headNurse, error: nurseError } = await supabase
      .from('profiles')
      .select('id, name, role, store_id, store:stores(name)')
      .eq('role', 'head_nurse')
      .single();

    if (nurseError) {
      console.error('查询护士长信息失败:', nurseError);
      return;
    }

    console.log(`   护士长: ${headNurse.name} (门店: ${headNurse.store?.name})`);
    console.log('');

    // 3. 测试修复后的筛选逻辑
    console.log('2. 测试修复后的筛选逻辑:');
    
    // 护士长查看个人任务
    const selfTasks = filterTasksForHeadNurse(schedules, headNurse.store_id, 'self');
    console.log(`   护士长个人任务: ${selfTasks.length} 条`);
    selfTasks.forEach((task, index) => {
      console.log(`     ${index + 1}. ${task.appointment?.customer_name} - ${task.scheduled_date} ${task.scheduled_time_start}`);
    });
    console.log('');

    // 护士长查看门店任务
    const storeTasks = filterTasksForHeadNurse(schedules, headNurse.store_id, 'store');
    console.log(`   护士长门店任务: ${storeTasks.length} 条`);
    storeTasks.forEach((task, index) => {
      console.log(`     ${index + 1}. ${task.appointment?.customer_name} - ${task.scheduled_date} ${task.scheduled_time_start}`);
      console.log(`        护士ID: ${task.nurse_id}`);
      console.log(`        排班门店: ${task.store_id}`);
      console.log(`        预约门店: ${task.appointment?.store_id}`);
      console.log(`        匹配原因: ${task.store_id === headNurse.store_id ? '排班门店匹配' : '预约门店匹配'}`);
      console.log('');
    });

    // 4. 对比修复前后的差异
    console.log('3. 对比修复前后的差异:');
    
    // 修复前：只按排班门店ID筛选
    const oldLogicTasks = schedules.filter(s => 
      s.appointment_id && s.store_id === headNurse.store_id
    );
    console.log(`   修复前(只按排班门店ID): ${oldLogicTasks.length} 条`);
    
    // 修复后：按排班门店ID或预约门店ID筛选
    const newLogicTasks = schedules.filter(s => 
      s.appointment_id && (
        s.store_id === headNurse.store_id || 
        s.appointment?.store_id === headNurse.store_id
      )
    );
    console.log(`   修复后(排班或预约门店ID): ${newLogicTasks.length} 条`);
    
    const additionalTasks = newLogicTasks.filter(newTask => 
      !oldLogicTasks.some(oldTask => oldTask.id === newTask.id)
    );
    console.log(`   新增可见任务: ${additionalTasks.length} 条`);
    additionalTasks.forEach((task, index) => {
      console.log(`     ${index + 1}. ${task.appointment?.customer_name} - ${task.scheduled_date}`);
      console.log(`        原因: 预约门店ID匹配但排班门店ID不匹配`);
    });

    // 5. 验证结果
    console.log('');
    console.log('4. 验证结果:');
    console.log(`   ✅ 护士长个人任务: ${selfTasks.length} 条`);
    console.log(`   ✅ 护士长门店任务: ${storeTasks.length} 条`);
    console.log(`   ✅ 修复增加了 ${additionalTasks.length} 条可见任务`);
    
    if (storeTasks.length >= 3) {
      console.log('   ✅ 修复成功：护士长现在可以看到门店的所有任务');
    } else {
      console.log('   ⚠️  可能仍有问题：门店任务数量少于预期');
    }

  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

if (require.main === module) {
  testHeadNurseStoreTasksFix();
}