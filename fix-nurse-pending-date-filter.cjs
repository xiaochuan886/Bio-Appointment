#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function fixNursePendingDateFilter() {
  console.log('🔧 修复护士待排班API的日期过滤问题...\n');

  try {
    const filePath = path.join(__dirname, 'server/api-server.cjs');
    let content = fs.readFileSync(filePath, 'utf8');

    // 找到护士待排班API的位置
    const nursePendingStart = content.indexOf("app.get('/api/appointments/nurse-pending'");
    if (nursePendingStart === -1) {
      console.error('❌ 未找到护士待排班API');
      return;
    }

    // 找到下一个app.get的位置作为结束点
    const nextApiStart = content.indexOf("app.get('", nursePendingStart + 1);
    const nursePendingEnd = nextApiStart === -1 ? content.length : nextApiStart;

    // 提取护士待排班API的代码
    const nursePendingCode = content.substring(nursePendingStart, nursePendingEnd);
    
    console.log('📍 找到护士待排班API，长度:', nursePendingCode.length);

    // 替换日期过滤逻辑
    let modifiedCode = nursePendingCode;

    // 注释掉日期过滤的if语句
    modifiedCode = modifiedCode.replace(
      /(\s+)\/\/ Add date range filter\n(\s+)if \(requested_date_from\) \{\n(\s+)conditions\.push\(`a\.requested_date >= \$\$\{params\.length \+ 1\}`\);\n(\s+)params\.push\(requested_date_from\);\n(\s+)\}\n(\s+)\n(\s+)if \(requested_date_to\) \{\n(\s+)conditions\.push\(`a\.requested_date <= \$\$\{params\.length \+ 1\}`\);\n(\s+)params\.push\(requested_date_to\);\n(\s+)\}/,
      `$1// 待排班预约不应该被日期筛选器筛选，护士长需要看到所有待排班的预约
$1// 注释掉日期过滤逻辑，因为这不符合业务逻辑
$1// if (requested_date_from) {
$1//   conditions.push(\`a.requested_date >= \$\$\{params.length + 1\}\`);
$1//   params.push(requested_date_from);
$1// }
$1// 
$1// if (requested_date_to) {
$1//   conditions.push(\`a.requested_date <= \$\$\{params.length + 1\}\`);
$1//   params.push(requested_date_to);
$1// }`
    );

    // 检查是否成功替换
    if (modifiedCode === nursePendingCode) {
      console.log('⚠️  未找到匹配的日期过滤代码，尝试简单替换...');
      
      // 尝试简单的替换方式
      modifiedCode = modifiedCode.replace(
        'if (requested_date_from) {',
        '// 待排班预约不应该被日期筛选 - 注释掉\n    // if (requested_date_from) {'
      );
      
      modifiedCode = modifiedCode.replace(
        /conditions\.push\(`a\.requested_date >= \$\$\{params\.length \+ 1\}`\);/g,
        '// conditions.push(`a.requested_date >= $${params.length + 1}`);'
      );
      
      modifiedCode = modifiedCode.replace(
        /conditions\.push\(`a\.requested_date <= \$\$\{params\.length \+ 1\}`\);/g,
        '// conditions.push(`a.requested_date <= $${params.length + 1}`);'
      );
      
      modifiedCode = modifiedCode.replace(
        'if (requested_date_to) {',
        '// if (requested_date_to) {'
      );
      
      // 注释掉params.push
      modifiedCode = modifiedCode.replace(
        /(\s+)params\.push\(requested_date_from\);/g,
        '$1// params.push(requested_date_from);'
      );
      
      modifiedCode = modifiedCode.replace(
        /(\s+)params\.push\(requested_date_to\);/g,
        '$1// params.push(requested_date_to);'
      );
    }

    // 重新组装完整文件内容
    const newContent = content.substring(0, nursePendingStart) + modifiedCode + content.substring(nursePendingEnd);

    // 写回文件
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    console.log('✅ 修复完成！');
    console.log('📝 修改内容:');
    console.log('  - 注释掉了护士待排班API中的日期过滤逻辑');
    console.log('  - 现在护士长可以看到所有待排班的预约，不受日期限制');

  } catch (error) {
    console.error('❌ 修复失败:', error);
  }
}

fixNursePendingDateFilter();