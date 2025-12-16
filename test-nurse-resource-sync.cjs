const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123'
});

async function testNurseResourceSync() {
  console.log('🧪 测试护士资源自动同步\n');

  try {
    // 1. 查看当前资源
    console.log('📋 测试前的护士资源:');
    const beforeResources = await pool.query(`
      SELECT id, name, type, status, store_id
      FROM resources
      WHERE type = 'nurse'
      ORDER BY name
    `);
    console.log('  总数:', beforeResources.rows.length);
    beforeResources.rows.forEach(r => {
      console.log('  -', r.name, '(状态:', r.status + ')');
    });
    console.log('');

    // 2. 获取一个门店ID
    const storeResult = await pool.query('SELECT id, name FROM stores LIMIT 1');
    const storeId = storeResult.rows[0].id;
    const storeName = storeResult.rows[0].name;

    // 3. 创建一个新护士用户
    console.log('✅ 测试1: 创建新护士用户');
    const testNurseName = '测试护士-' + Date.now();
    const createResult = await pool.query(`
      INSERT INTO profiles (username, email, full_name, role, password_hash, status, store_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, full_name, role
    `, [
      'test_nurse_' + Date.now(),
      'test_nurse@example.com',
      testNurseName,
      'nurse',
      'test123',
      'active',
      storeId
    ]);

    const newNurse = createResult.rows[0];
    console.log('  已创建护士:', newNurse.full_name);

    // 检查是否自动创建了资源
    const resourceCheck1 = await pool.query(
      'SELECT * FROM resources WHERE name = $1 AND type = $2',
      [testNurseName, 'nurse']
    );

    if (resourceCheck1.rows.length > 0) {
      console.log('  ✅ 资源已自动创建');
      console.log('     资源ID:', resourceCheck1.rows[0].id);
      console.log('     状态:', resourceCheck1.rows[0].status);
      console.log('     门店:', resourceCheck1.rows[0].store_id);
    } else {
      console.log('  ❌ 资源未自动创建（触发器可能未生效）');
    }
    console.log('');

    // 4. 更新护士的门店
    console.log('✅ 测试2: 更新护士门店');
    const otherStoreResult = await pool.query(
      'SELECT id, name FROM stores WHERE id != $1 LIMIT 1',
      [storeId]
    );
    
    if (otherStoreResult.rows.length > 0) {
      const newStoreId = otherStoreResult.rows[0].id;
      const newStoreName = otherStoreResult.rows[0].name;

      await pool.query(
        'UPDATE profiles SET store_id = $1 WHERE id = $2',
        [newStoreId, newNurse.id]
      );

      console.log('  已更新门店:', storeName, '→', newStoreName);

      // 检查资源是否同步更新
      const resourceCheck2 = await pool.query(
        'SELECT * FROM resources WHERE name = $1 AND type = $2',
        [testNurseName, 'nurse']
      );

      if (resourceCheck2.rows.length > 0 && resourceCheck2.rows[0].store_id === newStoreId) {
        console.log('  ✅ 资源门店已自动同步');
      } else {
        console.log('  ❌ 资源门店未同步');
      }
    }
    console.log('');

    // 5. 停用护士
    console.log('✅ 测试3: 停用护士');
    await pool.query(
      'UPDATE profiles SET status = $1 WHERE id = $2',
      ['disabled', newNurse.id]
    );

    const resourceCheck3 = await pool.query(
      'SELECT * FROM resources WHERE name = $1 AND type = $2',
      [testNurseName, 'nurse']
    );

    if (resourceCheck3.rows.length > 0 && resourceCheck3.rows[0].status === 'unavailable') {
      console.log('  ✅ 资源状态已自动更新为 unavailable');
    } else {
      console.log('  ❌ 资源状态未同步');
    }
    console.log('');

    // 6. 重新激活护士
    console.log('✅ 测试4: 重新激活护士');
    await pool.query(
      'UPDATE profiles SET status = $1 WHERE id = $2',
      ['active', newNurse.id]
    );

    const resourceCheck4 = await pool.query(
      'SELECT * FROM resources WHERE name = $1 AND type = $2',
      [testNurseName, 'nurse']
    );

    if (resourceCheck4.rows.length > 0 && resourceCheck4.rows[0].status === 'available') {
      console.log('  ✅ 资源状态已自动更新为 available');
    } else {
      console.log('  ❌ 资源状态未同步');
    }
    console.log('');

    // 7. 清理测试数据
    console.log('🧹 清理测试数据');
    await pool.query('DELETE FROM resources WHERE name = $1', [testNurseName]);
    await pool.query('DELETE FROM profiles WHERE id = $1', [newNurse.id]);
    console.log('  已清理');
    console.log('');

    // 8. 查看最终资源
    console.log('📋 测试后的护士资源:');
    const afterResources = await pool.query(`
      SELECT id, name, type, status, store_id
      FROM resources
      WHERE type = 'nurse'
      ORDER BY name
    `);
    console.log('  总数:', afterResources.rows.length);
    afterResources.rows.forEach(r => {
      console.log('  -', r.name, '(状态:', r.status + ')');
    });

    console.log('');
    console.log('🎉 测试完成！');

    await pool.end();

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error);
    await pool.end();
  }
}

testNurseResourceSync();
