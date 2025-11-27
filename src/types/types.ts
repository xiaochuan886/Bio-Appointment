// Bio-Appointment系统类型定义

export type UserRole = 'sales' | 'head_nurse' | 'nurse' | 'doctor';

export type ServiceCategory = 'nursing' | 'consultation' | 'report';

export type ResourceType = 'room' | 'nurse';

export type AppointmentStatus = 'pending' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export type DoctorStatus = 'pending' | 'accepted' | 'rejected';

export type ScheduleStatus = 'draft' | 'published' | 'locked';

export type TaskExecutionStatus = 'pending' | 'checked_in' | 'in_progress' | 'completed';

// 数据库表类型定义

export interface Profile {
  id: string;
  name: string;
  role: UserRole;
  phone?: string;
  email?: string;
  status: 'active' | 'unavailable';
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  base_duration: number;
  requires_doctor: boolean;
  allow_companions: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  category?: string;
  status: 'available' | 'unavailable';
  created_at: string;
}

export interface Appointment {
  id: string;
  customer_name: string;
  companion_names?: string[];
  total_people: number;
  service_id: string;
  requested_date: string;
  requested_time_start?: string;
  requested_time_end?: string;
  estimated_duration: number;
  actual_duration?: number;
  is_urgent: boolean;
  status: AppointmentStatus;
  sales_id?: string;
  doctor_id?: string;
  doctor_status?: DoctorStatus;
  doctor_note?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  appointment_id: string;
  scheduled_date: string;
  scheduled_time_start: string;
  scheduled_time_end: string;
  room_id?: string;
  nurse_id?: string;
  adjusted_duration?: number;
  adjustment_reason?: string;
  status: ScheduleStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskExecution {
  id: string;
  schedule_id: string;
  nurse_id?: string;
  check_in_time?: string;
  start_time?: string;
  finish_time?: string;
  actual_duration?: number;
  overtime_note?: string;
  status: TaskExecutionStatus;
  created_at: string;
  updated_at: string;
}

// 扩展类型（包含关联数据）

export interface AppointmentWithDetails extends Appointment {
  service?: Service;
  sales?: Profile;
  doctor?: Profile;
  schedule?: ScheduleWithDetails;
}

export interface ScheduleWithDetails extends Schedule {
  appointment?: AppointmentWithDetails;
  room?: Resource;
  nurse?: Resource;
  created_by_profile?: Profile;
}

export interface TaskExecutionWithDetails extends TaskExecution {
  schedule?: ScheduleWithDetails;
  nurse_profile?: Profile;
}

// 表单输入类型

export interface CreateAppointmentInput {
  customer_name: string;
  companion_names?: string[];
  service_id: string;
  requested_date: string;
  requested_time_start?: string;
  requested_time_end?: string;
  is_urgent?: boolean;
  sales_id?: string;
  doctor_id?: string;
}

export interface CreateScheduleInput {
  appointment_id: string;
  scheduled_date: string;
  scheduled_time_start: string;
  scheduled_time_end: string;
  room_id?: string;
  nurse_id?: string;
  adjusted_duration?: number;
  adjustment_reason?: string;
}

export interface UpdateScheduleInput {
  scheduled_date?: string;
  scheduled_time_start?: string;
  scheduled_time_end?: string;
  room_id?: string;
  nurse_id?: string;
  adjusted_duration?: number;
  adjustment_reason?: string;
  status?: ScheduleStatus;
}

export interface UpdateTaskExecutionInput {
  check_in_time?: string;
  start_time?: string;
  finish_time?: string;
  actual_duration?: number;
  overtime_note?: string;
  status?: TaskExecutionStatus;
}

// 资源可用性查询结果
export interface ResourceAvailability {
  available_rooms: Array<{
    id: string;
    name: string;
    category?: string;
  }>;
  available_nurses: Array<{
    id: string;
    name: string;
  }>;
}
