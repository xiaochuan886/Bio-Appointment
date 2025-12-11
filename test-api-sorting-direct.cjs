const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';
const mockToken = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3MzM4NjI1NzksImV4cCI6MTczMzk0ODk3OX0.signature';

async function testApiSortingDirect() {
  console.log('🧪 直接测试API排序...\n');

  try {
    const response = await fetch(`${API_BASE}/appointments/cancelled`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ API返回 ${data.length} 个已取消预约\n`);
      
      console.log('📋 API返回的前10个预约（按API排序）:');
      console.log('─'.repeat(100));
      
      data.slice(0, 10).forEach((apt, index) => {
        console.log(`${index + 1}. 客户: ${apt.customer_name}`);
        console.log(`   预约人: ${apt.sales_name || '未指定'}`);
        console.log(`   服务: ${apt.service_name}`);
        console.log(`   cancelled_at: ${apt.cancelled_at ? new Date(apt.cancelled_at).toLocaleString() : 'NULL'}`);
        console.log(`   created_at: ${apt.created_at ? new Date(apt.created_at).toLocaleString() : 'NULL'}`);
        console.log(`   updated_at: ${apt.updated_at ? new Date(apt.updated_at).toLocaleString() : 'NULL'}`);
        console.log('');
      });
      
      // 统计有销售信息的预约在前10位的数量
      const topTenWithSales = data.slice(0, 10).filter(apt => 
        apt.sales_name && apt.sales_name !== '未指定'
      );
      
      console.log(`📊 前10位中有销售信息的预约: ${topTenWithSales.length} 个`);
      
      if (topTenWithSales.length > 0) {
        console.log('\n✅ 前10位中有销售信息的预约:');
        topTenWithSales.forEach((apt, index) => {
          const position = data.findIndex(a => a.id === apt.id) + 1;
          console.log(`   位置${position}: ${apt.customer_name} - 预约人: ${apt.sales_name}`);
        });
      }
      
      // 查找所有有销售信息的预约
      const allWithSales = data.filter(apt => 
        apt.sales_name && apt.sales_name !== '未指定'
      );
      
      console.log(`\n📊 总共有销售信息的预约: ${allWithSales.length} 个`);
      console.log('📋 所有有销售信息的预约位置:');
      allWithSales.forEach((apt, index) => {
        const position = data.findIndex(a => a.id === apt.id) + 1;
        console.log(`   位置${position}: ${apt.customer_name} - 预约人: ${apt.sales_name}`);
      });
      
    } else {
      console.log(`❌ API调用失败: ${response.status}`);
      const errorText = await response.text();
      console.log('错误信息:', errorText);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testApiSortingDirect();