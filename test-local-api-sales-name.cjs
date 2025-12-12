#!/usr/bin/env node

/**
 * 测试本地API是否返回预约人数据
 */

async function testLocalAPI() {
  console.log('🔍 测试本地API预约人数据');
  console.log('=' .repeat(40));

  try {
    const fetch = (await import('node-fetch')).default;
    
    // 测试schedules API
    console.log('\n📡 测试 /api/schedules 端点:');
    const response = await fetch('http://localhost:3001/api/schedules?limit=3');
    
    if (!response.ok) {
      console.log(`❌ API调用失败: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();
    console.log(`✅ API调用成功，返回 ${data.length} 条记录`);

    if (data.length === 0) {
      console.log('⚠️  没有返回任何数据');
      return;
    }

    // 检查每条记录的预约人数据
    data.forEach((record, index) => {
      console.log(`\n记录 ${index + 1}:`);
      console.log(`  - 排班ID: ${record.id}`);
      console.log(`  - 预约ID: ${record.appointment_id}`);
      console.log(`  - 客户姓名: ${record.customer_name || '无'}`);
      console.log(`  - 预约人姓名: ${record.sales_name || '❌ 缺失'}`);
      console.log(`  - 预约人用户名: ${record.sales_username || '无'}`);
      console.log(`  - 同行客户: ${record.companion_names ? record.companion_names.join(', ') : '无'}`);
      console.log(`  - 总人数: ${record.total_people || 1}`);
      console.log(`  - 服务名称: ${record.service_name || '无'}`);
      console.log(`  - 护士姓名: ${record.nurse_name || '无'}`);
    });

    // 统计数据完整性
    const totalRecords = data.length;
    const withSalesName = data.filter(r => r.sales_name).length;
    const withSalesUsername = data.filter(r => r.sales_username).length;
    const withCustomerName = data.filter(r => r.customer_name).length;
    const withTotalPeople = data.filter(r => r.total_people).length;

    console.log('\n📊 数据完整性统计:');
    console.log(`  - 总记录数: ${totalRecords}`);
    console.log(`  - 有预约人姓名: ${withSalesName}/${totalRecords} (${Math.round(withSalesName/totalRecords*100)}%)`);
    console.log(`  - 有预约人用户名: ${withSalesUsername}/${totalRecords} (${Math.round(withSalesUsername/totalRecords*100)}%)`);
    console.log(`  - 有客户姓名: ${withCustomerName}/${totalRecords} (${Math.round(withCustomerName/totalRecords*100)}%)`);
    console.log(`  - 有总人数: ${withTotalPeople}/${totalRecords} (${Math.round(withTotalPeople/totalRecords*100)}%)`);

    if (withSalesName === 0) {
      console.log('\n⚠️  预约人数据完全缺失！');
      console.log('可能的原因:');
      console.log('1. 数据库中appointments表没有sales_id或created_by数据');
      console.log('2. profiles表中缺少对应的用户记录');
      console.log('3. API查询的JOIN条件有问题');
      
      console.log('\n🔧 建议检查:');
      console.log('1. 检查appointments表的sales_id和created_by字段');
      console.log('2. 检查profiles表是否有对应的用户记录');
      console.log('3. 手动创建一些测试数据');
    } else {
      console.log('\n✅ 预约人数据正常返回');
    }

  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 请确保API服务器正在运行: npm run dev 或 node server/api-server.cjs');
    }
  }
}

// 运行测试
testLocalAPI().catch(console.error);