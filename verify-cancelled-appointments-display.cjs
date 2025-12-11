const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';

// Mock admin token for testing
const mockToken = 'mock.eyJ1c2VySWQiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3MzM4NjI1NzksImV4cCI6MTczMzk0ODk3OX0.signature';

async function verifyCancelledAppointmentsDisplay() {
  console.log('🧪 验证已取消预约显示...\n');

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
      
      // 查找有销售信息的预约
      const appointmentWithSales = cancelledData.find(apt => 
        apt.customer_name === '测试客户-已取消预约'
      );
      
      if (appointmentWithSales) {
        console.log('✅ 找到测试预约，验证前端应该显示的内容:');
        console.log('─'.repeat(50));
        console.log(`客户名称: ${appointmentWithSales.customer_name}`);
        console.log(`预约人: ${appointmentWithSales.sales_name || '未指定'}`);
        console.log(`服务: ${appointmentWithSales.service_name}`);
        console.log(`预约时间: ${appointmentWithSales.requested_date} ${appointmentWithSales.requested_time_start}`);
        console.log(`预计时长: ${appointmentWithSales.estimated_duration || appointmentWithSales.service_duration || 30}分钟`);
        console.log(`客户数量: ${appointmentWithSales.total_people || (appointmentWithSales.companion_names?.length ? appointmentWithSales.companion_names.length + 1 : 1)}人`);
        
        if (appointmentWithSales.companion_names && appointmentWithSales.companion_names.length > 0) {
          console.log(`同行客户: ${appointmentWithSales.companion_names.join(', ')}`);
        }
        
        if (appointmentWithSales.cancelled_reason) {
          console.log(`取消原因: ${appointmentWithSales.cancelled_reason}`);
        }
        
        if (appointmentWithSales.cancelled_at) {
          console.log(`取消时间: ${new Date(appointmentWithSales.cancelled_at).toLocaleString()}`);
        }
        console.log('─'.repeat(50));
        
        // 验证前端显示逻辑
        console.log('\n📋 前端显示逻辑验证:');
        const displaySalesName = appointmentWithSales.sales_name || '未指定';
        console.log(`   预约人显示: "${displaySalesName}"`);
        
        if (displaySalesName !== '未指定') {
          console.log('   ✅ 预约人信息正确');
        } else {
          console.log('   ❌ 预约人信息缺失');
        }
        
      } else {
        console.log('❌ 没有找到测试预约');
      }
      
      // 检查其他预约的销售信息状态
      console.log('\n📊 所有已取消预约的销售信息统计:');
      let withSales = 0;
      let withoutSales = 0;
      
      cancelledData.forEach(apt => {
        if (apt.sales_name && apt.sales_name !== '未指定') {
          withSales++;
        } else {
          withoutSales++;
        }
      });
      
      console.log(`   有销售信息: ${withSales} 个`);
      console.log(`   无销售信息: ${withoutSales} 个`);
      console.log(`   销售信息覆盖率: ${((withSales / cancelledData.length) * 100).toFixed(1)}%`);
      
      if (withSales > 0) {
        console.log('\n✅ 前端应该能正确显示有销售信息的已取消预约');
        console.log('   如果前端仍显示"未指定"，可能是以下原因:');
        console.log('   1. 前端代码缓存问题，需要刷新页面');
        console.log('   2. API数据传输问题');
        console.log('   3. 前端渲染逻辑问题');
      }
      
    } else {
      console.log(`❌ API调用失败: ${cancelledResponse.status}`);
    }

  } catch (error) {
    console.error('❌ 验证失败:', error);
  }
}

// 运行验证
verifyCancelledAppointmentsDisplay();