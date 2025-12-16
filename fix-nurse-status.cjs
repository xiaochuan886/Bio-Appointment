const { Pool } = require('pg');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const pool = new Pool({
  connectionString: envVars.DATABASE_URL
});

async function fixNurseStatus() {
  console.log('🔧 修复护士资源状态\n');

  try {
    // 1. 查看当前护士状态
    const checkResult = await pool.query(`
      SELECT id, name, type, status, store_id
      FROM resources
      WHERE type = 'nurse'
      ORDER BY name
    `);

    console.log('📋 当前护士资源状态:');
    checkResult.rows.forEach(r => {
      console.log('  - ' + r.name + ': status=' + (r.status || 'NULL') + ', store_id=' + (r.store_id || 'NULL'));
    });
    console.log('');

    // 2. 将所有status为NULL的护士设置为'available'
    const updateResult = await pool.query(`
      UPDATE resources
      SET status = 'available'
      WHERE type = 'nurse' AND (status IS NULL OR status != 'available')
      RETURNING id, name, status
    `);

    if (updateResult.rowCount > 0) {
      console.log('✅ 已更新 ' + updateResult.rowCount + ' 个护士资源的状态为 available:');
      updateResult.rows.forEach(r => {
        console.log('  - ' + r.name);
      });
    } else {
      console.log('ℹ️  所有护士资源状态已正确');
    }

    await pool.end();

  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    await pool.end();
  }
}

fixNurseStatus();
