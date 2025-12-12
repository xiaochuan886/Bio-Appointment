#!/usr/bin/env node

/**
 * 创建包含预约人信息的测试数据
 */

const { createClient } = require('@supabase/supabase-js');

// 使用本地Supabase配置
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJncGdrbWtqd3FncWpxanp3cWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzNzI4NzEsImV4cCI6MjA0ODk0ODg3MX0.VJJOBjUvbg_vQOjKJaZQIvNWJDJqKlJZ8w_-jqhXFgE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestData() {
  console.log('🔧 创建预约人测试数据');
  console.log('=' .repeat(40));

  try {
    // 1. 首先检查现有数据
    console.log('\n📊 检查现有数据:');
    
    const { data: existingAppointments, error: checkError } = await supabase
      .from('appointments')
      .select('id, customer_name, sales_name, sales_id, created_by')
      .limit(5);

    if (checkError) {
      console.error('❌ 检查现有数据失败:', checkError.message);
      return;
    }

    console.log(`找到 ${existingAppointments?.length || 0} 个现有预约`);
    
    if (existingAppointments?.length > 0) {
      existingAppointments.forEach((apt, index) => {
        console.log(`预约 ${index + 1}: ${apt.customer_name}, sales_name: ${apt.sales_name || '无'}, sales_id: ${apt.sales_id || '无'}`);
      });
    }

    // 2. 获取一些用户作为销售员和护士
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, username, role')
      .limit(10);

    if (userError) {
      console.error('❌ 获取用户失败:', userError.message);
      return;
    }

    console.log(`\n👥 找到 ${users?.length || 0} 个用户`);
    
    const salesUsers = users?.filter(u => u.role === 'admin' || u.role === 'head_nurse') || [];
    const nurses = users?.filter(u => u.role === 'nurse') || [];
    
    console.log(`销售员候选: ${salesUsers.length} 个`);
    console.log(`护士: ${nurses.length} 个`);

    if (salesUsers.length === 0 || nurses.length === 0) {
      console.log('❌ 缺少必要的用户角色，无法创建测试数据');
      return;
    }

    // 3. 创建测试预约（包含预约人信息）
    console.log('\n📝 创建测试预约:');
    
    const testAppointments = [
      {
        customer_name: '张三',
        companion_names: ['李四', '王五'],
        total_people: 3,
        sales_id: salesUsers[0].id,
        created_by: salesUsers[0].id,
        service_id: 'test-service-1',
        store_id: 'test-store-1',
        estimated_duration: 90,
        scheduled_date: new Date().toISOString().split('T')[0],
        scheduled_time_start: '10:00',
        scheduled_time_end: '11:30',
        status: 'confirmed'
      },
      {
        customer_name: '赵六',
        companion_names: ['钱七'],
        total_people: 2,
        sales_id: salesUsers.length > 1 ? salesUsers[1].id : salesUsers[0].id,
        created_by: salesUsers[0].id,
        service_id: 'test-service-2',
        store_id: 'test-store-1',
        estimated_duration: 60,
        scheduled_date: new Date().toISOString().split('T')[0],
        scheduled_time_start: '14:00',
        scheduled_time_end: '15:00',
        status: 'confirmed'
      }
    ];

    for (let i = 0; i < testAppointments.length; i++) {
      const appointment = testAppointments[i];
      
      console.log(`创建预约 ${i + 1}: ${appointment.customer_name}`);
      
      const { data: newAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert(appointment)
        .select()
        .single();

      if (appointmentError) {
        console.error(`❌ 创建预约失败:`, appointmentError.message);
        continue;
      }

      console.log(`✅ 预约创建成功: ${newAppointment.id}`);

      // 4. 为预约创建排班
      const schedule = {
        appointment_id: newAppointment.id,
        nurse_id: nurses[i % nurses.length].id,
        room_id: 'test-room-1',
        store_id: appointment.store_id,
        scheduled_date: appointment.scheduled_date,
        scheduled_time_start: appointment.scheduled_time_start,
        scheduled_time_end: appointment.scheduled_time_end,
        status: 'scheduled'
      };

      const { data: newSchedule, error: scheduleError } = await supabase
        .from('schedules')
        .insert(schedule)
        .select()
        .single();

      if (scheduleError) {
        console.error(`❌ 创建排班失败:`, scheduleError.message);
      } else {
        console.log(`✅ 排班创建成功: ${newSchedule.id}`);
      }
    }

    // 5. 验证创建的数据
    console.log('\n🔍 验证创建的数据:');
    
    const { data: newAppointments, error: verifyError } = await supabase
      .from('appointments')
      .select(`
        id,
        customer_name,
        sales_name,
        total_people,
        companion_names,
        profiles!appointments_sales_id_fkey(full_name, username)
      `)
      .in('customer_name', ['张三', '赵六']);

    if (verifyError) {
      console.error('❌ 验证数据失败:', verifyError.message);
      return;
    }

    console.log(`验证结果: 找到 ${newAppointments?.length || 0} 个新预约`);
    
    newAppointments?.forEach((apt, index) => {
      console.log(`\n新预约 ${index + 1}:`);
      console.log(`  - 客户: ${apt.customer_name}`);
      console.log(`  - sales_name: ${apt.sales_name || '无'}`);
      console.log(`  - 销售员: ${apt.profiles?.full_name || '无'}`);
      console.log(`  - 总人数: ${apt.total_people}`);
      console.log(`  - 同行客户: ${apt.companion_names?.join(', ') || '无'}`);
    });

    console.log('\n✅ 测试数据创建完成！');
    console.log('现在可以在护士页面中看到预约人信息了。');

  } catch (error) {
    console.error('❌ 创建测试数据失败:', error);
  }
}

// 运行创建测试数据
createTestData().catch(console.error);