const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function testDoctorWorkflow() {
  console.log('🧪 测试医生前端工作流程\n');
  
  try {
    // 1. 获取医生用户信息
    console.log('1️⃣ 获取医生用户信息...');
    const doctorResult = await pool.query(`
      SELECT id, username, full_name, store_id FROM profiles 
      WHERE role = 'doctor' AND store_id IS NOT NULL 
      LIMIT 2
    `);
    
    if (doctorResult.rows.length === 0) {
      console.log('❌ 没有找到可用的医生用户');
      return;
    }
    
    console.log(`找到 ${doctorResult.rows.length} 个医生用户:`);
    doctorResult.rows.forEach((doctor, index) => {
      console.log(`  ${index + 1}. ${doctor.full_name} (用户名: ${doctor.username}, ID: ${doctor.id})`);
    });
    
    // 2. 获取咨询/报告服务
    console.log('\n2️⃣ 获取咨询/报告服务...');
    const serviceResult = await pool.query(`
      SELECT id, name FROM services 
      WHERE category IN ('consultation', 'report') 
      LIMIT 3
    `);
    
    if (serviceResult.rows.length === 0) {
      console.log('❌ 没有找到咨询/报告服务');
      return;
    }
    
    console.log(`找到 ${serviceResult.rows.length} 个服务:`);
    serviceResult.rows.forEach((service, index) => {
      console.log(`  ${index + 1}. ${service.name} (ID: ${service.id})`);
    });
    
    // 3. 创建测试预约
    console.log('\n3️⃣ 创建测试预约...');
    const doctor = doctorResult.rows[0]; // 使用第一个医生
    const service = serviceResult.rows[0]; // 使用第一个服务
    const today = new Date().toISOString().split('T')[0];
    const timeStart = '16:00:00';
    const timeEnd = '17:00:00';
    
    const newAppointment = await pool.query(`
      INSERT INTO appointments (
        customer_name, 
        service_id, 
        requested_date, 
        requested_time_start, 
        requested_time_end,
        estimated_duration,
        workflow_status, 
        doctor_id,
        store_id,
        status
      ) VALUES ($1, $2, $3, $4, $5, 60, 'pending_doctor_confirmation', $6, $7, 'pending')
      RETURNING *
    `, [
      `前端测试预约-${Date.now()}`,
      service.id,
      today,
      timeStart,
      timeEnd,
      doctor.id,
      doctor.store_id
    ]);
    
    const appointment = newAppointment.rows[0];
    console.log(`✅ 创建预约成功: ${appointment.customer_name} (ID: ${appointment.id})`);
    
    // 4. 输出测试步骤
    console.log('\n📋 测试步骤:');
    console.log('1. 请使用以下医生账号登录:');
    console.log(`   用户名: ${doctor.username}`);
    console.log(`   密码: 123456`); // 假设密码
    console.log(`   门店: ${doctor.store_id}`);
    
    console.log('\n2. 登录后访问以下页面:');
    console.log('   http://localhost:5173/doctor/appointments');
    
    console.log('\n3. 在预约待办页面找到以下预约:');
    console.log(`   客户: ${appointment.customer_name}`);
    console.log(`   服务: ${service.name}`);
    console.log(`   日期: ${today}`);
    console.log(`   时间: ${timeStart} - ${timeEnd}`);
    
    console.log('\n4. 点击"确认预约"按钮');
    console.log('\n5. 然后访问排班视图页面:');
    console.log('   http://localhost:5173/doctor/schedule');
    
    console.log('\n6. 预期结果:');
    console.log('   - 排班视图应该显示刚确认的预约');
    console.log('   - 如果没有显示，说明修复未生效');
    
    // 5. 创建一个简单的HTML测试页面
    console.log('\n7️⃣ 创建测试页面...');
    const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>医生预约确认测试</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .test-step { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .success { color: green; }
        .error { color: red; }
        .info { color: blue; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        button:hover { background: #0056b3; }
    </style>
</head>
<body>
    <h1>🧪 医生预约确认测试</h1>
    
    <div class="test-step">
        <h2>📋 测试信息</h2>
        <p><strong>医生账号:</strong> ${doctor.username}</p>
        <p><strong>密码:</strong> 123456</p>
        <p><strong>测试预约客户:</strong> ${appointment.customer_name}</p>
        <p><strong>预约ID:</strong> ${appointment.id}</p>
        <p><strong>服务:</strong> ${service.name}</p>
        <p><strong>日期:</strong> ${today}</p>
        <p><strong>时间:</strong> ${timeStart} - ${timeEnd}</p>
    </div>
    
    <div class="test-step">
        <h2>🔗 测试链接</h2>
        <button onclick="window.open('http://localhost:5173/doctor/appointments', '_blank')">
            打开预约待办页面
        </button>
        <button onclick="window.open('http://localhost:5173/doctor/schedule', '_blank')">
            打开排班视图页面
        </button>
    </div>
    
    <div class="test-step">
        <h2>📝 测试步骤</h2>
        <ol>
            <li>使用上方账号信息登录系统</li>
            <li>点击"打开预约待办页面"</li>
            <li>找到测试预约并点击"确认预约"</li>
            <li>点击"打开排班视图页面"</li>
            <li class="success">如果看到刚确认的预约，说明修复成功</li>
            <li class="error">如果没有看到预约，说明修复未生效</li>
        </ol>
    </div>
    
    <div class="test-step">
        <h2>🔍 验证方法</h2>
        <p>1. 在预约待办页面确认预约后，检查浏览器开发者工具的网络请求</p>
        <p>2. 确认API调用 /api/appointments/:id/doctor-confim 成功</p>
        <p>3. 确认API调用 /api/schedules/doctor 返回包含新预约的数据</p>
    </div>
    
    <script>
        // 自动检查预约状态
        async function checkAppointmentStatus() {
            try {
                const response = await fetch('/api/appointments/${appointment.id}');
                const data = await response.json();
                
                if (data.workflow_status === 'doctor_confirmed') {
                    document.querySelector('.success').style.display = 'block';
                    document.querySelector('.error').style.display = 'none';
                } else {
                    document.querySelector('.success').style.display = 'none';
                    document.querySelector('.error').style.display = 'block';
                }
            } catch (error) {
                console.error('检查预约状态失败:', error);
            }
        }
        
        // 每5秒检查一次
        setInterval(checkAppointmentStatus, 5000);
    </script>
</body>
</html>
    `;
    
    require('fs').writeFileSync('doctor-test-page.html', testHtml);
    console.log('✅ 测试页面已创建: doctor-test-page.html');
    console.log('\n🌐 在浏览器中打开此文件进行测试');
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  } finally {
    await pool.end();
  }
}

// Run test
testDoctorWorkflow();