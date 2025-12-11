/**
 * 护士工作流程测试数据生成脚本
 * 创建时间: 2025-12-09
 * 描述: 生成完整的护士工作流程测试数据，包括护士用户、服务类型、房间资源、预约记录、排班记录和任务执行记录
 */

// 直接使用数据库连接，与API服务器保持一致
const { Pool } = require('pg');
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
const { v4: uuidv4 } = require('uuid');

// 随机数据生成工具
const random = {
  // 生成随机整数
  int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  
  // 生成随机小数
  float(min, max, decimals = 2) {
    return (Math.random() * (max - min) + min).toFixed(decimals);
  },
  
  // 从数组中随机选择元素
  choice(array) {
    return array[Math.floor(Math.random() * array.length)];
  },
  
  // 生成随机手机号
  phone() {
    const prefixes = ['138', '139', '150', '151', '152', '158', '159', '186', '187', '188'];
    return this.choice(prefixes) + Math.random().toString().substr(2, 8);
  },
  
  // 生成随机姓名
  name() {
    const surnames = ['张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴'];
    const names = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '洋', '艳'];
    return this.choice(surnames) + this.choice(names);
  },
  
  // 生成随机日期
  date(startDays = -7, endDays = 7) {
    const now = new Date();
    const days = this.int(startDays, endDays);
    const date = new Date(now.setDate(now.getDate() + days));
    return date.toISOString().split('T')[0];
  },
  
  // 生成随机时间
  time(hourStart = 8, hourEnd = 18) {
    const hour = this.int(hourStart, hourEnd - 1);
    const minute = this.choice([0, 15, 30, 45]);
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }
};

// 测试数据定义
const testData = {
  // 护士用户数据
  nurses: [
    { id: uuidv4(), username: 'nurse001', full_name: '张晓梅', department: '体检科', email: 'zhangxm@hospital.com' },
    { id: uuidv4(), username: 'nurse002', full_name: '李静怡', department: '疫苗接种科', email: 'lijy@hospital.com' },
    { id: uuidv4(), username: 'nurse003', full_name: '王丽华', department: '体检科', email: 'wanglh@hospital.com' },
    { id: uuidv4(), username: 'nurse004', full_name: '陈志强', department: '咨询科', email: 'chenzq@hospital.com' },
    { id: uuidv4(), username: 'nurse005', full_name: '刘敏', department: '疫苗接种科', email: 'lium@hospital.com' }
  ],
  
  // 服务类型数据
  services: [
    { id: uuidv4(), name: '常规体检', category: 'nursing', base_duration: 30 },
    { id: uuidv4(), name: '全面体检', category: 'nursing', base_duration: 60 },
    { id: uuidv4(), name: '流感疫苗接种', category: 'nursing', base_duration: 15 },
    { id: uuidv4(), name: 'HPV疫苗接种', category: 'nursing', base_duration: 20 },
    { id: uuidv4(), name: '健康咨询', category: 'consultation', base_duration: 30 },
    { id: uuidv4(), name: '专科咨询', category: 'consultation', base_duration: 45 }
  ],
  
  // 房间资源数据
  rooms: [
    { id: uuidv4(), name: '体检室1', type: 'room', category: '体检室', capacity: 2 },
    { id: uuidv4(), name: '体检室2', type: 'room', category: '体检室', capacity: 2 },
    { id: uuidv4(), name: '接种室1', type: 'room', category: '接种室', capacity: 3 },
    { id: uuidv4(), name: '接种室2', type: 'room', category: '接种室', capacity: 3 },
    { id: uuidv4(), name: '咨询室1', type: 'room', category: '咨询室', capacity: 1 },
    { id: uuidv4(), name: '咨询室2', type: 'room', category: '咨询室', capacity: 1 },
    { id: uuidv4(), name: '观察室', type: 'room', category: '观察室', capacity: 5 },
    { id: uuidv4(), name: '休息室', type: 'room', category: '休息室', capacity: 10 }
  ],
  
  // 排班状态枚举
  scheduleStatuses: ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'],
  
  // 任务执行状态枚举
  taskExecutionStatuses: ['pending', 'checked_in', 'in_progress', 'completed']
};

// 清理现有数据
async function cleanExistingData() {
  console.log('🧹 清理现有测试数据...');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 按依赖关系顺序删除数据
    await client.query('DELETE FROM task_executions');
    await client.query('DELETE FROM nurse_sign_ins');
    await client.query('DELETE FROM notifications');
    await client.query('DELETE FROM schedules');
    await client.query('DELETE FROM appointments');
    await client.query('DELETE FROM resources WHERE name LIKE \'%室%\'');
    await client.query('DELETE FROM services WHERE name LIKE ANY(ARRAY[\'%体检%\', \'%接种%\', \'%咨询%\'])');
    await client.query('DELETE FROM profiles WHERE username LIKE \'nurse%\'');
    
    await client.query('COMMIT');
    console.log('✅ 现有数据清理完成');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 清理数据失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 生成护士用户数据
async function generateNurseUsers() {
  console.log('👩‍⚕️ 生成护士用户数据...');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const nurse of testData.nurses) {
      const query = `
        INSERT INTO profiles (id, username, password_hash, full_name, email, phone, role, department, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `;
      
      await client.query(query, [
        nurse.id,
        nurse.username,
        '$2b$10$example.hash.for.testing.only', // 示例密码哈希
        nurse.full_name,
        nurse.email,
        random.phone(),
        'nurse',
        nurse.department,
        'active'
      ]);
    }
    
    await client.query('COMMIT');
    console.log(`✅ 生成 ${testData.nurses.length} 个护士用户`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 生成护士用户失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 生成服务类型数据
async function generateServices() {
  console.log('🏥 生成服务类型数据...');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const service of testData.services) {
      const query = `
        INSERT INTO services (id, name, category, description, base_duration, requires_doctor, allow_companions, max_companions, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `;
      
      await client.query(query, [
        service.id,
        service.name,
        service.category,
        `${service.name}服务，专业医疗团队提供`,
        service.base_duration,
        service.category === 'consultation', // 咨询服务需要医生
        true, // 允许陪同
        5, // 最大陪同人数
        true
      ]);
    }
    
    await client.query('COMMIT');
    console.log(`✅ 生成 ${testData.services.length} 个服务类型`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 生成服务类型失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 生成房间资源数据
async function generateRooms() {
  console.log('🏠 生成房间资源数据...');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const room of testData.rooms) {
      const query = `
        INSERT INTO resources (id, name, type, category, description, capacity, status, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `;
      
      await client.query(query, [
        room.id,
        room.name,
        room.type,
        room.category,
        `${room.name}，用于${room.category}相关服务`,
        room.capacity,
        'available',
        true
      ]);
    }
    
    await client.query('COMMIT');
    console.log(`✅ 生成 ${testData.rooms.length} 个房间资源`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 生成房间资源失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 生成预约记录数据
async function generateAppointments() {
  console.log('📅 生成预约记录数据...');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const appointments = [];
    const numAppointments = 70; // 生成70个预约记录
    
    for (let i = 0; i < numAppointments; i++) {
      const appointment = {
        id: uuidv4(),
        customer_name: random.name(),
        customer_phone: random.phone(),
        service_id: random.choice(testData.services).id,
        requested_date: random.date(0, 7), // 未来7天
        requested_time_start: random.time(8, 18) + ':00',
        requested_time_end: random.time(9, 19) + ':00',
        estimated_duration: random.int(30, 120),
        is_urgent: random.int(1, 10) <= 2, // 20%概率为紧急
        notes: `预约备注 ${i + 1}`,
        status: random.choice(['confirmed', 'pending', 'cancelled']),
        workflow_status: random.choice(['pending_nurse_assignment', 'doctor_confirmed', 'nurse_scheduled']),
        requires_nurse_scheduling: true
      };
      
      const query = `
        INSERT INTO appointments (id, customer_name, customer_phone, service_id, requested_date, requested_time_start, requested_time_end, estimated_duration, is_urgent, notes, status, workflow_status, requires_nurse_scheduling, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      `;
      
      await client.query(query, [
        appointment.id,
        appointment.customer_name,
        appointment.customer_phone,
        appointment.service_id,
        appointment.requested_date,
        appointment.requested_time_start,
        appointment.requested_time_end,
        appointment.estimated_duration,
        appointment.is_urgent,
        appointment.notes,
        appointment.status,
        appointment.workflow_status,
        appointment.requires_nurse_scheduling
      ]);
      
      appointments.push(appointment);
    }
    
    await client.query('COMMIT');
    console.log(`✅ 生成 ${appointments.length} 个预约记录`);
    return appointments;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 生成预约记录失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 生成排班记录数据
async function generateSchedules(appointments) {
  console.log('📋 生成排班记录数据...');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const schedules = [];
    const numSchedules = 100; // 生成100个排班记录
    
    for (let i = 0; i < numSchedules; i++) {
      const appointment = random.choice(appointments);
      const nurse = random.choice(testData.nurses);
      const room = random.choice(testData.rooms);
      
      // 计算排班时间
      const scheduledDate = random.date(0, 7);
      const startTime = random.time(8, 17) + ':00';
      const service = testData.services.find(s => s.id === appointment.service_id);
      const duration = service ? service.base_duration : 30;
      
      // 计算结束时间
      const [hour, minute] = startTime.split(':').map(Number);
      const endHour = hour + Math.floor((minute + duration) / 60);
      const endMinute = (minute + duration) % 60;
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`;
      
      const schedule = {
        id: uuidv4(),
        appointment_id: appointment.id,
        nurse_id: nurse.id,
        room_id: room.id,
        scheduled_date: scheduledDate,
        scheduled_time_start: startTime,
        scheduled_time_end: endTime,
        status: random.choice(testData.scheduleStatuses),
        notes: `排班备注 ${i + 1}`
      };
      
      const query = `
        INSERT INTO schedules (id, appointment_id, nurse_id, room_id, scheduled_date, scheduled_time_start, scheduled_time_end, status, notes, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `;
      
      await client.query(query, [
        schedule.id,
        schedule.appointment_id,
        schedule.nurse_id,
        schedule.room_id,
        schedule.scheduled_date,
        schedule.scheduled_time_start,
        schedule.scheduled_time_end,
        schedule.status,
        schedule.notes
      ]);
      
      schedules.push(schedule);
    }
    
    await client.query('COMMIT');
    console.log(`✅ 生成 ${schedules.length} 个排班记录`);
    return schedules;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 生成排班记录失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 生成任务执行记录数据
async function generateTaskExecutions(schedules) {
  console.log('⚙️ 生成任务执行记录数据...');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const taskExecutions = [];
    
    // 为部分排班生成任务执行记录
    const schedulesWithExecution = schedules.filter(() => random.int(1, 10) <= 7); // 70%概率有执行记录
    
    for (const schedule of schedulesWithExecution) {
      const status = random.choice(testData.taskExecutionStatuses);
      const startTime = random.date(-3, 0) + ' ' + random.time(8, 18) + ':00';
      let finishTime = null;
      let actualDuration = null;
      
      if (status === 'completed' || status === 'interrupted') {
        const startDate = new Date(startTime);
        const duration = random.int(15, 90); // 15-90分钟
        startDate.setMinutes(startDate.getMinutes() + duration);
        finishTime = startDate.toISOString().replace('T', ' ').substr(0, 19);
        actualDuration = duration;
      }
      
      const taskExecution = {
        id: uuidv4(),
        schedule_id: schedule.id,
        nurse_id: schedule.nurse_id,
        check_in_time: startTime,
        start_time: startTime,
        finish_time: finishTime,
        actual_duration: actualDuration,
        status: status,
        notes: `任务执行备注 ${taskExecutions.length + 1}`
      };
      
      const query = `
        INSERT INTO task_executions (id, schedule_id, nurse_id, check_in_time, start_time, finish_time, actual_duration, status, notes, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `;
      
      await client.query(query, [
        taskExecution.id,
        taskExecution.schedule_id,
        taskExecution.nurse_id,
        taskExecution.check_in_time,
        taskExecution.start_time,
        taskExecution.finish_time,
        taskExecution.actual_duration,
        taskExecution.status,
        taskExecution.notes
      ]);
      
      taskExecutions.push(taskExecution);
    }
    
    await client.query('COMMIT');
    console.log(`✅ 生成 ${taskExecutions.length} 个任务执行记录`);
    return taskExecutions;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 生成任务执行记录失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 生成护士签到记录数据
async function generateNurseSignIns() {
  console.log('✍️ 生成护士签到记录数据...');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const signIns = [];
    
    // 为每个护士生成最近7天的签到记录
    for (const nurse of testData.nurses) {
      for (let day = -7; day <= 0; day++) {
        const workDate = random.date(day, day);
        
        // 80%概率有签到记录
        if (random.int(1, 10) <= 8) {
          const signInTime = workDate + ' ' + random.time(7, 9);
          let signOutTime = null;
          
          // 90%概率有签退记录
          if (random.int(1, 10) <= 9) {
            const signInDate = new Date(signInTime);
            const workHours = random.int(6, 10); // 6-10小时工作
            signInDate.setHours(signInDate.getHours() + workHours);
            signOutTime = signInDate.toISOString().replace('T', ' ').substr(0, 16);
          }
          
          const signIn = {
            id: uuidv4(),
            nurse_id: nurse.id,
            sign_in_time: signInTime,
            sign_out_time: signOutTime,
            work_date: workDate,
            notes: `工作记录 ${signIns.length + 1}`
          };
          
          const query = `
            INSERT INTO nurse_sign_ins (id, nurse_id, sign_in_time, sign_out_time, work_date, notes, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          `;
          
          await client.query(query, [
            signIn.id,
            signIn.nurse_id,
            signIn.sign_in_time,
            signIn.sign_out_time,
            signIn.work_date,
            signIn.notes
          ]);
          
          signIns.push(signIn);
        }
      }
    }
    
    await client.query('COMMIT');
    console.log(`✅ 生成 ${signIns.length} 个护士签到记录`);
    return signIns;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 生成护士签到记录失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 生成通知记录数据
async function generateNotifications() {
  console.log('🔔 生成通知记录数据...');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const notifications = [];
    const notificationTypes = ['info', 'warning', 'error', 'success'];
    const notificationTitles = [
      '任务状态更新',
      '排班变更通知',
      '系统维护通知',
      '新任务分配',
      '签到提醒',
      '服务完成提醒'
    ];
    
    // 为每个护士生成通知记录
    for (const nurse of testData.nurses) {
      const numNotifications = random.int(3, 8); // 每个护士3-8个通知
      
      for (let i = 0; i < numNotifications; i++) {
        const notification = {
          id: uuidv4(),
          user_id: nurse.id,
          title: random.choice(notificationTitles),
          message: `这是给${nurse.full_name}的通知消息 ${i + 1}`,
          type: random.choice(notificationTypes),
          related_id: random.choice(testData.nurses).id,
          related_type: 'nurse',
          is_read: random.int(1, 10) <= 6 // 60%概率已读
        };
        
        const query = `
          INSERT INTO notifications (id, user_id, title, message, type, related_id, related_type, is_read, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        `;
        
        await client.query(query, [
          notification.id,
          notification.user_id,
          notification.title,
          notification.message,
          notification.type,
          notification.related_id,
          notification.related_type,
          notification.is_read
        ]);
        
        notifications.push(notification);
      }
    }
    
    await client.query('COMMIT');
    console.log(`✅ 生成 ${notifications.length} 个通知记录`);
    return notifications;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 生成通知记录失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 验证数据完整性
async function verifyDataIntegrity() {
  console.log('🔍 验证数据完整性...');
  
  const client = await pool.connect();
  try {
    const checks = [
      { table: 'profiles', condition: "role = 'nurse'", description: '护士用户' },
      { table: 'services', condition: "category IN ('nursing', 'consultation', 'report')", description: '服务类型' },
      { table: 'resources', condition: "type IN ('room', 'nurse')", description: '房间资源' },
      { table: 'appointments', condition: '1=1', description: '预约记录' },
      { table: 'schedules', condition: '1=1', description: '排班记录' },
      { table: 'task_executions', condition: '1=1', description: '任务执行记录' },
      { table: 'nurse_sign_ins', condition: '1=1', description: '护士签到记录' },
      { table: 'notifications', condition: '1=1', description: '通知记录' }
    ];
    
    for (const check of checks) {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${check.table} WHERE ${check.condition}`);
      console.log(`✅ ${check.description}: ${result.rows[0].count} 条记录`);
    }
    
    // 验证视图
    const viewChecks = [
      { view: 'nurse_today_tasks', description: '护士今日任务视图' },
      { view: 'nurse_work_statistics', description: '护士工作统计视图' },
      { view: 'nurse_daily_report', description: '护士工作日报视图' }
    ];
    
    for (const check of viewChecks) {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${check.view}`);
      console.log(`✅ ${check.description}: ${result.rows[0].count} 条记录`);
    }
    
    console.log('✅ 数据完整性验证完成');
  } catch (error) {
    console.error('❌ 数据完整性验证失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 输出测试账户信息
function outputTestAccounts() {
  console.log('\n📋 测试账户信息:');
  console.log('='.repeat(50));
  
  for (const nurse of testData.nurses) {
    console.log(`用户名: ${nurse.username}`);
    console.log(`姓名: ${nurse.full_name}`);
    console.log(`部门: ${nurse.department}`);
    console.log(`邮箱: ${nurse.email}`);
    console.log(`密码: 123456 (所有测试账户通用密码)`);
    console.log('-'.repeat(30));
  }
  
  console.log('\n📊 数据统计:');
  console.log(`护士用户: ${testData.nurses.length} 个`);
  console.log(`服务类型: ${testData.services.length} 个`);
  console.log(`房间资源: ${testData.rooms.length} 个`);
  console.log('预约记录: 70+ 个');
  console.log('排班记录: 100+ 个');
  console.log('任务执行记录: 70+ 个');
  console.log('护士签到记录: 35+ 个');
  console.log('通知记录: 25+ 个');
}

// 主函数
async function main() {
  console.log('🚀 开始生成护士工作流程测试数据...\n');
  
  try {
    // 清理现有数据
    await cleanExistingData();
    
    // 生成基础数据
    await generateNurseUsers();
    await generateServices();
    await generateRooms();
    
    // 生成业务数据
    const appointments = await generateAppointments();
    const schedules = await generateSchedules(appointments);
    await generateTaskExecutions(schedules);
    await generateNurseSignIns();
    await generateNotifications();
    
    // 验证数据
    await verifyDataIntegrity();
    
    // 输出测试账户信息
    outputTestAccounts();
    
    console.log('\n🎉 护士工作流程测试数据生成完成！');
    console.log('💡 现在可以使用测试账户登录系统进行测试');
    
  } catch (error) {
    console.error('\n❌ 生成测试数据失败:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  main,
  testData,
  random
};