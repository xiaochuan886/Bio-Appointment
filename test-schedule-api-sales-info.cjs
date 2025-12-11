const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';
const mockToken = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3MzM4NjI1NzksImV4cCI6MTczMzk0ODk3OX0.signature';

async function testScheduleApiSalesInfo() {
  console.log('🧪 测试排班API销售信息...\n');

  try {
    // 获取今天的排班数据
    const today = new Date().toISOString().split('T')[0];
    
    const response = await fetch(`${API_BASE}/schedules?date=${today}`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ 排班API返回 ${data.length} 个排班记录\n`);
      
      if (data.length === 0) {
        console.log('⚠️ 今天没有排班记录，尝试获取所有排班...');
        
        // 尝试获取最近一周的排班
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const startDate = weekAgo.toISOString().split('T')[0];
        
        const weekResponse = await fetch(`${API_BASE}/schedules?start_date=${startDate}&end_date=${today}`, {
          headers: {
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (weekResponse.ok) {
          const weekData = await weekResponse.json();
          console.log(`✅ 最近一周排班API返回 ${weekData.length} 个排班记录\n`);
          
          if (weekData.length > 0) {
            console.log('📋 最近一周的排班记录（前5个）:');
            console.log('─'.repeat(80));
            
            weekData.slice(0, 5).forEach((schedule, index) => {
              console.log(`${index + 1}. 客户: ${schedule.customer_name || '未知'}`);
              console.log(`   预约人: ${schedule.sales_name || '未指定'}`);
              console.log(`   销售角色: ${schedule.sales_role || '未知'}`);
              console.log(`   服务: ${schedule.service_name || '未知'}`);
              console.log(`   护士: ${schedule.nurse_name || '未分配'}`);
              console.log(`   房间: ${schedule.room_name || '未分配'}`);
              console.log(`   日期: ${schedule.scheduled_date}`);
              console.log(`   时间: ${schedule.scheduled_time_start} - ${schedule.scheduled_time_end}`);
              console.log('');
            });
            
            // 统计有销售信息的排班
            const withSalesInfo = weekData.filter(s => s.sales_name && s.sales_name !== '未指定');
            console.log(`📊 有销售信息的排班: ${withSalesInfo.length}/${weekData.length}`);
            
            if (withSalesInfo.length > 0) {
              console.log('\n✅ 有销售信息的排班:');
              withSalesInfo.forEach((schedule, index) => {
                console.log(`   ${index + 1}. ${schedule.customer_name} - 预约人: ${schedule.sales_name}`);
              });
            }
          }
        }
      } else {
        console.log('📋 今天的排班记录:');
        console.log('─'.repeat(80));
        
        data.forEach((schedule, index) => {
          console.log(`${index + 1}. 客户: ${schedule.customer_name || '未知'}`);
          console.log(`   预约人: ${schedule.sales_name || '未指定'}`);
          console.log(`   销售角色: ${schedule.sales_role || '未知'}`);
          console.log(`   服务: ${schedule.service_name || '未知'}`);
          console.log(`   护士: ${schedule.nurse_name || '未分配'}`);
          console.log(`   房间: ${schedule.room_name || '未分配'}`);
          console.log(`   时间: ${schedule.scheduled_time_start} - ${schedule.scheduled_time_end}`);
          console.log('');
        });
        
        // 统计有销售信息的排班
        const withSalesInfo = data.filter(s => s.sales_name && s.sales_name !== '未指定');
        console.log(`📊 有销售信息的排班: ${withSalesInfo.length}/${data.length}`);
      }
      
    } else {
      console.log(`❌ 排班API调用失败: ${response.status}`);
      const errorText = await response.text();
      console.log('错误信息:', errorText);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testScheduleApiSalesInfo();