const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

// 初始用户列表（保留这些用户）
const INITIAL_USERS = [
  'admin',
  'sales1',
  'head_nurse1',
  'nurse1',
  'nurse2',
  'doctor1',
  'doctor2'
];

async function cleanTestData() {
  console.log('🧹 开始清理测试数据，仅保留初始用户...\n');
  
  try {
    // 1. 显示当前数据统计
    console.log('📊 清理前数据统计:');
    const stats = await getDataStats();
    printStats(stats);
    
    // 2. 确认操作
    console.log('\n⚠️ 警告：此操作将删除所有测试数据！');
    console.log('🔄 如果需要继续，请在 5 秒内按 Ctrl+C 取消...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 3. 获取需要删除的用户ID
    console.log('🔍 正在识别需要删除的用户...');
    const usersToDelete = await getUsersToDelete();
    console.log(`✅ 找到 ${usersToDelete.length} 个需要删除的用户\n`);
    
    if (usersToDelete.length === 0) {
      console.log('✅ 没有需要删除的用户，数据库已是干净状态');
      return;
    }
    
    // 4. 删除相关数据（按依赖关系顺序）
    console.log('🗑️ 开始删除测试数据...\n');
    
    // 删除任务执行记录（最高优先级，因为它依赖排班）
    console.log('  • 删除任务执行记录...');
    const taskExecutionsDeleted = await deleteTaskExecutions(usersToDelete);
    console.log(`    ✅ 已删除 ${taskExecutionsDeleted} 条任务执行记录\n`);
    
    // 删除排班
    console.log('  • 删除排班记录...');
    const schedulesDeleted = await deleteSchedules(usersToDelete);
    console.log(`    ✅ 已删除 ${schedulesDeleted} 条排班记录\n`);
    
    // 删除预约
    console.log('  • 删除预约记录...');
    const appointmentsDeleted = await deleteAppointments(usersToDelete);
    console.log(`    ✅ 已删除 ${appointmentsDeleted} 条预约记录\n`);
    
    // 删除用户
    console.log('  • 删除用户账户...');
    const usersDeleted = await deleteUsers(usersToDelete);
    console.log(`    ✅ 已删除 ${usersDeleted} 个用户账户\n`);
    
    // 5. 显示清理后的数据统计
    console.log('📊 清理后数据统计:');
    const finalStats = await getDataStats();
    printStats(finalStats);
    
    // 6. 显示保留的用户
    console.log('\n✅ 保留的初始用户:');
    const remainingUsers = await getRemainingUsers();
    remainingUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} (${user.full_name}) - ${user.role}`);
    });
    
    console.log('\n🎉 清理完成！数据库已恢复到初始状态');
    
  } catch (error) {
    console.error('❌ 清理过程中发生错误:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔌 数据库连接已关闭');
  }
}

async function getDataStats() {
  const queries = [
    { name: 'users', query: 'SELECT COUNT(*) as count FROM profiles' },
    { name: 'appointments', query: 'SELECT COUNT(*) as count FROM appointments' },
    { name: 'schedules', query: 'SELECT COUNT(*) as count FROM schedules' },
    { name: 'task_history', query: 'SELECT COUNT(*) as count FROM task_history' },
    { name: 'services', query: 'SELECT COUNT(*) as count FROM services' },
    { name: 'resources', query: 'SELECT COUNT(*) as count FROM resources' },
  ];
  
  const stats = {};
  for (const { name, query } of queries) {
    try {
      const result = await pool.query(query);
      stats[name] = parseInt(result.rows[0].count);
    } catch (error) {
      // 表不存在时返回 0
      stats[name] = 0;
    }
  }
  return stats;
}

function printStats(stats) {
  console.log(`  • 用户: ${stats.users}`);
  console.log(`  • 预约: ${stats.appointments}`);
  console.log(`  • 排班: ${stats.schedules}`);
  console.log(`  • 任务历史: ${stats.task_history}`);
  console.log(`  • 服务: ${stats.services}`);
  console.log(`  • 资源: ${stats.resources}`);
}

async function getUsersToDelete() {
  const placeholders = INITIAL_USERS.map((_, i) => `$${i + 1}`).join(',');
  const query = `
    SELECT id, username FROM profiles 
    WHERE username NOT IN (${placeholders})
    ORDER BY created_at DESC
  `;
  
  const result = await pool.query(query, INITIAL_USERS);
  return result.rows.map(row => row.id);
}

async function deleteTaskExecutions(userIds) {
  if (userIds.length === 0) return 0;
  
  try {
    // 删除与这些用户相关的任务执行记录
    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
    const query = `
      DELETE FROM task_executions 
      WHERE nurse_id IN (${placeholders})
    `;
    
    const result = await pool.query(query, userIds);
    return result.rowCount;
  } catch (error) {
    if (error.code === '42P01') {
      return 0;
    }
    throw error;
  }
}

async function deleteSchedules(userIds) {
  if (userIds.length === 0) return 0;
  
  try {
    // 先获取这些用户创建的预约 ID
    const salesPlaceholders = userIds.map((_, i) => `$${i + 1}`).join(',');
    const doctorPlaceholders = userIds.map((_, i) => `$${userIds.length + i + 1}`).join(',');
    const createdByPlaceholders = userIds.map((_, i) => `$${userIds.length * 2 + i + 1}`).join(',');
    
    const appointmentQuery = `
      SELECT id FROM appointments 
      WHERE sales_id IN (${salesPlaceholders}) 
         OR doctor_id IN (${doctorPlaceholders})
         OR created_by IN (${createdByPlaceholders})
    `;
    
    const appointmentResult = await pool.query(appointmentQuery, [...userIds, ...userIds, ...userIds]);
    const appointmentIds = appointmentResult.rows.map(row => row.id);
    
    if (appointmentIds.length === 0) return 0;
    
    // 删除这些预约相关的排班
    const appointmentPlaceholders = appointmentIds.map((_, i) => `$${i + 1}`).join(',');
    const scheduleQuery = `DELETE FROM schedules WHERE appointment_id IN (${appointmentPlaceholders})`;
    
    const result = await pool.query(scheduleQuery, appointmentIds);
    return result.rowCount;
  } catch (error) {
    if (error.code === '42P01') {
      return 0;
    }
    throw error;
  }
}

async function deleteAppointments(userIds) {
  if (userIds.length === 0) return 0;
  
  try {
    const salesPlaceholders = userIds.map((_, i) => `$${i + 1}`).join(',');
    const doctorPlaceholders = userIds.map((_, i) => `$${userIds.length + i + 1}`).join(',');
    const createdByPlaceholders = userIds.map((_, i) => `$${userIds.length * 2 + i + 1}`).join(',');
    const query = `
      DELETE FROM appointments 
      WHERE sales_id IN (${salesPlaceholders}) 
         OR doctor_id IN (${doctorPlaceholders})
         OR created_by IN (${createdByPlaceholders})
    `;
    
    const result = await pool.query(query, [...userIds, ...userIds, ...userIds]);
    return result.rowCount;
  } catch (error) {
    if (error.code === '42P01') {
      return 0;
    }
    throw error;
  }
}

async function deleteUsers(userIds) {
  if (userIds.length === 0) return 0;
  
  try {
    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
    const query = `DELETE FROM profiles WHERE id IN (${placeholders})`;
    
    const result = await pool.query(query, userIds);
    return result.rowCount;
  } catch (error) {
    if (error.code === '42P01') {
      return 0;
    }
    throw error;
  }
}

async function getRemainingUsers() {
  const placeholders = INITIAL_USERS.map((_, i) => `$${i + 1}`).join(',');
  const query = `
    SELECT id, username, full_name, role, created_at 
    FROM profiles 
    WHERE username IN (${placeholders})
    ORDER BY created_at ASC
  `;
  
  const result = await pool.query(query, INITIAL_USERS);
  return result.rows;
}

// 运行清理函数
cleanTestData().catch(console.error);
