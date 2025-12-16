async function testTodayAvailability() {
  console.log('🧪 测试今天的资源可用性（带门店筛选）\n');

  // 获取上海门店的排班数据
  const today = new Date().toISOString().split('T')[0];
  
  // 先获取门店列表
  const storesResponse = await fetch('http://localhost:3001/api/stores');
  const stores = await storesResponse.json();
  
  const shanghaiStore = stores.find(s => s.name.includes('上海'));
  
  if (!shanghaiStore) {
    console.log('❌ 未找到上海门店');
    return;
  }

  console.log('📍 测试门店:', shanghaiStore.name);
  console.log('📅 测试日期:', today);
  console.log('');

  // 测试15:00-15:30时间段
  const params = new URLSearchParams({
    date: today,
    time_start: '15:00:00',
    time_end: '15:30:00',
    store_id: shanghaiStore.id
  });

  try {
    const response = await fetch(`http://localhost:3001/api/resources/availability?${params.toString()}`);
    const data = await response.json();

    console.log('⏰ 时间段: 15:00-15:30');
    console.log('');
    console.log('✅ 可用房间数:', data.available_rooms?.length || 0);
    console.log('✅ 可用护士数:', data.available_nurses?.length || 0);
    console.log('');

    if (data.available_rooms && data.available_rooms.length > 0) {
      console.log('📦 可用房间:');
      data.available_rooms.forEach(r => {
        console.log('  - ' + r.name + ' (' + r.type + ')');
      });
      console.log('');
    }

    if (data.available_nurses && data.available_nurses.length > 0) {
      console.log('👩‍⚕️ 可用护士:');
      data.available_nurses.forEach(n => {
        console.log('  - ' + n.name);
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

testTodayAvailability();
