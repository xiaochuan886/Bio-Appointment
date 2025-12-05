"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiService = void 0;
const connection_1 = require("@/db/connection");
/**
 * Database API service for CRUD operations
 */
class ApiService {
    // Profiles API
    static async getProfile(id) {
        const user = await connection_1.DatabaseHelper.findById('profiles', id);
        if (!user)
            return null;
        // Remove password hash
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    static async getProfiles(filters = {}) {
        const users = await connection_1.DatabaseHelper.findMany('profiles', filters, {
            orderBy: 'created_at DESC',
        });
        // Remove password hashes
        return users.map(user => {
            const { password_hash, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });
    }
    static async createProfile(data) {
        const newUser = await connection_1.DatabaseHelper.create('profiles', {
            ...data,
            status: 'active',
            created_at: new Date(),
        });
        const { password_hash, ...userWithoutPassword } = newUser;
        return userWithoutPassword;
    }
    static async updateProfile(id, data) {
        const { id: _, password_hash, created_at, updated_at, ...allowedUpdates } = data;
        const updatedUser = await connection_1.DatabaseHelper.update('profiles', id, allowedUpdates);
        if (!updatedUser)
            return null;
        const { password_hash: _, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    }
    static async deleteProfile(id) {
        const deleted = await connection_1.DatabaseHelper.delete('profiles', id);
        return deleted !== null;
    }
    // Services API
    static async getServices(category) {
        const filters = category ? { category } : {};
        const services = await connection_1.DatabaseHelper.findMany('services', filters, {
            orderBy: 'category, name',
        });
        return services.filter(service => service.is_active);
    }
    static async getService(id) {
        return await connection_1.DatabaseHelper.findById('services', id);
    }
    static async createService(data) {
        return await connection_1.DatabaseHelper.create('services', {
            ...data,
            is_active: true,
            created_at: new Date(),
        });
    }
    static async updateService(id, data) {
        const { id: _, created_at, updated_at, ...allowedUpdates } = data;
        return await connection_1.DatabaseHelper.update('services', id, allowedUpdates);
    }
    // Resources API
    static async getResources(type, status) {
        const filters = {};
        if (type)
            filters.type = type;
        if (status)
            filters.status = status;
        const resources = await connection_1.DatabaseHelper.findMany('resources', filters, {
            orderBy: 'type, name',
        });
        return resources.filter(resource => resource.is_active);
    }
    static async getResource(id) {
        return await connection_1.DatabaseHelper.findById('resources', id);
    }
    static async createResource(data) {
        return await connection_1.DatabaseHelper.create('resources', {
            ...data,
            status: 'available',
            is_active: true,
            created_at: new Date(),
        });
    }
    static async updateResource(id, data) {
        const { id: _, created_at, updated_at, ...allowedUpdates } = data;
        return await connection_1.DatabaseHelper.update('resources', id, allowedUpdates);
    }
    // Appointments API
    static async getAppointments(filters = {}) {
        let whereClause = '1=1';
        const params = [];
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
        const result = await (0, connection_1.query)(queryText, params);
        return result.rows;
    }
    static async getAppointment(id) {
        return await connection_1.DatabaseHelper.findById('appointments', id);
    }
    static async createAppointment(data) {
        return await connection_1.DatabaseHelper.create('appointments', {
            ...data,
            status: 'pending',
            created_at: new Date(),
        });
    }
    static async updateAppointment(id, data) {
        const { id: _, created_at, updated_at, ...allowedUpdates } = data;
        return await connection_1.DatabaseHelper.update('appointments', id, allowedUpdates);
    }
    static async deleteAppointment(id) {
        const deleted = await connection_1.DatabaseHelper.delete('appointments', id);
        return deleted !== null;
    }
    // Schedules API
    static async getSchedules(filters = {}) {
        let whereClause = '1=1';
        const params = [];
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
      LEFT JOIN rooms r ON s.room_id = r.id
      LEFT JOIN profiles p ON s.nurse_id = p.id
      WHERE ${whereClause}
      ORDER BY scheduled_date, scheduled_time_start
    `;
        const result = await (0, connection_1.query)(queryText, params);
        return result.rows;
    }
    static async getSchedule(id) {
        return await connection_1.DatabaseHelper.findById('schedules', id);
    }
    static async createSchedule(data) {
        return await connection_1.DatabaseHelper.create('schedules', {
            ...data,
            status: 'draft',
            created_at: new Date(),
        });
    }
    static async updateSchedule(id, data) {
        const { id: _, created_at, updated_at, ...allowedUpdates } = data;
        return await connection_1.DatabaseHelper.update('schedules', id, allowedUpdates);
    }
    static async deleteSchedule(id) {
        const deleted = await connection_1.DatabaseHelper.delete('schedules', id);
        return deleted !== null;
    }
    // Task Executions API
    static async getTaskExecutions(filters = {}) {
        let whereClause = '1=1';
        const params = [];
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
        const result = await (0, connection_1.query)(queryText, params);
        return result.rows;
    }
    static async getTaskExecution(id) {
        return await connection_1.DatabaseHelper.findById('task_executions', id);
    }
    static async createTaskExecution(data) {
        return await connection_1.DatabaseHelper.create('task_executions', {
            ...data,
            status: 'pending',
            created_at: new Date(),
        });
    }
    static async updateTaskExecution(id, data) {
        const { id: _, created_at, updated_at, ...allowedUpdates } = data;
        return await connection_1.DatabaseHelper.update('task_executions', id, allowedUpdates);
    }
    // Resource availability API
    static async getResourceAvailability(date, time_start, time_end) {
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
            (0, connection_1.query)(roomsQuery, [date, time_start, time_end]),
            (0, connection_1.query)(nursesQuery, [date, time_start, time_end]),
        ]);
        return {
            available_rooms: roomsResult.rows,
            available_nurses: nursesResult.rows,
        };
    }
    // Statistics API
    static async getDashboardStats(date) {
        const queries = await Promise.all([
            (0, connection_1.query)('SELECT COUNT(*) as count FROM appointments WHERE requested_date = $1', [date]),
            (0, connection_1.query)('SELECT COUNT(*) as count FROM appointments WHERE requested_date = $1 AND status = $2', [date, 'pending']),
            (0, connection_1.query)('SELECT COUNT(*) as count FROM appointments WHERE requested_date = $1 AND status = $2', [date, 'completed']),
            (0, connection_1.query)('SELECT COUNT(*) as count FROM schedules WHERE scheduled_date = $1', [date]),
            (0, connection_1.query)('SELECT COUNT(*) as count FROM task_executions te JOIN schedules s ON te.schedule_id = s.id WHERE s.scheduled_date = $1', [date]),
            (0, connection_1.query)('SELECT COUNT(*) as count FROM task_executions te JOIN schedules s ON te.schedule_id = s.id WHERE s.scheduled_date = $1 AND te.status = $2', [date, 'completed']),
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
exports.ApiService = ApiService;
exports.default = ApiService;
