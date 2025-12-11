const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';
const mockToken = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3MzM4NjI1NzksImV4cCI6MTczMzk0ODk3OX0.signature';

async function testScheduleDetailDialogData() {
  console.log('🧪 测试排班详情对话框数据结构...\n');

  try {
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
      
      // 查找有销售信息的排班
      const scheduleWithSales = data.find(s => s.sales_name && s.sales_name !== '未指定');
      
      if (scheduleWithSales) {
        console.log('📋 找到带销售信息的排班记录:');
        console.log('─'.repeat(80));
        console.log(`客户名称: ${scheduleWithSales.customer_name}`);
        console.log(`预约人: ${scheduleWithSales.sales_name}`);
        console.log(`销售角色: ${scheduleWithSales.sales_role}`);
        console.log(`销售用户名: ${scheduleWithSales.sales_username}`);
        console.log('');
        
        console.log('🔍 排班详情对话框需要的字段检查:');
        console.log('─'.repeat(80));
        
        // 检查排班详情对话框需要的所有字段
        const requiredFields = [
          'sales_name',
          'sales_role', 
          'customer_name',
          'total_people',
          'companion_names',
          'service_name',
          'scheduled_time_start',
          'scheduled_time_end',
          'estimated_duration',
          'nurse_name',
          'room_name'
        ];
        
        requiredFields.forEach(field => {
          const value = scheduleWithSales[field];
          const status = value ? '✅' : '❌';
          console.log(`${status} ${field}: ${value || 'undefined'}`);
        });
        
        console.log('\n📊 数据完整性分析:');
        const missingFields = requiredFields.filter(field => !scheduleWithSales[field]);
        if (missingFields.length === 0) {
          console.log('✅ 所有必需字段都存在，排班详情对话框应该能正确显示');
        } else {
          console.log(`❌ 缺少字段: ${missingFields.join(', ')}`);
        }
        
        console.log('\n🎯 前端组件数据映射:');
        console.log('─'.repeat(80));
        console.log(`schedule.sales_name: "${scheduleWithSales.sales_name}"`);
        console.log(`schedule.sales_role: "${scheduleWithSales.sales_role}"`);
        console.log(`schedule.customer_name: "${scheduleWithSales.customer_name}"`);
        console.log(`schedule.total_people: ${scheduleWithSales.total_people}`);
        console.log(`schedule.companion_names: ${JSON.stringify(scheduleWithSales.companion_names)}`);
        
        console.log('\n📋 完整的排班对象结构:');
        console.log(JSON.stringify(scheduleWithSales, null, 2));
        
      } else {
        console.log('❌ 没有找到带销售信息的排班记录');
        
        console.log('\n📋 所有排班记录的销售信息状态:');
        data.forEach((schedule, index) => {
          console.log(`${index + 1}. ${schedule.customer_name} - 预约人: ${schedule.sales_name || '未指定'}`);
        });
      }
      
    } else {
      console.log(`❌ 排班API调用失败: ${response.status}`);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testScheduleDetailDialogData();