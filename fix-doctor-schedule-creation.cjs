const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function fixDoctorScheduleCreation() {
  console.log('🔧 开始修复医生排班创建问题...\n');
  
  try {
    // 1. 检查医生确认的预约但没有对应排班的情况
    console.log('1️⃣ 检查医生确认的预约但没有对应排班的情况...');
    const doctorConfirmedWithoutSchedule = await pool.query(`
      SELECT a.*, s.category as service_category
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      WHERE a.workflow_status = 'doctor_confirmed'
        AND s.category IN ('consultation', 'report')
        AND NOT EXISTS (
          SELECT 1 FROM schedules sch 
          WHERE sch.appointment_id = a.id AND sch.status != 'cancelled'
        )
    `);
    
    console.log(`找到 ${doctorConfirmedWithoutSchedule.rows.length} 个医生确认但没有排班的预约`);
    
    if (doctorConfirmedWithoutSchedule.rows.length > 0) {
      console.log('预约详情:');
      doctorConfirmedWithoutSchedule.rows.forEach((apt, index) => {
        console.log(`  ${index + 1}. ${apt.customer_name} - ${apt.service_category} - ${apt.requested_date}`);
      });
      
      // 2. 为这些预约创建排班
      console.log('\n2️⃣ 为这些预约创建排班...');
      for (const apt of doctorConfirmedWithoutSchedule.rows) {
        try {
          // 检查是否已有排班（双重检查）
          const existingSchedule = await pool.query(
            'SELECT id FROM schedules WHERE appointment_id = $1 AND status != \'cancelled\'',
            [apt.id]
          );
          
          if (existingSchedule.rows.length === 0) {
            const scheduleResult = await pool.query(`
              INSERT INTO schedules (
                appointment_id, 
                scheduled_date, 
                scheduled_time_start, 
                scheduled_time_end, 
                status, 
                created_at, 
                updated_at
              ) VALUES ($1, $2, $3, $4, 'scheduled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              RETURNING *
            `, [
              apt.id,
              apt.requested_date,
              apt.requested_time_start,
              apt.requested_time_end
            ]);
            
            console.log(`✅ 为预约 ${apt.customer_name} 创建排班成功: ${scheduleResult.rows[0].id}`);
          } else {
            console.log(`⚠️ 预约 ${apt.customer_name} 已有排班，跳过创建`);
          }
        } catch (error) {
          console.error(`❌ 为预约 ${apt.customer_name} 创建排班失败:`, error.message);
        }
      }
    }
    
    // 3. 检查排班中缺少doctor_id的情况
    console.log('\n3️⃣ 检查排班中缺少doctor_id的情况...');
    const schedulesWithoutDoctor = await pool.query(`
      SELECT s.*, a.doctor_id, a.customer_name
      FROM schedules s
      INNER JOIN appointments a ON s.appointment_id = a.id
      INNER JOIN services srv ON a.service_id = srv.id
      WHERE srv.category IN ('consultation', 'report')
        AND s.doctor_id IS NULL
        AND a.doctor_id IS NOT NULL
        AND s.status != 'cancelled'
    `);
    
    console.log(`找到 ${schedulesWithoutDoctor.rows.length} 个缺少doctor_id的排班`);
    
    if (schedulesWithoutDoctor.rows.length > 0) {
      console.log('更新这些排班的doctor_id...');
      for (const schedule of schedulesWithoutDoctor.rows) {
        try {
          await pool.query(`
            UPDATE schedules 
            SET doctor_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [schedule.doctor_id, schedule.id]);
          
          console.log(`✅ 更新排班 ${schedule.customer_name} 的doctor_id成功`);
        } catch (error) {
          console.error(`❌ 更新排班 ${schedule.customer_name} 的doctor_id失败:`, error.message);
        }
      }
    }
    
    // 4. 检查医生排班视图查询问题
    console.log('\n4️⃣ 测试医生排班视图查询...');
    
    // 获取一个医生用户进行测试
    const doctorResult = await pool.query(`
      SELECT id, store_id FROM profiles 
      WHERE role = 'doctor' AND store_id IS NOT NULL 
      LIMIT 1
    `);
    
    if (doctorResult.rows.length > 0) {
      const doctor = doctorResult.rows[0];
      console.log(`使用医生 ${doctor.id} (门店: ${doctor.store_id}) 进行测试`);
      
      // 模拟医生排班查询
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
          AND a.doctor_id = $1
          AND a.store_id = $2
        ORDER BY s.scheduled_date, s.scheduled_time_start
        LIMIT 10
      `, [doctor.id, doctor.store_id]);
      
      console.log(`医生排班查询结果: ${doctorSchedules.rows.length} 条记录`);
      if (doctorSchedules.rows.length > 0) {
        doctorSchedules.rows.forEach((schedule, index) => {
          console.log(`  ${index + 1}. ${schedule.customer_name} - ${schedule.service_name} - ${schedule.scheduled_date}`);
        });
      }
    } else {
      console.log('⚠️ 没有找到可用的医生用户进行测试');
    }
    
    // 5. 提供修复建议
    console.log('\n5️⃣ 修复建议:');
    console.log('a) 医生确认预约时，确保创建排班并设置正确的doctor_id');
    console.log('b) 检查排班数据的日期范围，确保在当前日期范围内');
    console.log('c) 前端在医生确认预约后应刷新排班数据');
    
    console.log('\n✅ 修复完成！');
    
  } catch (error) {
    console.error('❌ 修复过程中出错:', error);
  } finally {
    await pool.end();
  }
}

// 运行修复
fixDoctorScheduleCreation();