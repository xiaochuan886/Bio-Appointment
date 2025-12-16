const fs = require('fs');
const path = require('path');

console.log('🔧 修复 userResult undefined 错误...');

const filePath = path.join(__dirname, 'server/api-server.cjs');

// 读取文件内容
let content = fs.readFileSync(filePath, 'utf8');

// 查找问题代码
const originalCode = `    // 获取用户详细信息
    let userResult;
    if (user && user.userId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(user.userId)) {
        userResult = await pool.query(
          'SELECT id, role, store_id FROM profiles WHERE id = $1',
          [user.userId]
        );
      } else {
        userResult = { rows: [{ id: user.userId, role: user.role, store_id: null }] };
      }
    }

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found',
        message: '用户不存在'
      });
    }

    const userProfile = userResult.rows[0];`;

// 修复后的代码
const fixedCode = `    // 获取用户详细信息
    let userResult;
    if (user && user.userId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(user.userId)) {
        userResult = await pool.query(
          'SELECT id, role, store_id FROM profiles WHERE id = $1',
          [user.userId]
        );
      } else {
        userResult = { rows: [{ id: user.userId, role: user.role, store_id: null }] };
      }
    } else {
      // 如果user或user.userId不存在，返回认证错误
      return res.status(401).json({
        error: 'Authentication failed',
        message: '用户认证信息无效'
      });
    }

    if (!userResult || userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found',
        message: '用户不存在'
      });
    }

    const userProfile = userResult.rows[0];`;

// 替换代码
if (content.includes(originalCode)) {
  content = content.replace(originalCode, fixedCode);
  
  // 写回文件
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('✅ 成功修复 userResult undefined 错误');
  console.log('📝 修复内容:');
  console.log('   1. 添加了对userResult是否为undefined的检查');
  console.log('   2. 在user或user.userId不存在时返回认证错误');
  console.log('   3. 在检查userResult.rows.length之前先检查userResult是否存在');
} else {
  console.log('❌ 未找到需要修复的代码段');
  console.log('🔍 请检查代码是否已经被修改过');
}

console.log('🎯 修复完成！');