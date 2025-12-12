const { Pool } = require('pg');
const fs = require('fs');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function executeMigration() {
  console.log('🔧 执行数据库迁移：添加 doctor_id 字段到 schedules 表...\n');
  
  try {
    // Read the migration file
    const migrationSQL = fs.readFileSync('database/migrations/08-add-doctor-id-to-schedules.sql', 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ 数据库迁移执行成功！');
    
    // Verify the migration
    console.log('\n🔍 验证迁移结果...');
    
    // Check if doctor_id column exists
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'schedules' AND column_name = 'doctor_id'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log(`✅ doctor_id 字段已添加: ${columnCheck.rows[0].data_type}`);
    } else {
      console.log('❌ doctor_id 字段未找到');
    }
    
    // Check existing schedules with doctor_id
    const schedulesWithDoctor = await pool.query(`
      SELECT s.id, s.doctor_id, a.customer_name, a.doctor_id as appointment_doctor_id
      FROM schedules s
      INNER JOIN appointments a ON s.appointment_id = a.id
      INNER JOIN services srv ON a.service_id = srv.id
      WHERE srv.category IN ('consultation', 'report')
        AND s.doctor_id IS NOT NULL
      LIMIT 5
    `);
    
    console.log(`\n📊 找到 ${schedulesWithDoctor.rows.length} 个已设置 doctor_id 的排班记录`);
    schedulesWithDoctor.rows.forEach((schedule, index) => {
      console.log(`  ${index + 1}. ${schedule.customer_name} - 排班doctor_id: ${schedule.doctor_id}, 预约doctor_id: ${schedule.appointment_doctor_id}`);
    });
    
    // Test doctor schedule query
    console.log('\n🔍 测试医生排班查询...');
    
    // Get a doctor for testing
    const doctorResult = await pool.query(`
      SELECT id, store_id, full_name FROM profiles 
      WHERE role = 'doctor' AND store_id IS NOT NULL 
      LIMIT 1
    `);
    
    if (doctorResult.rows.length > 0) {
      const doctor = doctorResult.rows[0];
      console.log(`使用医生 ${doctor.full_name} (${doctor.id}) 进行测试`);
      
      const doctorSchedules = await pool.query(`
        SELECT
          s.*,
          a.customer_name,
          a.doctor_id,
          a.store_id as appointment_store_id,
          srv.name as service_name,
          srv.category as service_category
        FROM schedules s
        INNER JOIN appointments a ON s.appointment_id = a.id
        LEFT JOIN services srv ON a.service_id = srv.id
        WHERE srv.category IN ('consultation', 'report')
          AND s.status != 'cancelled'
          AND (s.doctor_id = $1 OR a.doctor_id = $1)
          AND a.store_id = $2
        ORDER BY s.scheduled_date, s.scheduled_time_start
        LIMIT 10
      `, [doctor.id, doctor.store_id]);
      
      console.log(`医生排班查询结果: ${doctorSchedules.rows.length} 条记录`);
      if (doctorSchedules.rows.length > 0) {
        doctorSchedules.rows.forEach((schedule, index) => {
          console.log(`  ${index + 1}. ${schedule.customer_name} - ${schedule.service_name} - ${schedule.scheduled_date}`);
        });
      } else {
        console.log('  没有找到排班记录');
      }
    } else {
      console.log('⚠️ 没有找到可用的医生用户进行测试');
    }
    
    console.log('\n✅ 迁移验证完成！');
    
  } catch (error) {
    console.error('❌ 迁移执行失败:', error);
  } finally {
    await pool.end();
  }
}

// Run the migration
executeMigration();