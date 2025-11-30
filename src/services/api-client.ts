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
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

// Helper function to handle authenticated API calls
async function authenticatedApiCall(endpoint: string, options?: RequestInit) {
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
export interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  service_id: string;
  requested_date: string;
  requested_time_start: string;
  requested_time_end: string;
  total_people: number;
  estimated_duration: number;
  is_urgent: boolean;
  status: string;
  notes?: string;
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

  // Resources
  async getResources(filters?: { type?: string; status?: string }): Promise<Resource[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiCall(`/resources${query}`);
  },

  // Schedules
  async getSchedules(filters?: { date?: string; nurse_id?: string }): Promise<Schedule[]> {
    const params = new URLSearchParams();
    if (filters?.date) params.append('date', filters.date);
    if (filters?.nurse_id) params.append('nurse_id', filters.nurse_id);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiCall(`/schedules${query}`);
  },

  // Task Executions
  async getTaskExecutions(filters?: { status?: string; assigned_to?: string }): Promise<TaskExecution[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiCall(`/task-executions${query}`);
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
  async getProfiles(): Promise<Profile[]> {
    return authenticatedApiCall('/profiles');
  },

  async getProfile(id: string): Promise<Profile> {
    return authenticatedApiCall(`/profiles/${id}`);
  },

  // Dashboard Stats
  async getDashboardStats(date?: string) {
    const query = date ? `?date=${date}` : '';
    return apiCall(`/dashboard/stats${query}`);
  },

  // Resource Availability
  async getResourceAvailability(params: { date: string; time_start: string; time_end: string }) {
    const queryParams = new URLSearchParams(params).toString();
    return apiCall(`/resources/availability?${queryParams}`);
  },

  // Schedule CRUD operations
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

  // Helper functions for specific needs
  async getAvailableNurses() {
    return authenticatedApiCall('/profiles/nurses/available');
  },

  async getAvailableRooms() {
    return apiCall('/resources/rooms/available');
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
};

export default clientApi;