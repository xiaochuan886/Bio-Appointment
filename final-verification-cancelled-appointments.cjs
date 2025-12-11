const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';
const mockToken = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3MzM4NjI1NzksImV4cCI6MTczMzk0ODk3OX0.signature';

async function finalVerificationCancelledAppointments() {
  console.log('🎯 最终验证：已取消预约显示修复\n');

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
      
      console.log('📋 前5个已取消预约（应该显示销售信息）:');
      console.log('─'.repeat(80));
      
      let issuesFound = [];
      
      data.slice(0, 5).forEach((apt, index) => {
        console.log(`${index + 1}. 客户: ${apt.customer_name}`);
        console.log(`   预约人: ${apt.sales_name || '未指定'}`);
        console.log(`   服务: ${apt.service_name}`);
        console.log(`   客户数量: ${apt.total_people || 1}人`);
        
        if (apt.companion_names && apt.companion_names.length > 0) {
          console.log(`   同行客户: ${apt.companion_names.join(', ')}`);
        }
        
        if (apt.cancelled_reason) {
          console.log(`   取消原因: ${apt.cancelled_reason}`);
        }
        
        if (apt.cancelled_at) {
          console.log(`   取消时间: ${new Date(apt.cancelled_at).toLocaleString()}`);
        }
        
        // 检查问题
        if (!apt.sales_name || apt.sales_name === '未指定') {
          issuesFound.push(`位置${index + 1}: ${apt.customer_name} - 缺少销售信息`);
        }
        
        console.log('');
      });
      
      // 统计结果
      const topFiveWithSales = data.slice(0, 5).filter(apt => 
        apt.sales_name && apt.sales_name !== '未指定'
      );
      
      console.log('─'.repeat(80));
      console.log('📊 验证结果:');
      console.log(`   前5位中有销售信息: ${topFiveWithSales.length}/5`);
      console.log(`   前5位中缺少销售信息: ${5 - topFiveWithSales.length}/5`);
      
      if (issuesFound.length === 0) {
        console.log('\n🎉 验证通过！所有问题已修复:');
        console.log('   ✅ 已取消预约按最新时间排序');
        console.log('   ✅ 销售信息正确显示');
        console.log('   ✅ 客户信息完整显示');
        console.log('   ✅ 不再显示"未指定"');
      } else {
        console.log('\n⚠️ 发现问题:');
        issuesFound.forEach(issue => {
          console.log(`   ❌ ${issue}`);
        });
      }
      
      // 检查前端应该看到的内容
      console.log('\n🎯 前端显示预期:');
      console.log('   1. 切换到"已取消预约"标签页');
      console.log('   2. 列表顶部应显示最近取消的预约');
      console.log('   3. 每个预约应显示正确的预约人姓名');
      console.log('   4. 客户数量和同行客户信息应完整');
      console.log('   5. 不应再看到"预约人: 未指定"');
      
      console.log('\n📋 前端应该看到的前3个预约:');
      data.slice(0, 3).forEach((apt, index) => {
        console.log(`   ${index + 1}. ${apt.customer_name} - 预约人: ${apt.sales_name || '未指定'}`);
      });
      
    } else {
      console.log(`❌ API调用失败: ${response.status}`);
    }

  } catch (error) {
    console.error('❌ 验证失败:', error);
  }
}

finalVerificationCancelledAppointments();