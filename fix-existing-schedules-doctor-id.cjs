const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function fixExistingSchedulesDoctorId() {
  console.log('🔧 修复现有排班的 doctor_id 字段...\n');
  
  try {
    // 1. 查找所有医生服务的排班，但缺少doctor_id的记录
    console.log('1️⃣ 查找需要修复的排班记录...');
    const schedulesWithoutDoctor = await pool.query(`
      SELECT s.id, s.appointment_id, a.doctor_id, a.customer_name, srv.name as service_name, srv.category as service_category
      FROM schedules s
      INNER JOIN appointments a ON s.appointment_id = a.id
      LEFT JOIN services srv ON a.service_id = srv.id
      WHERE srv.category IN ('consultation', 'report')
        AND s.doctor_id IS NULL
        AND a.doctor_id IS NOT NULL
        AND s.status != 'cancelled'
    `);
    
    console.log(`找到 ${schedulesWithoutDoctor.rows.length} 个需要修复的排班记录`);
    
    if (schedulesWithoutDoctor.rows.length === 0) {
      console.log('✅ 没有需要修复的排班记录');
      return;
    }
    
    // 2. 显示需要修复的记录
    console.log('\n需要修复的排班记录:');
    schedulesWithoutDoctor.rows.forEach((schedule, index) => {
      console.log(`  ${index + 1}. ${schedule.customer_name} - ${schedule.service_name} - 预约doctor_id: ${schedule.doctor_id}`);
    });
    
    // 3. 修复这些记录
    console.log('\n2️⃣ 修复排班记录...');
    let fixedCount = 0;
    
    for (const schedule of schedulesWithoutDoctor.rows) {
      try {
        await pool.query(`
          UPDATE schedules 
          SET doctor_id = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [schedule.doctor_id, schedule.id]);
        
        console.log(`✅ 修复排班: ${schedule.customer_name} - 设置doctor_id为 ${schedule.doctor_id}`);
        fixedCount++;
      } catch (error) {
        console.error(`❌ 修复排班失败 ${schedule.customer_name}:`, error.message);
      }
    }
    
    console.log(`\n✅ 成功修复 ${fixedCount} 个排班记录`);
    
    // 4. 验证修复结果
    console.log('\n3️⃣ 验证修复结果...');
    
    // 获取一个医生进行测试
    const doctorResult = await pool.query(`
      SELECT id, full_name, store_id FROM profiles 
      WHERE role = 'doctor' AND store_id IS NOT NULL 
      LIMIT 1
    `);
    
    if (doctorResult.rows.length > 0) {
      const doctor = doctorResult.rows[0];
      console.log(`使用医生 ${doctor.full_name} 进行验证`);
      
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
        console.log('排班记录:');
        doctorSchedules.rows.forEach((schedule, index) => {
          console.log(`  ${index + 1}. ${schedule.customer_name} - ${schedule.service_name} - ${schedule.scheduled_date}`);
        });
      }
    }
    
    console.log('\n✅ 修复完成！');
    
  } catch (error) {
    console.error('❌ 修复过程中出错:', error);
  } finally {
    await pool.end();
  }
}

// Run the fix
fixExistingSchedulesDoctorId();