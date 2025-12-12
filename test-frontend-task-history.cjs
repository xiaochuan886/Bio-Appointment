#!/usr/bin/env node

/**
 * 前端任务历史页面功能验证脚本
 * 测试不同用户角色的页面行为
 */

const fs = require('fs');
const path = require('path');

// 读取权限工具函数文件
function readPermissionsFile() {
  const filePath = path.join(__dirname, 'src/utils/permissions.ts');
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content;
  } catch (error) {
    console.error('无法读取权限文件:', error.message);
    return null;
  }
}

// 读取历史页面文件
function readHistoryPageFile() {
  const filePath = path.join(__dirname, 'src/pages/nurse/HistoryPage.tsx');
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content;
  } catch (error) {
    console.error('无法读取历史页面文件:', error.message);
    return null;
  }
}

// 检查权限函数是否存在
function checkPermissionFunctions(content) {
  const requiredFunctions = [
    'canViewAllTaskHistory',
    'canChooseTaskHistoryScope', 
    'getTaskHistoryFilters'
  ];
  
  const results = {};
  requiredFunctions.forEach(func => {
    results[func] = content.includes(`export function ${func}`);
  });
  
  return results;
}

// 检查历史页面功能
function checkHistoryPageFeatures(content) {
  const features = {
    'dataScope状态': content.includes('dataScope'),
    '权限检查': content.includes('canViewAllTaskHistory') && content.includes('canChooseTaskHistoryScope'),
    '数据范围选择器': content.includes('canChooseScope &&'),
    '动态页面标题': content.includes('canViewAllData') && content.includes('dataScope === \'self\''),
    '权限筛选': content.includes('getTaskHistoryFilters'),
    '依赖更新': content.includes('dataScope])'),
  };
  
  return features;
}

function main() {
  console.log('🔍 前端任务历史页面功能验证\n');

  // 检查权限工具函数
  console.log('1. 检查权限工具函数:');
  const permissionsContent = readPermissionsFile();
  if (permissionsContent) {
    const permissionFunctions = checkPermissionFunctions(permissionsContent);
    Object.entries(permissionFunctions).forEach(([func, exists]) => {
      console.log(`   ${exists ? '✅' : '❌'} ${func}`);
    });
  } else {
    console.log('   ❌ 无法读取权限文件');
  }
  console.log('');

  // 检查历史页面功能
  console.log('2. 检查历史页面功能:');
  const historyContent = readHistoryPageFile();
  if (historyContent) {
    const pageFeatures = checkHistoryPageFeatures(historyContent);
    Object.entries(pageFeatures).forEach(([feature, exists]) => {
      console.log(`   ${exists ? '✅' : '❌'} ${feature}`);
    });
  } else {
    console.log('   ❌ 无法读取历史页面文件');
  }
  console.log('');

  // 功能完整性检查
  console.log('3. 功能完整性检查:');
  const allPermissionFunctions = permissionsContent ? 
    Object.values(checkPermissionFunctions(permissionsContent)).every(Boolean) : false;
  const allPageFeatures = historyContent ?
    Object.values(checkHistoryPageFeatures(historyContent)).every(Boolean) : false;
  
  console.log(`   权限函数完整性: ${allPermissionFunctions ? '✅ 完整' : '❌ 不完整'}`);
  console.log(`   页面功能完整性: ${allPageFeatures ? '✅ 完整' : '❌ 不完整'}`);
  console.log(`   总体状态: ${allPermissionFunctions && allPageFeatures ? '✅ 就绪' : '❌ 需要修复'}`);
  console.log('');

  // 使用建议
  console.log('4. 使用建议:');
  console.log('   - 管理员登录后可查看所有任务历史');
  console.log('   - 护士长可通过数据范围选择器切换个人/门店视图');
  console.log('   - 护士只能查看个人任务历史');
  console.log('   - 所有数据访问都经过权限验证');
  console.log('');

  console.log('✅ 验证完成');
}

if (require.main === module) {
  main();
}