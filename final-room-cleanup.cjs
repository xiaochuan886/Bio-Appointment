const { Pool } = require('pg');

// 最终清理剩余的重复房间记录
async function finalRoomCleanup() {
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
    console.log('🔍 开始最终清理剩余重复房间记录...\n');

    // 1. 查看当前VIP室1的情况
    console.log('1️⃣ 查看VIP室1的重复情况...');
    const vipRoom1Query = `
      SELECT id, name, type, status, store_id, created_at
      FROM resources 
      WHERE type = 'room' AND name = 'VIP室1'
      ORDER BY created_at
    `;
    const vipRoom1Result = await pool.query(vipRoom1Query);
    
    console.log(`✅ 找到 ${vipRoom1Result.rows.length} 条VIP室1记录:`);
    vipRoom1Result.rows.forEach((room, index) => {
      console.log(`  ${index + 1}. ID: ${room.id}, 创建时间: ${room.created_at}`);
    });

    if (vipRoom1Result.rows.length <= 1) {
      console.log('✅ VIP室1没有重复，无需清理');
      return;
    }

    // 2. 检查哪个VIP室1有排班引用
    console.log('\n2️⃣ 检查排班引用...');
    let referencedRoomId = null;
    let unreferencedRoomId = null;
    
    for (const room of vipRoom1Result.rows) {
      const scheduleCheckQuery = `
        SELECT COUNT(*) as count FROM schedules WHERE room_id = $1
      `;
      const scheduleCheckResult = await pool.query(scheduleCheckQuery, [room.id]);
      
      const count = parseInt(scheduleCheckResult.rows[0].count);
      console.log(`  房间 ${room.id}: ${count} 个排班引用`);
      
      if (count > 0) {
        referencedRoomId = room.id;
        console.log(`    → 有排班引用，保留: ${room.id}`);
      } else {
        unreferencedRoomId = room.id;
        console.log(`    → 无排班引用，可删除: ${room.id}`);
      }
    }

    // 3. 删除无引用的重复记录
    if (unreferencedRoomId) {
      console.log(`\n3️⃣ 删除无引用的重复房间: ${unreferencedRoomId}`);
      
      const deleteQuery = `DELETE FROM resources WHERE id = $1`;
      await pool.query(deleteQuery, [unreferencedRoomId]);
      console.log(`✅ 已删除房间 ${unreferencedRoomId}`);
    } else {
      console.log('\n3️⃣ 所有VIP室1都有排班引用，无法自动删除');
      console.log('💡 建议手动检查并处理重复记录');
    }

    // 4. 验证最终结果
    console.log('\n4️⃣ 验证最终结果...');
    const finalCheckQuery = `
      SELECT id, name, type, status, store_id
      FROM resources 
      WHERE type = 'room'
      ORDER BY name
    `;
    const finalCheckResult = await pool.query(finalCheckQuery);
    
    console.log(`✅ 最终数据库中有 ${finalCheckResult.rows.length} 条房间记录:`);
    const finalRoomNames = finalCheckResult.rows.map(r => r.name);
    const finalDuplicates = finalRoomNames.filter((name, index) => finalRoomNames.indexOf(name) !== index);
    
    if (finalDuplicates.length === 0) {
      console.log('✅ 房间名称唯一性验证通过！');
    } else {
      console.log('❌ 仍有重复房间名称:', [...new Set(finalDuplicates)]);
    }

    console.log('\n🎯 房间重复问题最终修复完成！');

  } catch (error) {
    console.error('❌ 最终清理失败:', error);
  } finally {
    await pool.end();
  }
}

// 运行最终清理
finalRoomCleanup();