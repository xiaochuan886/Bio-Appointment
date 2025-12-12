#!/usr/bin/env node

/**
 * 为现有预约记录添加预约人数据
 * 基于created_by字段或随机分配销售人员
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addSalesNameToAppointments() {
  console.log('🔍 为现有预约记录添加预约人数据...\n');

  try {
    // 1. 获取所有销售人员
    const { data: salesPeople, error: salesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, role')
      .eq('role', 'sales')
      .eq('status', 'active');

    if (salesError) {
      console.error('❌ 获取销售人员失败:', salesError);
      return;
    }

    console.log(`✅ 找到 ${salesPeople.length} 个销售人员`);
    salesPeople.forEach((person, index) => {
      console.log(`${index + 1}. ${person.full_name} (${person.username})`);
    });

    // 如果没有销售人员，创建一些测试销售人员
    if (salesPeople.length === 0) {
      console.log('\n📝 创建测试销售人员...');
      const testSalesPeople = [
        { username: 'sales001', full_name: '销售员张明', role: 'sales' },
        { username: 'sales002', full_name: '客服专员李芳', role: 'sales' },
        { username: 'sales003', full_name: '业务代表王强', role: 'sales' },
        { username: 'sales004', full_name: '销售顾问赵静', role: 'sales' },
        { username: 'sales005', full_name: '客户经理钱伟', role: 'sales' }
      ];

      for (const person of testSalesPeople) {
        const { data, error } = await supabase
          .from('profiles')
          .insert([{
            ...person,
            email: `${person.username}@example.com`,
            status: 'active'
          }])
          .select();

        if (error) {
          console.error(`❌ 创建销售人员 ${person.full_name} 失败:`, error);
        } else {
          console.log(`✅ 创建销售人员: ${person.full_name}`);
          salesPeople.push(data[0]);
        }
      }
    }

    // 2. 获取没有sales_name的预约记录
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, customer_name, created_by, sales_id')
      .is('sales_name', null)
      .limit(50);

    if (appointmentsError) {
      console.error('❌ 获取预约记录失败:', appointmentsError);
      return;
    }

    console.log(`\n✅ 找到 ${appointments.length} 个需要添加预约人的预约记录`);

    // 3. 为每个预约记录分配预约人
    let updateCount = 0;
    for (const appointment of appointments) {
      let salesPerson = null;

      // 如果有sales_id，使用对应的销售人员
      if (appointment.sales_id) {
        salesPerson = salesPeople.find(p => p.id === appointment.sales_id);
      }

      // 如果没有找到，随机分配一个销售人员
      if (!salesPerson && salesPeople.length > 0) {
        const randomIndex = Math.floor(Math.random() * salesPeople.length);
        salesPerson = salesPeople[randomIndex];
      }

      if (salesPerson) {
        // 更新预约记录
        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            sales_name: salesPerson.full_name,
            sales_id: salesPerson.id
          })
          .eq('id', appointment.id);

        if (updateError) {
          console.error(`❌ 更新预约 ${appointment.customer_name} 失败:`, updateError);
        } else {
          updateCount++;
          console.log(`✅ 为客户 ${appointment.customer_name} 分配预约人: ${salesPerson.full_name}`);
        }
      }
    }

    console.log(`\n🎉 成功为 ${updateCount} 个预约记录添加了预约人信息`);

    // 4. 验证更新结果
    console.log('\n🔍 验证更新结果...');
    const { data: updatedAppointments, error: verifyError } = await supabase
      .from('appointments')
      .select('id, customer_name, sales_name')
      .not('sales_name', 'is', null)
      .limit(10);

    if (verifyError) {
      console.error('❌ 验证失败:', verifyError);
    } else {
      console.log(`✅ 现在有 ${updatedAppointments.length} 个预约记录有预约人信息`);
      console.log('\n前5个有预约人的预约记录:');
      updatedAppointments.slice(0, 5).forEach((appointment, index) => {
        console.log(`${index + 1}. 客户: ${appointment.customer_name}, 预约人: ${appointment.sales_name}`);
      });
    }

  } catch (error) {
    console.error('❌ 操作失败:', error);
  }
}

// 运行脚本
addSalesNameToAppointments();