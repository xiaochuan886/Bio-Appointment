// Bio-Appointment数据库API封装
import { supabase } from './supabase';
import type {
  Profile,
  Service,
  Resource,
  Appointment,
  Schedule,
  TaskExecution,
  AppointmentWithDetails,
  ScheduleWithDetails,
  TaskExecutionWithDetails,
  CreateAppointmentInput,
  CreateScheduleInput,
  UpdateScheduleInput,
  UpdateTaskExecutionInput,
  ResourceAvailability,
  Nurse,
  Doctor,
  Room,
  SkillLevel,
  RoomType,
  LoginCredentials,
  RegisterCredentials,
  UpdateProfileInput,
  UpdateUserRoleInput,
  UpdateUserStatusInput,
  CreateUserInput,
  UpdateUserInput,
  DeleteUserInput,
  UserRole,
  UserStatus,
} from '@/types/types';

// ==================== 认证 API ====================

/**
 * 用户登录
 * @param credentials 登录凭证（用户名和密码）
 * @returns 用户信息和 profile
 */
export async function login(credentials: LoginCredentials) {
  try {
    const { username, password } = credentials;
    
    console.log('开始登录流程，用户名:', username);
    
    // 将用户名转换为邮箱格式（username@miaoda.com）
    const email = `${username}@miaoda.com`;
    
    console.log('尝试使用邮箱登录:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Supabase 登录错误:', error);
      throw new Error(error.message || '登录失败');
    }
    
    if (!data.user) {
      console.error('登录成功但未返回用户信息');
      throw new Error('登录失败：未获取到用户信息');
    }
    
    console.log('登录成功，用户 ID:', data.user.id);
    
    // 获取用户的 profile 信息
    try {
      const profile = await getProfileById(data.user.id);
      console.log('获取 profile 成功:', profile);
      
      if (!profile) {
        console.warn('用户没有 profile 记录');
      }
      
      return {
        user: data.user,
        session: data.session,
        profile,
      };
    } catch (profileError) {
      console.error('获取 profile 失败:', profileError);
      // 即使 profile 获取失败，也返回用户信息
      return {
        user: data.user,
        session: data.session,
        profile: null,
      };
    }
  } catch (error: any) {
    console.error('登录过程出错:', error);
    throw error;
  }
}

/**
 * 用户注册
 * @param credentials 注册凭证
 * @returns 用户信息
 */
export async function register(credentials: RegisterCredentials) {
  try {
    const { username, password, full_name } = credentials;
    
    console.log('开始注册流程，用户名:', username);
    
    // 验证用户名格式（只允许字母、数字和下划线）
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('用户名只能包含字母、数字和下划线');
    }
    
    // 将用户名转换为邮箱格式
    const email = `${username}@miaoda.com`;
    
    console.log('尝试使用邮箱注册:', email);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: full_name || username,
        },
      },
    });
    
    if (error) {
      console.error('Supabase 注册错误:', error);
      throw new Error(error.message || '注册失败');
    }
    
    console.log('注册成功，用户 ID:', data.user?.id);
    
    return data;
  } catch (error: any) {
    console.error('注册过程出错:', error);
    throw error;
  }
}

/**
 * 用户登出
 */
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * 获取当前登录用户
 * @returns 当前用户信息和 profile
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('获取认证用户失败:', error);
      throw error;
    }
    
    if (user) {
      try {
        const profile = await getProfileById(user.id);
        return {
          user,
          profile,
        };
      } catch (profileError) {
        console.error('获取用户 profile 失败:', profileError);
        // 即使 profile 获取失败，也返回用户信息
        return {
          user,
          profile: null,
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('getCurrentUser 错误:', error);
    return null;
  }
}

/**
 * 获取当前用户的 session
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

/**
 * 监听认证状态变化
 * @param callback 状态变化回调函数
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

// ==================== 用户管理 API ====================

/**
 * 获取所有用户列表（仅管理员）
 */
export async function getAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

/**
 * 更新用户角色（仅管理员）
 */
export async function updateUserRole(input: UpdateUserRoleInput) {
  const { user_id, role } = input;
  
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', user_id)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

/**
 * 更新用户状态（仅管理员）
 */
export async function updateUserStatus(input: UpdateUserStatusInput) {
  const { user_id, status } = input;
  
  const { data, error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', user_id)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

/**
 * 创建新用户（仅管理员）
 */
export async function createUser(input: CreateUserInput) {
  const { username, password, full_name, role, department } = input;
  
  // 验证用户名格式
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new Error('用户名只能包含字母、数字和下划线');
  }
  
  // 检查用户名是否已存在
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .maybeSingle();
  
  if (existingUser) {
    throw new Error('用户名已存在');
  }
  
  // 将用户名转换为邮箱格式
  const email = `${username}@miaoda.com`;
  
  // 创建 auth 用户
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        full_name,
      },
    },
  });
  
  if (authError) throw authError;
  if (!authData.user) throw new Error('创建用户失败');
  
  // 更新 profile 信息
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .update({
      username,
      full_name,
      role,
      department,
      status: 'active',
    })
    .eq('id', authData.user.id)
    .select()
    .maybeSingle();
  
  if (profileError) throw profileError;
  
  return profileData;
}

/**
 * 更新用户信息（仅管理员）
 */
export async function updateUser(input: UpdateUserInput) {
  const { user_id, full_name, role, department, status } = input;
  
  const updateData: Partial<Profile> = {};
  if (full_name !== undefined) updateData.full_name = full_name;
  if (role !== undefined) updateData.role = role;
  if (department !== undefined) updateData.department = department;
  if (status !== undefined) updateData.status = status;
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user_id)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

/**
 * 删除用户（仅管理员）
 * 注意：这会软删除用户（设置状态为 disabled），而不是物理删除
 */
export async function deleteUser(input: DeleteUserInput) {
  const { user_id } = input;
  
  // 软删除：将用户状态设置为 disabled
  const { data, error } = await supabase
    .from('profiles')
    .update({ status: 'disabled' })
    .eq('id', user_id)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

/**
 * 更新当前用户的个人信息
 */
export async function updateCurrentUserProfile(input: UpdateProfileInput) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('未登录');
  
  const { data, error } = await supabase
    .from('profiles')
    .update(input)
    .eq('id', user.id)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

// ==================== Profiles ====================

export async function getProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getProfilesByRole(role: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', role)
    .eq('status', 'active')
    .order('username', { ascending: true });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getProfileById(id: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) {
      console.error('查询 profile 失败:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('getProfileById 错误:', error);
    throw error;
  }
}

export async function updateProfile(id: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

// ==================== Services ====================

export async function getServices() {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getServiceById(id: string) {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

// ==================== Resources ====================

export async function getResources() {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .order('type', { ascending: true })
    .order('name', { ascending: true });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getResourcesByType(type: string) {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('type', type)
    .eq('status', 'available')
    .order('name', { ascending: true });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function updateResource(id: string, updates: Partial<Resource>) {
  const { data, error } = await supabase
    .from('resources')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

// ==================== Appointments ====================

export async function getAppointments(filters?: {
  status?: string;
  date?: string;
  sales_id?: string;
  doctor_id?: string;
}) {
  let query = supabase
    .from('appointments')
    .select(`
      *,
      service:services(*),
      sales:profiles!appointments_sales_id_fkey(id, name, role),
      doctor:profiles!appointments_doctor_id_fkey(id, name, role)
    `);
  
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.date) {
    query = query.eq('requested_date', filters.date);
  }
  if (filters?.sales_id) {
    query = query.eq('sales_id', filters.sales_id);
  }
  if (filters?.doctor_id) {
    query = query.eq('doctor_id', filters.doctor_id);
  }
  
  query = query.order('requested_date', { ascending: false })
    .order('created_at', { ascending: false });
  
  const { data, error } = await query;
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getAppointmentById(id: string): Promise<AppointmentWithDetails | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      service:services(*),
      sales:profiles!appointments_sales_id_fkey(id, name, role),
      doctor:profiles!appointments_doctor_id_fkey(id, name, role)
    `)
    .eq('id', id)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function createAppointment(input: CreateAppointmentInput) {
  const totalPeople = 1 + (input.companion_names?.length || 0);
  
  const { data: serviceData } = await supabase
    .from('services')
    .select('base_duration')
    .eq('id', input.service_id)
    .maybeSingle();
  
  const estimatedDuration = serviceData?.base_duration || 60;
  
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      customer_name: input.customer_name,
      companion_names: input.companion_names || [],
      total_people: totalPeople,
      service_id: input.service_id,
      requested_date: input.requested_date,
      requested_time_start: input.requested_time_start,
      requested_time_end: input.requested_time_end,
      estimated_duration: estimatedDuration,
      is_urgent: input.is_urgent || false,
      status: 'pending',
      sales_id: input.sales_id,
      doctor_id: input.doctor_id,
      doctor_status: input.doctor_id ? 'pending' : undefined,
      created_by: input.sales_id,
    })
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function updateAppointment(id: string, updates: Partial<Appointment>) {
  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function deleteAppointment(id: string) {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ==================== Schedules ====================

export async function getSchedules(filters?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  appointment_id?: string;
}) {
  let query = supabase
    .from('schedules')
    .select(`
      *,
      appointment:appointments(
        *,
        service:services(*),
        sales:profiles!appointments_sales_id_fkey(id, name, role),
        doctor:profiles!appointments_doctor_id_fkey(id, name, role)
      ),
      room:rooms(id, name, room_type),
      nurse:nurses(id, name, skill_level),
      created_by_profile:profiles!schedules_created_by_fkey(id, name, role)
    `);
  
  // 支持单日查询
  if (filters?.date) {
    query = query.eq('scheduled_date', filters.date);
  }
  // 支持日期范围查询
  else if (filters?.startDate && filters?.endDate) {
    query = query.gte('scheduled_date', filters.startDate)
      .lte('scheduled_date', filters.endDate);
  }
  // 如果只有startDate，查询该日期及之后
  else if (filters?.startDate) {
    query = query.gte('scheduled_date', filters.startDate);
  }
  // 如果只有endDate，查询该日期及之前
  else if (filters?.endDate) {
    query = query.lte('scheduled_date', filters.endDate);
  }
  
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.appointment_id) {
    query = query.eq('appointment_id', filters.appointment_id);
  }
  
  query = query.order('scheduled_date', { ascending: true })
    .order('scheduled_time_start', { ascending: true });
  
  const { data, error } = await query;
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getScheduleById(id: string): Promise<ScheduleWithDetails | null> {
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      appointment:appointments(
        *,
        service:services(*),
        sales:profiles!appointments_sales_id_fkey(id, name, role),
        doctor:profiles!appointments_doctor_id_fkey(id, name, role)
      ),
      room:rooms(id, name, room_type),
      nurse:nurses(id, name, skill_level),
      created_by_profile:profiles!schedules_created_by_fkey(id, name, role)
    `)
    .eq('id', id)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function createSchedule(input: CreateScheduleInput) {
  const { data, error } = await supabase
    .from('schedules')
    .insert({
      appointment_id: input.appointment_id,
      scheduled_date: input.scheduled_date,
      scheduled_time_start: input.scheduled_time_start,
      scheduled_time_end: input.scheduled_time_end,
      room_id: input.room_id,
      nurse_id: input.nurse_id,
      adjusted_duration: input.adjusted_duration,
      adjustment_reason: input.adjustment_reason,
      status: 'draft',
    })
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function updateSchedule(id: string, updates: UpdateScheduleInput) {
  const { data, error } = await supabase
    .from('schedules')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function deleteSchedule(id: string) {
  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ==================== Task Executions ====================

export async function getTaskExecutions(filters?: {
  nurse_id?: string;
  status?: string;
  date?: string;
}) {
  let query = supabase
    .from('task_executions')
    .select(`
      *,
      schedule:schedules(
        *,
        appointment:appointments(
          *,
          service:services(*)
        ),
        room:room_id(id, name),
        nurse:nurse_id(id, name)
      ),
      nurse_profile:nurse_id(id, name, role)
    `);
  
  if (filters?.nurse_id) {
    query = query.eq('nurse_id', filters.nurse_id);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.date) {
    query = query.eq('schedule.scheduled_date', filters.date);
  }
  
  query = query.order('created_at', { ascending: false });
  
  const { data, error } = await query;
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getTaskExecutionById(id: string): Promise<TaskExecutionWithDetails | null> {
  const { data, error } = await supabase
    .from('task_executions')
    .select(`
      *,
      schedule:schedules(
        *,
        appointment:appointments(
          *,
          service:services(*)
        ),
        room:room_id(id, name),
        nurse:nurse_id(id, name)
      ),
      nurse_profile:nurse_id(id, name, role)
    `)
    .eq('id', id)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function updateTaskExecution(id: string, updates: UpdateTaskExecutionInput) {
  const { data, error } = await supabase
    .from('task_executions')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

// ==================== RPC Functions ====================

export async function checkResourceAvailability(
  date: string,
  timeStart: string,
  timeEnd: string,
  excludeScheduleId?: string
): Promise<ResourceAvailability> {
  const { data, error } = await supabase.rpc('check_resource_availability', {
    p_date: date,
    p_time_start: timeStart,
    p_time_end: timeEnd,
    p_exclude_schedule_id: excludeScheduleId || null,
  });
  
  if (error) throw error;
  
  return {
    available_rooms: data?.[0]?.available_rooms || [],
    available_nurses: data?.[0]?.available_nurses || [],
  };
}

// ==================== Nurses ====================

export async function getNurses() {
  const { data, error } = await supabase
    .from('nurses')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getAvailableNurses() {
  const { data, error } = await supabase
    .from('nurses')
    .select('*')
    .eq('is_available', true)
    .order('name', { ascending: true });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function createNurse(nurse: { name: string; skill_level: SkillLevel; is_available: boolean }) {
  const { data, error } = await supabase
    .from('nurses')
    .insert([nurse])
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function updateNurse(id: string, nurse: Partial<Omit<Nurse, 'id' | 'created_at'>>) {
  const { data, error } = await supabase
    .from('nurses')
    .update(nurse)
    .eq('id', id)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function deleteNurse(id: string) {
  const { error } = await supabase
    .from('nurses')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ==================== Doctors ====================

export async function getDoctors() {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getAvailableDoctors() {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('is_available', true)
    .order('name', { ascending: true });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function createDoctor(doctor: { name: string; specialty: string; is_available: boolean }) {
  const { data, error } = await supabase
    .from('doctors')
    .insert([doctor])
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function updateDoctor(id: string, doctor: Partial<Omit<Doctor, 'id' | 'created_at'>>) {
  const { data, error } = await supabase
    .from('doctors')
    .update(doctor)
    .eq('id', id)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function deleteDoctor(id: string) {
  const { error } = await supabase
    .from('doctors')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ==================== Rooms ====================

export async function getRooms() {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getAvailableRooms() {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('is_available', true)
    .order('name', { ascending: true });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function createRoom(room: { name: string; room_type: RoomType; is_available: boolean }) {
  const { data, error } = await supabase
    .from('rooms')
    .insert([room])
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function updateRoom(id: string, room: Partial<Omit<Room, 'id' | 'created_at'>>) {
  const { data, error } = await supabase
    .from('rooms')
    .update(room)
    .eq('id', id)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function deleteRoom(id: string) {
  const { error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}
