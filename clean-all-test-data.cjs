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

async function cleanAllTestData() {
  console.log('🧹 开始彻底清理所有测试数据，仅保留初始用户...\n');
  
  try {
    // 1. 显示当前数据统计
    console.log('📊 清理前数据统计:');
    const stats = await getDataStats();
    printStats(stats);
    
    // 2. 确认操作
    console.log('\n⚠️ 警告：此操作将删除所有测试数据！');
    console.log('🔄 如果需要继续，请在 5 秒内按 Ctrl+C 取消...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 3. 获取初始用户的 ID
    console.log('🔍 正在识别初始用户...');
    const initialUserIds = await getInitialUserIds();
    console.log(`✅ 找到 ${initialUserIds.length} 个初始用户\n`);
    
    // 4. 删除所有非初始用户的数据
    console.log('🗑️ 开始删除所有测试数据...\n');
    
    // 删除任务执行记录
    console.log('  • 删除任务执行记录...');
    const taskExecutionsDeleted = await deleteAllTaskExecutions(initialUserIds);
    console.log(`    ✅ 已删除 ${taskExecutionsDeleted} 条任务执行记录\n`);
    
    // 删除排班
    console.log('  • 删除排班记录...');
    const schedulesDeleted = await deleteAllSchedules(initialUserIds);
    console.log(`    ✅ 已删除 ${schedulesDeleted} 条排班记录\n`);
    
    // 删除预约
    console.log('  • 删除预约记录...');
    const appointmentsDeleted = await deleteAllAppointments(initialUserIds);
    console.log(`    ✅ 已删除 ${appointmentsDeleted} 条预约记录\n`);
    
    // 删除非初始用户
    console.log('  • 删除非初始用户账户...');
    const usersDeleted = await deleteNonInitialUsers(initialUserIds);
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
    { name: 'task_executions', query: 'SELECT COUNT(*) as count FROM task_executions' },
    { name: 'services', query: 'SELECT COUNT(*) as count FROM services' },
    { name: 'resources', query: 'SELECT COUNT(*) as count FROM resources' },
  ];
  
  const stats = {};
  for (const { name, query } of queries) {
    try {
      const result = await pool.query(query);
      stats[name] = parseInt(result.rows[0].count);
    } catch (error) {
      stats[name] = 0;
    }
  }
  return stats;
}

function printStats(stats) {
  console.log(`  • 用户: ${stats.users}`);
  console.log(`  • 预约: ${stats.appointments}`);
  console.log(`  • 排班: ${stats.schedules}`);
  console.log(`  • 任务执行: ${stats.task_executions}`);
  console.log(`  • 服务: ${stats.services}`);
  console.log(`  • 资源: ${stats.resources}`);
}

async function getInitialUserIds() {
  const placeholders = INITIAL_USERS.map((_, i) => `$${i + 1}`).join(',');
  const query = `
    SELECT id FROM profiles 
    WHERE username IN (${placeholders})
    ORDER BY created_at ASC
  `;
  
  const result = await pool.query(query, INITIAL_USERS);
  return result.rows.map(row => row.id);
}

async function deleteAllTaskExecutions(initialUserIds) {
  try {
    // 删除所有任务执行记录（不管是谁创建的）
    const query = 'DELETE FROM task_executions';
    const result = await pool.query(query);
    return result.rowCount;
  } catch (error) {
    if (error.code === '42P01') {
      return 0;
    }
    throw error;
  }
}

async function deleteAllSchedules(initialUserIds) {
  try {
    // 删除所有排班记录（不管是谁创建的）
    const query = 'DELETE FROM schedules';
    const result = await pool.query(query);
    return result.rowCount;
  } catch (error) {
    if (error.code === '42P01') {
      return 0;
    }
    throw error;
  }
}

async function deleteAllAppointments(initialUserIds) {
  try {
    // 删除所有预约记录（不管是谁创建的）
    const query = 'DELETE FROM appointments';
    const result = await pool.query(query);
    return result.rowCount;
  } catch (error) {
    if (error.code === '42P01') {
      return 0;
    }
    throw error;
  }
}

async function deleteNonInitialUsers(initialUserIds) {
  try {
    const placeholders = initialUserIds.map((_, i) => `$${i + 1}`).join(',');
    const query = `DELETE FROM profiles WHERE id NOT IN (${placeholders})`;
    
    const result = await pool.query(query, initialUserIds);
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
cleanAllTestData().catch(console.error);
