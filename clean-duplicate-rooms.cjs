const { Pool } = require('pg');

// 清理数据库中的重复房间记录
async function cleanDuplicateRooms() {
  const pool = new Pool({
    host: '127.0.0.1',
    port: 5437,
    database: 'bio_appointment',
    user: 'app_user',
    password: 'secure_password_123',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  try {
    console.log('🔍 开始清理重复房间记录...\n');

    // 1. 查看所有房间记录
    console.log('1️⃣ 查看所有房间记录...');
    const allRoomsQuery = `
      SELECT id, name, type, status, store_id, created_at
      FROM resources 
      WHERE type = 'room'
      ORDER BY name, created_at
    `;
    const allRoomsResult = await pool.query(allRoomsQuery);
    
    console.log(`✅ 数据库中共有 ${allRoomsResult.rows.length} 条房间记录:`);
    allRoomsResult.rows.forEach((room, index) => {
      console.log(`  ${index + 1}. ID: ${room.id}, 名称: ${room.name}, 类型: ${room.type}, 创建时间: ${room.created_at}`);
    });

    // 2. 分析重复的房间名称
    console.log('\n2️⃣ 分析重复的房间名称...');
    const roomNames = allRoomsResult.rows.map(r => r.name);
    const duplicateNames = roomNames.filter((name, index) => roomNames.indexOf(name) !== index);
    const uniqueDuplicates = [...new Set(duplicateNames)];
    
    if (uniqueDuplicates.length > 0) {
      console.log(`❌ 发现 ${uniqueDuplicates.length} 个重复的房间名称:`, uniqueDuplicates);
      
      // 3. 为每个重复名称选择保留最新记录
      console.log('\n3️⃣ 清理重复记录...');
      let totalDeleted = 0;
      
      for (const duplicateName of uniqueDuplicates) {
        const duplicateRooms = allRoomsResult.rows.filter(r => r.name === duplicateName);
        console.log(`\n处理重复房间: "${duplicateName}" (${duplicateRooms.length} 条记录)`);
        
        // 按创建时间排序，保留最新的
        duplicateRooms.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const keepRoom = duplicateRooms[0];
        const deleteRooms = duplicateRooms.slice(1);
        
        console.log(`  保留: ID ${keepRoom.id} (创建时间: ${keepRoom.created_at})`);
        console.log(`  删除: ${deleteRooms.map(r => r.id).join(', ')}`);
        
        // 删除重复记录
        for (const deleteRoom of deleteRooms) {
          // 先检查是否有排班引用这个房间
          const scheduleCheckQuery = `
            SELECT COUNT(*) as count FROM schedules WHERE room_id = $1
          `;
          const scheduleCheckResult = await pool.query(scheduleCheckQuery, [deleteRoom.id]);
          
          if (parseInt(scheduleCheckResult.rows[0].count) > 0) {
            console.log(`  ⚠️ 房间 ${deleteRoom.id} 有排班引用，暂时保留`);
            continue;
          }
          
          const deleteQuery = `DELETE FROM resources WHERE id = $1`;
          await pool.query(deleteQuery, [deleteRoom.id]);
          totalDeleted++;
          console.log(`  ✅ 已删除房间 ${deleteRoom.id}`);
        }
      }
      
      console.log(`\n✅ 总共删除了 ${totalDeleted} 条重复房间记录`);
    } else {
      console.log('✅ 没有发现重复的房间名称');
    }

    // 4. 验证清理结果
    console.log('\n4️⃣ 验证清理结果...');
    const afterCleanupQuery = `
      SELECT id, name, type, status, store_id
      FROM resources 
      WHERE type = 'room'
      ORDER BY name
    `;
    const afterCleanupResult = await pool.query(afterCleanupQuery);
    
    console.log(`✅ 清理后数据库中有 ${afterCleanupResult.rows.length} 条房间记录:`);
    afterCleanupResult.rows.forEach((room, index) => {
      console.log(`  ${index + 1}. ID: ${room.id}, 名称: ${room.name}, 类型: ${room.type}`);
    });

    // 5. 检查房间名称唯一性
    const afterNames = afterCleanupResult.rows.map(r => r.name);
    const afterDuplicates = afterNames.filter((name, index) => afterNames.indexOf(name) !== index);
    
    if (afterDuplicates.length === 0) {
      console.log('\n✅ 房间名称唯一性验证通过！');
    } else {
      console.log('\n❌ 仍有重复房间名称:', [...new Set(afterDuplicates)]);
    }

    console.log('\n🎯 房间重复记录清理完成！');

  } catch (error) {
    console.error('❌ 清理失败:', error);
  } finally {
    await pool.end();
  }
}

// 运行清理
cleanDuplicateRooms();