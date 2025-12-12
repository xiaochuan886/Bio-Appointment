#!/usr/bin/env node

/**
 * 调试护士长查看门店任务的数据筛选问题
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debugStoreTasksIssue() {
  console.log('🔍 调试护士长门店任务查看问题\n');

  try {
    // 1. 查看当前排班数据
    console.log('1. 查看当前排班数据:');
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

    console.log(`   找到 ${schedules.length} 条排班记录:`);
    schedules.forEach((schedule, index) => {
      console.log(`   排班 ${index + 1}:`);
      console.log(`     ID: ${schedule.id}`);
      console.log(`     护士ID: ${schedule.nurse_id || '未分配'}`);
      console.log(`     排班门店ID: ${schedule.store_id || '未指定'}`);
      console.log(`     预约门店ID: ${schedule.appointment?.store_id || '未指定'}`);
      console.log(`     门店名称: ${schedule.appointment?.store?.name || '未知'}`);
      console.log(`     日期: ${schedule.scheduled_date}`);
      console.log(`     时间: ${schedule.scheduled_time_start} - ${schedule.scheduled_time_end}`);
      console.log(`     状态: ${schedule.status}`);
      console.log(`     客户: ${schedule.appointment?.customer_name || '未知'}`);
      console.log('');
    });

    // 2. 查看护士长信息
    console.log('2. 查看护士长信息:');
    const { data: headNurse, error: nurseError } = await supabase
      .from('profiles')
      .select('id, name, role, store_id, store:stores(name)')
      .eq('role', 'head_nurse')
      .single();

    if (nurseError) {
      console.error('查询护士长信息失败:', nurseError);
      return;
    }

    console.log(`   护士长ID: ${headNurse.id}`);
    console.log(`   护士长姓名: ${headNurse.name}`);
    console.log(`   护士长门店ID: ${headNurse.store_id}`);
    console.log(`   护士长门店名称: ${headNurse.store?.name || '未知'}`);
    console.log('');

    // 3. 模拟API筛选逻辑
    console.log('3. 模拟API筛选逻辑:');
    
    // 护士长查看个人任务
    const selfTasks = schedules.filter(s => s.nurse_id === headNurse.id);
    console.log(`   护士长个人任务: ${selfTasks.length} 条`);
    selfTasks.forEach((task, index) => {
      console.log(`     任务 ${index + 1}: ${task.appointment?.customer_name} - ${task.scheduled_date} ${task.scheduled_time_start}`);
    });

    // 护士长查看门店任务 - 按排班门店ID筛选
    const storeTasksByScheduleStore = schedules.filter(s => s.store_id === headNurse.store_id);
    console.log(`   门店任务(按排班门店ID): ${storeTasksByScheduleStore.length} 条`);
    storeTasksByScheduleStore.forEach((task, index) => {
      console.log(`     任务 ${index + 1}: ${task.appointment?.customer_name} - ${task.scheduled_date} ${task.scheduled_time_start} (护士: ${task.nurse_id})`);
    });

    // 护士长查看门店任务 - 按预约门店ID筛选
    const storeTasksByAppointmentStore = schedules.filter(s => s.appointment?.store_id === headNurse.store_id);
    console.log(`   门店任务(按预约门店ID): ${storeTasksByAppointmentStore.length} 条`);
    storeTasksByAppointmentStore.forEach((task, index) => {
      console.log(`     任务 ${index + 1}: ${task.appointment?.customer_name} - ${task.scheduled_date} ${task.scheduled_time_start} (护士: ${task.nurse_id})`);
    });

    // 4. 检查数据一致性
    console.log('4. 检查数据一致性:');
    const inconsistentTasks = schedules.filter(s => 
      s.store_id && s.appointment?.store_id && s.store_id !== s.appointment.store_id
    );
    console.log(`   排班门店ID与预约门店ID不一致的任务: ${inconsistentTasks.length} 条`);
    inconsistentTasks.forEach((task, index) => {
      console.log(`     任务 ${index + 1}: 排班门店=${task.store_id}, 预约门店=${task.appointment.store_id}`);
    });

    // 5. 建议的修复方案
    console.log('5. 建议的修复方案:');
    console.log('   问题分析:');
    console.log('   - 排班记录的store_id可能为空或不正确');
    console.log('   - 应该优先使用预约的store_id来筛选门店任务');
    console.log('   - 前端筛选逻辑需要同时检查两个字段');
    console.log('');
    console.log('   修复建议:');
    console.log('   1. API筛选时同时考虑排班和预约的门店ID');
    console.log('   2. 前端筛选时使用OR逻辑而不是AND逻辑');
    console.log('   3. 确保排班创建时正确设置store_id');

  } catch (error) {
    console.error('调试过程中发生错误:', error);
  }
}

if (require.main === module) {
  debugStoreTasksIssue();
}