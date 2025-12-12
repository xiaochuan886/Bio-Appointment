const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001';

async function testDoctorConfirmAPI() {
  try {
    console.log('🔍 开始测试医生确认预约API...\n');

    // 1. 登录获取token
    console.log('1. 登录获取token...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'doctor1@example.com',
        password: '123456'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`登录失败: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.tokens.accessToken;
    console.log('✅ 登录成功，获得token');

    // 2. 获取待确认的预约
    console.log('\n2. 获取待确认的预约...');
    const pendingResponse = await fetch(`${API_BASE}/api/appointments/doctor-pending`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!pendingResponse.ok) {
      throw new Error(`获取待确认预约失败: ${pendingResponse.status} ${pendingResponse.statusText}`);
    }

    const pendingAppointments = await pendingResponse.json();
    console.log(`✅ 找到 ${pendingAppointments.length} 个待确认预约`);

    if (pendingAppointments.length === 0) {
      console.log('❌ 没有待确认的预约，无法测试');
      return;
    }

    const appointment = pendingAppointments[0];
    console.log('📋 选择预约:', {
      id: appointment.id,
      customer_name: appointment.customer_name,
      service_name: appointment.service?.name,
      requested_date: appointment.requested_date
    });

    // 3. 获取医生信息
    console.log('\n3. 获取医生信息...');
    const profileResponse = await fetch(`${API_BASE}/api/profiles/${loginData.user.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!profileResponse.ok) {
      throw new Error(`获取医生信息失败: ${profileResponse.status} ${profileResponse.statusText}`);
    }

    const profile = await profileResponse.json();
    console.log('✅ 医生信息:', {
      id: profile.id,
      full_name: profile.full_name,
      role: profile.role,
      store_id: profile.store_id
    });

    // 4. 确认预约
    console.log('\n4. 确认预约...');
    const confirmResponse = await fetch(`${API_BASE}/api/appointments/${appointment.id}/doctor-confirm`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        doctor_id: profile.id,
        doctor_note: 'API测试确认'
      })
    });

    if (!confirmResponse.ok) {
      const errorText = await confirmResponse.text();
      throw new Error(`确认预约失败: ${confirmResponse.status} ${confirmResponse.statusText}\n${errorText}`);
    }

    const confirmedAppointment = await confirmResponse.json();
    console.log('✅ 预约确认成功:', {
      id: confirmedAppointment.id,
      workflow_status: confirmedAppointment.workflow_status,
      doctor_confirmed_at: confirmedAppointment.doctor_confirmed_at
    });

    // 5. 检查排班是否被创建
    console.log('\n5. 检查排班是否被创建...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒让排班创建完成

    const { Pool } = require('pg');
    const pool = new Pool({
      host: '127.0.0.1',
      port: 5437,
      database: 'bio_appointment',
      user: 'app_user',
      password: 'secure_password_123',
    });

    const scheduleResult = await pool.query(
      'SELECT * FROM schedules WHERE appointment_id = $1 AND status != \'cancelled\'',
      [appointment.id]
    );

    console.log(`📊 找到 ${scheduleResult.rows.length} 个排班记录`);

    if (scheduleResult.rows.length > 0) {
      const schedule = scheduleResult.rows[0];
      console.log('✅ 排班创建成功:', {
        id: schedule.id,
        appointment_id: schedule.appointment_id,
        doctor_id: schedule.doctor_id,
        scheduled_date: schedule.scheduled_date,
        status: schedule.status
      });

      // 6. 验证医生排班查询
      console.log('\n6. 验证医生排班查询...');
      const doctorScheduleResponse = await fetch(`${API_BASE}/api/schedules/doctor`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (doctorScheduleResponse.ok) {
        const doctorSchedules = await doctorScheduleResponse.json();
        console.log(`📊 医生排班查询返回 ${doctorSchedules.length} 条记录`);

        const foundSchedule = doctorSchedules.find(s => s.id === schedule.id);
        if (foundSchedule) {
          console.log('✅ 新创建的排班可以在医生排班视图中找到');
        } else {
          console.log('❌ 新创建的排班无法在医生排班视图中找到');
        }
      } else {
        console.log('❌ 医生排班查询失败:', doctorScheduleResponse.status);
      }
    } else {
      console.log('❌ 没有找到排班记录，排班创建可能失败');
    }

    await pool.end();

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

testDoctorConfirmAPI();