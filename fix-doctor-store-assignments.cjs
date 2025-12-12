const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function fixDoctorStoreAssignments() {
  console.log('🔧 修复医生门店分配问题...\n');

  try {
    // 1. 获取所有门店
    const storesResult = await pool.query('SELECT * FROM stores ORDER BY name');
    const stores = storesResult.rows;
    
    console.log('可用门店:');
    stores.forEach((store, index) => {
      console.log(`${index + 1}. ${store.name} (${store.id})`);
    });

    // 2. 获取没有门店ID的医生
    const doctorsResult = await pool.query(
      'SELECT * FROM profiles WHERE role = $1 AND store_id IS NULL',
      ['doctor']
    );
    const doctorsWithoutStore = doctorsResult.rows;

    if (doctorsWithoutStore.length === 0) {
      console.log('\n✅ 所有医生都已正确分配门店');
      return;
    }

    console.log(`\n发现 ${doctorsWithoutStore.length} 个医生没有分配门店:`);
    doctorsWithoutStore.forEach(doctor => {
      console.log(`- ${doctor.full_name} (${doctor.username})`);
    });

    // 3. 根据医生用户名自动分配门店
    const shanghaiStore = stores.find(s => s.name.includes('上海'));
    const defaultStore = stores.find(s => s.name.includes('默认'));

    if (!shanghaiStore || !defaultStore) {
      console.log('❌ 未找到上海门店或默认门店');
      return;
    }

    console.log('\n🔄 自动分配门店...');

    for (const doctor of doctorsWithoutStore) {
      let targetStoreId;
      let targetStoreName;

      // 根据用户名判断应该分配到哪个门店
      if (doctor.username.includes('shanghai') || doctor.full_name.includes('上海')) {
        targetStoreId = shanghaiStore.id;
        targetStoreName = shanghaiStore.name;
      } else {
        targetStoreId = defaultStore.id;
        targetStoreName = defaultStore.name;
      }

      try {
        await pool.query(
          'UPDATE profiles SET store_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [targetStoreId, doctor.id]
        );

        console.log(`✅ ${doctor.full_name} -> ${targetStoreName}`);
      } catch (error) {
        console.log(`❌ 更新 ${doctor.full_name} 失败:`, error.message);
      }
    }

    // 4. 验证修复结果
    console.log('\n📊 验证修复结果...');
    
    const allDoctorsResult = await pool.query(
      'SELECT p.*, s.name as store_name FROM profiles p LEFT JOIN stores s ON p.store_id = s.id WHERE p.role = $1',
      ['doctor']
    );
    
    console.log('所有医生的门店分配:');
    allDoctorsResult.rows.forEach(doctor => {
      const storeInfo = doctor.store_name ? `${doctor.store_name} (${doctor.store_id})` : '❌ 未分配';
      console.log(`- ${doctor.full_name}: ${storeInfo}`);
    });

    // 5. 检查是否还有未分配的医生
    const remainingUnassigned = allDoctorsResult.rows.filter(d => !d.store_id);
    if (remainingUnassigned.length > 0) {
      console.log(`\n⚠️ 仍有 ${remainingUnassigned.length} 个医生未分配门店`);
    } else {
      console.log('\n✅ 所有医生都已正确分配门店');
    }

    // 6. 创建数据验证约束（可选）
    console.log('\n🛡️ 建议添加数据库约束防止未来出现此问题...');
    console.log('可以执行以下SQL来添加约束:');
    console.log(`
-- 为医生角色添加门店ID非空约束
ALTER TABLE profiles 
ADD CONSTRAINT check_doctor_has_store 
CHECK (role != 'doctor' OR store_id IS NOT NULL);
    `);

  } catch (error) {
    console.error('❌ 修复失败:', error.message);
  } finally {
    await pool.end();
  }
}

fixDoctorStoreAssignments();