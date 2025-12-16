const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123'
});

async function createNurseResources() {
  console.log('🔧 为护士用户创建资源记录\n');

  try {
    // 1. 查看现有护士用户
    const nursesResult = await pool.query(`
      SELECT id, full_name, role, store_id, status
      FROM profiles
      WHERE role IN ('nurse', 'head_nurse')
      ORDER BY full_name
    `);

    console.log('👩‍⚕️ 找到 ' + nursesResult.rows.length + ' 个护士用户:');
    nursesResult.rows.forEach(n => {
      console.log('  - ' + n.full_name + ' (' + n.role + ', 门店: ' + (n.store_id || '未分配') + ')');
    });
    console.log('');

    // 2. 为每个护士创建资源记录
    let created = 0;
    for (const nurse of nursesResult.rows) {
      // 检查是否已存在资源记录
      const existingResource = await pool.query(
        'SELECT id FROM resources WHERE name = $1 AND type = $2',
        [nurse.full_name, 'nurse']
      );

      if (existingResource.rows.length === 0) {
        // 创建资源记录
        await pool.query(`
          INSERT INTO resources (name, type, status, store_id)
          VALUES ($1, $2, $3, $4)
        `, [nurse.full_name, 'nurse', 'available', nurse.store_id]);
        
        console.log('✅ 已创建资源: ' + nurse.full_name);
        created++;
      } else {
        console.log('ℹ️  资源已存在: ' + nurse.full_name);
      }
    }

    console.log('');
    console.log('🎉 完成！共创建 ' + created + ' 个护士资源记录');

    // 3. 验证结果
    const verifyResult = await pool.query(`
      SELECT id, name, type, status, store_id
      FROM resources
      WHERE type = 'nurse'
      ORDER BY name
    `);

    console.log('');
    console.log('📋 当前护士资源列表:');
    verifyResult.rows.forEach(r => {
      console.log('  - ' + r.name + ' (状态: ' + r.status + ', 门店: ' + (r.store_id || '未分配') + ')');
    });

    await pool.end();

  } catch (error) {
    console.error('❌ 创建失败:', error.message);
    await pool.end();
  }
}

createNurseResources();
