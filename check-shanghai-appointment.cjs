#!/usr/bin/env node

// 使用简单的环境变量读取，不依赖 dotenv
const fs = require('fs');
const path = require('path');

// 读取 .env 文件
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }
}

loadEnv();

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkShanghaiAppointment() {
  console.log('🔍 检查上海门店预约客户李三的数据...\n');

  try {
    // 1. 检查预约记录
    console.log('1. 查询预约记录...');
    const { data: appointments, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        stores!inner(name, city),
        services(name),
        users(name, role)
      `)
      .or('customer_name.ilike.%李三%,customer_phone.ilike.%李三%')
      .order('created_at', { ascending: false });

    if (appointmentError) {
      console.error('❌ 查询预约记录失败:', appointmentError);
      return;
    }

    console.log(`📋 找到 ${appointments?.length || 0} 条相关预约记录:`);
    if (appointments && appointments.length > 0) {
      appointments.forEach((apt, index) => {
        console.log(`\n预约 ${index + 1}:`);
        console.log(`  ID: ${apt.id}`);
        console.log(`  客户姓名: ${apt.customer_name}`);
        console.log(`  客户电话: ${apt.customer_phone}`);
        console.log(`  门店: ${apt.stores?.name} (${apt.stores?.city})`);
        console.log(`  服务: ${apt.services?.name}`);
        console.log(`  预约时间: ${apt.appointment_time}`);
        console.log(`  状态: ${apt.status}`);
        console.log(`  创建时间: ${apt.created_at}`);
        console.log(`  销售员: ${apt.users?.name} (${apt.users?.role})`);
      });
    }

    // 2. 检查上海门店信息
    console.log('\n2. 查询上海门店信息...');
    const { data: shanghaiStores, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .ilike('city', '%上海%');

    if (storeError) {
      console.error('❌ 查询门店信息失败:', storeError);
      return;
    }

    console.log(`🏪 找到 ${shanghaiStores?.length || 0} 个上海门店:`);
    shanghaiStores?.forEach(store => {
      console.log(`  门店ID: ${store.id}, 名称: ${store.name}, 城市: ${store.city}`);
    });

    // 3. 检查排班记录
    console.log('\n3. 查询相关排班记录...');
    if (appointments && appointments.length > 0) {
      for (const apt of appointments) {
        const { data: schedules, error: scheduleError } = await supabase
          .from('schedules')
          .select(`
            *,
            users!schedules_nurse_id_fkey(name, role),
            stores(name, city)
          `)
          .eq('store_id', apt.store_id)
          .gte('date', apt.appointment_time.split('T')[0])
          .lte('date', apt.appointment_time.split('T')[0]);

        if (scheduleError) {
          console.error('❌ 查询排班记录失败:', scheduleError);
          continue;
        }

        console.log(`\n📅 预约 ${apt.id} 对应日期的排班记录 (${schedules?.length || 0} 条):`);
        schedules?.forEach(schedule => {
          console.log(`  排班ID: ${schedule.id}`);
          console.log(`  护士: ${schedule.users?.name} (${schedule.users?.role})`);
          console.log(`  日期: ${schedule.date}`);
          console.log(`  时间: ${schedule.start_time} - ${schedule.end_time}`);
          console.log(`  状态: ${schedule.status}`);
          console.log(`  门店: ${schedule.stores?.name}`);
        });
      }
    }

    // 4. 检查护士长用户
    console.log('\n4. 查询上海门店的护士长...');
    if (shanghaiStores && shanghaiStores.length > 0) {
      for (const store of shanghaiStores) {
        const { data: headNurses, error: nurseError } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'head_nurse')
          .eq('store_id', store.id);

        if (nurseError) {
          console.error('❌ 查询护士长失败:', nurseError);
          continue;
        }

        console.log(`\n👩‍⚕️ ${store.name} 的护士长 (${headNurses?.length || 0} 人):`);
        headNurses?.forEach(nurse => {
          console.log(`  护士长: ${nurse.name} (ID: ${nurse.id})`);
          console.log(`  邮箱: ${nurse.email}`);
          console.log(`  状态: ${nurse.is_active ? '活跃' : '非活跃'}`);
        });
      }
    }

    // 5. 检查任务记录
    console.log('\n5. 查询相关任务记录...');
    if (appointments && appointments.length > 0) {
      for (const apt of appointments) {
        const { data: tasks, error: taskError } = await supabase
          .from('tasks')
          .select(`
            *,
            users!tasks_nurse_id_fkey(name, role),
            appointments(customer_name, appointment_time)
          `)
          .eq('appointment_id', apt.id);

        if (taskError) {
          console.error('❌ 查询任务记录失败:', taskError);
          continue;
        }

        console.log(`\n📋 预约 ${apt.id} 的任务记录 (${tasks?.length || 0} 条):`);
        tasks?.forEach(task => {
          console.log(`  任务ID: ${task.id}`);
          console.log(`  护士: ${task.users?.name}`);
          console.log(`  状态: ${task.status}`);
          console.log(`  创建时间: ${task.created_at}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  }
}

checkShanghaiAppointment();