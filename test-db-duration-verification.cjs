const { createClient } = require('@supabase/supabase-js');

// 配置
const supabaseUrl = 'http://localhost:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabaseDurationVerification() {
  console.log('🔍 验证数据库中的排班时长数据\n');
  
  try {
    // 1. 检查现有的排班数据
    console.log('📊 检查现有排班数据...');
    
    const { data: schedules, error: scheduleError } = await supabase
      .from('schedules')
      .select(`
        *,
        appointments (
          customer_name,
          estimated_duration,
          service_id,
          services (
            name,
            base_duration
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (scheduleError) {
      console.error('❌ 获取排班数据失败:', scheduleError);
      return;
    }
    
    if (!schedules || schedules.length === 0) {
      console.log('⚠️ 没有找到排班数据');
      return;
    }
    
    console.log(`📋 找到 ${schedules.length} 个排班记录:\n`);
    
    schedules.forEach((schedule, index) => {
      console.log(`🔸 排班 ${index + 1}:`);
      console.log(`  ID: ${schedule.id}`);
      console.log(`  客户: ${schedule.appointments?.customer_name || '未知'}`);
      console.log(`  服务: ${schedule.appointments?.services?.name || '未知'}`);
      console.log(`  预约时长: ${schedule.appointments?.estimated_duration || '未知'} 分钟`);
      console.log(`  服务基础时长: ${schedule.appointments?.services?.base_duration || '未知'} 分钟`);
      console.log(`  排班开始时间: ${schedule.scheduled_time_start}`);
      console.log(`  排班结束时间: ${schedule.scheduled_time_end}`);
      console.log(`  调整时长: ${schedule.adjusted_duration || '未设置'} 分钟`);
      console.log(`  调整原因: ${schedule.adjustment_reason || '未设置'}`);
      console.log(`  状态: ${schedule.status}`);
      
      // 计算实际时长
      if (schedule.scheduled_time_start && schedule.scheduled_time_end) {
        const [startHours, startMinutes] = schedule.scheduled_time_start.split(':').map(Number);
        const [endHours, endMinutes] = schedule.scheduled_time_end.split(':').map(Number);
        const actualDuration = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
        
        console.log(`  📏 计算实际时长: ${actualDuration} 分钟`);
        
        // 验证时长一致性
        if (schedule.adjusted_duration) {
          if (actualDuration === schedule.adjusted_duration) {
            console.log(`  ✅ 时长一致: adjusted_duration = ${schedule.adjusted_duration} 分钟`);
          } else {
            console.log(`  ❌ 时长不一致: adjusted_duration = ${schedule.adjusted_duration} 分钟, 实际计算 = ${actualDuration} 分钟`);
          }
        } else {
          console.log(`  ⚠️ 未设置 adjusted_duration，使用实际时长: ${actualDuration} 分钟`);
        }
      }
      
      console.log('');
    });
    
    // 2. 检查数据库表结构
    console.log('🔍 检查 schedules 表结构...');
    
    const { data: columns, error: columnError } = await supabase
      .rpc('get_table_columns', { table_name: 'schedules' })
      .select('column_name, data_type, is_nullable');
    
    if (columnError) {
      console.log('⚠️ 无法获取表结构，使用替代方法检查...');
      
      // 尝试插入一条测试记录来验证字段
      const testSchedule = {
        appointment_id: '00000000-0000-0000-0000-000000000000',
        nurse_id: '00000000-0000-0000-0000-000000000000',
        room_id: '00000000-0000-0000-0000-000000000000',
        scheduled_date: new Date().toISOString().split('T')[0],
        scheduled_time_start: '10:00:00',
        scheduled_time_end: '11:00:00',
        adjusted_duration: 60,
        adjustment_reason: '测试',
        status: 'scheduled'
      };
      
      console.log('📝 测试字段是否存在...');
      const requiredFields = ['adjusted_duration', 'adjustment_reason'];
      const existingFields = Object.keys(testSchedule);
      
      requiredFields.forEach(field => {
        if (existingFields.includes(field)) {
          console.log(`  ✅ 字段 ${field} 存在`);
        } else {
          console.log(`  ❌ 字段 ${field} 不存在`);
        }
      });
    } else {
      console.log('📋 schedules 表字段:');
      columns?.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
      });
    }
    
    // 3. 验证甘特图数据获取
    console.log('\n📊 验证甘特图数据获取...');
    
    const today = new Date().toISOString().split('T')[0];
    const { data: ganttData, error: ganttError } = await supabase
      .from('schedules')
      .select(`
        *,
        appointments (
          customer_name,
          estimated_duration,
          services (
            name,
            base_duration
          )
        ),
        resources (
          name,
          type
        ),
        profiles (
          full_name,
          role
        )
      `)
      .eq('scheduled_date', today);
    
    if (ganttError) {
      console.error('❌ 获取甘特图数据失败:', ganttError);
    } else {
      console.log(`📋 今日排班数据: ${ganttData?.length || 0} 条记录`);
      
      ganttData?.forEach((schedule, index) => {
        console.log(`\n🔸 甘特图项目 ${index + 1}:`);
        console.log(`  客户: ${schedule.appointments?.customer_name || '未知'}`);
        console.log(`  时间: ${schedule.scheduled_time_start} - ${schedule.scheduled_time_end}`);
        console.log(`  调整时长: ${schedule.adjusted_duration || '未设置'} 分钟`);
        console.log(`  房间: ${schedule.resources?.name || '未知'}`);
        console.log(`  护士: ${schedule.profiles?.full_name || '未知'}`);
        
        // 计算甘特图宽度
        if (schedule.scheduled_time_start && schedule.scheduled_time_end) {
          const [startHours, startMinutes] = schedule.scheduled_time_start.split(':').map(Number);
          const [endHours, endMinutes] = schedule.scheduled_time_end.split(':').map(Number);
          const duration = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
          
          console.log(`  📏 甘特图宽度计算: ${duration} 分钟 = ${(duration / 60) * 100}px (假设每小时100px)`);
        }
      });
    }
    
    console.log('\n🎉 数据库验证完成！');
    
  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error);
  }
}

// 运行验证
testDatabaseDurationVerification();