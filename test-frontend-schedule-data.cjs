const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';
const mockToken = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3MzM4NjI1NzksImV4cCI6MTczMzk0ODk3OX0.signature';

async function testFrontendScheduleData() {
  console.log('🧪 测试前端排班数据访问...\n');

  try {
    const today = new Date().toISOString().split('T')[0];
    
    const response = await fetch(`${API_BASE}/schedules?date=${today}`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const schedules = await response.json();
      console.log(`✅ 排班API返回 ${schedules.length} 个排班记录\n`);
      
      // 查找有销售信息的排班
      const scheduleWithSales = schedules.find(s => s.sales_name && s.sales_name !== '未指定');
      
      if (scheduleWithSales) {
        console.log('📋 找到带销售信息的排班:');
        console.log('─'.repeat(80));
        console.log(`ID: ${scheduleWithSales.id}`);
        console.log(`客户: ${scheduleWithSales.customer_name}`);
        console.log(`预约人: ${scheduleWithSales.sales_name}`);
        console.log(`销售角色: ${scheduleWithSales.sales_role}`);
        console.log(`房间: ${scheduleWithSales.room_name}`);
        console.log(`护士: ${scheduleWithSales.nurse_name}`);
        console.log(`时间: ${scheduleWithSales.scheduled_time_start} - ${scheduleWithSales.scheduled_time_end}`);
        
        console.log('\n🔍 模拟ScheduleDetailDialog组件逻辑:');
        console.log('─'.repeat(80));
        
        // 模拟组件中的逻辑
        const displaySalesName = scheduleWithSales.sales_name || '未指定';
        const displaySalesRole = scheduleWithSales.sales_role;
        
        console.log(`schedule.sales_name: "${scheduleWithSales.sales_name}"`);
        console.log(`schedule.sales_role: "${scheduleWithSales.sales_role}"`);
        console.log(`显示结果 (schedule.sales_name || '未指定'): "${displaySalesName}"`);
        
        if (displaySalesName === '未指定') {
          console.log('❌ 问题：即使API返回了销售信息，组件仍显示"未指定"');
          console.log('   可能原因：');
          console.log('   1. schedule.sales_name 为 null、undefined 或空字符串');
          console.log('   2. 数据传递过程中丢失');
          console.log('   3. 组件接收到的数据结构不正确');
        } else {
          console.log('✅ 组件应该正确显示销售信息');
        }
        
        console.log('\n🎯 前端测试建议:');
        console.log('1. 在资源看板中找到客户"资源看板测试客户-销售信息"');
        console.log('2. 点击该排班块，打开详情对话框');
        console.log('3. 检查"预约人"字段是否显示"张销售"');
        console.log('4. 如果仍显示"未指定"，则需要检查组件数据传递');
        
      } else {
        console.log('❌ 没有找到带销售信息的排班');
        console.log('请先运行 create-schedule-with-sales-info.cjs 创建测试数据');
      }
      
    } else {
      console.log(`❌ 排班API调用失败: ${response.status}`);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testFrontendScheduleData();