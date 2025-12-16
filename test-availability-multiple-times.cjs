async function testMultipleTimes() {
  console.log('🧪 测试多个时间段的资源可用性\n');

  const today = new Date().toISOString().split('T')[0];
  const timeSlots = [
    ['08:00:00', '09:00:00'],
    ['10:00:00', '11:00:00'],
    ['12:00:00', '13:00:00'],
    ['14:00:00', '15:00:00'],
    ['15:00:00', '16:00:00'],
    ['16:00:00', '17:00:00']
  ];

  console.log('📅 测试日期:', today);
  console.log('');

  for (const [start, end] of timeSlots) {
    const params = new URLSearchParams({
      date: today,
      time_start: start,
      time_end: end
    });

    try {
      const response = await fetch(`http://localhost:3001/api/resources/availability?${params.toString()}`);
      const data = await response.json();

      const status = (data.has_available_room && data.has_available_nurse) ? '✅ 可预约' : '❌ 不可预约';
      const roomCount = data.available_rooms?.length || 0;
      const nurseCount = data.available_nurses?.length || 0;

      console.log(`⏰ ${start.substring(0,5)}-${end.substring(0,5)}: ${status} (房间:${roomCount}, 护士:${nurseCount})`);

    } catch (error) {
      console.log(`⏰ ${start.substring(0,5)}-${end.substring(0,5)}: ❌ 查询失败`);
    }
  }
}

testMultipleTimes();
