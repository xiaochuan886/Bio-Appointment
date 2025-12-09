const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function clearAppointments() {
  console.log('🗑️ 开始清理数据库中的预约记录...');
  
  try {
    // 检查当前预约数量
    const countResult = await pool.query('SELECT COUNT(*) as count FROM appointments');
    const currentCount = parseInt(countResult.rows[0].count);
    console.log(`📊 当前数据库中有 ${currentCount} 条预约记录`);
    
    if (currentCount === 0) {
      console.log('✅ 数据库中没有预约记录，无需清理');
      return;
    }
    
    // 显示一些样本数据
    const sampleResult = await pool.query('SELECT id, customer_name, service_id, requested_date, status FROM appointments LIMIT 5');
    console.log('📋 样本预约记录:');
    sampleResult.rows.forEach((apt, index) => {
      console.log(`  ${index + 1}. ${apt.customer_name} - ${apt.requested_date} - ${apt.status}`);
    });
    
    // 确认操作
    console.log('\n⚠️ 警告：此操作将删除所有预约记录，包括相关的排班记录！');
    console.log('🔄 如果需要继续，请在 5 秒内按 Ctrl+C 取消...');
    
    // 等待 5 秒
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 删除相关的排班记录（因为排班记录依赖于预约）
    console.log('🗑️ 正在删除相关的排班记录...');
    const scheduleDeleteResult = await pool.query('DELETE FROM schedules');
    console.log(`✅ 已删除 ${scheduleDeleteResult.rowCount} 条排班记录`);
    
    // 删除所有预约记录
    console.log('🗑️ 正在删除预约记录...');
    const appointmentDeleteResult = await pool.query('DELETE FROM appointments');
    console.log(`✅ 已删除 ${appointmentDeleteResult.rowCount} 条预约记录`);
    
    // 验证清理结果
    const finalCountResult = await pool.query('SELECT COUNT(*) as count FROM appointments');
    const finalCount = parseInt(finalCountResult.rows[0].count);
    
    const finalScheduleCountResult = await pool.query('SELECT COUNT(*) as count FROM schedules');
    const finalScheduleCount = parseInt(finalScheduleCountResult.rows[0].count);
    
    console.log('\n🎉 清理完成！');
    console.log(`📊 预约记录：${currentCount} → ${finalCount}`);
    console.log(`📊 排班记录：${scheduleDeleteResult.rowCount} → ${finalScheduleCount}`);
    
    if (finalCount === 0 && finalScheduleCount === 0) {
      console.log('✅ 数据库已完全清理，所有预约和排班记录已删除');
    } else {
      console.log('⚠️ 清理可能不完整，请检查数据库');
    }
    
  } catch (error) {
    console.error('❌ 清理过程中发生错误:', error);
  } finally {
    await pool.end();
    console.log('🔌 数据库连接已关闭');
  }
}

// 运行清理函数
clearAppointments().catch(console.error);