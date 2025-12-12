#!/usr/bin/env node

/**
 * 更新现有预约记录，添加预约人信息
 * 如果appointments表中的sales_name字段为空，则从created_by字段获取创建者信息
 */

const { createClient } = require('@supabase/supabase-js');

// 使用本地Supabase配置
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJncGdrbWtqd3FncWpxanp3cWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzNzI4NzEsImV4cCI6MjA0ODk0ODg3MX0.VJJOBjUvbg_vQOjKJaZQIvNWJDJqKlJZ8w_-jqhXFgE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAppointmentsSalesName() {
  console.log('🔧 更新现有预约的预约人信息');
  console.log('=' .repeat(50));

  try {
    // 1. 检查现有预约数据
    console.log('\n📊 检查现有预约数据:');
    
    const { data: appointments, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        customer_name,
        sales_name,
        sales_id,
        created_by,
        profiles!appointments_created_by_fkey(full_name, username, role)
      `)
      .limit(10);

    if (appointmentError) {
      console.error('❌ 获取预约数据失败:', appointmentError.message);
      return;
    }

    console.log(`找到 ${appointments?.length || 0} 个预约记录`);

    if (!appointments || appointments.length === 0) {
      console.log('⚠️  没有找到预约记录');
      return;
    }

    // 2. 分析数据状态
    const withSalesName = appointments.filter(a => a.sales_name).length;
    const withSalesId = appointments.filter(a => a.sales_id).length;
    const withCreatedBy = appointments.filter(a => a.created_by).length;

    console.log(`\n📈 数据状态分析:`);
    console.log(`  - 有sales_name: ${withSalesName}/${appointments.length}`);
    console.log(`  - 有sales_id: ${withSalesId}/${appointments.length}`);
    console.log(`  - 有created_by: ${withCreatedBy}/${appointments.length}`);

    // 3. 显示现有数据
    appointments.forEach((apt, index) => {
      console.log(`\n预约 ${index + 1}:`);
      console.log(`  - ID: ${apt.id}`);
      console.log(`  - 客户: ${apt.customer_name}`);
      console.log(`  - sales_name: ${apt.sales_name || '❌ 缺失'}`);
      console.log(`  - sales_id: ${apt.sales_id || '无'}`);
      console.log(`  - created_by: ${apt.created_by || '无'}`);
      console.log(`  - 创建者: ${apt.profiles?.full_name || '无'} (${apt.profiles?.role || '无'})`);
    });

    // 4. 更新缺失sales_name的记录
    console.log('\n🔄 更新缺失的预约人信息:');
    
    const needsUpdate = appointments.filter(a => !a.sales_name && a.created_by && a.profiles?.full_name);
    
    if (needsUpdate.length === 0) {
      console.log('✅ 所有记录都已有预约人信息，无需更新');
      return;
    }

    console.log(`需要更新 ${needsUpdate.length} 个记录`);

    for (const appointment of needsUpdate) {
      const salesName = appointment.profiles.full_name;
      
      console.log(`更新预约 ${appointment.id}: 设置sales_name为 "${salesName}"`);
      
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ 
          sales_name: salesName,
          sales_id: appointment.created_by // 同时设置sales_id
        })
        .eq('id', appointment.id);

      if (updateError) {
        console.error(`❌ 更新失败:`, updateError.message);
      } else {
        console.log(`✅ 更新成功`);
      }
    }

    // 5. 验证更新结果
    console.log('\n🔍 验证更新结果:');
    
    const { data: updatedAppointments, error: verifyError } = await supabase
      .from('appointments')
      .select('id, customer_name, sales_name, sales_id')
      .in('id', needsUpdate.map(a => a.id));

    if (verifyError) {
      console.error('❌ 验证失败:', verifyError.message);
      return;
    }

    updatedAppointments?.forEach((apt, index) => {
      console.log(`更新后 ${index + 1}: ${apt.customer_name} - 预约人: ${apt.sales_name || '仍然缺失'}`);
    });

    // 6. 检查关联的排班数据
    console.log('\n📅 检查关联的排班数据:');
    
    const { data: schedules, error: scheduleError } = await supabase
      .from('schedules')
      .select(`
        id,
        appointment_id,
        appointments(customer_name, sales_name)
      `)
      .not('appointment_id', 'is', null)
      .limit(5);

    if (scheduleError) {
      console.error('❌ 获取排班数据失败:', scheduleError.message);
      return;
    }

    console.log(`找到 ${schedules?.length || 0} 个排班记录`);
    
    schedules?.forEach((schedule, index) => {
      console.log(`排班 ${index + 1}: ${schedule.appointments?.customer_name} - 预约人: ${schedule.appointments?.sales_name || '无'}`);
    });

    console.log('\n✅ 预约人信息更新完成！');
    console.log('现在API应该能正确返回sales_name数据了。');

  } catch (error) {
    console.error('❌ 更新过程中发生错误:', error);
  }
}

// 运行更新
updateAppointmentsSalesName().catch(console.error);