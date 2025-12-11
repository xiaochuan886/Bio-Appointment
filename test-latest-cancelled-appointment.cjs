const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';

// Mock admin token for testing
const mockToken = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3MzM4NjI1NzksImV4cCI6MTczMzk0ODk3OX0.signature';

async function testLatestCancelledAppointment() {
  console.log('🧪 测试最新已取消预约显示...\n');

  try {
    // 获取已取消预约
    const cancelledResponse = await fetch(`${API_BASE}/appointments/cancelled`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (cancelledResponse.ok) {
      const cancelledData = await cancelledResponse.json();
      console.log(`获取到 ${cancelledData.length} 个已取消预约\n`);
      
      // 检查前3个预约（应该按时间倒序排列）
      console.log('📋 前3个已取消预约（按时间倒序）:');
      console.log('─'.repeat(60));
      
      cancelledData.slice(0, 3).forEach((apt, index) => {
        console.log(`${index + 1}. 客户: ${apt.customer_name}`);
        console.log(`   预约人: ${apt.sales_name || '未指定'}`);
        console.log(`   服务: ${apt.service_name}`);
        console.log(`   取消时间: ${apt.cancelled_at ? new Date(apt.cancelled_at).toLocaleString() : '未知'}`);
        console.log(`   客户数量: ${apt.total_people || 1}人`);
        
        if (apt.companion_names && apt.companion_names.length > 0) {
          console.log(`   同行客户: ${apt.companion_names.join(', ')}`);
        }
        
        if (apt.cancelled_reason) {
          console.log(`   取消原因: ${apt.cancelled_reason}`);
        }
        
        console.log('');
      });
      
      console.log('─'.repeat(60));
      
      // 查找我们最新创建的预约
      const latestTestAppointment = cancelledData.find(apt => 
        apt.customer_name === '最新测试客户-销售信息验证'
      );
      
      if (latestTestAppointment) {
        console.log('\n✅ 找到最新创建的测试预约:');
        console.log(`   客户: ${latestTestAppointment.customer_name}`);
        console.log(`   预约人: ${latestTestAppointment.sales_name || '未指定'}`);
        console.log(`   在列表中的位置: ${cancelledData.findIndex(apt => apt.id === latestTestAppointment.id) + 1}`);
        
        if (latestTestAppointment.sales_name && latestTestAppointment.sales_name !== '未指定') {
          console.log('   ✅ 销售信息正确显示');
        } else {
          console.log('   ❌ 销售信息缺失');
        }
      } else {
        console.log('\n❌ 没有找到最新创建的测试预约');
      }
      
      // 统计有销售信息的预约
      const appointmentsWithSales = cancelledData.filter(apt => 
        apt.sales_name && apt.sales_name !== '未指定'
      );
      
      console.log(`\n📊 销售信息统计:`);
      console.log(`   有销售信息: ${appointmentsWithSales.length} 个`);
      console.log(`   无销售信息: ${cancelledData.length - appointmentsWithSales.length} 个`);
      
      if (appointmentsWithSales.length > 0) {
        console.log('\n✅ 有销售信息的已取消预约:');
        appointmentsWithSales.forEach((apt, index) => {
          console.log(`   ${index + 1}. ${apt.customer_name} - 预约人: ${apt.sales_name}`);
        });
      }
      
      console.log('\n🎯 前端显示建议:');
      console.log('   1. 刷新浏览器页面以获取最新数据');
      console.log('   2. 切换到"已取消预约"标签页');
      console.log('   3. 查看列表顶部是否显示带销售信息的预约');
      console.log('   4. 如果仍显示"未指定"，可能需要检查前端缓存');
      
    } else {
      console.log(`❌ API调用失败: ${cancelledResponse.status}`);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testLatestCancelledAppointment();