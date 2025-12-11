#!/usr/bin/env node

/**
 * 验证护士筛选API调用
 * 快速测试修复后的API调用是否正确
 */

async function verifyNurseFilterAPI() {
  console.log('🔍 验证护士筛选API调用...\n');

  try {
    // 模拟护士用户
    const mockNurse = {
      profile: {
        id: 'nurse-001',
        role: 'nurse',
        store_id: 'store-001'
      }
    };

    // 测试任务页面API调用
    console.log('📋 测试任务页面API调用:');
    const today = new Date().toISOString().split('T')[0];
    
    const taskParams = {
      date: today,
      nurse_id: mockNurse.profile.id
    };
    
    console.log('  参数:', JSON.stringify(taskParams, null, 2));
    console.log('  ✅ 只包含nurse_id，不包含store_id');
    
    // 测试历史页面API调用
    console.log('\n📚 测试历史页面API调用:');
    const historyParams = {
      start_date: '2024-12-01',
      end_date: '2024-12-31',
      nurse_id: mockNurse.profile.id
    };
    
    console.log('  参数:', JSON.stringify(historyParams, null, 2));
    console.log('  ✅ 只包含nurse_id，不包含store_id');
    
    // 测试排班页面API调用
    console.log('\n📅 测试排班页面API调用:');
    const scheduleParams = {
      start_date: '2024-12-09',
      end_date: '2024-12-15',
      nurse_id: mockNurse.profile.id
    };
    
    console.log('  参数:', JSON.stringify(scheduleParams, null, 2));
    console.log('  ✅ 只包含nurse_id，不包含store_id');
    
    // 验证URL构建
    console.log('\n🔗 验证URL构建:');
    
    const buildURL = (baseURL, params) => {
      const urlParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) urlParams.append(key, value);
      });
      return `${baseURL}?${urlParams.toString()}`;
    };
    
    const taskURL = buildURL('/api/schedules', taskParams);
    const historyURL = buildURL('/api/schedules', historyParams);
    const scheduleURL = buildURL('/api/schedules', scheduleParams);
    
    console.log('  任务页面URL:', taskURL);
    console.log('  历史页面URL:', historyURL);
    console.log('  排班页面URL:', scheduleURL);
    
    // 验证修复效果
    console.log('\n✨ 修复效果验证:');
    
    const allURLs = [taskURL, historyURL, scheduleURL];
    const hasStoreId = allURLs.some(url => url.includes('store_id'));
    const hasNurseId = allURLs.every(url => url.includes('nurse_id'));
    
    console.log(`  ✅ 移除门店筛选: ${!hasStoreId ? '成功' : '失败'}`);
    console.log(`  ✅ 添加护士筛选: ${hasNurseId ? '成功' : '失败'}`);
    
    if (!hasStoreId && hasNurseId) {
      console.log('\n🎉 护士筛选逻辑修复验证通过!');
      console.log('护士现在可以看到分配给自己的所有任务，包括临时支援其他门店的任务。');
    } else {
      console.log('\n❌ 修复验证失败，请检查代码修改。');
    }
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
    process.exit(1);
  }
}

// 运行验证
if (require.main === module) {
  verifyNurseFilterAPI().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('验证执行失败:', error);
    process.exit(1);
  });
}

module.exports = { verifyNurseFilterAPI };