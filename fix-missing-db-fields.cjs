const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function fixMissingFields() {
  try {
    console.log('🔍 检查数据库字段缺失问题...');
    
    // 1. 检查 appointments 表结构
    console.log('\n📋 检查 appointments 表结构...');
    const tableStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'appointments' 
      ORDER BY ordinal_position
    `);
    
    console.log('当前 appointments 表字段:');
    tableStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });
    
    // 2. 检查是否缺少 forwarded_to_nurse_at 字段
    const hasForwardedField = tableStructure.rows.some(col => col.column_name === 'forwarded_to_nurse_at');
    
    if (!hasForwardedField) {
      console.log('\n❌ 发现问题: appointments 表缺少 forwarded_to_nurse_at 字段');
      
      // 添加缺失的字段
      console.log('🔧 正在添加 forwarded_to_nurse_at 字段...');
      await pool.query(`
        ALTER TABLE appointments 
        ADD COLUMN forwarded_to_nurse_at TIMESTAMP WITH TIME ZONE
      `);
      console.log('✅ forwarded_to_nurse_at 字段添加成功');
    } else {
      console.log('\n✅ forwarded_to_nurse_at 字段已存在');
    }
    
    // 3. 检查是否缺少其他工作流相关字段
    const requiredFields = [
      'workflow_status',
      'requires_nurse_scheduling', 
      'doctor_confirmed_at',
      'forwarded_to_nurse_at'
    ];
    
    console.log('\n🔍 检查工作流相关字段...');
    const missingFields = [];
    
    requiredFields.forEach(field => {
      const exists = tableStructure.rows.some(col => col.column_name === field);
      if (!exists) {
        missingFields.push(field);
      }
    });
    
    if (missingFields.length > 0) {
      console.log(`❌ 缺少字段: ${missingFields.join(', ')}`);
      
      // 执行迁移脚本
      console.log('🔧 正在执行数据库迁移...');
      
      // 添加 workflow_status 字段
      if (missingFields.includes('workflow_status')) {
        await pool.query(`
          ALTER TABLE appointments 
          ADD COLUMN workflow_status VARCHAR(50) DEFAULT 'pending_nurse_assignment'
        `);
        console.log('✅ workflow_status 字段添加成功');
      }
      
      // 添加 requires_nurse_scheduling 字段
      if (missingFields.includes('requires_nurse_scheduling')) {
        await pool.query(`
          ALTER TABLE appointments 
          ADD COLUMN requires_nurse_scheduling BOOLEAN DEFAULT true
        `);
        console.log('✅ requires_nurse_scheduling 字段添加成功');
      }
      
      // 添加 doctor_confirmed_at 字段
      if (missingFields.includes('doctor_confirmed_at')) {
        await pool.query(`
          ALTER TABLE appointments 
          ADD COLUMN doctor_confirmed_at TIMESTAMP WITH TIME ZONE
        `);
        console.log('✅ doctor_confirmed_at 字段添加成功');
      }
      
      // 添加 forwarded_to_nurse_at 字段
      if (missingFields.includes('forwarded_to_nurse_at')) {
        await pool.query(`
          ALTER TABLE appointments 
          ADD COLUMN forwarded_to_nurse_at TIMESTAMP WITH TIME ZONE
        `);
        console.log('✅ forwarded_to_nurse_at 字段添加成功');
      }
      
      // 创建索引
      console.log('🔧 正在创建索引...');
      try {
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_appointments_workflow_status 
          ON appointments(workflow_status)
        `);
        console.log('✅ workflow_status 索引创建成功');
      } catch (error) {
        console.log('⚠️ workflow_status 索引可能已存在:', error.message);
      }
      
      try {
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_appointments_requires_nurse_scheduling 
          ON appointments(requires_nurse_scheduling)
        `);
        console.log('✅ requires_nurse_scheduling 索引创建成功');
      } catch (error) {
        console.log('⚠️ requires_nurse_scheduling 索引可能已存在:', error.message);
      }
      
      // 更新现有数据
      console.log('🔧 正在更新现有数据...');
      const updateResult = await pool.query(`
        UPDATE appointments a
        SET
          workflow_status = CASE
            WHEN s.category = 'consultation' OR s.category = 'report' THEN 'pending_doctor_confirmation'
            ELSE 'pending_nurse_assignment'
          END,
          requires_nurse_scheduling = CASE
            WHEN s.category = 'consultation' OR s.category = 'report' THEN false
            ELSE true
          END
        FROM services s
        WHERE a.service_id = s.id
        AND a.workflow_status IS NULL
      `);
      
      console.log(`✅ 更新了 ${updateResult.rowCount} 条预约记录`);
      
    } else {
      console.log('✅ 所有工作流字段都存在');
    }
    
    // 4. 最终验证
    console.log('\n🔍 最终验证表结构...');
    const finalStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'appointments' 
      AND column_name IN ('workflow_status', 'requires_nurse_scheduling', 'doctor_confirmed_at', 'forwarded_to_nurse_at')
      ORDER BY ordinal_position
    `);
    
    console.log('工作流字段最终状态:');
    finalStructure.rows.forEach(col => {
      console.log(`  ✅ ${col.column_name}: ${col.data_type}`);
    });
    
    console.log('\n🎉 数据库字段修复完成！');
    
  } catch (error) {
    console.error('❌ 修复过程中出错:', error);
  } finally {
    await pool.end();
  }
}

// 执行修复
fixMissingFields();