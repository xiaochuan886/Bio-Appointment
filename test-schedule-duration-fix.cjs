const { createClient } = require('@supabase/supabase-js');

// 配置
const supabaseUrl = 'http://localhost:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testScheduleDurationFix() {
  console.log('🔍 测试排班时长修复功能\n');
  
  try {
    // 1. 获取现有的预约和房间数据
    console.log('📋 获取测试数据...');
    
    // 获取待排班的预约
    const { data: appointments, error: appointmentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('workflow_status', 'pending_nurse_assignment')
      .eq('requires_nurse_scheduling', true)
      .limit(1);
    
    if (appointmentError) {
      console.error('❌ 获取预约失败:', appointmentError);
      return;
    }
    
    if (!appointments || appointments.length === 0) {
      console.log('⚠️ 没有找到待排班的预约，创建测试预约...');
      
      // 创建测试预约
      const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('category', 'nursing')
        .limit(1);
      
      const { data: stores } = await supabase
        .from('stores')
        .select('*')
        .limit(1);
      
      const { data: sales } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'sales')
        .limit(1);
      
      if (!services || services.length === 0 || !stores || stores.length === 0) {
        console.error('❌ 缺少必要的测试数据（服务或门店）');
        return;
      }
      
      const newAppointment = {
        customer_name: '测试时长修复',
        customer_phone: '13800138000',
        service_id: services[0].id,
        requested_date: new Date().toISOString().split('T')[0],
        requested_time_start: '14:00:00',
        requested_time_end: '14:30:00',
        estimated_duration: 30,
        store_id: stores[0].id,
        sales_id: sales?.[0]?.id || null,
        status: 'pending',
        workflow_status: 'pending_nurse_assignment',
        requires_nurse_scheduling: true
      };
      
      const { data: createdAppointment, error: createError } = await supabase
        .from('appointments')
        .insert([newAppointment])
        .select()
        .single();
      
      if (createError) {
        console.error('❌ 创建测试预约失败:', createError);
        return;
      }
      
      appointments.push(createdAppointment);
      console.log('✅ 创建测试预约成功');
    }
    
    const appointment = appointments[0];
    console.log(`📝 使用预约: ${appointment.customer_name} (ID: ${appointment.id})`);
    
    // 获取房间
    const { data: rooms, error: roomError } = await supabase
      .from('resources')
      .select('*')
      .eq('store_id', appointment.store_id)
      .eq('status', 'available')
      .limit(1);
    
    if (roomError || !rooms || rooms.length === 0) {
      console.error('❌ 获取房间失败:', roomError);
      return;
    }
    
    const room = rooms[0];
    console.log(`🏠 使用房间: ${room.name} (ID: ${room.id})`);
    
    // 获取护士
    const { data: nurses, error: nurseError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'nurse')
      .eq('store_id', appointment.store_id)
      .eq('status', 'active')
      .limit(1);
    
    if (nurseError || !nurses || nurses.length === 0) {
      console.error('❌ 获取护士失败:', nurseError);
      return;
    }
    
    const nurse = nurses[0];
    console.log(`👷 使用护士: ${nurse.full_name} (ID: ${nurse.id})`);
    
    // 2. 创建排班，测试adjusted_duration字段
    console.log('\n🔧 创建排班并测试adjusted_duration字段...');
    
    const adjustedDuration = 45; // 调整时长为45分钟
    const adjustmentReason = '客户特殊需求';
    const scheduledTimeStart = '15:00:00';
    
    // 计算结束时间
    const [hours, minutes] = scheduledTimeStart.split(':').map(Number);
    const totalEndMinutes = minutes + adjustedDuration;
    const totalEndHours = hours + Math.floor(totalEndMinutes / 60);
    const finalEndMinutes = totalEndMinutes % 60;
    const scheduledTimeEnd = `${String(totalEndHours).padStart(2, '0')}:${String(finalEndMinutes).padStart(2, '0')}:00`;
    
    console.log(`⏰ 计划时间: ${scheduledTimeStart} - ${scheduledTimeEnd} (时长: ${adjustedDuration}分钟)`);
    
    const scheduleData = {
      appointment_id: appointment.id,
      nurse_id: nurse.id,
      room_id: room.id,
      scheduled_date: appointment.requested_date,
      scheduled_time_start: scheduledTimeStart,
      scheduled_time_end: scheduledTimeEnd,
      adjusted_duration: adjustedDuration,
      adjustment_reason: adjustmentReason,
      status: 'scheduled'
    };
    
    console.log('📤 发送排班数据:', JSON.stringify(scheduleData, null, 2));
    
    // 直接调用API创建排班
    const response = await fetch('http://localhost:3001/api/schedules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token'
      },
      body: JSON.stringify(scheduleData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 创建排班失败:', response.status, errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ 排班创建成功:', result);
    
    // 3. 验证数据库中的数据
    console.log('\n🔍 验证数据库中的排班数据...');
    
    const { data: savedSchedule, error: fetchError } = await supabase
      .from('schedules')
      .select('*')
      .eq('appointment_id', appointment.id)
      .single();
    
    if (fetchError) {
      console.error('❌ 获取保存的排班失败:', fetchError);
      return;
    }
    
    console.log('📊 保存的排班数据:');
    console.log(`  - ID: ${savedSchedule.id}`);
    console.log(`  - 开始时间: ${savedSchedule.scheduled_time_start}`);
    console.log(`  - 结束时间: ${savedSchedule.scheduled_time_end}`);
    console.log(`  - 调整时长: ${savedSchedule.adjusted_duration} 分钟`);
    console.log(`  - 调整原因: ${savedSchedule.adjustment_reason}`);
    console.log(`  - 状态: ${savedSchedule.status}`);
    
    // 验证时长是否正确
    const [startHours, startMinutes] = savedSchedule.scheduled_time_start.split(':').map(Number);
    const [scheduleEndHours, scheduleEndMinutes] = savedSchedule.scheduled_time_end.split(':').map(Number);
    const actualDuration = (scheduleEndHours * 60 + scheduleEndMinutes) - (startHours * 60 + startMinutes);
    
    console.log(`\n⏱️ 时长验证:`);
    console.log(`  - 预期时长: ${adjustedDuration} 分钟`);
    console.log(`  - 实际时长: ${actualDuration} 分钟`);
    console.log(`  - 数据库adjusted_duration: ${savedSchedule.adjusted_duration} 分钟`);
    
    if (actualDuration === adjustedDuration && savedSchedule.adjusted_duration === adjustedDuration) {
      console.log('✅ 时长验证通过！');
    } else {
      console.log('❌ 时长验证失败！');
    }
    
    // 4. 测试更新排班
    console.log('\n🔄 测试更新排班...');
    
    const newAdjustedDuration = 60;
    const newScheduledTimeEnd = '16:00:00';
    
    const updateData = {
      scheduled_time_start: '15:00:00',
      scheduled_time_end: newScheduledTimeEnd,
      adjusted_duration: newAdjustedDuration,
      adjustment_reason: '延长服务时间'
    };
    
    const updateResponse = await fetch(`http://localhost:3001/api/schedules/${savedSchedule.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token'
      },
      body: JSON.stringify(updateData)
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ 更新排班失败:', updateResponse.status, errorText);
      return;
    }
    
    const updateResult = await updateResponse.json();
    console.log('✅ 排班更新成功:', updateResult);
    
    // 验证更新后的数据
    const { data: updatedSchedule, error: fetchUpdateError } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', savedSchedule.id)
      .single();
    
    if (fetchUpdateError) {
      console.error('❌ 获取更新后的排班失败:', fetchUpdateError);
      return;
    }
    
    console.log('📊 更新后的排班数据:');
    console.log(`  - 开始时间: ${updatedSchedule.scheduled_time_start}`);
    console.log(`  - 结束时间: ${updatedSchedule.scheduled_time_end}`);
    console.log(`  - 调整时长: ${updatedSchedule.adjusted_duration} 分钟`);
    console.log(`  - 调整原因: ${updatedSchedule.adjustment_reason}`);
    
    // 验证更新后的时长
    const [newStartHours, newStartMinutes] = updatedSchedule.scheduled_time_start.split(':').map(Number);
    const [updatedEndHours, updatedEndMinutes] = updatedSchedule.scheduled_time_end.split(':').map(Number);
    const newActualDuration = (updatedEndHours * 60 + updatedEndMinutes) - (newStartHours * 60 + newStartMinutes);
    
    console.log(`\n⏱️ 更新后时长验证:`);
    console.log(`  - 预期时长: ${newAdjustedDuration} 分钟`);
    console.log(`  - 实际时长: ${newActualDuration} 分钟`);
    console.log(`  - 数据库adjusted_duration: ${updatedSchedule.adjusted_duration} 分钟`);
    
    if (newActualDuration === newAdjustedDuration && updatedSchedule.adjusted_duration === newAdjustedDuration) {
      console.log('✅ 更新后时长验证通过！');
    } else {
      console.log('❌ 更新后时长验证失败！');
    }
    
    // 5. 测试甘特图数据获取
    console.log('\n📊 测试甘特图数据获取...');
    
    const ganttResponse = await fetch(`http://localhost:3001/api/schedules?date=${appointment.requested_date}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer mock-token'
      }
    });
    
    if (!ganttResponse.ok) {
      const errorText = await ganttResponse.text();
      console.error('❌ 获取甘特图数据失败:', ganttResponse.status, errorText);
      return;
    }
    
    const ganttData = await ganttResponse.json();
    const scheduleInGantt = ganttData.find(s => s.id === savedSchedule.id);
    
    if (scheduleInGantt) {
      console.log('📊 甘特图中的排班数据:');
      console.log(`  - ID: ${scheduleInGantt.id}`);
      console.log(`  - 开始时间: ${scheduleInGantt.scheduled_time_start}`);
      console.log(`  - 结束时间: ${scheduleInGantt.scheduled_time_end}`);
      console.log(`  - 调整时长: ${scheduleInGantt.adjusted_duration} 分钟`);
      console.log(`  - 客户名称: ${scheduleInGantt.customer_name}`);
      
      // 计算甘特图宽度
      const [ganttStartHours, ganttStartMinutes] = scheduleInGantt.scheduled_time_start.split(':').map(Number);
      const [ganttEndHours, ganttEndMinutes] = scheduleInGantt.scheduled_time_end.split(':').map(Number);
      const ganttDuration = (ganttEndHours * 60 + ganttEndMinutes) - (ganttStartHours * 60 + ganttStartMinutes);
      
      console.log(`\n📏 甘特图宽度计算:`);
      console.log(`  - 时长: ${ganttDuration} 分钟`);
      console.log(`  - 预期宽度: ${(ganttDuration / 60) * 100}px (假设每小时100px)`);
      
      if (ganttDuration === newAdjustedDuration) {
        console.log('✅ 甘特图数据验证通过！');
      } else {
        console.log('❌ 甘特图数据验证失败！');
      }
    } else {
      console.log('❌ 甘特图中未找到排班数据');
    }
    
    console.log('\n🎉 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
testScheduleDurationFix();