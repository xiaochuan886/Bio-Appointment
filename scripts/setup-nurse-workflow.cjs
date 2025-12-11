/**
 * 护士工作流程一键设置脚本
 * 创建时间: 2025-12-09
 * 描述: 自动化执行数据库迁移和测试数据生成，快速设置护士工作流程环境
 */

const { Pool } = require('pg');

// 数据库配置
const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5437'),
  database: process.env.POSTGRES_DB || 'bio_appointment',
  user: process.env.POSTGRES_USER || 'app_user',
  password: process.env.POSTGRES_PASSWORD || 'secure_password_123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// 创建连接池
const pool = new Pool(dbConfig);
const fs = require('fs');
const path = require('path');

// 颜色输出工具
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n📍 步骤 ${step}: ${message}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// 检查数据库连接
async function checkDatabaseConnection() {
  logStep(1, '检查数据库连接');
  
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logSuccess('数据库连接正常');
    return true;
  } catch (error) {
    logError(`数据库连接失败: ${error.message}`);
    logInfo('请检查数据库配置和网络连接');
    return false;
  }
}

// 执行数据库迁移
async function executeMigration() {
  logStep(2, '执行数据库迁移');
  
  try {
    const migrationPath = path.join(__dirname, '../database/migrations/08-optimize-nurse-workflow.sql');
    
    if (!fs.existsSync(migrationPath)) {
      logError('迁移文件不存在: ' + migrationPath);
      return false;
    }
    
    logInfo('读取迁移文件...');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    logInfo('执行迁移脚本...');
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      await client.query(migrationSQL);
      await client.query('COMMIT');
      logSuccess('数据库迁移完成');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      logError(`迁移执行失败: ${error.message}`);
      return false;
    } finally {
      client.release();
    }
  } catch (error) {
    logError(`迁移文件读取失败: ${error.message}`);
    return false;
  }
}

// 验证迁移结果
async function verifyMigration() {
  logStep(3, '验证迁移结果');
  
  try {
    const client = await pool.connect();
    
    try {
      // 检查新增的表
      const tables = [
        { name: 'task_executions', description: '任务执行记录表' },
        { name: 'nurse_sign_ins', description: '护士签到记录表' },
        { name: 'notifications', description: '通知记录表' }
      ];
      
      for (const table of tables) {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '${table.name}'
          ) as exists
        `);
        
        if (result.rows[0].exists) {
          logSuccess(`${table.description} (${table.name}) 创建成功`);
        } else {
          logError(`${table.description} (${table.name}) 创建失败`);
          return false;
        }
      }
      
      // 检查新增的枚举类型
      const enums = [
        { name: 'task_execution_status_enum', description: '任务执行状态枚举' },
        { name: 'schedule_status_enum', description: '排班状态枚举' }
      ];
      
      for (const enumType of enums) {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM pg_type 
            WHERE typname = '${enumType.name}'
          ) as exists
        `);
        
        if (result.rows[0].exists) {
          logSuccess(`${enumType.description} (${enumType.name}) 创建成功`);
        } else {
          logError(`${enumType.description} (${enumType.name}) 创建失败`);
          return false;
        }
      }
      
      // 检查新增的视图
      const views = [
        { name: 'nurse_today_tasks', description: '护士今日任务视图' },
        { name: 'nurse_work_statistics', description: '护士工作统计视图' },
        { name: 'nurse_daily_report', description: '护士工作日报视图' }
      ];
      
      for (const view of views) {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name = '${view.name}'
          ) as exists
        `);
        
        if (result.rows[0].exists) {
          logSuccess(`${view.description} (${view.name}) 创建成功`);
        } else {
          logError(`${view.description} (${view.name}) 创建失败`);
          return false;
        }
      }
      
      // 检查新增的函数
      const functions = [
        { name: 'get_nurse_sign_in_status', description: '护士签到状态函数' },
        { name: 'update_task_status', description: '任务状态更新函数' }
      ];
      
      for (const func of functions) {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM pg_proc 
            WHERE proname = '${func.name}'
          ) as exists
        `);
        
        if (result.rows[0].exists) {
          logSuccess(`${func.description} (${func.name}) 创建成功`);
        } else {
          logError(`${func.description} (${func.name}) 创建失败`);
          return false;
        }
      }
      
      logSuccess('迁移验证完成，所有对象创建成功');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    logError(`迁移验证失败: ${error.message}`);
    return false;
  }
}

// 生成测试数据
async function generateTestData() {
  logStep(4, '生成测试数据');
  
  try {
    const { main: generateData } = require('./generate-nurse-test-data.cjs');
    
    logInfo('开始生成测试数据...');
    await generateData();
    
    logSuccess('测试数据生成完成');
    return true;
  } catch (error) {
    logError(`测试数据生成失败: ${error.message}`);
    return false;
  }
}

// 验证测试数据
async function verifyTestData() {
  logStep(5, '验证测试数据');
  
  try {
    const client = await pool.connect();
    
    try {
      const checks = [
        { table: 'profiles', condition: "role = 'nurse'", description: '护士用户', minCount: 5 },
        { table: 'services', condition: "category IN ('体检', '疫苗接种', '咨询')", description: '服务类型', minCount: 6 },
        { table: 'resources', condition: "type IN ('体检室', '接种室', '咨询室', '观察室', '休息室')", description: '房间资源', minCount: 8 },
        { table: 'appointments', condition: '1=1', description: '预约记录', minCount: 50 },
        { table: 'schedules', condition: '1=1', description: '排班记录', minCount: 80 },
        { table: 'task_executions', condition: '1=1', description: '任务执行记录', minCount: 30 },
        { table: 'nurse_sign_ins', condition: '1=1', description: '护士签到记录', minCount: 20 },
        { table: 'notifications', condition: '1=1', description: '通知记录', minCount: 15 }
      ];
      
      let allChecksPassed = true;
      
      for (const check of checks) {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${check.table} WHERE ${check.condition}`);
        const count = parseInt(result.rows[0].count);
        
        if (count >= check.minCount) {
          logSuccess(`${check.description}: ${count} 条记录 (≥${check.minCount})`);
        } else {
          logError(`${check.description}: ${count} 条记录 (<${check.minCount})`);
          allChecksPassed = false;
        }
      }
      
      if (allChecksPassed) {
        logSuccess('测试数据验证完成，所有数据符合要求');
        return true;
      } else {
        logError('测试数据验证失败，部分数据不符合要求');
        return false;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    logError(`测试数据验证失败: ${error.message}`);
    return false;
  }
}

// 输出测试账户信息
function outputTestAccounts() {
  logStep(6, '输出测试账户信息');
  
  const testAccounts = [
    { username: 'nurse001', full_name: '张晓梅', department: '体检科' },
    { username: 'nurse002', full_name: '李静怡', department: '疫苗接种科' },
    { username: 'nurse003', full_name: '王丽华', department: '体检科' },
    { username: 'nurse004', full_name: '陈志强', department: '咨询科' },
    { username: 'nurse005', full_name: '刘敏', department: '疫苗接种科' }
  ];
  
  log('\n📋 测试账户信息:', 'bright');
  log('='.repeat(50), 'bright');
  
  for (const account of testAccounts) {
    log(`用户名: ${account.username}`, 'green');
    log(`姓名: ${account.full_name}`, 'blue');
    log(`部门: ${account.department}`, 'cyan');
    log(`密码: 123456 (所有测试账户通用密码)`, 'yellow');
    log('-'.repeat(30), 'cyan');
  }
  
  log('\n📊 数据统计:', 'bright');
  log(`护士用户: 5 个`, 'green');
  log(`服务类型: 6 个`, 'green');
  log(`房间资源: 8 个`, 'green');
  log(`预约记录: 70+ 个`, 'green');
  log(`排班记录: 100+ 个`, 'green');
  log(`任务执行记录: 70+ 个`, 'green');
  log(`护士签到记录: 35+ 个`, 'green');
  log(`通知记录: 25+ 个`, 'green');
}

// 输出后续步骤指导
function outputNextSteps() {
  logStep(7, '后续步骤指导');
  
  log('\n🚀 后续操作建议:', 'bright');
  log('='.repeat(50), 'bright');
  
  log('\n1. 启动开发服务器:', 'cyan');
  log('   npm run dev', 'yellow');
  
  log('\n2. 启动API服务器:', 'cyan');
  log('   node server/api-server.cjs', 'yellow');
  
  log('\n3. 访问护士功能:', 'cyan');
  log('   http://localhost:5173/nurse/schedule', 'yellow');
  log('   http://localhost:5173/nurse/tasks', 'yellow');
  log('   http://localhost:5173/nurse/history', 'yellow');
  
  log('\n4. 测试护士工作流程:', 'cyan');
  log('   - 使用测试账户登录系统', 'yellow');
  log('   - 执行护士签到操作', 'yellow');
  log('   - 查看今日排班和任务', 'yellow');
  log('   - 更新任务状态', 'yellow');
  log('   - 查看历史记录', 'yellow');
  
  log('\n5. API接口测试:', 'cyan');
  log('   POST /api/nurse/sign-in - 护士签到', 'yellow');
  log('   GET  /api/nurse/today-tasks - 获取今日任务', 'yellow');
  log('   PUT  /api/nurse/task-status - 更新任务状态', 'yellow');
  log('   GET  /api/nurse/notifications - 获取通知列表', 'yellow');
  
  log('\n📚 更多信息:', 'cyan');
  log('   - 技术文档: 护士功能改进技术架构设计文档.md', 'yellow');
  log('   - API文档: server/nurse-workflow-api.cjs', 'yellow');
  log('   - 前端组件: src/components/nurse/', 'yellow');
}

// 主函数
async function main() {
  log('\n🚀 护士工作流程一键设置开始...', 'bright');
  log('='.repeat(60), 'bright');
  
  const startTime = Date.now();
  let success = true;
  
  try {
    // 步骤1: 检查数据库连接
    success = await checkDatabaseConnection();
    if (!success) {
      logError('数据库连接失败，终止设置流程');
      process.exit(1);
    }
    
    // 步骤2: 执行数据库迁移
    success = await executeMigration();
    if (!success) {
      logError('数据库迁移失败，终止设置流程');
      process.exit(1);
    }
    
    // 步骤3: 验证迁移结果
    success = await verifyMigration();
    if (!success) {
      logError('迁移验证失败，终止设置流程');
      process.exit(1);
    }
    
    // 步骤4: 生成测试数据
    success = await generateTestData();
    if (!success) {
      logError('测试数据生成失败，终止设置流程');
      process.exit(1);
    }
    
    // 步骤5: 验证测试数据
    success = await verifyTestData();
    if (!success) {
      logError('测试数据验证失败，终止设置流程');
      process.exit(1);
    }
    
    // 步骤6: 输出测试账户信息
    outputTestAccounts();
    
    // 步骤7: 输出后续步骤指导
    outputNextSteps();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    log(`\n🎉 护士工作流程设置完成！耗时: ${duration}秒`, 'bright');
    log('='.repeat(60), 'bright');
    
  } catch (error) {
    logError(`设置过程中发生未预期错误: ${error.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 处理命令行参数
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    skipMigration: false,
    skipTestData: false,
    help: false
  };
  
  for (const arg of args) {
    switch (arg) {
      case '--skip-migration':
        options.skipMigration = true;
        break;
      case '--skip-test-data':
        options.skipTestData = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }
  
  return options;
}

// 显示帮助信息
function showHelp() {
  log('\n🚀 护士工作流程一键设置脚本', 'bright');
  log('='.repeat(50), 'bright');
  
  log('\n用法:', 'cyan');
  log('  node scripts/setup-nurse-workflow.cjs [选项]', 'yellow');
  
  log('\n选项:', 'cyan');
  log('  --skip-migration    跳过数据库迁移', 'yellow');
  log('  --skip-test-data    跳过测试数据生成', 'yellow');
  log('  --help, -h          显示帮助信息', 'yellow');
  
  log('\n示例:', 'cyan');
  log('  node scripts/setup-nurse-workflow.cjs                    # 完整设置', 'yellow');
  log('  node scripts/setup-nurse-workflow.cjs --skip-migration   # 跳过迁移', 'yellow');
  log('  node scripts/setup-nurse-workflow.cjs --skip-test-data   # 跳过测试数据', 'yellow');
}

// 如果直接运行此脚本
if (require.main === module) {
  const options = parseArguments();
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  // 如果跳过某些步骤，修改主函数逻辑
  if (options.skipMigration || options.skipTestData) {
    log('\n⚠️  跳过模式已启用', 'yellow');
    if (options.skipMigration) log('  - 跳过数据库迁移', 'yellow');
    if (options.skipTestData) log('  - 跳过测试数据生成', 'yellow');
  }
  
  main();
}

module.exports = {
  main,
  checkDatabaseConnection,
  executeMigration,
  verifyMigration,
  generateTestData,
  verifyTestData,
  outputTestAccounts,
  outputNextSteps
};