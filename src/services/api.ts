import { DatabaseHelper, query } from '@/db/connection';
import type {
  Profile,
  Service,
  Resource,
  Appointment,
  Schedule,
  TaskExecution,
  CreateAppointmentInput,
  CreateScheduleInput,
  UpdateScheduleInput,
} from '@/types/types';

/**
 * Database API service for CRUD operations
 */
export class ApiService {
  // Profiles API
  static async getProfile(id: string): Promise<Profile | null> {
    const user = await DatabaseHelper.findById('profiles', id);
    if (!user) return null;

    // Remove password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword as Profile;
  }

  static async getProfiles(filters: {
    role?: string;
    status?: string;
    department?: string;
  } = {}): Promise<Profile[]> {
    const users = await DatabaseHelper.findMany('profiles', filters, {
      orderBy: 'created_at DESC',
    });

    // Remove password hashes
    return users.map(user => {
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword as Profile;
    });
  }

  static async createProfile(data: {
    username: string;
    email?: string;
    full_name?: string;
    role: string;
    department?: string;
    password_hash: string;
  }): Promise<Profile> {
    const newUser = await DatabaseHelper.create('profiles', {
      ...data,
      status: 'active',
      created_at: new Date(),
    });

    const { password_hash, ...userWithoutPassword } = newUser;
    return userWithoutPassword as Profile;
  }

  static async updateProfile(id: string, data: Partial<Profile>): Promise<Profile | null> {
    const { id: _, password_hash, created_at, updated_at, ...allowedUpdates } = data as any;

    const updatedUser = await DatabaseHelper.update('profiles', id, allowedUpdates);
    if (!updatedUser) return null;

    const { password_hash: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword as Profile;
  }

  static async deleteProfile(id: string): Promise<boolean> {
    const deleted = await DatabaseHelper.delete('profiles', id);
    return deleted !== null;
  }

  // Services API
  static async getServices(category?: string): Promise<Service[]> {
    const filters = category ? { category } : {};
    const services = await DatabaseHelper.findMany('services', filters, {
      orderBy: 'category, name',
    });

    return services.filter(service => service.is_active);
  }

  static async getService(id: string): Promise<Service | null> {
    return await DatabaseHelper.findById('services', id);
  }

  static async createService(data: {
    name: string;
    description?: string;
    category: string;
    base_duration: number;
    requires_doctor?: boolean;
    allow_companions?: boolean;
    max_companions?: number;
  }): Promise<Service> {
    return await DatabaseHelper.create('services', {
      ...data,
      is_active: true,
      created_at: new Date(),
    });
  }

  static async updateService(id: string, data: Partial<Service>): Promise<Service | null> {
    const { id: _, created_at, updated_at, ...allowedUpdates } = data as any;
    return await DatabaseHelper.update('services', id, allowedUpdates);
  }

  // Resources API
  static async getResources(type?: string, status?: string): Promise<Resource[]> {
    const filters: any = {};
    if (type) filters.type = type;
    if (status) filters.status = status;

    const resources = await DatabaseHelper.findMany('resources', filters, {
      orderBy: 'type, name',
    });

    return resources.filter(resource => resource.is_active);
  }

  static async getResource(id: string): Promise<Resource | null> {
    return await DatabaseHelper.findById('resources', id);
  }

  static async createResource(data: {
    name: string;
    type: string;
    category?: string;
    capacity?: number;
    location?: string;
    description?: string;
  }): Promise<Resource> {
    return await DatabaseHelper.create('resources', {
      ...data,
      status: 'available',
      is_active: true,
      created_at: new Date(),
    });
  }

  static async updateResource(id: string, data: Partial<Resource>): Promise<Resource | null> {
    const { id: _, created_at, updated_at, ...allowedUpdates } = data as any;
    return await DatabaseHelper.update('resources', id, allowedUpdates);
  }

  // Appointments API
  static async getAppointments(filters: {
    customer_name?: string;
    status?: string;
    sales_id?: string;
    doctor_id?: string;
    requested_date?: string;
    requested_date_from?: string;
    requested_date_to?: string;
  } = {}): Promise<Appointment[]> {
    let whereClause = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Build dynamic WHERE clause for complex filters
    if (filters.customer_name) {
      whereClause += ` AND customer_name ILIKE $${paramIndex}`;
      params.push(`%${filters.customer_name}%`);
      paramIndex++;
    }

    if (filters.status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.sales_id) {
      whereClause += ` AND sales_id = $${paramIndex}`;
      params.push(filters.sales_id);
      paramIndex++;
    }

    if (filters.doctor_id) {
      whereClause += ` AND doctor_id = $${paramIndex}`;
      params.push(filters.doctor_id);
      paramIndex++;
    }

    if (filters.requested_date) {
      whereClause += ` AND requested_date = $${paramIndex}`;
      params.push(filters.requested_date);
      paramIndex++;
    }

    if (filters.requested_date_from) {
      whereClause += ` AND requested_date >= $${paramIndex}`;
      params.push(filters.requested_date_from);
      paramIndex++;
    }

    if (filters.requested_date_to) {
      whereClause += ` AND requested_date <= $${paramIndex}`;
      params.push(filters.requested_date_to);
      paramIndex++;
    }

    const queryText = `
      SELECT * FROM appointments
      WHERE ${whereClause}
      ORDER BY requested_date DESC, created_at DESC
    `;

    const result = await query(queryText, params);
    return result.rows;
  }

  static async getAppointment(id: string): Promise<Appointment | null> {
    return await DatabaseHelper.findById('appointments', id);
  }

  static async createAppointment(data: CreateAppointmentInput & { created_by: string }): Promise<Appointment> {
    return await DatabaseHelper.create('appointments', {
      ...data,
      status: 'pending',
      created_at: new Date(),
    });
  }

  static async updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment | null> {
    const { id: _, created_at, updated_at, ...allowedUpdates } = data as any;
    return await DatabaseHelper.update('appointments', id, allowedUpdates);
  }

  static async deleteAppointment(id: string): Promise<boolean> {
    const deleted = await DatabaseHelper.delete('appointments', id);
    return deleted !== null;
  }

  // Schedules API
  static async getSchedules(filters: {
    scheduled_date?: string;
    scheduled_date_from?: string;
    scheduled_date_to?: string;
    room_id?: string;
    nurse_id?: string;
    status?: string;
  } = {}): Promise<Schedule[]> {
    let whereClause = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.scheduled_date) {
      whereClause += ` AND scheduled_date = $${paramIndex}`;
      params.push(filters.scheduled_date);
      paramIndex++;
    }

    if (filters.scheduled_date_from) {
      whereClause += ` AND scheduled_date >= $${paramIndex}`;
      params.push(filters.scheduled_date_from);
      paramIndex++;
    }

    if (filters.scheduled_date_to) {
      whereClause += ` AND scheduled_date <= $${paramIndex}`;
      params.push(filters.scheduled_date_to);
      paramIndex++;
    }

    if (filters.room_id) {
      whereClause += ` AND room_id = $${paramIndex}`;
      params.push(filters.room_id);
      paramIndex++;
    }

    if (filters.nurse_id) {
      whereClause += ` AND nurse_id = $${paramIndex}`;
      params.push(filters.nurse_id);
      paramIndex++;
    }

    if (filters.status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    const queryText = `
      SELECT s.*,
             a.customer_name, a.service_id, a.estimated_duration,
             r.name as room_name, r.type as room_type,
             p.full_name as nurse_name
      FROM schedules s
      LEFT JOIN appointments a ON s.appointment_id = a.id
      LEFT JOIN resources r ON s.room_id = r.id
      LEFT JOIN profiles p ON s.nurse_id = p.id
      WHERE ${whereClause}
      ORDER BY scheduled_date, scheduled_time_start
    `;

    const result = await query(queryText, params);
    return result.rows;
  }

  static async getSchedule(id: string): Promise<Schedule | null> {
    return await DatabaseHelper.findById('schedules', id);
  }

  static async createSchedule(data: CreateScheduleInput & { created_by: string }): Promise<Schedule> {
    return await DatabaseHelper.create('schedules', {
      ...data,
      status: 'draft',
      created_at: new Date(),
    });
  }

  static async updateSchedule(id: string, data: UpdateScheduleInput): Promise<Schedule | null> {
    const { id: _, created_at, updated_at, ...allowedUpdates } = data as any;
    return await DatabaseHelper.update('schedules', id, allowedUpdates);
  }

  static async deleteSchedule(id: string): Promise<boolean> {
    const deleted = await DatabaseHelper.delete('schedules', id);
    return deleted !== null;
  }

  // Task Executions API
  static async getTaskExecutions(filters: {
    schedule_id?: string;
    nurse_id?: string;
    status?: string;
    date?: string;
  } = {}): Promise<TaskExecution[]> {
    let whereClause = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.schedule_id) {
      whereClause += ` AND te.schedule_id = $${paramIndex}`;
      params.push(filters.schedule_id);
      paramIndex++;
    }

    if (filters.nurse_id) {
      whereClause += ` AND te.nurse_id = $${paramIndex}`;
      params.push(filters.nurse_id);
      paramIndex++;
    }

    if (filters.status) {
      whereClause += ` AND te.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.date) {
      whereClause += ` AND s.scheduled_date = $${paramIndex}`;
      params.push(filters.date);
      paramIndex++;
    }

    const queryText = `
      SELECT te.*,
             s.scheduled_date, s.scheduled_time_start,
             a.customer_name, a.service_id,
             p.full_name as nurse_name
      FROM task_executions te
      LEFT JOIN schedules s ON te.schedule_id = s.id
      LEFT JOIN appointments a ON s.appointment_id = a.id
      LEFT JOIN profiles p ON te.nurse_id = p.id
      WHERE ${whereClause}
      ORDER BY s.scheduled_date, s.scheduled_time_start
    `;

    const result = await query(queryText, params);
    return result.rows;
  }

  static async getTaskExecution(id: string): Promise<TaskExecution | null> {
    return await DatabaseHelper.findById('task_executions', id);
  }

  static async createTaskExecution(data: {
    schedule_id: string;
    nurse_id?: string;
  }): Promise<TaskExecution> {
    return await DatabaseHelper.create('task_executions', {
      ...data,
      status: 'pending',
      created_at: new Date(),
    });
  }

  static async updateTaskExecution(id: string, data: Partial<TaskExecution>): Promise<TaskExecution | null> {
    const { id: _, created_at, updated_at, ...allowedUpdates } = data as any;
    return await DatabaseHelper.update('task_executions', id, allowedUpdates);
  }

  // Resource availability API
  static async getResourceAvailability(date: string, time_start: string, time_end: string): Promise<{
    available_rooms: Array<{ id: string; name: string; category?: string }>;
    available_nurses: Array<{ id: string; name: string; full_name?: string }>;
  }> {
    // Get available rooms
    const roomsQuery = `
      SELECT r.id, r.name, r.category
      FROM resources r
      WHERE r.type = 'room'
        AND r.is_active = true
        AND r.status = 'available'
        AND NOT EXISTS (
          SELECT 1 FROM schedules s
          WHERE s.room_id = r.id
            AND s.scheduled_date = $1
            AND s.status IN ('published', 'locked')
            AND (
              (s.scheduled_time_start <= $2 AND s.scheduled_time_end > $2) OR
              (s.scheduled_time_start < $3 AND s.scheduled_time_end >= $3) OR
              (s.scheduled_time_start >= $2 AND s.scheduled_time_end <= $3)
            )
        )
    `;

    // Get available nurses
    const nursesQuery = `
      SELECT p.id, p.username as name, p.full_name
      FROM profiles p
      WHERE p.role IN ('nurse', 'head_nurse')
        AND p.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM schedules s
          WHERE s.nurse_id = p.id
            AND s.scheduled_date = $1
            AND s.status IN ('published', 'locked')
            AND (
              (s.scheduled_time_start <= $2 AND s.scheduled_time_end > $2) OR
              (s.scheduled_time_start < $3 AND s.scheduled_time_end >= $3) OR
              (s.scheduled_time_start >= $2 AND s.scheduled_time_end <= $3)
            )
        )
    `;

    const [roomsResult, nursesResult] = await Promise.all([
      query(roomsQuery, [date, time_start, time_end]),
      query(nursesQuery, [date, time_start, time_end]),
    ]);

    return {
      available_rooms: roomsResult.rows,
      available_nurses: nursesResult.rows,
    };
  }

  // Statistics API
  static async getDashboardStats(date: string): Promise<{
    totalAppointments: number;
    pendingAppointments: number;
    completedAppointments: number;
    totalSchedules: number;
    totalTasks: number;
    completedTasks: number;
  }> {
    const queries = await Promise.all([
      query('SELECT COUNT(*) as count FROM appointments WHERE requested_date = $1', [date]),
      query('SELECT COUNT(*) as count FROM appointments WHERE requested_date = $1 AND status = $2', [date, 'pending']),
      query('SELECT COUNT(*) as count FROM appointments WHERE requested_date = $1 AND status = $2', [date, 'completed']),
      query('SELECT COUNT(*) as count FROM schedules WHERE scheduled_date = $1', [date]),
      query('SELECT COUNT(*) as count FROM task_executions te JOIN schedules s ON te.schedule_id = s.id WHERE s.scheduled_date = $1', [date]),
      query('SELECT COUNT(*) as count FROM task_executions te JOIN schedules s ON te.schedule_id = s.id WHERE s.scheduled_date = $1 AND te.status = $2', [date, 'completed']),
    ]);

    return {
      totalAppointments: parseInt(queries[0].rows[0].count),
      pendingAppointments: parseInt(queries[1].rows[0].count),
      completedAppointments: parseInt(queries[2].rows[0].count),
      totalSchedules: parseInt(queries[3].rows[0].count),
      totalTasks: parseInt(queries[4].rows[0].count),
      completedTasks: parseInt(queries[5].rows[0].count),
    };
  }
}

export default ApiService;