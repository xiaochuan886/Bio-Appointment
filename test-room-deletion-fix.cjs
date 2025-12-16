const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function testRoomDeletion() {
  console.log('🧪 开始测试房间删除功能...\n');

  try {
    // 1. 查看当前所有房间
    console.log('📋 当前所有房间:');
    const allRoomsResult = await pool.query(
      'SELECT id, name, type FROM resources WHERE type IN ($1, $2, $3, $4) ORDER BY name',
      ['room', 'vip', 'treatment', 'consultation']
    );
    
    allRoomsResult.rows.forEach(room => {
      console.log(`  - ${room.name} (ID: ${room.id}, Type: ${room.type})`);
    });

    if (allRoomsResult.rows.length === 0) {
      console.log('❌ 没有找到任何房间，请先创建一些房间');
      return;
    }

    // 2. 测试删除每种类型的房间
    const roomsByType = {};
    allRoomsResult.rows.forEach(room => {
      if (!roomsByType[room.type]) {
        roomsByType[room.type] = [];
      }
      roomsByType[room.type].push(room);
    });

    for (const [type, rooms] of Object.entries(roomsByType)) {
      if (rooms.length > 0) {
        const roomToDelete = rooms[0]; // 删除该类型的第一个房间
        console.log(`\n🗑️  测试删除 ${type} 类型的房间: ${roomToDelete.name}`);
        
        // 检查房间是否被排班使用
        const scheduleCheck = await pool.query(
          'SELECT COUNT(*) as count FROM schedules WHERE room_id = $1',
          [roomToDelete.id]
        );
        
        if (parseInt(scheduleCheck.rows[0].count) > 0) {
          console.log(`⚠️  房间 ${roomToDelete.name} 正被排班使用，跳过删除测试`);
          continue;
        }

        // 执行删除
        const deleteResult = await pool.query(
          'DELETE FROM resources WHERE id = $1 AND type IN ($2, $3, $4, $5) RETURNING *',
          [roomToDelete.id, 'room', 'vip', 'treatment', 'consultation']
        );

        if (deleteResult.rows.length > 0) {
          console.log(`✅ 成功删除房间: ${deleteResult.rows[0].name}`);
        } else {
          console.log(`❌ 删除房间失败: ${roomToDelete.name}`);
        }
      }
    }

    // 3. 验证删除后的状态
    console.log('\n📋 删除后的房间列表:');
    const remainingRoomsResult = await pool.query(
      'SELECT id, name, type FROM resources WHERE type IN ($1, $2, $3, $4) ORDER BY name',
      ['room', 'vip', 'treatment', 'consultation']
    );
    
    remainingRoomsResult.rows.forEach(room => {
      console.log(`  - ${room.name} (ID: ${room.id}, Type: ${room.type})`);
    });

    console.log(`\n📊 删除前: ${allRoomsResult.rows.length} 个房间`);
    console.log(`📊 删除后: ${remainingRoomsResult.rows.length} 个房间`);
    console.log(`📊 成功删除: ${allRoomsResult.rows.length - remainingRoomsResult.rows.length} 个房间`);

  } catch (error) {
    console.error('❌ 测试房间删除功能时出错:', error);
  } finally {
    await pool.end();
  }
}

// 运行测试
testRoomDeletion();