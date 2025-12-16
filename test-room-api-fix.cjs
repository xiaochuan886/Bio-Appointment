const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function testRoomAPI() {
  try {
    console.log('🔍 测试修复后的房间API...\n');

    // 1. 测试数据库中的房间数据
    console.log('1. 检查数据库中的房间数据:');
    const allResources = await pool.query('SELECT type, COUNT(*) as count FROM resources GROUP BY type');
    console.log('   资源类型分布:', allResources.rows);
    
    const roomResources = await pool.query(`
      SELECT id, name, type, status, store_id 
      FROM resources 
      WHERE type IN ('room', 'vip', 'treatment', 'consultation') 
      ORDER BY name
    `);
    console.log('   房间类型资源数量:', roomResources.rows.length);
    console.log('   房间样本:', roomResources.rows.slice(0, 3));

    // 2. 测试修复后的API查询逻辑
    console.log('\n2. 测试修复后的API查询逻辑:');
    const query = `
      SELECT * FROM resources
       WHERE type IN ($1, $2, $3, $4) AND status = 'available'
       ORDER BY name
    `;
    const params = ['room', 'vip', 'treatment', 'consultation'];
    console.log('   查询SQL:', query);
    console.log('   查询参数:', params);
    
    const apiResult = await pool.query(query, params);
    console.log('   API查询结果数量:', apiResult.rows.length);
    console.log('   API查询样本:', apiResult.rows.slice(0, 3));

    // 3. 测试数据转换逻辑
    console.log('\n3. 测试数据转换逻辑:');
    const transformedRooms = apiResult.rows.map(resource => {
      let room_type = 'treatment'; // default
      
      // 优先使用数据库中的 type 字段
      if (['vip', 'treatment', 'consultation'].includes(resource.type)) {
        room_type = resource.type;
      } else if (resource.type === 'room') {
        // 对于旧的 type='room' 的记录，从名称推断
        if (resource.name.includes('VIP')) {
          room_type = 'vip';
        } else if (resource.name.includes('咨询')) {
          room_type = 'consultation';
        }
      }
      
      return {
        id: resource.id,
        name: resource.name,
        room_type: room_type,
        is_available: resource.status === 'available',
        store_id: resource.store_id,
        created_at: resource.created_at || new Date().toISOString()
      };
    });
    
    console.log('   转换后数量:', transformedRooms.length);
    console.log('   转换后样本:', transformedRooms.slice(0, 3));

    // 4. 模拟前端API调用
    console.log('\n4. 模拟前端API调用:');
    const response = await fetch('http://localhost:3001/api/resources/rooms/available');
    const data = await response.json();
    console.log('   API响应状态:', response.status);
    console.log('   API返回数量:', data.length);
    console.log('   API返回样本:', data.slice(0, 3));

    console.log('\n✅ 房间API测试完成!');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await pool.end();
  }
}

testRoomAPI();