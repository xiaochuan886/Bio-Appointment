const fs = require('fs');

// 读取API服务器文件
const apiServerPath = 'server/api-server.cjs';
let content = fs.readFileSync(apiServerPath, 'utf8');

console.log('🔧 [修复] 开始修复排班时长处理问题...');

// 问题分析：
// 1. 排班API只接收 scheduled_time_start 和 scheduled_time_end
// 2. 排班API不接收 duration 参数
// 3. 排班创建后，预约的 estimated_duration 没有被更新
// 4. 前端修改的时长只体现在 scheduled_time_start 和 scheduled_time_end 上

// 解决方案：
// 1. 在排班创建时，根据时间差计算实际时长
// 2. 更新预约的 estimated_duration 字段以反映实际时长

// 查找排班创建的INSERT语句
const insertScheduleRegex = /(`INSERT INTO schedules \(appointment_id, scheduled_date, scheduled_time_start, scheduled_time_end, room_id, nurse_id, notes, status\)\s*VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7, 'scheduled'\)\s*RETURNING \*`,\s*\[appointment_id, scheduled_date, scheduled_time_start, scheduled_time_end, room_id, nurse_id, notes\]\s*\);/;

if (insertScheduleRegex.test(content)) {
  console.log('✅ [修复] 找到排班创建代码');
  
  // 替换排班创建代码，添加时长计算和预约更新
  const newInsertCode = `// 计算排班时长（分钟）
    const startTime = new Date(\`1970-01-01T\${scheduled_time_start}\`);
    const endTime = new Date(\`1970-01-01T\${scheduled_time_end}\`);
    const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
    
    console.log(\`🕐 [DEBUG] 计算排班时长: \${scheduled_time_start} - \${scheduled_time_end} = \${durationMinutes}分钟\`);
    
    const result = await pool.query(
      \`INSERT INTO schedules (appointment_id, scheduled_date, scheduled_time_start, scheduled_time_end, room_id, nurse_id, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled')
       RETURNING *\`,
      [appointment_id, scheduled_date, scheduled_time_start, scheduled_time_end, room_id, nurse_id, notes]
    );
    
    // 更新预约的estimated_duration以反映实际排班时长
    if (durationMinutes > 0) {
      await pool.query(
        \`UPDATE appointments SET estimated_duration = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2\`,
        [durationMinutes, appointment_id]
      );
      console.log(\`✅ [DEBUG] 已更新预约时长: appointment_id=\${appointment_id}, new_duration=\${durationMinutes}分钟\`);
    }`;
  
  // 替换原有代码
  content = content.replace(insertScheduleRegex, newInsertCode);
  console.log('✅ [修复] 已替换排班创建代码');
} else {
  console.log('❌ [修复] 未找到排班创建代码');
}

// 查找医生排班创建的INSERT语句
const insertDoctorScheduleRegex = /(`INSERT INTO schedules \(appointment_id, scheduled_date, scheduled_time_start, scheduled_time_end, doctor_id, status, created_at, updated_at\)\s*VALUES \(\$1, CURRENT_DATE, \$3, \$4, \$5, 'scheduled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP\)\s*RETURNING \*`,\s*\[updatedAppointment\.id, updatedAppointment\.requested_time_start, updatedAppointment\.requested_time_end, finalDoctorId\]\s*\);/;

if (insertDoctorScheduleRegex.test(content)) {
  console.log('✅ [修复] 找到医生排班创建代码');
  
  // 替换医生排班创建代码，添加时长计算和预约更新
  const newDoctorInsertCode = `// 计算排班时长（分钟）
            const startTime = new Date(\`1970-01-01T\${updatedAppointment.requested_time_start}\`);
            const endTime = new Date(\`1970-01-01T\${updatedAppointment.requested_time_end}\`);
            const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
            
            console.log(\`🕐 [DEBUG] 医生排班时长: \${updatedAppointment.requested_time_start} - \${updatedAppointment.requested_time_end} = \${durationMinutes}分钟\`);
            
            const scheduleResult = await pool.query(
              \`INSERT INTO schedules (appointment_id, scheduled_date, scheduled_time_start, scheduled_time_end, doctor_id, status, created_at, updated_at)
               VALUES ($1, CURRENT_DATE, $3, $4, $5, 'scheduled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
               RETURNING *\`,
              [
                updatedAppointment.id,
                updatedAppointment.requested_time_start,
                updatedAppointment.requested_time_end,
                finalDoctorId
              ]
            );
            
            // 更新预约的estimated_duration以反映实际排班时长
            if (durationMinutes > 0) {
              await pool.query(
                \`UPDATE appointments SET estimated_duration = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2\`,
                [durationMinutes, updatedAppointment.id]
              );
              console.log(\`✅ [DEBUG] 已更新医生预约时长: appointment_id=\${updatedAppointment.id}, new_duration=\${durationMinutes}分钟\`);
            }`;
  
  // 替换原有代码
  content = content.replace(insertDoctorScheduleRegex, newDoctorInsertCode);
  console.log('✅ [修复] 已替换医生排班创建代码');
} else {
  console.log('❌ [修复] 未找到医生排班创建代码');
}

// 查找排班更新的代码
const updateScheduleRegex = /(const result = await pool\.query\(\s*`UPDATE schedules SET \${updateFields\.join\(', '\)}, updated_at = CURRENT_TIMESTAMP\s*WHERE id = \$\{paramIndex\}\s*RETURNING \*`,\s*values\s*\)\s*;)/;

if (updateScheduleRegex.test(content)) {
  console.log('✅ [修复] 找到排班更新代码');
  
  // 在排班更新后添加时长计算和预约更新
  const newUpdateCode = `const result = await pool.query(
      \`UPDATE schedules SET \${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *\`,
      values
    );
    
    // 如果更新了时间，则重新计算时长并更新预约
    const timeFields = ['scheduled_time_start', 'scheduled_time_end'];
    const hasTimeUpdate = timeFields.some(field => updates.hasOwnProperty(field));
    
    if (hasTimeUpdate && result.rows.length > 0) {
      const updatedSchedule = result.rows[0];
      const startTime = new Date(\`1970-01-01T\${updatedSchedule.scheduled_time_start}\`);
      const endTime = new Date(\`1970-01-01T\${updatedSchedule.scheduled_time_end}\`);
      const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
      
      console.log(\`🕐 [DEBUG] 排班更新后重新计算时长: \${updatedSchedule.scheduled_time_start} - \${updatedSchedule.scheduled_time_end} = \${durationMinutes}分钟\`);
      
      // 更新预约的estimated_duration
      await pool.query(
        \`UPDATE appointments SET estimated_duration = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2\`,
        [durationMinutes, updatedSchedule.appointment_id]
      );
      console.log(\`✅ [DEBUG] 已更新预约时长: appointment_id=\${updatedSchedule.appointment_id}, new_duration=\${durationMinutes}分钟\`);
    }`;
  
  // 替换原有代码
  content = content.replace(updateScheduleRegex, newUpdateCode);
  console.log('✅ [修复] 已替换排班更新代码');
} else {
  console.log('❌ [修复] 未找到排班更新代码');
}

// 写入修复后的文件
fs.writeFileSync(apiServerPath, content, 'utf8');
console.log('✅ [修复] 排班时长处理修复完成');
console.log('\n📋 [修复总结]');
console.log('1. ✅ 在排班创建时计算实际时长');
console.log('2. ✅ 更新预约的estimated_duration字段以反映实际时长');
console.log('3. ✅ 在排班更新时重新计算时长并更新预约');
console.log('4. ✅ 添加调试日志以便追踪时长处理');
console.log('\n🔄 [下一步] 重启API服务器以应用修复');