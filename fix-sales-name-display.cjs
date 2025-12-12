#!/usr/bin/env node

/**
 * 修复预约人数据显示问题
 * 1. 检查数据库中的预约人数据
 * 2. 更新缺失的sales_name字段
 * 3. 验证API返回的数据
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase配置
const supabaseUrl = 'https://bgpgkmkjwqgqjqjzwqgq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJncGdrbWtqd3FncWpxanp3cWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzNzI4NzEsImV4cCI6MjA0ODk0ODg3MX0.VJJOBjUvbg_vQOjKJaZQIvNWJDJqKlJZ8w_-jqhXFgE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSalesNameDisplay() {
  console.log('🔧 修复预约人数据显示');
  console.log('=' .repeat(40));

  try {
    // 1. 检查appointments表中的数据
    console.log('\n📊 检查appointments表数据:');
    
    const { data: appointments, error: aptError } = await supabase
      .from('appointments')
      .select(`
        id,
        customer_name,
        sales_name,
        sales_id,
        created_by,
        sales_profile:profiles!appointments_sales_id_fkey(full_name, username),
        creator_profile:profiles!appointments_created_by_fkey(full_name, username)
      `)
      .limit(10);

    if (aptError) {
      console.error('❌ 获取appointments数据失败:', aptError.message);
      return;
    }

    console.log(`找到 ${appointments?.length || 0} 个预约记录`);

    if (!appointments || appointments.length === 0) {
      console.log('⚠️  没有预约数据，创建测试数据...');
      await createTestAppointments();
      return;
    }

    // 分析数据状态
    const withSalesName = appointments.filter(a => a.sales_name).length;
    const withSalesId = appointments.filter(a => a.sales_id).length;
    const withCreatedBy = appointments.filter(a => a.created_by).length;

    console.log(`数据状态: sales_name(${withSalesName}) sales_id(${withSalesId}) created_by(${withCreatedBy})`);

    // 2. 更新缺失的sales_name字段
    console.log('\n🔄 更新缺失的sales_name:');
    
    for (const apt of appointments) {
      if (!apt.sales_name) {
        let salesName = null;
        
        // 优先使用sales_profile，然后是creator_profile
        if (apt.sales_profile?.full_name) {
          salesName = apt.sales_profile.full_name;
        } else if (apt.creator_profile?.full_name) {
          salesName = apt.creator_profile.full_name;
        }

        if (salesName) {
          console.log(`更新预约 ${apt.id}: 设置sales_name为 "${salesName}"`);
          
          const { error: updateError } = await supabase
            .from('appointments')
            .update({ sales_name: salesName })
            .eq('id', apt.id);

          if (updateError) {
            console.error(`❌ 更新失败:`, updateError.message);
          } else {
            console.log(`✅ 更新成功`);
          }
        } else {
          console.log(`⚠️  预约 ${apt.id} 无法找到预约人信息`);
        }
      } else {
        console.log(`✅ 预约 ${apt.id} 已有预约人: ${apt.sales_name}`);
      }
    }

    // 3. 验证更新后的数据
    console.log('\n🔍 验证更新结果:');
    
    const { data: updatedAppointments, error: verifyError } = await supabase
      .from('appointments')
      .select('id, customer_name, sales_name, companion_names, total_people')
      .limit(5);

    if (verifyError) {
      console.error('❌ 验证失败:', verifyError.message);
      return;
    }

    updatedAppointments?.forEach((apt, index) => {
      console.log(`预约 ${index + 1}:`);
      console.log(`  - 客户: ${apt.customer_name}`);
      console.log(`  - 预约人: ${apt.sales_name || '❌ 仍然缺失'}`);
      console.log(`  - 同行客户: ${apt.companion_names?.join(', ') || '无'}`);
      console.log(`  - 总人数: ${apt.total_people || 1}`);
    });

    console.log('\n✅ 预约人数据修复完成！');
    console.log('现在护士页面应该能正确显示预约人信息了。');

  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error);
  }
}

async function createTestAppointments() {
  console.log('\n📝 创建测试预约数据:');
  
  try {
    // 获取一些用户
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .limit(5);

    if (userError || !users?.length) {
      console.error('❌ 获取用户失败:', userError?.message);
      return;
    }

    const testAppointments = [
      {
        customer_name: '测试客户A',
        sales_name: users[0].full_name,
        sales_id: users[0].id,
        created_by: users[0].id,
        companion_names: ['同行客户1', '同行客户2'],
        total_people: 3,
        service_id: 'test-service',
        store_id: 'test-store',
        estimated_duration: 90,
        scheduled_date: new Date().toISOString().split('T')[0],
        scheduled_time_start: '10:00',
        scheduled_time_end: '11:30',
        status: 'confirmed'
      },
      {
        customer_name: '测试客户B',
        sales_name: users.length > 1 ? users[1].full_name : users[0].full_name,
        sales_id: users.length > 1 ? users[1].id : users[0].id,
        created_by: users[0].id,
        companion_names: ['同行客户3'],
        total_people: 2,
        service_id: 'test-service',
        store_id: 'test-store',
        estimated_duration: 60,
        scheduled_date: new Date().toISOString().split('T')[0],
        scheduled_time_start: '14:00',
        scheduled_time_end: '15:00',
        status: 'confirmed'
      }
    ];

    for (const apt of testAppointments) {
      const { data: newApt, error: createError } = await supabase
        .from('appointments')
        .insert(apt)
        .select()
        .single();

      if (createError) {
        console.error(`❌ 创建预约失败:`, createError.message);
      } else {
        console.log(`✅ 创建预约成功: ${newApt.customer_name} (预约人: ${newApt.sales_name})`);
      }
    }

  } catch (error) {
    console.error('❌ 创建测试数据失败:', error);
  }
}

// 运行修复
fixSalesNameDisplay().catch(console.error);