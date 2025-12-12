#!/usr/bin/env node

/**
 * 测试预约人数据是否正确返回
 * 检查API是否包含sales_name字段
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase配置
const supabaseUrl = 'https://bgpgkmkjwqgqjqjzwqgq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJncGdrbWtqd3FncWpxanp3cWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzNzI4NzEsImV4cCI6MjA0ODk0ODg3MX0.VJJOBjUvbg_vQOjKJaZQIvNWJDJqKlJZ8w_-jqhXFgE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSalesNameData() {
  console.log('🔍 测试预约人数据 (sales_name)');
  console.log('=' .repeat(50));

  try {
    // 1. 检查数据库中的预约数据
    console.log('\n📊 检查数据库中的预约数据:');
    
    const { data: appointments, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        customer_name,
        sales_name,
        sales_id,
        created_by,
        profiles!appointments_sales_id_fkey(full_name, username),
        creator:profiles!appointments_created_by_fkey(full_name, username)
      `)
      .limit(5);

    if (appointmentError) {
      console.error('❌ 获取预约数据失败:', appointmentError);
      return;
    }

    console.log(`找到 ${appointments?.length || 0} 个预约记录`);
    
    appointments?.forEach((appointment, index) => {
      console.log(`\n预约 ${index + 1}:`);
      console.log(`  - ID: ${appointment.id}`);
      console.log(`  - 客户: ${appointment.customer_name}`);
      console.log(`  - sales_name字段: ${appointment.sales_name || '无'}`);
      console.log(`  - sales_id: ${appointment.sales_id || '无'}`);
      console.log(`  - created_by: ${appointment.created_by || '无'}`);
      console.log(`  - 销售员信息: ${appointment.profiles?.full_name || '无'}`);
      console.log(`  - 创建者信息: ${appointment.creator?.full_name || '无'}`);
    });

    // 2. 检查排班数据
    console.log('\n📅 检查排班数据:');
    
    const { data: schedules, error: scheduleError } = await supabase
      .from('schedules')
      .select(`
        id,
        appointment_id,
        nurse_id,
        appointments(
          customer_name,
          sales_name,
          sales_id,
          created_by,
          profiles!appointments_sales_id_fkey(full_name),
          creator:profiles!appointments_created_by_fkey(full_name)
        )
      `)
      .not('appointment_id', 'is', null)
      .limit(5);

    if (scheduleError) {
      console.error('❌ 获取排班数据失败:', scheduleError);
      return;
    }

    console.log(`找到 ${schedules?.length || 0} 个排班记录`);
    
    schedules?.forEach((schedule, index) => {
      console.log(`\n排班 ${index + 1}:`);
      console.log(`  - 排班ID: ${schedule.id}`);
      console.log(`  - 预约ID: ${schedule.appointment_id}`);
      console.log(`  - 客户: ${schedule.appointments?.customer_name}`);
      console.log(`  - sales_name: ${schedule.appointments?.sales_name || '无'}`);
      console.log(`  - 销售员: ${schedule.appointments?.profiles?.full_name || '无'}`);
      console.log(`  - 创建者: ${schedule.appointments?.creator?.full_name || '无'}`);
    });

    // 3. 测试API端点
    console.log('\n🌐 测试API端点:');
    
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('http://localhost:3001/api/schedules?limit=3');
      
      if (response.ok) {
        const apiData = await response.json();
        console.log(`✅ API调用成功，返回 ${apiData.length} 条记录`);
        
        apiData.forEach((record, index) => {
          console.log(`\nAPI记录 ${index + 1}:`);
          console.log(`  - 排班ID: ${record.id}`);
          console.log(`  - 客户: ${record.customer_name}`);
          console.log(`  - sales_name: ${record.sales_name || '❌ 缺失'}`);
          console.log(`  - sales_username: ${record.sales_username || '无'}`);
          console.log(`  - 预约ID: ${record.appointment_id}`);
        });

        // 检查是否有sales_name数据
        const hasSalesName = apiData.some(record => record.sales_name);
        const hasSalesUsername = apiData.some(record => record.sales_username);
        
        console.log(`\n📋 数据完整性检查:`);
        console.log(`  - 包含sales_name: ${hasSalesName ? '✅' : '❌'}`);
        console.log(`  - 包含sales_username: ${hasSalesUsername ? '✅' : '❌'}`);
        
        if (!hasSalesName && !hasSalesUsername) {
          console.log(`\n⚠️  预约人数据缺失，可能的原因:`);
          console.log(`  1. 数据库中appointments表的sales_name字段为空`);
          console.log(`  2. API查询中的JOIN条件有问题`);
          console.log(`  3. 需要检查sales_id和created_by字段的关联`);
        }
        
      } else {
        console.log(`❌ API调用失败: ${response.status}`);
      }
    } catch (apiError) {
      console.log(`⚠️  API服务器未运行: ${apiError.message}`);
    }

    // 4. 建议修复方案
    console.log('\n🔧 修复建议:');
    console.log('如果预约人数据缺失，可以尝试以下方案:');
    console.log('1. 更新现有预约记录的sales_name字段');
    console.log('2. 确保API查询正确关联sales_id和profiles表');
    console.log('3. 在前端显示时优先使用sales_name，fallback到创建者姓名');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
testSalesNameData().catch(console.error);