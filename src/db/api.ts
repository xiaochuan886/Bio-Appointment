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
} from '@/types/types';

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
    .order('name', { ascending: true });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getProfileById(id: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  
  if (error) throw error;
  return data;
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
      sales:sales_id(id, name, role),
      doctor:doctor_id(id, name, role)
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
      sales:sales_id(id, name, role),
      doctor:doctor_id(id, name, role)
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
        sales:sales_id(id, name, role),
        doctor:doctor_id(id, name, role)
      ),
      room:room_id(id, name, type, category),
      nurse:nurse_id(id, name, type),
      created_by_profile:created_by(id, name, role)
    `);
  
  if (filters?.date) {
    query = query.eq('scheduled_date', filters.date);
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
        sales:sales_id(id, name, role),
        doctor:doctor_id(id, name, role)
      ),
      room:room_id(id, name, type, category),
      nurse:nurse_id(id, name, type),
      created_by_profile:created_by(id, name, role)
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
