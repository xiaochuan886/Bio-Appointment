// Bio-Appointment系统类型定义

// ==================== 用户角色与权限 ====================

export type UserRole = 'super_admin' | 'sales' | 'head_nurse' | 'nurse' | 'doctor';

export type UserStatus = 'active' | 'disabled';

export type ServiceCategory = 'nursing' | 'consultation' | 'report';

export type ResourceType = 'room' | 'nurse';

export type AppointmentStatus = 'pending' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export type DoctorStatus = 'pending' | 'accepted' | 'rejected';

export type ScheduleStatus = 'draft' | 'published' | 'locked';

export type TaskExecutionStatus = 'pending' | 'checked_in' | 'in_progress' | 'completed';

// ==================== 用户认证类型 ====================

export interface Profile {
  id: string;
  username: string;
  email?: string;
  full_name?: string;
  role: UserRole;
  department?: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface PublicProfile {
  id: string;
  username: string;
  full_name?: string;
  role: UserRole;
  department?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile?: Profile;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  password: string;
  full_name?: string;
}

export interface UpdateProfileInput {
  full_name?: string;
  department?: string;
}

export interface UpdateUserRoleInput {
  user_id: string;
  role: UserRole;
}

export interface UpdateUserStatusInput {
  user_id: string;
  status: UserStatus;
}

export interface CreateUserInput {
  username: string;
  password: string;
  full_name: string;
  role: UserRole;
  department?: string;
}

export interface UpdateUserInput {
  user_id: string;
  full_name?: string;
  role?: UserRole;
  department?: string;
  status?: UserStatus;
}

export interface DeleteUserInput {
  user_id: string;
}

// 数据库表类型定义（保持向后兼容）

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
  service?: Service | null;
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

// ==================== 资源管理类型 ====================

export type SkillLevel = 'junior' | 'intermediate' | 'senior';
export type RoomType = 'vip' | 'treatment' | 'consultation';

export interface Nurse {
  id: string;
  name: string;
  skill_level: SkillLevel;
  is_available: boolean;
  created_at: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  is_available: boolean;
  created_at: string;
}

export interface Room {
  id: string;
  name: string;
  room_type: RoomType;
  is_available: boolean;
  created_at: string;
}

// ==================== 钉钉集成类型 ====================

export type DingTalkSyncType = 'departments' | 'users';
export type DingTalkSyncStatus = 'running' | 'success' | 'failed';
export type DingTalkNotificationStatus = 'pending' | 'sent' | 'failed';

// 新增：同步状态枚举
export type SyncStatus = 'pending' | 'running' | 'success' | 'failed' | 'partial';
export type SyncType = 'manual' | 'auto' | 'incremental';
export type ConflictStrategy = 'dingtalk_first' | 'local_first' | 'manual';

// 新增：钉钉同步配置
export interface DingTalkSyncConfig {
  id: string;
  app_key: string;
  app_secret: string;
  agent_id: string;
  corp_id: string;
  sync_enabled: boolean;
  auto_sync_enabled: boolean;
  sync_schedule: string;
  sync_time: string;
  conflict_strategy: ConflictStrategy;
  selected_departments: string[];
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

// 新增：钉钉同步日志（新版）
export interface DingTalkSyncLogV2 {
  id: string;
  sync_type: SyncType;
  status: SyncStatus;
  total_users: number;
  success_count: number;
  failed_count: number;
  skipped_count: number;
  error_message?: string;
  details: Record<string, any>;
  started_at: string;
  completed_at?: string;
  created_by?: string;
  created_at: string;
}

// 新增：钉钉部门映射
export interface DingTalkDepartmentMapping {
  id: string;
  dingtalk_dept_id: string;
  dingtalk_dept_name: string;
  local_department?: string;
  parent_id?: string;
  order_num: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// 钉钉用户映射
export interface DingTalkUser {
  id: string;
  profile_id?: string;
  dingtalk_userid: string;
  dingtalk_unionid?: string;
  name: string;
  mobile?: string;
  department_ids: string[];
  avatar?: string;
  is_active: boolean;
  last_sync_at: string;
  created_at: string;
  updated_at: string;
}

// 钉钉部门
export interface DingTalkDepartment {
  id: string;
  dingtalk_dept_id: string;
  name: string;
  parent_id?: string;
  order_num: number;
  is_active: boolean;
  last_sync_at: string;
  created_at: string;
  updated_at: string;
}

// 钉钉同步日志（旧版，保留兼容性）
export interface DingTalkSyncLog {
  id: string;
  sync_type: DingTalkSyncType;
  status: DingTalkSyncStatus;
  total_count: number;
  success_count: number;
  failed_count: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  created_by?: string;
  created_at: string;
}

// 钉钉通知记录
export interface DingTalkNotification {
  id: string;
  notification_type: string;
  recipient_userid: string;
  title: string;
  content: string;
  status: DingTalkNotificationStatus;
  sent_at?: string;
  error_message?: string;
  related_id?: string;
  created_at: string;
}

// 钉钉 API 响应类型
export interface DingTalkAccessTokenResponse {
  errcode: number;
  errmsg: string;
  access_token: string;
  expires_in: number;
}

export interface DingTalkUserInfoResponse {
  errcode: number;
  errmsg: string;
  userid: string;
  name: string;
  mobile?: string;
  avatar?: string;
  unionid?: string;
}

export interface DingTalkDepartmentListResponse {
  errcode: number;
  errmsg: string;
  result: Array<{
    dept_id: number;
    name: string;
    parent_id: number;
    order: number;
  }>;
}

export interface DingTalkUserListResponse {
  errcode: number;
  errmsg: string;
  result: {
    list: Array<{
      userid: string;
      name: string;
      mobile?: string;
      avatar?: string;
      unionid?: string;
      dept_id_list: number[];
    }>;
    has_more: boolean;
    next_cursor: number;
  };
}

// 钉钉登录相关
export interface DingTalkAuthCodeResponse {
  code: string;
}

export interface DingTalkLoginInput {
  auth_code: string;
}

// 钉钉通讯录同步输入
export interface DingTalkSyncInput {
  sync_type: DingTalkSyncType;
  force?: boolean; // 是否强制全量同步
}

// 新增：钉钉同步请求输入
export interface DingTalkSyncRequestInput {
  sync_type: SyncType;
  selected_departments?: string[];
  conflict_strategy?: ConflictStrategy;
}

// 钉钉通知输入
export interface DingTalkNotificationInput {
  recipient_userids: string[]; // 接收人钉钉 userid 列表
  notification_type: string;
  title: string;
  content: string;
  related_id?: string;
}

// 钉钉配置
export interface DingTalkConfig {
  appKey: string;
  agentId: string;
  corpId: string;
}

// 新增：同步统计信息
export interface SyncStatistics {
  total_syncs: number;
  success_count: number;
  failed_count: number;
  last_sync?: string;
  total_users_synced: number;
}

