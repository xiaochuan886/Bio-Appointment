// Bio-Appointment数据库API封装 - 本地PostgreSQL版本
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
    
    // 使用本地API进行登录
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '登录失败');
    }

    const data = await response.json();
    console.log('登录成功:', data);
    
    return data;
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
    
    // 使用本地API进行注册
    const response = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password, full_name }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '注册失败');
    }

    const data = await response.json();
    console.log('注册成功:', data);
    
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
  try {
    const response = await fetch('http://localhost:3001/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '登出失败');
    }

    console.log('登出成功');
  } catch (error: any) {
    console.error('登出过程出错:', error);
    throw error;
  }
}

/**
 * 获取当前登录用户
 * @returns 当前用户信息和 profile
 */
export async function getCurrentUser() {
  try {
    // 从localStorage获取token
    const token = localStorage.getItem('access_token');
    if (!token) {
      return null;
    }

    const response = await fetch('http://localhost:3001/api/auth/user', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('getCurrentUser 错误:', error);
    return null;
  }
}

/**
 * 获取当前用户的 session
 */
export async function getSession() {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return null;
    }

    const response = await fetch('http://localhost:3001/api/auth/session', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('getSession 错误:', error);
    return null;
  }
}

// ==================== 用户管理 API ====================

/**
 * 获取所有用户列表（仅管理员）
 */
export async function getAllUsers() {
  console.log('🔍 [DEBUG] getAllUsers 被调用，尝试获取用户列表');
  
  try {
    console.log('🔍 [DEBUG] 尝试从本地 API 获取用户: http://localhost:3001/api/users');
    const response = await fetch('http://localhost:3001/api/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });
    
    if (!response.ok) {
      console.error('🔍 [DEBUG] 本地 API 调用失败:', response.status, response.statusText);
      throw new Error('Failed to fetch users');
    }
    
    const data = await response.json();
    console.log(`🔍 [DEBUG] 本地 API 成功返回 ${data.length} 个用户`);
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('🔍 [DEBUG] 获取用户列表失败:', error);
    throw error;
  }
}

/**
 * 更新用户信息（仅管理员）
 */
export async function updateUser(input: UpdateUserInput) {
  const { user_id, full_name, role, department, status, store_id } = input;
  
  console.log('🔍 [DEBUG] updateUser 被调用，参数:', {
    user_id,
    full_name,
    role,
    department,
    status,
    store_id,
    timestamp: new Date().toISOString()
  });
  
  const updateData: Partial<Profile> = {};
  if (full_name !== undefined) updateData.full_name = full_name;
  if (role !== undefined) updateData.role = role;
  if (department !== undefined) updateData.department = department;
  if (status !== undefined) updateData.status = status;
  if (store_id !== undefined) updateData.store_id = store_id;
  
  console.log('🔍 [DEBUG] 准备通过后端 API 更新数据:', updateData);
  
  try {
    // 使用后端 API
    const response = await fetch(`http://localhost:3001/api/users/${user_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('🔍 [DEBUG] 后端 API 更新失败:', errorData);
      throw new Error(errorData.message || 'Failed to update user');
    }
    
    const data = await response.json();
    console.log('🔍 [DEBUG] 后端 API 更新成功，返回数据:', data);
    return data;
  } catch (error: any) {
    console.error('🔍 [DEBUG] updateUser 完整错误:', error);
    throw error;
  }
}

/**
 * 创建新用户（仅管理员）
 */
export async function createUser(input: CreateUserInput) {
  const { username, password, full_name, role, department, store_id } = input;
  
  console.log('🔍 [DEBUG] createUser 被调用，参数:', {
    username,
    full_name,
    role,
    department,
    store_id
  });

  try {
    // Create a default email for the user
    const defaultEmail = `${username}@company.local`;
    
    const response = await fetch('http://localhost:3001/api/profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify({ username, email: defaultEmail, password, full_name, role, department, store_id })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('🔍 [DEBUG] 创建用户失败:', errorData);
      throw new Error(errorData.message || 'Failed to create user');
    }
    
    const data = await response.json();
    console.log('🔍 [DEBUG] 用户创建成功:', data);
    return data;
  } catch (error: any) {
    console.error('🔍 [DEBUG] createUser 完整错误:', error);
    throw error;
  }
}

/**
 * 删除用户（仅管理员）
 * 注意：这会软删除用户（设置状态为 disabled），而不是物理删除
 */
export async function deleteUser(input: DeleteUserInput) {
  const { user_id } = input;
  
  console.log('🔍 [DEBUG] deleteUser 被调用，参数:', { user_id });

  try {
    const response = await fetch(`http://localhost:3001/api/users/${user_id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('🔍 [DEBUG] 删除用户失败:', errorData);
      throw new Error(errorData.message || 'Failed to delete user');
    }
    
    const data = await response.json();
    console.log('🔍 [DEBUG] 用户删除成功:', data);
    return data;
  } catch (error: any) {
    console.error('🔍 [DEBUG] deleteUser 完整错误:', error);
    throw error;
  }
}

/**
 * 更新当前用户的个人信息
 */
export async function updateCurrentUserProfile(input: UpdateProfileInput) {
  console.log('🔍 [DEBUG] updateCurrentUserProfile 被调用，参数:', input);
  
  try {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('未登录');
    }

    const response = await fetch('http://localhost:3001/api/profile/current', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(input)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('🔍 [DEBUG] 更新当前用户信息失败:', errorData);
      throw new Error(errorData.message || 'Failed to update current user profile');
    }
    
    const data = await response.json();
    console.log('🔍 [DEBUG] 当前用户信息更新成功:', data);
    return data;
  } catch (error: any) {
    console.error('🔍 [DEBUG] updateCurrentUserProfile 完整错误:', error);
    throw error;
  }
}

/**
 * 重置用户密码
 */
export async function resetUserPassword(user_id: string, new_password: string) {
  console.log('🔍 [DEBUG] resetUserPassword 被调用，参数:', { user_id });
  
  try {
    const response = await fetch(`http://localhost:3001/api/users/${user_id}/reset-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify({ new_password })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('🔍 [DEBUG] 重置密码失败:', errorData);
      throw new Error(errorData.message || 'Failed to reset password');
    }
    
    const data = await response.json();
    console.log('🔍 [DEBUG] 密码重置成功:', data);
    return data;
  } catch (error: any) {
    console.error('🔍 [DEBUG] resetUserPassword 完整错误:', error);
    throw error;
  }
}

/**
 * 更新用户邮箱
 */
export async function updateUserEmail(user_id: string, email: string) {
  console.log('🔍 [DEBUG] updateUserEmail 被调用，参数:', { user_id, email });
  
  try {
    const response = await fetch(`http://localhost:3001/api/users/${user_id}/email`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify({ email })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('🔍 [DEBUG] 更新邮箱失败:', errorData);
      throw new Error(errorData.message || 'Failed to update email');
    }
    
    const data = await response.json();
    console.log('🔍 [DEBUG] 邮箱更新成功:', data);
    return data;
  } catch (error: any) {
    console.error('🔍 [DEBUG] updateUserEmail 完整错误:', error);
    throw error;
  }
}

// ==================== Profiles ====================

export async function getProfiles() {
  try {
    const response = await fetch('http://localhost:3001/api/profiles', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch profiles');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('获取 profiles 失败:', error);
    throw error;
  }
}

export async function getProfilesByRole(role: string) {
  try {
    const response = await fetch(`http://localhost:3001/api/profiles?role=${role}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch profiles by role');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('按角色获取 profiles 失败:', error);
    throw error;
  }
}

export async function getProfileById(id: string) {
  try {
    const response = await fetch(`http://localhost:3001/api/profiles/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('getProfileById 错误:', error);
    throw error;
  }
}

export async function updateProfile(id: string, updates: Partial<Profile>) {
  try {
    const response = await fetch(`http://localhost:3001/api/profiles/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('updateProfile 错误:', error);
    throw error;
  }
}

// ==================== Services ====================

export async function getServices() {
  try {
    const response = await fetch('http://localhost:3001/api/services', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch services');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('获取 services 失败:', error);
    throw error;
  }
}

export async function getServiceById(id: string) {
  try {
    const response = await fetch(`http://localhost:3001/api/services/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch service');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('getServiceById 错误:', error);
    throw error;
  }
}

// ==================== Resources ====================

export async function getResources() {
  try {
    const response = await fetch('http://localhost:3001/api/resources', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch resources');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('获取 resources 失败:', error);
    throw error;
  }
}

export async function getResourcesByType(type: string) {
  try {
    const response = await fetch(`http://localhost:3001/api/resources?type=${type}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch resources by type');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('按类型获取 resources 失败:', error);
    throw error;
  }
}

export async function updateResource(id: string, updates: Partial<Resource>) {
  try {
    const response = await fetch(`http://localhost:3001/api/resources/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update resource');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('updateResource 错误:', error);
    throw error;
  }
}

// ==================== Appointments ====================

export async function getAppointments(filters?: {
  status?: string;
  date?: string;
  sales_id?: string;
  doctor_id?: string;
}) {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.date) params.append('date', filters.date);
    if (filters?.sales_id) params.append('sales_id', filters.sales_id);
    if (filters?.doctor_id) params.append('doctor_id', filters.doctor_id);

    const response = await fetch(`http://localhost:3001/api/appointments?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch appointments');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('获取 appointments 失败:', error);
    throw error;
  }
}

export async function getAppointmentById(id: string): Promise<AppointmentWithDetails | null> {
  try {
    const response = await fetch(`http://localhost:3001/api/appointments/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch appointment');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('getAppointmentById 错误:', error);
    throw error;
  }
}

export async function createAppointment(input: CreateAppointmentInput) {
  try {
    const response = await fetch('http://localhost:3001/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error('Failed to create appointment');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('createAppointment 错误:', error);
    throw error;
  }
}

export async function updateAppointment(id: string, updates: Partial<Appointment>) {
  try {
    const response = await fetch(`http://localhost:3001/api/appointments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update appointment');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('updateAppointment 错误:', error);
    throw error;
  }
}

export async function deleteAppointment(id: string) {
  try {
    const response = await fetch(`http://localhost:3001/api/appointments/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete appointment');
    }
  } catch (error: any) {
    console.error('deleteAppointment 错误:', error);
    throw error;
  }
}

// ==================== Schedules ====================

export async function getSchedules(filters?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  appointment_id?: string;
}) {
  try {
    const params = new URLSearchParams();
    if (filters?.date) params.append('date', filters.date);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.appointment_id) params.append('appointment_id', filters.appointment_id);

    const response = await fetch(`http://localhost:3001/api/schedules?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch schedules');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('获取 schedules 失败:', error);
    throw error;
  }
}

export async function getScheduleById(id: string): Promise<ScheduleWithDetails | null> {
  try {
    const response = await fetch(`http://localhost:3001/api/schedules/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch schedule');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('getScheduleById 错误:', error);
    throw error;
  }
}

export async function createSchedule(input: CreateScheduleInput) {
  try {
    const response = await fetch('http://localhost:3001/api/schedules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error('Failed to create schedule');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('createSchedule 错误:', error);
    throw error;
  }
}

export async function updateSchedule(id: string, updates: UpdateScheduleInput) {
  try {
    const response = await fetch(`http://localhost:3001/api/schedules/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update schedule');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('updateSchedule 错误:', error);
    throw error;
  }
}

export async function deleteSchedule(id: string) {
  try {
    const response = await fetch(`http://localhost:3001/api/schedules/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete schedule');
    }
  } catch (error: any) {
    console.error('deleteSchedule 错误:', error);
    throw error;
  }
}

// ==================== Task Executions ====================

export async function getTaskExecutions(filters?: {
  nurse_id?: string;
  status?: string;
  date?: string;
}) {
  try {
    const params = new URLSearchParams();
    if (filters?.nurse_id) params.append('nurse_id', filters.nurse_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.date) params.append('date', filters.date);

    const response = await fetch(`http://localhost:3001/api/task-executions?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch task executions');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('获取 task executions 失败:', error);
    throw error;
  }
}

export async function getTaskExecutionById(id: string): Promise<TaskExecutionWithDetails | null> {
  try {
    const response = await fetch(`http://localhost:3001/api/task-executions/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch task execution');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('getTaskExecutionById 错误:', error);
    throw error;
  }
}

export async function updateTaskExecution(id: string, updates: UpdateTaskExecutionInput) {
  try {
    const response = await fetch(`http://localhost:3001/api/task-executions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update task execution');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('updateTaskExecution 错误:', error);
    throw error;
  }
}

// ==================== RPC Functions ====================

export async function checkResourceAvailability(
  date: string,
  timeStart: string,
  timeEnd: string,
  excludeScheduleId?: string
): Promise<ResourceAvailability> {
  try {
    const params = new URLSearchParams({
      date,
      time_start: timeStart,
      time_end: timeEnd,
      ...(excludeScheduleId && { exclude_schedule_id: excludeScheduleId })
    });

    const response = await fetch(`http://localhost:3001/api/resources/availability?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check resource availability');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('checkResourceAvailability 错误:', error);
    throw error;
  }
}

// ==================== Nurses ====================

export async function getNurses() {
  try {
    const response = await fetch('http://localhost:3001/api/nurses', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch nurses');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('获取 nurses 失败:', error);
    throw error;
  }
}

export async function getAvailableNurses() {
  try {
    const response = await fetch('http://localhost:3001/api/profiles/nurses/available', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch available nurses');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('获取 available nurses 失败:', error);
    throw error;
  }
}

// ==================== Doctors ====================

export async function getDoctors() {
  try {
    const response = await fetch('http://localhost:3001/api/doctors', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch doctors');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('获取 doctors 失败:', error);
    throw error;
  }
}

export async function getAvailableDoctors() {
  try {
    const response = await fetch('http://localhost:3001/api/doctors/available', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch available doctors');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('获取 available doctors 失败:', error);
    throw error;
  }
}

export async function createDoctor(doctor: { name: string; specialty: string; is_available: boolean }) {
  try {
    const response = await fetch('http://localhost:3001/api/doctors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify(doctor)
    });

    if (!response.ok) {
      throw new Error('Failed to create doctor');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('createDoctor 错误:', error);
    throw error;
  }
}

export async function updateDoctor(id: string, updates: Partial<Doctor>) {
  try {
    const response = await fetch(`http://localhost:3001/api/doctors/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update doctor');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('updateDoctor 错误:', error);
    throw error;
  }
}

export async function deleteDoctor(id: string) {
  try {
    const response = await fetch(`http://localhost:3001/api/doctors/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete doctor');
    }
  } catch (error: any) {
    console.error('deleteDoctor 错误:', error);
    throw error;
  }
}

export async function createNurse(nurse: { name: string; skill_level: string; is_available: boolean }) {
  try {
    const response = await fetch('http://localhost:3001/api/nurses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify(nurse)
    });

    if (!response.ok) {
      throw new Error('Failed to create nurse');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('createNurse 错误:', error);
    throw error;
  }
}

export async function updateNurse(id: string, updates: Partial<Nurse>) {
  try {
    const response = await fetch(`http://localhost:3001/api/nurses/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update nurse');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('updateNurse 错误:', error);
    throw error;
  }
}

export async function deleteNurse(id: string) {
  try {
    const response = await fetch(`http://localhost:3001/api/nurses/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete nurse');
    }
  } catch (error: any) {
    console.error('deleteNurse 错误:', error);
    throw error;
  }
}

// ==================== Rooms ====================

export async function createRoom(room: { name: string; type: string; is_available: boolean; store_id?: string }) {
  try {
    const response = await fetch('http://localhost:3001/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify(room)
    });

    if (!response.ok) {
      throw new Error('Failed to create room');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('createRoom 错误:', error);
    throw error;
  }
}

export async function updateRoom(id: string, updates: Partial<Room>) {
  try {
    const response = await fetch(`http://localhost:3001/api/rooms/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update room');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('updateRoom 错误:', error);
    throw error;
  }
}

export async function deleteRoom(id: string) {
  try {
    const response = await fetch(`http://localhost:3001/api/rooms/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete room');
    }
  } catch (error: any) {
    console.error('deleteRoom 错误:', error);
    throw error;
  }
}

export async function getRooms(store_id?: string) {
  try {
    let url = 'http://localhost:3001/api/rooms';
    if (store_id) {
      url += `?store_id=${store_id}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch rooms');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('获取 rooms 失败:', error);
    throw error;
  }
}

export async function getAvailableRooms() {
  try {
    const response = await fetch('http://localhost:3001/api/resources/rooms/available', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch available rooms');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('获取 available rooms 失败:', error);
    throw error;
  }
}

// ==================== 钉钉同步相关 API ====================

/**
 * 获取钉钉同步配置
 */
export async function getDingTalkSyncConfig() {
  try {
    const response = await fetch('http://localhost:3001/api/dingtalk/config', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch DingTalk config');
    }

    const data = await response.json();
    console.log('获取钉钉配置成功:', data);
    return data;
  } catch (error: any) {
    console.error('获取钉钉配置失败:', error);
    throw error;
  }
}

/**
 * 创建或更新钉钉同步配置
 */
export async function upsertDingTalkSyncConfig(config: {
  app_key: string;
  app_secret: string;
  agent_id: string;
  corp_id: string;
  sync_enabled?: boolean;
  auto_sync_enabled?: boolean;
  sync_schedule?: string;
  sync_time?: string;
  conflict_strategy?: 'dingtalk_first' | 'local_first' | 'manual';
  selected_departments?: string[];
}) {
  console.log('开始保存钉钉配置...', { ...config, app_secret: '***' });

  try {
    const response = await fetch('http://localhost:3001/api/dingtalk/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error('保存钉钉配置失败: ' + errorData.message);
    }

    const data = await response.json();
    console.log('钉钉配置保存成功:', data);
    return data;
  } catch (error: any) {
    console.error('保存钉钉配置失败:', error);
    throw error;
  }
}

/**
 * 触发钉钉同步
 */
export async function triggerDingTalkSync(params: {
  sync_type?: 'manual' | 'auto' | 'incremental';
  selected_departments?: string[];
  conflict_strategy?: 'dingtalk_first' | 'local_first' | 'manual';
}) {
  try {
    const response = await fetch('http://localhost:3001/api/dingtalk/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error('钉钉同步失败: ' + errorData.message);
    }

    const data = await response.json();
    console.log('钉钉同步启动成功:', data);
    return data;
  } catch (error: any) {
    console.error('钉钉同步失败:', error);
    throw error;
  }
}

/**
 * 获取钉钉同步日志列表
 */
export async function getDingTalkSyncLogs(params?: {
  limit?: number;
  offset?: number;
  status?: 'pending' | 'running' | 'success' | 'failed' | 'partial';
}) {
  try {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.status) queryParams.append('status', params.status);

    const response = await fetch(`http://localhost:3001/api/dingtalk/sync/logs?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('获取钉钉同步日志失败: ' + (await response.text()));
    }

    const data = await response.json();
    console.log('获取钉钉同步日志成功:', data);

    // 转换API响应格式以匹配前端期望的格式
    return {
      data: Array.isArray(data.logs) ? data.logs : [],
      count: data.total || 0,
    };
  } catch (error: any) {
    console.error('获取钉钉同步日志失败:', error);
    throw error;
  }
}

/**
 * 获取单个同步日志详情
 */
export async function getDingTalkSyncLogById(id: string) {
  try {
    const response = await fetch(`http://localhost:3001/api/dingtalk/sync/logs/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch sync log');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('getDingTalkSyncLogById 错误:', error);
    throw error;
  }
}

/**
 * 获取钉钉部门映射列表
 */
export async function getDingTalkDepartmentMappings() {
  try {
    const response = await fetch('http://localhost:3001/api/dingtalk/departments', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch department mappings');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('getDingTalkDepartmentMappings 错误:', error);
    throw error;
  }
}

/**
 * 更新钉钉部门映射
 */
export async function updateDingTalkDepartmentMapping(
  id: string,
  updates: {
    local_department?: string;
    enabled?: boolean;
  }
) {
  try {
    const response = await fetch(`http://localhost:3001/api/dingtalk/departments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update department mapping');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('updateDingTalkDepartmentMapping 错误:', error);
    throw error;
  }
}

/**
 * 获取同步统计信息
 */
export async function getSyncStatistics() {
  try {
    const response = await fetch('http://localhost:3001/api/dingtalk/statistics', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch sync statistics');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('获取同步统计失败:', error);
    return {
      total_syncs: 0,
      success_count: 0,
      failed_count: 0,
      last_sync: null,
      total_users_synced: 0
    };
  }
}
