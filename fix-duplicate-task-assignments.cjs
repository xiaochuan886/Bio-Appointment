#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function fixDuplicateTaskAssignments() {
  console.log('🔧 修复重复分配的任务...\n');

  try {
    // 1. 查找重复分配的预约
    console.log('1. 查找重复分配的预约...');
    const duplicateQuery = `
      SELECT 
        a.id as appointment_id,
        a.customer_name,
        srv.name as service_name,
        COUNT(s.id) as schedule_count,
        ARRAY_AGG(s.id ORDER BY s.created_at) as schedule_ids,
        ARRAY_AGG(p.full_name ORDER BY s.created_at) as nurse_names
      FROM appointments a
      LEFT JOIN services srv ON a.service_id = srv.id
      LEFT JOIN schedules s ON a.id = s.appointment_id
      LEFT JOIN profiles p ON s.nurse_id = p.id
      WHERE s.scheduled_date >= CURRENT_DATE - INTERVAL '1 day'
      GROUP BY a.id, a.customer_name, srv.name
      HAVING COUNT(s.id) > 1
      ORDER BY a.customer_name
    `;

    const { rows: duplicates } = await pool.query(duplicateQuery);
    console.log(`⚠️  发现 ${duplicates.length} 个重复分配的预约`);

    if (duplicates.length === 0) {
      console.log('✅ 没有发现重复分配的任务');
      return;
    }

    // 2. 处理每个重复分配的预约
    console.log('\n2. 处理重复分配的预约...');
    let fixedCount = 0;
    
    for (const duplicate of duplicates) {
      console.log(`\n处理预约: ${duplicate.customer_name} - ${duplicate.service_name}`);
      console.log(`  重复次数: ${duplicate.schedule_count}`);
      console.log(`  分配给: ${duplicate.nurse_names.join(', ')}`);
      
      const scheduleIds = duplicate.schedule_ids;
      
      // 保留最新创建的排班记录，删除其他的
      const keepScheduleId = scheduleIds[scheduleIds.length - 1]; // 最后创建的
      const deleteScheduleIds = scheduleIds.slice(0, -1); // 其他的都删除
      
      console.log(`  保留排班ID: ${keepScheduleId}`);
      console.log(`  删除排班ID: ${deleteScheduleIds.join(', ')}`);
      
      // 删除重复的排班记录
      if (deleteScheduleIds.length > 0) {
        // 先删除相关的任务执行记录
        const deleteTaskExecutionsQuery = `
          DELETE FROM task_executions 
          WHERE schedule_id = ANY($1)
        `;
        
        const { rowCount: deletedTaskExecutions } = await pool.query(deleteTaskExecutionsQuery, [deleteScheduleIds]);
        if (deletedTaskExecutions > 0) {
          console.log(`  🗑️  删除了 ${deletedTaskExecutions} 个相关的任务执行记录`);
        }
        
        // 然后删除重复的排班记录
        const deleteSchedulesQuery = `
          DELETE FROM schedules 
          WHERE id = ANY($1)
        `;
        
        await pool.query(deleteSchedulesQuery, [deleteScheduleIds]);
        console.log(`  ✅ 已删除 ${deleteScheduleIds.length} 个重复排班`);
        fixedCount++;
      }
    }

    console.log(`\n🎉 修复完成！共处理了 ${fixedCount} 个重复分配的预约`);

    // 3. 验证修复结果
    console.log('\n3. 验证修复结果...');
    const verifyQuery = `
      SELECT 
        a.customer_name,
        srv.name as service_name,
        COUNT(s.id) as schedule_count
      FROM appointments a
      LEFT JOIN services srv ON a.service_id = srv.id
      LEFT JOIN schedules s ON a.id = s.appointment_id
      WHERE s.scheduled_date >= CURRENT_DATE - INTERVAL '1 day'
      GROUP BY a.id, a.customer_name, srv.name
      HAVING COUNT(s.id) > 1
    `;

    const { rows: remainingDuplicates } = await pool.query(verifyQuery);
    
    if (remainingDuplicates.length === 0) {
      console.log('✅ 验证通过：没有剩余的重复分配');
    } else {
      console.log(`⚠️  仍有 ${remainingDuplicates.length} 个重复分配需要手动处理`);
    }

    // 4. 检查特定的张三预约
    console.log('\n4. 检查张三的预约分配情况...');
    const zhangSanQuery = `
      SELECT 
        s.id,
        s.nurse_id,
        p.full_name as nurse_name,
        s.status,
        s.created_at
      FROM schedules s
      LEFT JOIN profiles p ON s.nurse_id = p.id
      LEFT JOIN appointments a ON s.appointment_id = a.id
      WHERE a.customer_name = '张三'
        AND s.scheduled_date >= CURRENT_DATE - INTERVAL '1 day'
      ORDER BY s.created_at
    `;

    const { rows: zhangSanSchedules } = await pool.query(zhangSanQuery);
    console.log(`📋 张三的排班记录 (${zhangSanSchedules.length} 条):`);
    
    zhangSanSchedules.forEach((schedule, index) => {
      console.log(`  ${index + 1}. 护士: ${schedule.nurse_name}, 状态: ${schedule.status}, 创建时间: ${schedule.created_at}`);
    });

  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await pool.end();
  }
}

fixDuplicateTaskAssignments();