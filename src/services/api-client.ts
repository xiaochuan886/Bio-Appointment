// API Base URL
const API_BASE_URL = 'http://localhost:3001/api';

// Helper function to handle API responses
async function apiCall(endpoint: string, options?: RequestInit) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // 创建增强的错误对象，包含所有可能的错误信息
      const enhancedError = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`) as any;
      
      // 添加额外的错误信息
      if (errorData.message) {
        enhancedError.detailedMessage = errorData.message;
      }
      if (errorData.appointmentCount) {
        enhancedError.appointmentCount = errorData.appointmentCount;
      }
      if (errorData.appointments) {
        enhancedError.appointments = errorData.appointments;
      }
      
      // 保留原始错误数据
      enhancedError.originalError = errorData;
      
      throw enhancedError;
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

// Helper function to handle authenticated API calls
export async function authenticatedApiCall(endpoint: string, options?: RequestInit) {
  const tokens = getStoredTokens();
  if (!tokens) {
    throw new Error('No authentication tokens available');
  }

  return apiCall(endpoint, {
    ...options,
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`,
      ...options?.headers,
      'Content-Type': 'application/json', // 确保Content-Type不被覆盖
    },
  });
}

// Token storage helpers
function getStoredTokens() {
  try {
    const accessToken = localStorage.getItem('bio_appointment_access_token');
    const refreshToken = localStorage.getItem('bio_appointment_refresh_token');

    if (accessToken && refreshToken) {
      return { accessToken, refreshToken };
    }
    return null;
  } catch {
    return null;
  }
}

// Types
export interface Store {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  contact_person?: string;
  status: 'active' | 'inactive';
  description?: string;
  business_hours?: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface StoreCreateRequest {
  name: string;
  address?: string;
  phone?: string;
  contact_person?: string;
  status?: 'active' | 'inactive';
  description?: string;
  business_hours?: Record<string, any>;
}

export interface StoreUpdateRequest {
  name?: string;
  address?: string;
  phone?: string;
  contact_person?: string;
  status?: 'active' | 'inactive';
  description?: string;
  business_hours?: Record<string, any>;
}

export interface StoreFilters {
  status?: 'active' | 'inactive';
  name?: string;
  limit?: number;
  offset?: number;
}

export interface StoreResource {
  id: string;
  name: string;
  type: string;
  category: string;
  status: string;
  capacity?: number;
  location?: string;
}

export interface StoreStaff {
  id: string;
  username: string;
  full_name: string;
  role: string;
  status: string;
  phone?: string;
}

export interface Appointment {
  id: string;
  customer_name: string;
  customer_phone?: string;
  service_id: string;
  service?: Service | null;
  requested_date: string;
  requested_time_start?: string;
  requested_time_end?: string;
  total_people: number;
  estimated_duration: number;
  is_urgent: boolean;
  status: string;
  workflow_status?: 'pending_nurse_assignment' | 'pending_doctor_confirmation' | 'doctor_confirmed' | 'doctor_completed' | 'doctor_rejected' | 'nurse_scheduled' | 'in_progress' | 'completed' | 'cancelled';
  requires_nurse_scheduling?: boolean;
  doctor_confirmed_at?: string;
  forwarded_to_nurse_at?: string;
  doctor_id?: string;
  doctor_status?: string;
  doctor_note?: string;
  // 销售信息字段
  sales_name?: string;
  sales_username?: string;
  sales_role?: string;
  // 客户信息字段
  companion_names?: string[];
  sales?: {
    id: string;
    username: string;
    full_name?: string;
  };
  store?: Store;
  notes?: string;
  store_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  base_duration: number;
  requires_doctor: boolean;
  allow_companions: boolean;
  max_companions?: number;
  is_active?: boolean;
}

export interface Resource {
  id: string;
  name: string;
  type: string;
  category: string;
  status: string;
  store_id?: string;
}

export interface Schedule {
  id: string;
  appointment_id: string;
  scheduled_date: string;
  scheduled_time_start: string;
  scheduled_time_end: string;
  room_id?: string;
  nurse_id?: string;
  status: string;
  notes?: string;
  store_id?: string;
  // 新增：销售信息字段
  sales_name?: string;
  sales_username?: string;
  sales_role?: string;
  // 新增：客户信息字段
  customer_name?: string;
  companion_names?: string[];
  total_people?: number;
  appointment?: {
    customer_name?: string;
    companion_names?: string[];
    total_people?: number;
    is_urgent?: boolean;
    store_id?: string;
    sales_name?: string;
    sales_username?: string;
    sales_role?: string;
    store?: {
      id: string;
      name: string;
    };
    service?: {
      name: string;
      category: string;
    };
  };
  room?: {
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface TaskExecution {
  id: string;
  schedule_id?: string;
  title: string;
  description?: string;
  status: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  department?: string;
  store_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAppointmentInput {
  customer_name: string;
  customer_phone: string;
  service_id: string;
  requested_date: string;
  requested_time_start: string;
  requested_time_end: string;
  total_people?: number;
  estimated_duration?: number;
  is_urgent?: boolean;
  notes?: string;
  companion_names?: string[] | null;
  store_id?: string;
}

// API Functions
export const clientApi = {
  // Auth
  async login(credentials: { username: string; password: string }) {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.username,
        password: credentials.password,
      }),
    });
  },

  async logout() {
    const tokens = getStoredTokens();
    if (tokens) {
      try {
        await apiCall('/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`,
          },
        });
      } catch (error) {
        console.error('Logout API call failed:', error);
      }
    }
    // Clear local tokens
    localStorage.removeItem('bio_appointment_access_token');
    localStorage.removeItem('bio_appointment_refresh_token');
  },

  // Appointments
  async getAppointments(filters?: Record<string, any>): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return authenticatedApiCall(`/appointments${query}`);
  },

  async getNursePendingAppointments(filters?: Record<string, any>): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return authenticatedApiCall(`/appointments/nurse-pending${query}`);
  },

  async getCancelledAppointments(filters?: Record<string, any>): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return authenticatedApiCall(`/appointments/cancelled${query}`);
  },

  async getDoctorPendingAppointments(filters?: Record<string, any>): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return authenticatedApiCall(`/appointments/doctor-pending${query}`);
  },

  async getDoctorSchedules(filters?: {
    start_date?: string;
    end_date?: string;
    date?: string;
  }): Promise<Schedule[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return authenticatedApiCall(`/schedules/doctor${query}`);
  },

  async doctorConfirmAppointment(id: string, data: {
    doctor_id: string;
    doctor_note?: string;
  }): Promise<Appointment> {
    return authenticatedApiCall(`/appointments/${id}/doctor-confirm`, {
      method: 'PUT',
      body: JSON.stringify({
        ...data,
        workflow_status: 'doctor_confirmed'
      }),
    });
  },

  async doctorRejectAppointment(id: string, data: {
    doctor_id: string;
    doctor_note: string;
  }): Promise<Appointment> {
    return authenticatedApiCall(`/appointments/${id}/doctor-reject`, {
      method: 'PUT',
      body: JSON.stringify({
        ...data,
        workflow_status: 'doctor_rejected'
      }),
    });
  },

  async updateAppointmentWorkflow(id: string, data: {
    workflow_status: string;
    note?: string;
  }): Promise<Appointment> {
    return authenticatedApiCall(`/appointments/${id}/workflow`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async createAppointment(data: CreateAppointmentInput): Promise<Appointment> {
    return authenticatedApiCall('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment> {
    return authenticatedApiCall(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteAppointment(id: string): Promise<void> {
    return authenticatedApiCall(`/appointments/${id}`, {
      method: 'DELETE',
    });
  },

  // Services
  async getServices(category?: string): Promise<Service[]> {
    const query = category ? `?category=${category}` : '';
    return apiCall(`/services${query}`);
  },

  async createService(data: {
    name: string;
    description: string;
    category: string;
    base_duration: number;
    requires_doctor?: boolean;
    allow_companions?: boolean;
    max_companions?: number;
    is_active?: boolean;
  }): Promise<Service> {
    return apiCall('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateService(id: string, data: Partial<Service>): Promise<Service> {
    return apiCall(`/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteService(id: string): Promise<void> {
    return apiCall(`/services/${id}`, {
      method: 'DELETE',
    });
  },

  // Resources
  async getResources(filters?: { type?: string; status?: string; store_id?: string }): Promise<Resource[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.store_id) params.append('store_id', filters.store_id);
    const query = params.toString() ? `?${params.toString()}` : '';
    return authenticatedApiCall(`/resources${query}`);
  },

  // Schedules
  async getSchedules(filters?: {
    date?: string;
    start_date?: string;
    end_date?: string;
    nurse_id?: string;
    store_id?: string;
  }): Promise<Schedule[]> {
    const params = new URLSearchParams();
    if (filters?.date) params.append('date', filters.date);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.nurse_id) params.append('nurse_id', filters.nurse_id);
    if (filters?.store_id) params.append('store_id', filters.store_id);
    const query = params.toString() ? `?${params.toString()}` : '';
    return authenticatedApiCall(`/schedules${query}`);
  },

  async createSchedule(data: {
    appointment_id: string;
    scheduled_date: string;
    scheduled_time_start: string;
    scheduled_time_end: string;
    room_id?: string;
    nurse_id?: string;
    notes?: string;
  }): Promise<Schedule> {
    return authenticatedApiCall('/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSchedule(id: string, data: Partial<Schedule>): Promise<Schedule> {
    return authenticatedApiCall(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteSchedule(id: string): Promise<void> {
    return authenticatedApiCall(`/schedules/${id}`, {
      method: 'DELETE',
    });
  },

  // Task Executions
  async getTaskExecutions(filters?: { status?: string; assigned_to?: string }): Promise<TaskExecution[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to);
    const query = params.toString() ? `?${params.toString()}` : '';
    return authenticatedApiCall(`/task-executions${query}`);
  },

  async updateTaskExecution(id: string, data: Partial<TaskExecution>): Promise<TaskExecution> {
    return authenticatedApiCall(`/task-executions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async createTaskExecution(data: {
    schedule_id?: string;
    title: string;
    description?: string;
    status?: string;
    assigned_to?: string;
  }): Promise<TaskExecution> {
    return authenticatedApiCall('/task-executions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Profiles
  async getProfiles(store_id?: string): Promise<Profile[]> {
    const query = store_id ? `?store_id=${store_id}` : '';
    return authenticatedApiCall(`/profiles${query}`);
  },

  async getProfile(id: string): Promise<Profile> {
    return authenticatedApiCall(`/profiles/${id}`);
  },

  // Dashboard Stats
  async getDashboardStats(date?: string) {
    const query = date ? `?date=${date}` : '';
    return authenticatedApiCall(`/dashboard/stats${query}`);
  },

  // Resource Availability
  async getResourceAvailability(params: { date: string; time_start: string; time_end: string; store_id?: string }) {
    const queryParams = new URLSearchParams(params).toString();
    return authenticatedApiCall(`/resources/availability?${queryParams}`);
  },


  // Helper functions for specific needs
  async getAvailableNurses(store_id?: string) {
    const query = store_id ? `?store_id=${store_id}` : '';
    console.log('🔍 [DEBUG] 前端调用getAvailableNurses API:', { store_id, query });
    try {
      const result = await authenticatedApiCall(`/profiles/nurses/available${query}`);
      console.log('🔍 [DEBUG] getAvailableNurses API返回成功:', { result, count: result?.length || 0, type: typeof result });
      return result;
    } catch (error) {
      console.error('🔍 [DEBUG] getAvailableNurses API调用失败:', error);
      throw error;
    }
  },

  async getAvailableRooms(store_id?: string) {
    const query = store_id ? `?store_id=${store_id}` : '';
    return authenticatedApiCall(`/resources/rooms/available${query}`);
  },

  // DingTalk Configuration
  async getDingTalkConfig() {
    return authenticatedApiCall('/dingtalk/config');
  },

  async saveDingTalkConfig(config: {
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
    return authenticatedApiCall('/dingtalk/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  // DingTalk Sync
  async triggerSync(params: {
    sync_type?: 'manual' | 'auto' | 'incremental';
    selected_departments?: string[];
    conflict_strategy?: 'dingtalk_first' | 'local_first' | 'manual';
  }) {
    return authenticatedApiCall('/dingtalk/sync', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getSyncLogs(params?: {
    limit?: number;
    offset?: number;
    status?: 'pending' | 'running' | 'success' | 'failed' | 'partial';
  }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.offset) queryParams.append('offset', String(params.offset));
    if (params?.status) queryParams.append('status', params.status);

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return authenticatedApiCall(`/dingtalk/sync/logs${query}`);
  },

  // Store Management
  async getStores(filters?: StoreFilters): Promise<Store[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await authenticatedApiCall(`/stores${query}`);
    return response.stores || response; // Handle both paginated and direct array responses
  },

  async getStore(id: string): Promise<Store> {
    return authenticatedApiCall(`/stores/${id}`);
  },

  async createStore(data: StoreCreateRequest): Promise<Store> {
    return authenticatedApiCall('/stores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateStore(id: string, data: StoreUpdateRequest): Promise<Store> {
    return authenticatedApiCall(`/stores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteStore(id: string): Promise<void> {
    return authenticatedApiCall(`/stores/${id}`, {
      method: 'DELETE',
    });
  },

  async getStoreResources(id: string, type?: string): Promise<StoreResource[]> {
    const query = type ? `?type=${type}` : '';
    return authenticatedApiCall(`/stores/${id}/resources${query}`);
  },

  async getStoreStaff(id: string, role?: string): Promise<StoreStaff[]> {
    const query = role ? `?role=${role}` : '';
    return authenticatedApiCall(`/stores/${id}/staff${query}`);
  },
};

export default clientApi;