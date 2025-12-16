const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// 读取 .env 文件
const envContent = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.VITE_SUPABASE_ANON_KEY
);

async function testResourceAvailability() {
  console.log('🧪 测试资源可用性检查修复\n');

  try {
    // 测试场景：检查上海门店 2024-12-16 15:00-15:30 的资源可用性
    const testDate = '2024-12-16';
    const testTimeStart = '15:00:00';
    const testTimeEnd = '15:30:00';

    // 获取上海门店ID
    const { data: stores } = await supabase
      .from('stores')
      .select('*')
      .ilike('name', '%上海%')
      .single();

    if (!stores) {
      console.log('❌ 未找到上海门店');
      return;
    }

    console.log('📍 测试门店:', stores.name, '(ID:', stores.id, ')');
    console.log('📅 测试日期:', testDate);
    console.log('⏰ 测试时间段:', testTimeStart, '-', testTimeEnd);
    console.log('');

    // 1. 查看该时间段的排班情况
    const { data: schedules } = await supabase
      .from('schedules')
      .select(`
        *,
        room:resources!schedules_room_id_fkey(id, name, type),
        nurse:resources!schedules_nurse_id_fkey(id, name, type)
      `)
      .eq('scheduled_date', testDate)
      .neq('status', 'cancelled')
      .gte('scheduled_time_end', testTimeStart)
      .lte('scheduled_time_start', testTimeEnd);

    console.log('📋 该时间段的排班情况:');
    if (schedules && schedules.length > 0) {
      schedules.forEach(s => {
        console.log(`  - ${s.scheduled_time_start.substring(0,5)}-${s.scheduled_time_end.substring(0,5)}: 房间=${s.room?.name}, 护士=${s.nurse?.name}`);
      });
    } else {
      console.log('  无排班');
    }
    console.log('');

    // 2. 测试API端点
    const params = new URLSearchParams({
      date: testDate,
      time_start: testTimeStart,
      time_end: testTimeEnd,
      store_id: stores.id
    });

    const response = await fetch(`http://localhost:3001/api/resources/availability?${params.toString()}`);
    const availability = await response.json();

    console.log('✅ API返回结果:');
    console.log('  可用房间数:', availability.available_rooms?.length || 0);
    console.log('  可用护士数:', availability.available_nurses?.length || 0);
    console.log('  有可用房间:', availability.has_available_room);
    console.log('  有可用护士:', availability.has_available_nurse);
    console.log('');

    if (availability.available_rooms && availability.available_rooms.length > 0) {
      console.log('  可用房间列表:');
      availability.available_rooms.forEach(r => {
        console.log(`    - ${r.name} (${r.type})`);
      });
    }

    if (availability.available_nurses && availability.available_nurses.length > 0) {
      console.log('  可用护士列表:');
      availability.available_nurses.forEach(n => {
        console.log(`    - ${n.name} (${n.type})`);
      });
    }

    console.log('');
    console.log('🎯 结论:');
    if (availability.has_available_room && availability.has_available_nurse) {
      console.log('  ✅ 该时间段可以预约（有房间和护士）');
    } else if (!availability.has_available_room && !availability.has_available_nurse) {
      console.log('  ❌ 该时间段不可预约（房间和护士都已满）');
    } else if (!availability.has_available_room) {
      console.log('  ❌ 该时间段不可预约（房间已满）');
    } else {
      console.log('  ❌ 该时间段不可预约（护士已满）');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testResourceAvailability();
