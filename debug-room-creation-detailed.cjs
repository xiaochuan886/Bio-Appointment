const { Pool } = require('pg');

// 数据库连接配置
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

async function testRoomCreation() {
  console.log('🔍 开始详细调试房间创建问题...');
  
  try {
    // 1. 检查数据库连接
    console.log('\n📋 步骤1: 检查数据库连接');
    const connectionTest = await pool.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ 数据库连接正常:', connectionTest.rows[0]);
    
    // 2. 检查resources表结构
    console.log('\n📋 步骤2: 检查resources表结构');
    const tableStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'resources' 
      ORDER BY ordinal_position
    `);
    console.log('📊 resources表结构:');
    tableStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
    });
    
    // 3. 检查当前房间数据
    console.log('\n📋 步骤3: 检查当前房间数据');
    const currentRooms = await pool.query('SELECT * FROM resources WHERE type = \'room\' ORDER BY created_at DESC');
    console.log(`📊 当前房间数量: ${currentRooms.rows.length}`);
    currentRooms.rows.forEach((room, index) => {
      console.log(`  ${index + 1}. ${room.name} (${room.id}) - ${room.status} - 门店: ${room.store_id}`);
    });
    
    // 4. 测试房间创建
    console.log('\n📋 步骤4: 测试房间创建');
    const testRoomName = `调试测试房间-${Date.now()}`;
    const testStoreId = '4ceaa988-7946-45c7-befa-d3e9ea409969'; // 北戴河门店ID
    
    console.log(`🔧 准备创建房间: ${testRoomName}`);
    
    // 开始事务
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      console.log('🔧 事务已开始');
      
      // 插入房间
      const insertResult = await client.query(`
        INSERT INTO resources (name, type, status, store_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [testRoomName, 'room', 'available', testStoreId]);
      
      console.log('🔧 INSERT执行成功:', insertResult.rows[0]);
      
      // 立即验证插入
      const verifyResult = await client.query('SELECT * FROM resources WHERE id = $1', [insertResult.rows[0].id]);
      console.log('🔧 立即验证结果:', verifyResult.rows.length > 0 ? '✅ 找到记录' : '❌ 未找到记录');
      
      // 提交事务
      await client.query('COMMIT');
      console.log('🔧 事务已提交');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.log('🔧 事务已回滚:', error.message);
      throw error;
    } finally {
      client.release();
      console.log('🔧 数据库连接已释放');
    }
    
    // 5. 再次检查房间数据
    console.log('\n📋 步骤5: 事务提交后再次检查房间数据');
    const finalRooms = await pool.query('SELECT * FROM resources WHERE type = \'room\' ORDER BY created_at DESC');
    console.log(`📊 最终房间数量: ${finalRooms.rows.length}`);
    
    // 查找新创建的房间
    const newRoom = finalRooms.rows.find(room => room.name === testRoomName);
    if (newRoom) {
      console.log('✅ 新房间创建成功:', {
        id: newRoom.id,
        name: newRoom.name,
        status: newRoom.status,
        store_id: newRoom.store_id,
        created_at: newRoom.created_at
      });
    } else {
      console.log('❌ 新房间未找到在数据库中');
      
      // 检查是否有其他新房间
      const otherNewRooms = finalRooms.rows.filter(room => 
        !currentRooms.rows.some(oldRoom => oldRoom.id === room.id)
      );
      if (otherNewRooms.length > 0) {
        console.log('🔍 发现其他新房间:', otherNewRooms);
      } else {
        console.log('🔍 没有发现任何新房间');
      }
    }
    
    // 6. 测试API端点
    console.log('\n📋 步骤6: 测试API端点');
    const apiResponse = await fetch('http://localhost:3001/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      'Authorization': 'Bearer mock.' + Buffer.from(JSON.stringify({
          userId: 'admin-id',
          email: 'admin@test.com',
          role: 'super_admin',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60
        })).toString('base64') + '.signature'
      },
      body: JSON.stringify({
        name: `API测试房间-${Date.now()}`,
        type: 'vip',
        is_available: true,
        store_id: testStoreId
      })
    });
    
    const apiResult = await apiResponse.json();
    console.log('🔧 API响应状态:', apiResponse.status);
    console.log('🔧 API响应数据:', apiResult);
    
    // 7. 最终验证
    console.log('\n📋 步骤7: 最终验证数据库状态');
    const finalVerification = await pool.query('SELECT * FROM resources WHERE type = \'room\' ORDER BY created_at DESC LIMIT 10');
    console.log(`📊 最终验证房间数量: ${finalVerification.rows.length}`);
    finalVerification.rows.forEach((room, index) => {
      console.log(`  ${index + 1}. ${room.name} (${room.id}) - ${room.status} - 门店: ${room.store_id} - 创建时间: ${room.created_at}`);
    });
    
  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error);
  } finally {
    await pool.end();
    console.log('🔧 数据库连接池已关闭');
  }
}

// 运行测试
testRoomCreation();