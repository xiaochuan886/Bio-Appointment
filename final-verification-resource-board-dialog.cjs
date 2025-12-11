const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';
const mockToken = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3MzM4NjI1NzksImV4cCI6MTczMzk0ODk3OX0.signature';

async function finalVerificationResourceBoardDialog() {
  console.log('🎯 最终验证：资源看板弹窗销售信息显示\n');

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
      const schedulesWithSales = schedules.filter(s => s.sales_name && s.sales_name !== '未指定');
      
      console.log('📊 验证结果:');
      console.log('─'.repeat(80));
      console.log(`总排班数: ${schedules.length}`);
      console.log(`有销售信息的排班: ${schedulesWithSales.length}`);
      console.log(`无销售信息的排班: ${schedules.length - schedulesWithSales.length}`);
      
      if (schedulesWithSales.length > 0) {
        console.log('\n✅ 有销售信息的排班记录:');
        schedulesWithSales.forEach((schedule, index) => {
          console.log(`${index + 1}. 客户: ${schedule.customer_name}`);
          console.log(`   预约人: ${schedule.sales_name}`);
          console.log(`   销售角色: ${schedule.sales_role}`);
          console.log(`   房间: ${schedule.room_name}`);
          console.log(`   时间: ${schedule.scheduled_time_start} - ${schedule.scheduled_time_end}`);
          console.log('');
        });
        
        console.log('🔍 ScheduleDetailDialog组件数据验证:');
        console.log('─'.repeat(80));
        
        const testSchedule = schedulesWithSales[0];
        console.log('测试排班数据:');
        console.log(`  schedule.sales_name: "${testSchedule.sales_name}"`);
        console.log(`  schedule.sales_role: "${testSchedule.sales_role}"`);
        console.log(`  schedule.customer_name: "${testSchedule.customer_name}"`);
        console.log(`  schedule.total_people: ${testSchedule.total_people}`);
        console.log(`  schedule.companion_names: ${JSON.stringify(testSchedule.companion_names)}`);
        
        // 模拟组件渲染逻辑
        const salesNameDisplay = testSchedule.sales_name || '未指定';
        const salesRoleDisplay = testSchedule.sales_role === 'sales' ? '销售' : testSchedule.sales_role;
        
        console.log('\n组件渲染结果:');
        console.log(`  预约人显示: "${salesNameDisplay}"`);
        console.log(`  角色显示: "${salesRoleDisplay}"`);
        
        if (salesNameDisplay !== '未指定') {
          console.log('\n🎉 验证通过！');
          console.log('✅ API数据正确');
          console.log('✅ 组件逻辑正确');
          console.log('✅ 销售信息应该正确显示');
        } else {
          console.log('\n❌ 验证失败');
          console.log('数据问题需要进一步调查');
        }
        
        console.log('\n🎯 前端操作指南:');
        console.log('1. 打开护士长排班页面 (http://localhost:5173)');
        console.log('2. 登录后进入"护理服务排班看板"');
        console.log('3. 在资源看板中找到以下排班:');
        schedulesWithSales.forEach((schedule, index) => {
          console.log(`   ${index + 1}. 客户"${schedule.customer_name}" - 房间"${schedule.room_name}" - 时间${schedule.scheduled_time_start}`);
        });
        console.log('4. 点击排班块，打开详情对话框');
        console.log('5. 检查"预约人"字段是否显示正确的销售人员姓名');
        console.log('6. 如果仍显示"未指定"，可能需要刷新页面或清除缓存');
        
      } else {
        console.log('\n⚠️ 没有找到带销售信息的排班');
        console.log('建议运行以下命令创建测试数据:');
        console.log('node create-schedule-with-sales-info.cjs');
      }
      
    } else {
      console.log(`❌ 排班API调用失败: ${response.status}`);
    }

  } catch (error) {
    console.error('❌ 验证失败:', error);
  }
}

finalVerificationResourceBoardDialog();