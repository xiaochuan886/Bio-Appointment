const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.VITE_SUPABASE_ANON_KEY
);

async function checkNurseResources() {
  console.log('🔍 检查护士资源和排班情况\n');

  try {
    // 1. 查看所有护士资源
    const { data: nurses, error: nurseError } = await supabase
      .from('resources')
      .select('*')
      .eq('type', 'nurse')
      .order('name');

    if (nurseError) throw nurseError;

    console.log('👩‍⚕️ 护士资源列表:');
    if (nurses && nurses.length > 0) {
      nurses.forEach(n => {
        console.log(`  - ${n.name} (状态: ${n.status}, 门店: ${n.store_id || '未分配'})`);
      });
    } else {
      console.log('  ⚠️  没有护士资源！');
    }
    console.log('');

    // 2. 查看今天的排班
    const today = new Date().toISOString().split('T')[0];
    const { data: schedules, error: schedError } = await supabase
      .from('schedules')
      .select(`
        *,
        nurse:resources!schedules_nurse_id_fkey(name)
      `)
      .eq('scheduled_date', today)
      .neq('status', 'cancelled')
      .order('scheduled_time_start');

    if (schedError) throw schedError;

    console.log('📅 今天 (' + today + ') 的排班:');
    if (schedules && schedules.length > 0) {
      schedules.forEach(s => {
        const start = s.scheduled_time_start.substring(0,5);
        const end = s.scheduled_time_end.substring(0,5);
        const nurseName = s.nurse?.name || '未分配护士';
        console.log('  - ' + start + '-' + end + ': ' + nurseName + ' (状态: ' + s.status + ')');
      });
    } else {
      console.log('  无排班');
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

checkNurseResources();
