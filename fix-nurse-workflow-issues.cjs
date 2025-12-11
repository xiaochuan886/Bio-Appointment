/**
 * 护士工作流程问题修复脚本
 * 创建时间: 2025-12-09
 * 描述: 修复验证脚本发现的护士功能问题
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
    return false;
  }
}

// 修复枚举类型
async function fixEnums() {
  logStep(2, '修复枚举类型');
  
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 修复服务类别枚举
      logInfo('修复服务类别枚举...');
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_category_enum') THEN
            CREATE TYPE service_category_enum AS ENUM (
              '体检', '疫苗接种', '咨询', '治疗', '检查', '手术'
            );
          END IF;
        END $$;
      `);
      
      // 修复资源类型枚举
      logInfo('修复资源类型枚举...');
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_type_enum') THEN
            CREATE TYPE resource_type_enum AS ENUM (
              '体检室', '接种室', '咨询室', '治疗室', '检查室', '手术室', '观察室', '休息室'
            );
          END IF;
        END $$;
      `);
      
      // 修复任务执行状态枚举
      logInfo('修复任务执行状态枚举...');
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_execution_status_enum') THEN
            CREATE TYPE task_execution_status_enum AS ENUM (
              'pending', 'in_progress', 'completed', 'cancelled', 'interrupted'
            );
          END IF;
        END $$;
      `);
      
      // 修复排班状态枚举
      logInfo('修复排班状态枚举...');
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_status_enum') THEN
            CREATE TYPE schedule_status_enum AS ENUM (
              'pending', 'scheduled', 'customer_arrived', 'service_started', 
              'in_progress', 'service_completed', 'completed', 'cancelled', 
              'customer_no_show', 'service_interrupted'
            );
          END IF;
        END $$;
      `);
      
      await client.query('COMMIT');
      logSuccess('枚举类型修复完成');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      logError(`枚举类型修复失败: ${error.message}`);
      return false;
    } finally {
      client.release();
    }
  } catch (error) {
    logError(`枚举类型修复失败: ${error.message}`);
    return false;
  }
}

// 修复表结构
async function fixTables() {
  logStep(3, '修复表结构');
  
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 创建护士签到记录表
      logInfo('创建护士签到记录表...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS nurse_sign_ins (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nurse_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            sign_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            sign_out_time TIMESTAMP WITH TIME ZONE,
            work_date DATE NOT NULL DEFAULT CURRENT_DATE,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      
      // 创建通知记录表
      logInfo('创建通知记录表...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50) NOT NULL DEFAULT 'info',
            related_id UUID,
            related_type VARCHAR(50),
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      
      // 创建索引
      logInfo('创建索引...');
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_nurse_sign_ins_nurse_id ON nurse_sign_ins(nurse_id);
        CREATE INDEX IF NOT EXISTS idx_nurse_sign_ins_work_date ON nurse_sign_ins(work_date);
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
      `);
      
      // 创建触发器函数
      logInfo('创建触发器函数...');
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);
      
      // 创建触发器
      logInfo('创建触发器...');
      await client.query(`
        DROP TRIGGER IF EXISTS update_nurse_sign_ins_updated_at ON nurse_sign_ins;
        CREATE TRIGGER update_nurse_sign_ins_updated_at BEFORE UPDATE ON nurse_sign_ins
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
        DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
        CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
      
      await client.query('COMMIT');
      logSuccess('表结构修复完成');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      logError(`表结构修复失败: ${error.message}`);
      return false;
    } finally {
      client.release();
    }
  } catch (error) {
    logError(`表结构修复失败: ${error.message}`);
    return false;
  }
}

// 修复视图
async function fixViews() {
  logStep(4, '修复视图');
  
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 创建护士今日任务视图
      logInfo('创建护士今日任务视图...');
      await client.query(`
        CREATE OR REPLACE VIEW nurse_today_tasks AS
        SELECT
            s.id, s.scheduled_date, s.scheduled_time_start, s.scheduled_time_end, s.status,
            a.customer_name, a.customer_phone,
            srv.name as service_name, srv.category as service_category,
            r.name as room_name, r.type as room_type,
            p.full_name as nurse_name,
            te.id as task_execution_id, te.start_time as started_at, te.finish_time as completed_at, te.status as execution_status,
            CASE WHEN te.id IS NOT NULL THEN true ELSE false END as has_execution
        FROM schedules s
        LEFT JOIN appointments a ON s.appointment_id = a.id
        LEFT JOIN services srv ON a.service_id = srv.id
        LEFT JOIN resources r ON s.room_id = r.id
        LEFT JOIN profiles p ON s.nurse_id = p.id
        LEFT JOIN task_executions te ON s.id = te.schedule_id
        WHERE s.scheduled_date = CURRENT_DATE
          AND s.status NOT IN ('cancelled')
        ORDER BY s.scheduled_time_start;
      `);
      
      // 创建护士工作统计视图
      logInfo('创建护士工作统计视图...');
      await client.query(`
        CREATE OR REPLACE VIEW nurse_work_statistics AS
        SELECT
            p.id as nurse_id, p.full_name as nurse_name, p.department,
            COUNT(s.id) as total_schedules,
            COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as completed_tasks,
            COUNT(CASE WHEN s.status = 'in_progress' THEN 1 END) as in_progress_tasks,
            COUNT(CASE WHEN s.status = 'pending' OR s.status = 'scheduled' THEN 1 END) as pending_tasks,
            COUNT(CASE WHEN s.status = 'cancelled' THEN 1 END) as cancelled_tasks,
            AVG(EXTRACT(EPOCH FROM (te.finish_time - te.start_time))/60) as avg_service_duration_minutes,
            COUNT(CASE WHEN s.scheduled_date = CURRENT_DATE THEN 1 END) as today_tasks
        FROM profiles p
        LEFT JOIN schedules s ON p.id = s.nurse_id
        LEFT JOIN task_executions te ON s.id = te.schedule_id
        WHERE p.role = 'nurse' AND p.status = 'active'
        GROUP BY p.id, p.full_name, p.department;
      `);
      
      // 创建护士工作日报视图
      logInfo('创建护士工作日报视图...');
      await client.query(`
        CREATE OR REPLACE VIEW nurse_daily_report AS
        SELECT
            p.id as nurse_id,
            p.full_name as nurse_name,
            nsi.work_date,
            nsi.sign_in_time,
            nsi.sign_out_time,
            EXTRACT(EPOCH FROM (COALESCE(nsi.sign_out_time, NOW()) - nsi.sign_in_time))/3600 as work_hours,
            COUNT(s.id) as total_tasks,
            COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as completed_tasks,
            COUNT(CASE WHEN s.status = 'in_progress' THEN 1 END) as in_progress_tasks,
            COUNT(CASE WHEN s.status = 'cancelled' THEN 1 END) as cancelled_tasks
        FROM profiles p
        LEFT JOIN nurse_sign_ins nsi ON p.id = nsi.nurse_id
        LEFT JOIN schedules s ON p.id = s.nurse_id AND DATE(s.scheduled_date) = nsi.work_date
        WHERE p.role = 'nurse' AND p.status = 'active'
        GROUP BY p.id, p.full_name, nsi.work_date, nsi.sign_in_time, nsi.sign_out_time
        ORDER BY nsi.work_date DESC, p.full_name;
      `);
      
      await client.query('COMMIT');
      logSuccess('视图修复完成');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      logError(`视图修复失败: ${error.message}`);
      return false;
    } finally {
      client.release();
    }
  } catch (error) {
    logError(`视图修复失败: ${error.message}`);
    return false;
  }
}

// 修复函数
async function fixFunctions() {
  logStep(5, '修复函数');
  
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 创建护士签到状态函数
      logInfo('创建护士签到状态函数...');
      await client.query(`
        CREATE OR REPLACE FUNCTION get_nurse_sign_in_status(nurse_uuid UUID, target_date DATE DEFAULT CURRENT_DATE)
        RETURNS TABLE(
            is_signed_in BOOLEAN,
            sign_in_time TIMESTAMP WITH TIME ZONE,
            sign_out_time TIMESTAMP WITH TIME ZONE,
            work_duration_hours NUMERIC
        ) AS $$
        BEGIN
            RETURN QUERY
            SELECT 
                (nsi.sign_in_time IS NOT NULL AND nsi.sign_out_time IS NULL) as is_signed_in,
                nsi.sign_in_time,
                nsi.sign_out_time,
                CASE 
                    WHEN nsi.sign_in_time IS NOT NULL AND nsi.sign_out_time IS NOT NULL 
                    THEN EXTRACT(EPOCH FROM (nsi.sign_out_time - nsi.sign_in_time))/3600
                    ELSE NULL 
                END as work_duration_hours
            FROM nurse_sign_ins nsi
            WHERE nsi.nurse_id = nurse_uuid AND nsi.work_date = target_date
            ORDER BY nsi.created_at DESC
            LIMIT 1;
        END;
        $$ LANGUAGE plpgsql;
      `);
      
      // 创建任务状态更新函数
      logInfo('创建任务状态更新函数...');
      await client.query(`
        CREATE OR REPLACE FUNCTION update_task_status(
            schedule_uuid UUID,
            new_status schedule_status_enum,
            nurse_uuid UUID DEFAULT NULL,
            notes TEXT DEFAULT NULL
        )
        RETURNS BOOLEAN AS $$
        DECLARE
            current_status schedule_status_enum;
            task_execution_uuid UUID;
        BEGIN
            -- 获取当前状态
            SELECT s.status INTO current_status FROM schedules s WHERE s.id = schedule_uuid;
            
            IF current_status IS NULL THEN
                RAISE EXCEPTION '排班记录不存在: %', schedule_uuid;
                RETURN FALSE;
            END IF;
            
            -- 更新排班状态
            UPDATE schedules SET 
                status = new_status,
                updated_at = NOW()
            WHERE id = schedule_uuid;
            
            -- 根据状态变化处理任务执行记录
            IF new_status = 'service_started' AND current_status != 'service_started' THEN
                -- 服务开始时创建任务执行记录
                INSERT INTO task_executions (schedule_id, nurse_id, started_at, status, notes)
                VALUES (schedule_uuid, nurse_uuid, NOW(), 'in_progress', notes)
                RETURNING id INTO task_execution_uuid;
                
            ELSIF new_status = 'service_completed' AND current_status != 'service_completed' THEN
                -- 服务完成时更新任务执行记录
                UPDATE task_executions SET 
                    completed_at = NOW(),
                    status = 'completed',
                    notes = COALESCE(notes, task_executions.notes)
                WHERE schedule_id = schedule_uuid AND status = 'in_progress'
                RETURNING id INTO task_execution_uuid;
                
            ELSIF new_status = 'service_interrupted' THEN
                -- 服务中断时更新任务执行记录
                UPDATE task_executions SET 
                    completed_at = NOW(),
                    status = 'interrupted',
                    notes = COALESCE(notes, task_executions.notes)
                WHERE schedule_id = schedule_uuid AND status = 'in_progress'
                RETURNING id INTO task_execution_uuid;
            END IF;
            
            -- 创建通知记录
            IF nurse_uuid IS NOT NULL THEN
                INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
                VALUES (
                    nurse_uuid,
                    '任务状态更新',
                    format('任务状态已从 %s 更新为 %s', current_status, new_status),
                    'info',
                    schedule_uuid,
                    'schedule'
                );
            END IF;
            
            RETURN TRUE;
        END;
        $$ LANGUAGE plpgsql;
      `);
      
      await client.query('COMMIT');
      logSuccess('函数修复完成');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      logError(`函数修复失败: ${error.message}`);
      return false;
    } finally {
      client.release();
    }
  } catch (error) {
    logError(`函数修复失败: ${error.message}`);
    return false;
  }
}

// 生成基本测试数据
async function generateBasicTestData() {
  logStep(6, '生成基本测试数据');
  
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 检查并创建护士用户
      logInfo('检查护士用户数据...');
      const nurseCount = await client.query('SELECT COUNT(*) as count FROM profiles WHERE role = $1', ['nurse']);
      
      if (parseInt(nurseCount.rows[0].count) < 5) {
        logInfo('创建护士用户...');
        const nurses = [
          { username: 'nurse001', full_name: '张晓梅', department: '体检科' },
          { username: 'nurse002', full_name: '李静怡', department: '疫苗接种科' },
          { username: 'nurse003', full_name: '王丽华', department: '体检科' },
          { username: 'nurse004', full_name: '陈志强', department: '咨询科' },
          { username: 'nurse005', full_name: '刘敏', department: '疫苗接种科' }
        ];
        
        for (const nurse of nurses) {
          await client.query(`
            INSERT INTO profiles (id, username, full_name, role, department, status, password_hash, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, 'nurse', $3, 'active', '$2b$12$X5.H4.8.K5.W4.8.K5.W4.8.K5.W4.8.K5.W4.8.K5.W4.8a', NOW(), NOW())
            ON CONFLICT (username) DO NOTHING
          `, [nurse.username, nurse.full_name, nurse.department]);
        }
        logSuccess('护士用户创建完成');
      }
      
      // 检查并创建服务类型
      logInfo('检查服务类型数据...');
      const serviceCount = await client.query('SELECT COUNT(*) as count FROM services');
      
      if (parseInt(serviceCount.rows[0].count) < 6) {
        logInfo('创建服务类型...');
        const services = [
          { name: '基础体检', category: 'nursing', duration: 30 },
          { name: '全面体检', category: 'nursing', duration: 60 },
          { name: '流感疫苗', category: 'nursing', duration: 15 },
          { name: 'HPV疫苗', category: 'nursing', duration: 20 },
          { name: '健康咨询', category: 'consultation', duration: 30 },
          { name: '营养咨询', category: 'consultation', duration: 45 }
        ];
        
        for (const service of services) {
          await client.query(`
            INSERT INTO services (id, name, category, base_duration, is_active, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3, true, NOW(), NOW())
            ON CONFLICT DO NOTHING
          `, [service.name, service.category, service.duration]);
        }
        logSuccess('服务类型创建完成');
      }
      
      // 检查并创建房间资源
      logInfo('检查房间资源数据...');
      const roomCount = await client.query('SELECT COUNT(*) as count FROM resources');
      
      if (parseInt(roomCount.rows[0].count) < 8) {
        logInfo('创建房间资源...');
        const rooms = [
          { name: '体检室1', type: '体检室', status: 'available' },
          { name: '体检室2', type: '体检室', status: 'available' },
          { name: '接种室1', type: '接种室', status: 'available' },
          { name: '接种室2', type: '接种室', status: 'available' },
          { name: '咨询室1', type: '咨询室', status: 'available' },
          { name: '咨询室2', type: '咨询室', status: 'available' },
          { name: '观察室', type: '观察室', status: 'available' },
          { name: '休息室', type: '休息室', status: 'available' }
        ];
        
        for (const room of rooms) {
          await client.query(`
            INSERT INTO resources (id, name, type, status, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
            ON CONFLICT DO NOTHING
          `, [room.name, room.type, room.status]);
        }
        logSuccess('房间资源创建完成');
      }
      
      await client.query('COMMIT');
      logSuccess('基本测试数据生成完成');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      logError(`基本测试数据生成失败: ${error.message}`);
      return false;
    } finally {
      client.release();
    }
  } catch (error) {
    logError(`基本测试数据生成失败: ${error.message}`);
    return false;
  }
}

// 主函数
async function main() {
  log('\n🚀 护士工作流程问题修复开始...', 'bright');
  log('='.repeat(60), 'bright');
  
  const startTime = Date.now();
  let success = true;
  
  try {
    // 步骤1: 检查数据库连接
    success = await checkDatabaseConnection();
    if (!success) {
      logError('数据库连接失败，终止修复流程');
      process.exit(1);
    }
    
    // 步骤2: 修复枚举类型
    success = await fixEnums();
    if (!success) {
      logError('枚举类型修复失败，终止修复流程');
      process.exit(1);
    }
    
    // 步骤3: 修复表结构
    success = await fixTables();
    if (!success) {
      logError('表结构修复失败，终止修复流程');
      process.exit(1);
    }
    
    // 步骤4: 修复视图
    success = await fixViews();
    if (!success) {
      logError('视图修复失败，终止修复流程');
      process.exit(1);
    }
    
    // 步骤5: 修复函数
    success = await fixFunctions();
    if (!success) {
      logError('函数修复失败，终止修复流程');
      process.exit(1);
    }
    
    // 步骤6: 生成基本测试数据
    success = await generateBasicTestData();
    if (!success) {
      logError('基本测试数据生成失败，终止修复流程');
      process.exit(1);
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    log(`\n🎉 护士工作流程问题修复完成！耗时: ${duration}秒`, 'bright');
    log('='.repeat(60), 'bright');
    
    log('\n📋 后续步骤:', 'cyan');
    log('1. 运行验证脚本: node verify-nurse-workflow-fixes.cjs', 'yellow');
    log('2. 检查验证报告: nurse-workflow-verification-report.html', 'yellow');
    log('3. 如有问题，重复运行此修复脚本', 'yellow');
    
  } catch (error) {
    logError(`修复过程中发生未预期错误: ${error.message}`);
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
  checkDatabaseConnection,
  fixEnums,
  fixTables,
  fixViews,
  fixFunctions,
  generateBasicTestData
};