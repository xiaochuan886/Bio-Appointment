import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 验证配置
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase 配置缺失:', {
    url: supabaseUrl ? '已配置' : '未配置',
    key: supabaseAnonKey ? '已配置' : '未配置'
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});