#!/usr/bin/env node

/**
 * 调试预约人数据不显示的问题
 * 直接检查API返回的数据结构
 */

const fetch = require('node-fetch');

async function debugSalesNameIssue() {
  console.log('🔍 调试预约人数据显示问题');
  console.log('=' .repeat(50));

  try {
    // 1. 测试API端点，获取实际数据
    console.log('\n📡 测试API端点:');
    
    const response = await fetch('http://localhost:3001/api/schedules?limit=5', {
      headers: {
        'Authorization': 'Bearer test-token', // 可能需要认证
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log(`❌ API调用失败: ${response.status} ${response.statusText}`);
      
      // 如果API需要认证，提供解决方案
      if (response.status === 401) {
        console.log('\n💡 解决方案:');
        console.log('1. API需要认证，请在浏览器中登录后再测试');
        console.log('2. 或者直接在浏览器开发者工具中查看网络请求');
        console.log('3. 检查实际返回的数据结构');
      }
      return;
    }

    const data = await response.json();
    console.log(`✅ API调用成功，返回 ${data.length} 条记录`);

    if (data.length === 0) {
      console.log('⚠️  没有返回任何数据');
      return;
    }

    // 2. 分析数据结构
    console.log('\n🔍 分析数据结构:');
    
    const firstRecord = data[0];
    console.log('第一条记录的完整结构:');
    console.log(JSON.stringify(firstRecord, null, 2));

    // 3. 检查预约人相关字段
    console.log('\n📊 预约人字段检查:');
    
    data.forEach((record, index) => {
      console.log(`\n记录 ${index + 1}:`);
      console.log(`  - ID: ${record.id}`);
      console.log(`  - 预约ID: ${record.appointment_id}`);
      console.log(`  - 客户姓名: ${record.customer_name || '❌ 缺失'}`);
      console.log(`  - sales_name: ${record.sales_name || '❌ 缺失'}`);
      console.log(`  - sales_username: ${record.sales_username || '❌ 缺失'}`);
      console.log(`  - sales_role: ${record.sales_role || '❌ 缺失'}`);
      console.log(`  - 护士姓名: ${record.nurse_name || '❌ 缺失'}`);
      
      // 检查嵌套的appointment对象
      if (record.appointment) {
        console.log(`  - appointment.sales_name: ${record.appointment.sales_name || '❌ 缺失'}`);
        console.log(`  - appointment.customer_name: ${record.appointment.customer_name || '❌ 缺失'}`);
      } else {
        console.log(`  - appointment对象: ❌ 缺失`);
      }
    });

    // 4. 统计数据完整性
    const totalRecords = data.length;
    const withSalesName = data.filter(r => r.sales_name).length;
    const withSalesUsername = data.filter(r => r.sales_username).length;
    const withCustomerName = data.filter(r => r.customer_name).length;
    const withAppointmentData = data.filter(r => r.appointment).length;

    console.log('\n📈 数据完整性统计:');
    console.log(`  - 总记录数: ${totalRecords}`);
    console.log(`  - 有sales_name: ${withSalesName}/${totalRecords} (${Math.round(withSalesName/totalRecords*100)}%)`);
    console.log(`  - 有sales_username: ${withSalesUsername}/${totalRecords} (${Math.round(withSalesUsername/totalRecords*100)}%)`);
    console.log(`  - 有customer_name: ${withCustomerName}/${totalRecords} (${Math.round(withCustomerName/totalRecords*100)}%)`);
    console.log(`  - 有appointment对象: ${withAppointmentData}/${totalRecords} (${Math.round(withAppointmentData/totalRecords*100)}%)`);

    // 5. 提供修复建议
    console.log('\n🔧 修复建议:');
    
    if (withSalesName === 0 && withSalesUsername === 0) {
      console.log('❌ 预约人数据完全缺失！');
      console.log('\n可能的原因:');
      console.log('1. 数据库中appointments表的sales_name字段为空');
      console.log('2. API查询的JOIN条件有问题');
      console.log('3. profiles表中缺少对应的用户记录');
      
      console.log('\n解决方案:');
      console.log('1. 检查数据库中的appointments表');
      console.log('2. 手动添加预约人数据');
      console.log('3. 修复API查询逻辑');
    } else if (withSalesName > 0) {
      console.log('✅ 部分记录有预约人数据');
      console.log('前端显示逻辑应该能正常工作');
    }

  } catch (error) {
    console.log(`❌ 调试失败: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 API服务器未运行，请启动服务器:');
      console.log('npm run dev 或 node server/api-server.cjs');
    }
  }
}

// 运行调试
debugSalesNameIssue().catch(console.error);