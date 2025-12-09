const axios = require('axios');

// 测试前端房间显示问题
async function testFrontendRoomDisplay() {
  console.log('🔍 开始测试前端房间显示问题...\n');

  try {
    // 1. 模拟护士长登录
    console.log('1️⃣ 模拟护士长登录...');
    const loginResponse = await axios.post('http://127.0.0.1:3001/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('✅ 登录成功:', { role: user.role, store_id: user.profile?.store_id });

    // 2. 获取房间数据（API层面）
    console.log('\n2️⃣ 获取房间数据（API层面）...');
    const roomsResponse = await axios.get('http://127.0.0.1:3001/api/rooms', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const rooms = roomsResponse.data;
    console.log(`✅ API返回房间数量: ${rooms.length}`);
    console.log('房间列表:');
    rooms.forEach((room, index) => {
      console.log(`  ${index + 1}. ID: ${room.id}, 名称: ${room.name}, 类型: ${room.room_type}`);
    });

    // 3. 检查房间名称是否有重复
    console.log('\n3️⃣ 检查房间名称重复情况...');
    const roomNames = rooms.map(r => r.name);
    const duplicateNames = roomNames.filter((name, index) => roomNames.indexOf(name) !== index);
    const uniqueDuplicates = [...new Set(duplicateNames)];
    
    if (uniqueDuplicates.length > 0) {
      console.log('❌ 发现重复的房间名称:', uniqueDuplicates);
      uniqueDuplicates.forEach(name => {
        const duplicateRooms = rooms.filter(r => r.name === name);
        console.log(`  - "${name}" 出现 ${duplicateRooms.length} 次:`);
        duplicateRooms.forEach(room => {
          console.log(`    * ID: ${room.id}, 类型: ${room.room_type}`);
        });
      });
    } else {
      console.log('✅ 房间名称没有重复');
    }

    // 4. 获取排班数据（检查排班中的房间引用）
    console.log('\n4️⃣ 获取排班数据...');
    const schedulesResponse = await axios.get('http://127.0.0.1:3001/api/schedules', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        date: new Date().toISOString().split('T')[0]
      }
    });
    
    const schedules = schedulesResponse.data;
    console.log(`✅ 获取到 ${schedules.length} 条排班记录`);
    
    // 5. 分析排班中的房间引用
    console.log('\n5️⃣ 分析排班中的房间引用...');
    const scheduleRoomReferences = schedules.map(s => ({
      scheduleId: s.id,
      roomId: s.room_id,
      roomName: s.room_name,
      customerName: s.appointment?.customer_name
    }));
    
    console.log('排班房间引用情况:');
    scheduleRoomReferences.forEach(ref => {
      const room = rooms.find(r => r.id === ref.roomId);
      const matchStatus = room ? '✅ ID匹配' : '❌ ID不匹配';
      console.log(`  - 排班 ${ref.scheduleId}: ${ref.customerName} -> 房间 ${ref.roomName} (${ref.roomId}) ${matchStatus}`);
      
      if (!room && ref.roomName) {
        const roomByName = rooms.find(r => r.name === ref.roomName);
        if (roomByName) {
          console.log(`    ⚠️ 但名称匹配到房间 ID: ${roomByName.id}`);
        }
      }
    });

    // 6. 模拟前端筛选逻辑
    console.log('\n6️⃣ 模拟前端筛选逻辑...');
    
    // 模拟 filteredRooms 逻辑
    const selectedRoomIds = []; // 空筛选条件
    const filteredRooms = selectedRoomIds.length > 0 
      ? rooms.filter(room => selectedRoomIds.includes(room.id))
      : rooms;
    
    console.log(`✅ filteredRooms 数量: ${filteredRooms.length}`);
    
    // 模拟每个视图的房间显示
    console.log('\n7️⃣ 分析各视图房间显示...');
    
    // 日视图房间显示
    console.log('日视图房间显示:');
    filteredRooms.forEach((room, index) => {
      console.log(`  ${index + 1}. ${room.name} (${room.room_type})`);
    });
    
    // 周视图房间显示
    console.log('周视图房间显示:');
    filteredRooms.forEach((room, index) => {
      console.log(`  ${index + 1}. ${room.name} (${room.room_type})`);
    });
    
    // 月视图房间显示（月视图显示排班汇总，不直接显示房间列表）
    console.log('月视图: 显示排班汇总，不直接显示房间列表');

    // 8. 检查可能的重复显示源
    console.log('\n8️⃣ 检查可能的重复显示源...');
    
    // 检查是否有相同的房间被多次渲染
    const roomDisplayCount = {};
    filteredRooms.forEach(room => {
      roomDisplayCount[room.name] = (roomDisplayCount[room.name] || 0) + 1;
    });
    
    console.log('房间显示次数统计:');
    Object.entries(roomDisplayCount).forEach(([name, count]) => {
      if (count > 1) {
        console.log(`❌ "${name}" 显示了 ${count} 次`);
      } else {
        console.log(`✅ "${name}" 显示了 ${count} 次`);
      }
    });

    console.log('\n🎯 前端房间显示分析完成');
    
    // 9. 给出诊断结论
    console.log('\n📋 诊断结论:');
    if (uniqueDuplicates.length > 0) {
      console.log('❌ 问题确认: API返回的房间数据中存在名称重复');
      console.log('💡 建议: 检查数据库中的房间记录，确保名称唯一');
    } else if (Object.values(roomDisplayCount).some(count => count > 1)) {
      console.log('❌ 问题确认: 前端渲染逻辑中存在重复显示');
      console.log('💡 建议: 检查 GanttChart 组件的房间渲染逻辑');
    } else {
      console.log('✅ API和前端渲染逻辑正常，可能是其他原因导致的显示问题');
      console.log('💡 建议: 检查浏览器控制台错误和网络请求');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testFrontendRoomDisplay();