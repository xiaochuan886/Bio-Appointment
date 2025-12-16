const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function testSpecificRoomDeletion() {
  console.log('🧪 测试特定房间ID的删除功能...\n');

  try {
    // 用户报告的房间ID
    const roomIdToDelete = '39396ef8-5b0c-43a0-a688-334c075f3766';
    
    console.log(`🔍 查找房间ID: ${roomIdToDelete}`);
    
    // 1. 检查房间是否存在（使用修复后的查询条件）
    const existingRoom = await pool.query(
      'SELECT * FROM resources WHERE id = $1 AND type IN ($2, $3, $4, $5)', 
      [roomIdToDelete, 'room', 'vip', 'treatment', 'consultation']
    );
    
    if (existingRoom.rows.length === 0) {
      console.log('❌ 房间不存在');
      return;
    }
    
    const room = existingRoom.rows[0];
    console.log(`✅ 找到房间: ${room.name} (类型: ${room.type})`);
    
    // 2. 检查是否被排班使用
    const scheduleCheck = await pool.query(
      'SELECT COUNT(*) as count FROM schedules WHERE room_id = $1',
      [roomIdToDelete]
    );
    
    console.log(`📊 排班使用次数: ${scheduleCheck.rows[0].count}`);
    
    if (parseInt(scheduleCheck.rows[0].count) > 0) {
      console.log('⚠️ 房间正在被排班使用，无法删除');
      return;
    }
    
    // 3. 执行删除（使用修复后的查询条件）
    console.log('🗑️ 执行删除操作...');
    const deleteResult = await pool.query(
      'DELETE FROM resources WHERE id = $1 AND type IN ($2, $3, $4, $5) RETURNING *',
      [roomIdToDelete, 'room', 'vip', 'treatment', 'consultation']
    );
    
    if (deleteResult.rows.length > 0) {
      console.log(`✅ 成功删除房间: ${deleteResult.rows[0].name}`);
    } else {
      console.log('❌ 删除失败');
    }
    
    // 4. 验证删除结果
    const verifyResult = await pool.query(
      'SELECT * FROM resources WHERE id = $1',
      [roomIdToDelete]
    );
    
    if (verifyResult.rows.length === 0) {
      console.log('✅ 验证成功：房间已从数据库中删除');
    } else {
      console.log('❌ 验证失败：房间仍然存在');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  } finally {
    await pool.end();
  }
}

// 运行测试
testSpecificRoomDeletion();