async function testAvailability() {
  console.log('🧪 测试资源可用性API\n');

  // 测试今天15:00-16:00的资源可用性
  const today = new Date().toISOString().split('T')[0];
  const params = new URLSearchParams({
    date: today,
    time_start: '15:00:00',
    time_end: '16:00:00'
  });

  try {
    const response = await fetch(`http://localhost:3001/api/resources/availability?${params.toString()}`);
    const data = await response.json();

    console.log('📅 查询日期:', today);
    console.log('⏰ 查询时间:', '15:00:00 - 16:00:00');
    console.log('');
    console.log('✅ API响应:');
    console.log('  可用房间数:', data.available_rooms?.length || 0);
    console.log('  可用护士数:', data.available_nurses?.length || 0);
    console.log('  有可用房间:', data.has_available_room);
    console.log('  有可用护士:', data.has_available_nurse);
    console.log('');

    if (data.available_rooms && data.available_rooms.length > 0) {
      console.log('📦 可用房间:');
      data.available_rooms.forEach(r => {
        console.log(`  - ${r.name} (${r.type})`);
      });
      console.log('');
    }

    if (data.available_nurses && data.available_nurses.length > 0) {
      console.log('👩‍⚕️ 可用护士:');
      data.available_nurses.forEach(n => {
        console.log(`  - ${n.name} (${n.type})`);
      });
      console.log('');
    }

    console.log('🎯 结论:');
    if (data.has_available_room && data.has_available_nurse) {
      console.log('  ✅ 该时间段可以预约');
    } else {
      console.log('  ❌ 该时间段不可预约');
      if (!data.has_available_room) console.log('     原因: 房间已满');
      if (!data.has_available_nurse) console.log('     原因: 护士已满');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testAvailability();
