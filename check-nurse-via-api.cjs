async function checkNurses() {
  console.log('🔍 通过API检查护士资源\n');

  try {
    // 查询所有护士
    const response = await fetch('http://localhost:3001/api/nurses');
    const nurses = await response.json();

    console.log('👩‍⚕️ 护士资源列表:');
    if (nurses && nurses.length > 0) {
      nurses.forEach(n => {
        console.log('  - ' + n.name + ' (状态: ' + n.status + ', 门店: ' + (n.store_id || '未分配') + ')');
      });
      console.log('\n总计:', nurses.length, '个护士');
    } else {
      console.log('  ⚠️  没有护士资源！');
    }

  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  }
}

checkNurses();
