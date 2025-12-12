const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'appointment_system',
  password: 'postgres',
  port: 5432,
});

async function cleanDuplicateSchedules() {
  console.log('🧹 清理重复排班记录...\n');

  try {
    // 1. 查找重复的排班记录
    console.log('1. 查找重复的排班记录...');
    const duplicatesResult = await pool.query(`
      SELECT 
        appointment_id,
        COUNT(*) as count,
        ARRAY_AGG(id ORDER BY created_at) as schedule_ids
      FROM schedules 
      WHERE status != 'cancelled'
      GROUP BY appointment_id 
      HAVING COUNT(*) > 1
    `);
    
    console.log(`发现 ${duplicatesResult.rows.length} 个预约有重复排班`);
    
    if (duplicatesResult.rows.length === 0) {
      console.log('✅ 没有重复排班，无需清理');
      return;
    }

    // 2. 显示重复排班详情
    console.log('\n2. 重复排班详情:');
    for (const duplicate of duplicatesResult.rows) {
      console.log(`预约 ${duplicate.appointment_id}: ${duplicate.count} 个排班`);
      console.log(`  排班IDs: ${duplicate.schedule_ids.join(', ')}`);
      
      // 获取预约详情
      const appointmentResult = await pool.query(
        'SELECT customer_name FROM appointments WHERE id = $1',
        [duplicate.appointment_id]
      );
      
      if (appointmentResult.rows.length > 0) {
        console.log(`  客户: ${appointmentResult.rows[0].customer_name}`);
      }
    }

    // 3. 删除重复的排班记录（保留最早创建的）
    console.log('\n3. 删除重复排班记录...');
    let deletedCount = 0;
    
    for (const duplicate of duplicatesResult.rows) {
      const scheduleIds = duplicate.schedule_ids;
      const keepId = scheduleIds[0]; // 保留最早创建的
      const deleteIds = scheduleIds.slice(1); // 删除其余的
      
      if (deleteIds.length > 0) {
        const deleteResult = await pool.query(
          'DELETE FROM schedules WHERE id = ANY($1) RETURNING id',
          [deleteIds]
        );
        
        deletedCount += deleteResult.rows.length;
        console.log(`✅ 预约 ${duplicate.appointment_id}: 保留 ${keepId}, 删除 ${deleteIds.join(', ')}`);
      }
    }

    console.log(`\n📊 清理完成: 删除了 ${deletedCount} 个重复排班记录`);

    // 4. 验证清理结果
    console.log('\n4. 验证清理结果...');
    const afterCleanupResult = await pool.query(`
      SELECT 
        appointment_id,
        COUNT(*) as count
      FROM schedules 
      WHERE status != 'cancelled'
      GROUP BY appointment_id 
      HAVING COUNT(*) > 1
    `);
    
    if (afterCleanupResult.rows.length === 0) {
      console.log('✅ 清理成功，没有重复排班记录');
    } else {
      console.log(`❌ 仍有 ${afterCleanupResult.rows.length} 个预约有重复排班`);
    }

    // 5. 显示最终统计
    const totalSchedulesResult = await pool.query(
      'SELECT COUNT(*) as total FROM schedules WHERE status != \'cancelled\''
    );
    
    console.log(`\n📈 最终统计: 共有 ${totalSchedulesResult.rows[0].total} 个有效排班记录`);

  } catch (error) {
    console.error('❌ 清理失败:', error);
  } finally {
    await pool.end();
  }
}

cleanDuplicateSchedules();