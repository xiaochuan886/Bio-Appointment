const { createClient } = require('@supabase/supabase-js');

// 初始化 Supabase 客户端
const supabaseUrl = process.env.SUPABASE_URL || 'https://fkdwadmphfegxgjcvdvv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrZHdhZG1waGZlZ3hnamN2ZHZ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjE1MTQzMiwiZXhwIjoyMDUxNzI3NDMyfQ.SjV_rCkH_mY34xOYjQn7J6Nyi_wkx6n6p3x3lB6p8wM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDoctorScheduleCreation() {
  console.log('=== 测试医生确认预约后排班创建 ===\n');

  try {
    // 1. 获取赵医生的ID
    console.log('1. 获取赵医生的用户信息...');
    const { data: doctorData, error: doctorError } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('name', '赵医生')
      .eq('role', 'doctor')
      .single();

    if (doctorError) {
      console.error('❌ 获取医生信息失败:', doctorError);
      return;
    }

    console.log(`✅ 找到医生: ${doctorData.name} (ID: ${doctorData.id})`);

    // 2. 查找最近确认的预约
    console.log('\n2. 查找最近确认的预约...');
    const { data: appointments, error: appointmentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', doctorData.id)
      .eq('status', 'doctor_confirmed')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (appointmentError) {
      console.error('❌ 查询预约失败:', appointmentError);
      return;
    }

    console.log(`✅ 找到 ${appointments.length} 个已确认的预约:`);
    appointments.forEach((apt, index) => {
      console.log(`  ${index + 1}. ${apt.customer_name} - ${apt.appointment_date} ${apt.start_time} (ID: ${apt.id})`);
    });

    if (appointments.length === 0) {
      console.log('⚠️ 没有找到已确认的预约');
      return;
    }

    // 3. 检查这些预约是否有对应的排班
    console.log('\n3. 检查预约对应的排班...');
    for (const apt of appointments) {
      console.log(`\n检查预约: ${apt.customer_name} (ID: ${apt.id})`);
      
      const { data: schedules, error: scheduleError } = await supabase
        .from('schedules')
        .select('*')
        .eq('appointment_id', apt.id);

      if (scheduleError) {
        console.error(`❌ 查询排班失败:`, scheduleError);
        continue;
      }

      if (schedules.length === 0) {
        console.log(`  ❌ 没有找到对应的排班记录`);
      } else {
        console.log(`  ✅ 找到 ${schedules.length} 个排班记录:`);
        schedules.forEach((schedule, index) => {
          console.log(`    ${index + 1}. 排班ID: ${schedule.id}, 医生ID: ${schedule.doctor_id}, 日期: ${schedule.date}, 状态: ${schedule.status}`);
        });
      }
    }

    // 4. 检查医生的所有排班
    console.log('\n4. 检查赵医生的所有排班...');
    const { data: doctorSchedules, error: doctorScheduleError } = await supabase
      .from('schedules')
      .select('*')
      .eq('doctor_id', doctorData.id)
      .order('date', { ascending: true });

    if (doctorScheduleError) {
      console.error('❌ 查询医生排班失败:', doctorScheduleError);
      return;
    }

    console.log(`✅ 赵医生共有 ${doctorSchedules.length} 个排班:`);
    doctorSchedules.forEach((schedule, index) => {
      console.log(`  ${index + 1}. 日期: ${schedule.date}, 时间: ${schedule.start_time}-${schedule.end_time}, 状态: ${schedule.status}, 预约ID: ${schedule.appointment_id}`);
    });

    // 5. 检查排班视图API查询条件
    console.log('\n5. 检查排班视图API查询条件...');
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // 模拟前端查询条件
    const { data: viewSchedules, error: viewError } = await supabase
      .from('schedules')
      .select(`
        *,
        appointments!inner(
          id,
          customer_name,
          appointment_date,
          start_time,
          end_time,
          status,
          services!inner(
            id,
            name,
            category,
            duration
          )
        )
      `)
      .eq('doctor_id', doctorData.id)
      .gte('date', todayStr)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (viewError) {
      console.error('❌ 查询排班视图失败:', viewError);
      return;
    }

    console.log(`✅ 排班视图查询结果 (${todayStr} 及之后): ${viewSchedules.length} 条记录`);
    viewSchedules.forEach((schedule, index) => {
      console.log(`  ${index + 1}. ${schedule.date} ${schedule.start_time} - ${schedule.appointments.customer_name}`);
    });

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

testDoctorScheduleCreation();