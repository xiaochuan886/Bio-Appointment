const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3001;

// Database connection
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Middleware
app.use(cors({
  origin: ['http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true,
}));
app.use(express.json());

// Database health check
async function checkDatabase() {
  try {
    const result = await pool.query('SELECT NOW()');
    return { status: 'connected', timestamp: result.rows[0].now };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

// Initialize database tables
async function initializeDatabase() {
  try {
    // Create profiles table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        phone VARCHAR(20),
        department VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create appointments table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20),
        service_id UUID,
        requested_date DATE NOT NULL,
        requested_time_start TIME NOT NULL,
        requested_time_end TIME NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    return false;
  }
}

// Routes

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await checkDatabase();
    res.json({
      status: 'healthy',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Mock authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Generate mock JWT-like token
    const generateToken = (userData) => {
      const payload = JSON.stringify({
        userId: userData.id,
        email: userData.email,
        role: userData.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60
      });
      const base64Payload = Buffer.from(payload).toString('base64');
      return `mock.${base64Payload}.signature`;
    };

    // Mock admin user for testing
    if (email === 'admin@test.com' && password === 'admin123') {
      const adminUser = {
        id: 'admin-id',
        email: 'admin@test.com',
        full_name: '系统管理员',
        role: 'super_admin',
      };
      res.json({
        user: adminUser,
        tokens: {
          accessToken: generateToken(adminUser),
          refreshToken: 'mock-refresh-token',
        }
      });
      return;
    }

    // Try to get user from database
    const result = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // For now, accept any password for existing users
    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
      tokens: {
        accessToken: generateToken(user),
        refreshToken: 'mock-refresh-token',
      }
    });
  } catch (error) {
    res.status(401).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
});

// Token refresh
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required'
      });
    }

    // Mock refresh - always return new tokens for now
    res.json({
      accessToken: 'mock-access-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now()
    });
  } catch (error) {
    res.status(401).json({
      error: 'Token refresh failed',
      message: error.message
    });
  }
});

// Logout
app.post('/api/auth/logout', async (req, res) => {
  try {
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: 'Logout failed',
      message: error.message
    });
  }
});

// Get profiles
app.get('/api/profiles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM profiles ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch profiles',
      message: error.message
    });
  }
});

// Get specific profile by ID
app.get('/api/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Return mock admin user for testing
    if (id === 'admin-id') {
      res.json({
        id: 'admin-id',
        email: 'admin@test.com',
        full_name: '系统管理员',
        role: 'super_admin',
      });
      return;
    }

    const result = await pool.query('SELECT * FROM profiles WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Profile not found'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch profile',
      message: error.message
    });
  }
});

// Get services
app.get('/api/services', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM services ORDER BY name';
    let params = [];

    if (category) {
      query = 'SELECT * FROM services WHERE category = $1 ORDER BY name';
      params = [category];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch services',
      message: error.message
    });
  }
});

// Create service
app.post('/api/services', async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      base_duration,
      requires_doctor = false,
      allow_companions = true,
      max_companions = 5,
      is_active = true
    } = req.body;

    const result = await pool.query(
      `INSERT INTO services (name, description, category, base_duration, requires_doctor, allow_companions, max_companions, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, description, category, base_duration, requires_doctor, allow_companions, max_companions, is_active]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({
      error: 'Failed to create service',
      message: error.message
    });
  }
});

// Update service
app.put('/api/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    console.log('[DEBUG] Loop start:', { updates, paramIndex, valuesLength: values.length });

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
    
    console.log('[DEBUG] Loop end:', { updateFields, paramIndex, valuesLength: values.length });

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update'
      });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE services SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Service not found'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update service',
      message: error.message
    });
  }
});

// Delete service
app.delete('/api/services/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if service is being used by any appointments
    const appointmentCheck = await pool.query(
      'SELECT COUNT(*) as count FROM appointments WHERE service_id = $1',
      [id]
    );

    if (parseInt(appointmentCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete service',
        message: 'Service is being used by existing appointments'
      });
    }

    const result = await pool.query(
      'DELETE FROM services WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Service not found'
      });
    }

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete service',
      message: error.message
    });
  }
});

// Get resources
app.get('/api/resources', async (req, res) => {
  try {
    const { type, status } = req.query;
    let query = 'SELECT * FROM resources ORDER BY name';
    let params = [];

    if (type || status) {
      const conditions = [];
      if (type) {
        conditions.push(`type = $${params.length + 1}`);
        params.push(type);
      }
      if (status) {
        conditions.push(`status = $${params.length + 1}`);
        params.push(status);
      }
      query = `SELECT * FROM resources WHERE ${conditions.join(' AND ')} ORDER BY name`;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch resources',
      message: error.message
    });
  }
});

// Get schedules
app.get('/api/schedules', async (req, res) => {
  try {
    const { date, start_date, end_date, nurse_id } = req.query;
    console.log('🔍 [DEBUG] 排班查询参数:', { date, start_date, end_date, nurse_id });
    
    let query = `
      SELECT
        s.*,
        a.customer_name,
        a.service_id,
        a.estimated_duration,
        a.is_urgent,
        srv.name as service_name,
        srv.category as service_category,
        r.name as room_name,
        r.type as room_type,
        r.status as room_status,
        p.full_name as nurse_name,
        p.role as nurse_role,
        p.department as nurse_department
      FROM schedules s
      LEFT JOIN appointments a ON s.appointment_id = a.id
      LEFT JOIN services srv ON a.service_id = srv.id
      LEFT JOIN resources r ON s.room_id = r.id
      LEFT JOIN profiles p ON s.nurse_id = p.id
    `;
    let params = [];
    const conditions = [];

    // 构建查询条件
    if (date) {
      conditions.push(`DATE(s.scheduled_date) = $${params.length + 1}`);
      params.push(date);
    } else if (start_date && end_date) {
      conditions.push(`DATE(s.scheduled_date) >= $${params.length + 1}`);
      params.push(start_date);
      conditions.push(`DATE(s.scheduled_date) <= $${params.length + 1}`);
      params.push(end_date);
    } else if (start_date) {
      conditions.push(`DATE(s.scheduled_date) >= $${params.length + 1}`);
      params.push(start_date);
    } else if (end_date) {
      conditions.push(`DATE(s.scheduled_date) <= $${params.length + 1}`);
      params.push(end_date);
    }

    if (nurse_id) {
      conditions.push(`s.nurse_id = $${params.length + 1}`);
      params.push(nurse_id);
    }

    // 如果有条件，添加WHERE子句
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY s.scheduled_date, s.scheduled_time_start`;

    console.log('🔍 [DEBUG] 排班查询SQL:', query);
    console.log('🔍 [DEBUG] 排班查询参数:', params);

    const result = await pool.query(query, params);
    console.log('🔍 [DEBUG] 返回排班数量:', result.rows.length);
    
    // Transform the data to match frontend expected format
    const schedules = result.rows.map(row => {
      // 添加房间类型推断逻辑（与房间API保持一致）
      let room_type = 'treatment'; // default
      if (row.room_name && row.room_name.includes('VIP')) {
        room_type = 'vip';
      } else if (row.room_name && row.room_name.includes('咨询')) {
        room_type = 'consultation';
      }

      return {
        ...row,
        // 修正room_type为推断出的值
        room_type: room_type,
        appointment: row.appointment_id ? {
          id: row.appointment_id,
          customer_name: row.customer_name,
          service_id: row.service_id,
          estimated_duration: row.estimated_duration,
          is_urgent: row.is_urgent,
          service: row.service_id ? {
            id: row.service_id,
            name: row.service_name,
            category: row.service_category
          } : null
        } : null,
        room: row.room_id ? {
          id: row.room_id,
          name: row.room_name,
          type: room_type, // 使用推断出的room_type
          status: row.room_status
        } : null,
      nurse: row.nurse_id ? {
        id: row.nurse_id,
        name: row.nurse_name,
        role: row.nurse_role,
        department: row.nurse_department
      } : null
      };
    });

    res.json(schedules);
  } catch (error) {
    console.error('Failed to fetch schedules:', error);
    res.status(500).json({
      error: 'Failed to fetch schedules',
      message: error.message
    });
  }
});

// Get task executions
app.get('/api/task-executions', async (req, res) => {
  try {
    const { status, assigned_to } = req.query;
    let query = 'SELECT * FROM task_executions ORDER BY created_at DESC';
    let params = [];

    if (status || assigned_to) {
      const conditions = [];
      if (status) {
        conditions.push(`status = $${params.length + 1}`);
        params.push(status);
      }
      if (assigned_to) {
        conditions.push(`assigned_to = $${params.length + 1}`);
        params.push(assigned_to);
      }
      query = `SELECT * FROM task_executions WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch task executions',
      message: error.message
    });
  }
});

// Helper function for DingTalk Notifications
async function sendDingTalkNotification(userIds, message) {
  console.log(`[DingTalk Notify] Sending to ${userIds.join(',')}:`, JSON.stringify(message));
  // In production, this would fetch access token and call DingTalk API
  return true;
}

// Create appointment
app.post('/api/appointments', async (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      service_id,
      requested_date,
      requested_time_start,
      requested_time_end,
      notes,
      total_people = 1,
      estimated_duration = 60,
      is_urgent = false,
      companion_names
    } = req.body;

    const result = await pool.query(
      `INSERT INTO appointments (customer_name, customer_phone, service_id, requested_date, requested_time_start, requested_time_end, notes, total_people, estimated_duration, is_urgent, companion_names)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [customer_name, customer_phone, service_id, requested_date, requested_time_start, requested_time_end, notes, total_people, estimated_duration, is_urgent, companion_names]
    );

    const appointment = result.rows[0];

    // [DingTalk] Handle Urgent Order Notification
    if (is_urgent) {
      try {
        // Get Head Nurses
        const headNurses = await pool.query("SELECT username FROM profiles WHERE role = 'head_nurse' AND status = 'active'");
        const headNurseIds = headNurses.rows.map(n => n.username); // Assuming username is DingTalk ID for now
        
        if (headNurseIds.length > 0) {
          await sendDingTalkNotification(headNurseIds, {
            msgtype: "markdown",
            markdown: {
              title: "【紧急】急单预约提醒",
              text: `### ⚠️ 急单预约提醒\n\n**客户**: ${customer_name}\n**时间**: ${requested_time_start}\n\n请立即处理！`
            }
          });
        }
      } catch (notifyError) {
        console.error('[DingTalk] Failed to send urgent notification:', notifyError);
      }
    }

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({
      error: 'Failed to create appointment',
      message: error.message
    });
  }
});

// Get appointments
app.get('/api/appointments', async (req, res) => {
  try {
    const { status, customer_name, requested_date } = req.query;
    let query = 'SELECT a.*, s.name as service_name, s.category as service_category, s.base_duration as service_base_duration, s.requires_doctor as service_requires_doctor, s.allow_companions as service_allow_companions, s.is_active as service_is_active FROM appointments a LEFT JOIN services s ON a.service_id = s.id';
    let params = [];
    const conditions = [];

    // Build WHERE clause based on filters
    if (status) {
      if (status.includes(',')) {
        const statuses = status.split(',');
        conditions.push(`status = ANY($${params.length + 1})`);
        params.push(statuses);
      } else {
        conditions.push(`status = $${params.length + 1}`);
        params.push(status);
      }
    }
    if (customer_name) {
      conditions.push(`customer_name ILIKE $${params.length + 1}`);
      params.push(`%${customer_name}%`);
    }
    if (requested_date) {
      conditions.push(`requested_date = $${params.length + 1}`);
      params.push(requested_date);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY requested_date DESC';

    console.log(`🔍 [DEBUG] 获取预约查询: ${query}`);
    console.log(`🔍 [DEBUG] 查询参数:`, params);

    const result = await pool.query(query, params);
    console.log(`🔍 [DEBUG] 返回预约数量: ${result.rows.length}`);
    
    // Map flat result to include service object
    const mappedRows = result.rows.map(row => ({
      ...row,
      service: row.service_name ? {
        id: row.service_id,
        name: row.service_name,
        category: row.service_category,
        base_duration: row.service_base_duration,
        requires_doctor: row.service_requires_doctor,
        allow_companions: row.service_allow_companions,
        is_active: row.service_is_active
      } : null
    }));
    
    console.log(`🔍 [DEBUG] 映射后第一条数据服务: ${mappedRows[0]?.service?.name}`);
    res.json(mappedRows);
  } catch (error) {
    console.error('Failed to fetch appointments:', error);
    res.status(500).json({
      error: 'Failed to fetch appointments',
      message: error.message
    });
  }
});

// Update appointment
app.put('/api/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log(`[DEBUG] Updating appointment ${id} with:`, JSON.stringify(updates));

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update'
      });
    }

    // Get original appointment to check changes
    const originalAppointmentResult = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    const originalAppointment = originalAppointmentResult.rows[0];

    values.push(id);

    const result = await pool.query(
      `UPDATE appointments SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Appointment not found'
      });
    }

    const updatedAppointment = result.rows[0];

    // [DingTalk] Handle Doctor Decision Notification
    if (updates.doctor_status && updates.doctor_status !== originalAppointment.doctor_status) {
      try {
        // In a real app, we'd find the sales person who created this appointment
        // For now, just log it
        const decision = updates.doctor_status === 'accepted' ? '已接受' : '已拒绝';
        console.log(`[DingTalk] Doctor decision notification: Appointment ${updatedAppointment.customer_name} ${decision}`);
        
        // Send notification to a placeholder user (representing Sales)
        await sendDingTalkNotification(['sales1'], {
          msgtype: "markdown",
          markdown: {
            title: `预约${decision}`,
            text: `### 预约${decision}\n\n**客户**: ${updatedAppointment.customer_name}\n**备注**: ${updates.doctor_note || '无'}`
          }
        });
      } catch (notifyError) {
        console.error('[DingTalk] Failed to send doctor notification:', notifyError);
      }
    }

    res.json(updatedAppointment);
  } catch (error) {
    console.error('Failed to update appointment:', error);
    res.status(500).json({
      error: 'Failed to update appointment',
      message: error.message
    });
  }
});

// Dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // Get appointment stats
    const appointmentStats = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
       FROM appointments
       WHERE DATE(requested_date) = $1`,
      [date]
    );

    // Get user stats
    const userStats = await pool.query(
      `SELECT
        COUNT(CASE WHEN role = 'doctor' THEN 1 END) as doctors,
        COUNT(CASE WHEN role = 'nurse' THEN 1 END) as nurses,
        COUNT(CASE WHEN role = 'sales' THEN 1 END) as sales,
        COUNT(CASE WHEN role = 'super_admin' THEN 1 END) as admins
       FROM profiles`
    );

    // Get today's schedule count
    const scheduleStats = await pool.query(
      `SELECT COUNT(*) as today_schedules
       FROM schedules
       WHERE scheduled_date = $1`,
      [date]
    );

    res.json({
      date,
      appointments: appointmentStats.rows[0],
      users: userStats.rows[0],
      schedules: scheduleStats.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch dashboard stats',
      message: error.message
    });
  }
});

// Resource availability
app.get('/api/resources/availability', async (req, res) => {
  try {
    const { date, time_start, time_end } = req.query;

    if (!date || !time_start || !time_end) {
      return res.status(400).json({
        error: 'Missing required parameters: date, time_start, time_end'
      });
    }

    // Get available resources (this is a simplified version)
    const result = await pool.query(
      `SELECT * FROM resources
       WHERE status = 'available'
       ORDER BY name`
    );

    res.json({
      date,
      time_start,
      time_end,
      available_resources: result.rows,
      total_available: result.rows.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch resource availability',
      message: error.message
    });
  }
});

// Get available rooms
app.get('/api/resources/rooms/available', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM resources
       WHERE type = 'room' AND status = 'available'
       ORDER BY name`
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch available rooms',
      message: error.message
    });
  }
});

// Get available nurses
app.get('/api/profiles/nurses/available', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM profiles
       WHERE role = 'nurse'
       ORDER BY full_name`
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch available nurses',
      message: error.message
    });
  }
});

// Get doctors
app.get('/api/doctors', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, full_name, department, status FROM profiles WHERE role = $1 ORDER BY full_name',
      ['doctor']
    );
    
    // Transform to match frontend expected format
    const doctors = result.rows.map(profile => ({
      id: profile.id,
      name: profile.full_name,
      specialty: profile.department || '全科', // Use department as specialty
      is_available: profile.status === 'active',
      created_at: profile.created_at || new Date().toISOString()
    }));
    
    res.json(doctors);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch doctors',
      message: error.message
    });
  }
});

app.get('/api/doctors/available', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, full_name, department FROM profiles WHERE role = $1 AND status = $2 ORDER BY full_name',
      ['doctor', 'active']
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch available doctors',
      message: error.message
    });
  }
});

// Get nurses for system config
app.get('/api/nurses', async (req, res) => {
  try {
    console.log('🔍 [DEBUG] 开始获取护士数据...');
    
    const result = await pool.query(
      'SELECT id, username, full_name, role, department, status FROM profiles WHERE role IN ($1, $2) ORDER BY role, full_name',
      ['nurse', 'head_nurse']
    );
    
    console.log('🔍 [DEBUG] 护士数据查询结果:');
    console.log('  - 查询到的护士数量:', result.rows.length);
    console.log('  - 原始数据样本:', result.rows[0] || '无数据');
    
    // 检查profiles表中的角色分布
    const allRolesResult = await pool.query('SELECT role, COUNT(*) as count FROM profiles GROUP BY role');
    console.log('🔍 [DEBUG] profiles表中的角色分布:', allRolesResult.rows);
    
    // Transform to match frontend expected format
    const nurses = result.rows.map(profile => ({
      id: profile.id,
      name: profile.full_name,
      skill_level: profile.role === 'head_nurse' ? 'senior' : 'intermediate', // Head nurses get senior level
      is_available: profile.status === 'active',
      created_at: profile.created_at || new Date().toISOString()
    }));
    
    console.log('🔍 [DEBUG] 转换后的护士数据:');
    console.log('  - 转换后数量:', nurses.length);
    console.log('  - 转换后样本:', nurses[0] || '无数据');
    
    res.json(nurses);
  } catch (error) {
    console.error('❌ [ERROR] 获取护士数据失败:', error);
    res.status(500).json({
      error: 'Failed to fetch nurses',
      message: error.message
    });
  }
});

// Get rooms for system config
app.get('/api/rooms', async (req, res) => {
  try {
    console.log('🔍 [DEBUG] 开始获取房间数据...');
    
    const result = await pool.query(
      'SELECT DISTINCT ON (name) id, name, type, status FROM resources WHERE type = $1 ORDER BY name',
      ['room']
    );
    
    console.log('🔍 [DEBUG] 数据库查询结果:');
    console.log('  - 查询到的房间数量:', result.rows.length);
    console.log('  - 原始数据样本:', result.rows[0] || '无数据');
    
    // 检查resources表中是否有房间数据
    const allResourcesResult = await pool.query('SELECT type, COUNT(*) as count FROM resources GROUP BY type');
    console.log('🔍 [DEBUG] resources表中的资源类型分布:', allResourcesResult.rows);
    
    // 如果没有房间数据，检查是否有其他类型的资源
    if (result.rows.length === 0) {
      console.warn('⚠️ [WARNING] 没有找到type=room的资源！');
      console.log('🔍 [DEBUG] 尝试查看所有resources数据:');
      const allResources = await pool.query('SELECT * FROM resources LIMIT 10');
      console.log('  - 所有资源样本:', allResources.rows);
    }
    
    // Transform to match frontend expected format
    const rooms = result.rows.map(resource => {
      let room_type = 'treatment'; // default
      if (resource.name.includes('VIP')) {
        room_type = 'vip';
      } else if (resource.name.includes('咨询')) {
        room_type = 'consultation';
      }
      
      return {
        id: resource.id,
        name: resource.name,
        room_type: room_type,
        is_available: resource.status === 'available',
        created_at: resource.created_at || new Date().toISOString()
      };
    });
    
    console.log('🔍 [DEBUG] 转换后的房间数据:');
    console.log('  - 转换后数量:', rooms.length);
    console.log('  - 转换后样本:', rooms[0] || '无数据');
    
    res.json(rooms);
  } catch (error) {
    console.error('❌ [ERROR] 获取房间数据失败:', error);
    res.status(500).json({
      error: 'Failed to fetch rooms',
      message: error.message
    });
  }
});

// Create schedule
app.post('/api/schedules', async (req, res) => {
  try {
    const {
      appointment_id,
      scheduled_date,
      scheduled_time_start,
      scheduled_time_end,
      room_id,
      nurse_id,
      notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO schedules (appointment_id, scheduled_date, scheduled_time_start, scheduled_time_end, room_id, nurse_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [appointment_id, scheduled_date, scheduled_time_start, scheduled_time_end, room_id, nurse_id, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create schedule',
      message: error.message
    });
  }
});

// Update schedule
app.put('/api/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update'
      });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE schedules SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Schedule not found'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update schedule',
      message: error.message
    });
  }
});

// Delete schedule
app.delete('/api/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM schedules WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Schedule not found'
      });
    }

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete schedule',
      message: error.message
    });
  }
});

// Create task execution
app.post('/api/task-executions', async (req, res) => {
  try {
    const {
      schedule_id,
      title,
      description,
      status = 'pending',
      assigned_to
    } = req.body;

    const result = await pool.query(
      `INSERT INTO task_executions (schedule_id, title, description, status, assigned_to)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [schedule_id, title, description, status, assigned_to]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create task execution',
      message: error.message
    });
  }
});

// Update task execution
app.put('/api/task-executions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update'
      });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE task_executions SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Task execution not found'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update task execution',
      message: error.message
    });
  }
});

// ==================== User Management Endpoints ====================

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, full_name, role, department, status, 
              created_at, updated_at, dingtalk_userid
       FROM profiles
       ORDER BY created_at DESC`
    );
    
    console.log(`获取所有用户: ${result.rows.length} 条记录`);
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, role, department, status } = req.body;
    
    console.log('🔍 [DEBUG] 更新用户请求:', {
      targetUserId: id,
      updates: { full_name, role, department, status },
      timestamp: new Date().toISOString()
    });

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM profiles WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      console.log('🔍 [DEBUG] 用户不存在:', id);
      return res.status(404).json({
        error: 'User not found'
      });
    }

    console.log('🔍 [DEBUG] 原用户数据:', existingUser.rows[0]);

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (full_name !== undefined) {
      updateFields.push(`full_name = $${paramIndex++}`);
      updateValues.push(full_name);
    }
    if (role !== undefined) {
      updateFields.push(`role = $${paramIndex++}`);
      updateValues.push(role);
    }
    if (department !== undefined) {
      updateFields.push(`department = $${paramIndex++}`);
      updateValues.push(department);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'No fields to update'
      });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    const updateQuery = `
      UPDATE profiles
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    console.log('🔍 [DEBUG] 执行更新查询:', updateQuery);
    console.log('🔍 [DEBUG] 查询参数:', updateValues);

    const result = await pool.query(updateQuery, updateValues);
    
    if (result.rows.length === 0) {
      console.log('🔍 [DEBUG] 更新失败，未找到用户');
      return res.status(404).json({
        error: 'User not found'
      });
    }

    console.log('🔍 [DEBUG] 更新成功，新数据:', result.rows[0]);
    console.log('🔍 [DEBUG] 特别是用户角色:', result.rows[0].role);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('🔍 [DEBUG] 更新用户失败:', error);
    res.status(500).json({
      error: 'Failed to update user',
      message: error.message
    });
  }
});

// ==================== DingTalk Endpoints ====================

// DingTalk Configuration endpoints
// Get DingTalk configuration
app.get('/api/dingtalk/config', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM dingtalk_sync_config ORDER BY created_at DESC LIMIT 1'
    );
    const config = result.rows[0] || null;
    if (config && config.app_secret) {
      config.app_secret = '***'; // Hide secret
    }
    console.log('获取钉钉配置:', config ? { sync_enabled: config.sync_enabled } : '无配置');
    res.json(config);
  } catch (error) {
    console.error('Failed to fetch DingTalk config:', error);
    res.status(500).json({
      error: 'Failed to fetch DingTalk configuration',
      message: error.message
    });
  }
});

// Update DingTalk configuration
app.post('/api/dingtalk/config', async (req, res) => {
  try {
    const {
      app_key,
      app_secret,
      agent_id,
      corp_id,
      sync_enabled = false,
      auto_sync_enabled = false,
      sync_schedule = 'daily',
      sync_time = '02:00:00',
      conflict_strategy = 'manual',
      selected_departments = []
    } = req.body;

    console.log('保存钉钉配置:', { app_key, agent_id, corp_id, sync_enabled });

    // Check if config exists
    const existingConfig = await pool.query(
      'SELECT id FROM dingtalk_sync_config LIMIT 1'
    );

    let result;
    if (existingConfig.rows.length > 0) {
      // Update existing config
      result = await pool.query(
        `UPDATE dingtalk_sync_config 
         SET app_key = $1, app_secret = $2, agent_id = $3, corp_id = $4,
             sync_enabled = $5, auto_sync_enabled = $6, sync_schedule = $7,
             sync_time = $8, conflict_strategy = $9, selected_departments = $10,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $11
         RETURNING *`,
        [
          app_key, app_secret, agent_id, corp_id,
          sync_enabled, auto_sync_enabled, sync_schedule,
          sync_time, conflict_strategy, JSON.stringify(selected_departments),
          existingConfig.rows[0].id
        ]
      );
    } else {
      // Insert new config
      result = await pool.query(
        `INSERT INTO dingtalk_sync_config 
         (app_key, app_secret, agent_id, corp_id, sync_enabled, auto_sync_enabled,
          sync_schedule, sync_time, conflict_strategy, selected_departments)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          app_key, app_secret, agent_id, corp_id,
          sync_enabled, auto_sync_enabled, sync_schedule,
          sync_time, conflict_strategy, JSON.stringify(selected_departments)
        ]
      );
    }

    const savedConfig = result.rows[0];
    if (savedConfig.app_secret) {
      savedConfig.app_secret = '***'; // Hide secret
    }
    
    console.log('钉钉配置已保存，sync_enabled:', savedConfig.sync_enabled);
    res.status(200).json(savedConfig);
  } catch (error) {
    console.error('Save DingTalk config error:', error);
    res.status(500).json({
      error: 'Failed to save DingTalk configuration',
      message: error.message
    });
  }
});

// DingTalk sync endpoints
// Trigger manual sync
app.post('/api/dingtalk/sync', async (req, res) => {
  try {
    const { sync_type = 'manual', selected_departments = [], conflict_strategy } = req.body;

    console.log('开始钉钉同步:', { sync_type, selected_departments, conflict_strategy });

    // Get DingTalk config from database
    const configResult = await pool.query(
      'SELECT * FROM dingtalk_sync_config LIMIT 1'
    );

    if (!configResult.rows[0]) {
      return res.status(400).json({
        error: 'DingTalk configuration not found. Please configure DingTalk first.'
      });
    }

    const config = configResult.rows[0];

    if (!config.sync_enabled) {
      return res.status(400).json({
        error: 'DingTalk sync is disabled. Please enable it in configuration.'
      });
    }

    // Create sync log
    const logResult = await pool.query(
      `INSERT INTO dingtalk_sync_logs 
       (sync_type, status, started_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       RETURNING id`,
      [sync_type, 'running']
    );

    const syncLogId = logResult.rows[0].id;

    try {
      // 1. Get DingTalk access token
      console.log('Getting DingTalk access token...');
      const tokenResponse = await fetch(
        `https://oapi.dingtalk.com/gettoken?appkey=${encodeURIComponent(config.app_key)}&appsecret=${encodeURIComponent(config.app_secret)}`
      );
      const tokenData = await tokenResponse.json();

      if (tokenData.errcode !== 0 || !tokenData.access_token) {
        throw new Error(`Failed to get DingTalk access token: ${tokenData.errmsg}`);
      }

      const accessToken = tokenData.access_token;
      console.log('Access token obtained successfully');

      // 2. Get department list recursively (all departments, not just first level)
      console.log('Fetching DingTalk departments...');
      
      // Helper function to recursively get all departments
      const getAllDepartments = async (parentDeptId = 1) => {
        const response = await fetch(
          `https://oapi.dingtalk.com/topapi/v2/department/listsub?access_token=${accessToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dept_id: parentDeptId })
          }
        );
        const data = await response.json();
        
        if (data.errcode !== 0 || !data.result) {
          console.error(`Failed to fetch departments for parent ${parentDeptId}:`, data.errmsg);
          return [];
        }
        
        let allDepts = data.result || [];
        
        // Recursively get sub-departments
        for (const dept of data.result) {
          const subDepts = await getAllDepartments(dept.dept_id);
          allDepts = allDepts.concat(subDepts);
        }
        
        return allDepts;
      };
      
      const allDepartments = await getAllDepartments(1);
      console.log(`Found ${allDepartments.length} departments (including all levels)`);
      
      // Also get root department info
      const rootDeptResponse = await fetch(
        `https://oapi.dingtalk.com/topapi/v2/department/get?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dept_id: 1 })
        }
      );
      const rootDeptData = await rootDeptResponse.json();
      if (rootDeptData.errcode === 0 && rootDeptData.result) {
        allDepartments.unshift(rootDeptData.result);
      }
      
      const deptData = { errcode: 0, result: allDepartments };

      // 3. Sync departments to department_mapping table
      for (const dept of deptData.result) {
        // Handle cases where parent_id or order might be undefined
        const parentId = dept.parent_id ? dept.parent_id.toString() : null;
        const orderNum = dept.order !== undefined ? dept.order : 0;
        
        await pool.query(
          `INSERT INTO dingtalk_department_mapping 
           (dingtalk_dept_id, dingtalk_dept_name, parent_id, order_num, enabled)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (dingtalk_dept_id) 
           DO UPDATE SET 
             dingtalk_dept_name = EXCLUDED.dingtalk_dept_name,
             parent_id = EXCLUDED.parent_id,
             order_num = EXCLUDED.order_num,
             updated_at = CURRENT_TIMESTAMP`,
          [dept.dept_id.toString(), dept.name, parentId, orderNum, true]
        );
      }

      // 4. Get departments to sync
      const deptIdsToSync = selected_departments.length > 0
        ? selected_departments
        : deptData.result.map(d => d.dept_id.toString());

      console.log(`Syncing users from ${deptIdsToSync.length} departments...`);

      // 5. Sync users
      let totalUsers = 0;
      let successCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      const failedDetails = [];

      for (const deptId of deptIdsToSync) {
        const deptInfo = deptData.result.find(d => d.dept_id.toString() === deptId.toString());
        const deptName = deptInfo ? deptInfo.name : deptId;
        console.log(`[Dept ${deptId}] Syncing users from department: ${deptName}...`);
        let cursor = 0;
        let hasMore = true;
        let deptUserCount = 0;

        while (hasMore) {
          const userResponse = await fetch(
            `https://oapi.dingtalk.com/topapi/v2/user/list?access_token=${accessToken}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                dept_id: parseInt(deptId),
                cursor,
                size: 100
              })
            }
          );

          const userData = await userResponse.json();

          if (userData.errcode !== 0 || !userData.result) {
            console.error(`[Dept ${deptId}] Failed to fetch users:`, userData.errmsg);
            break;
          }

          const users = userData.result.list || [];
          deptUserCount += users.length;
          totalUsers += users.length;
          console.log(`[Dept ${deptId}] Fetched ${users.length} users (cursor: ${cursor}, has_more: ${userData.result.has_more})`);

          for (const user of users) {
            try {
              // Check if user exists
              const existingUser = await pool.query(
                'SELECT id, username, full_name FROM profiles WHERE username = $1',
                [user.userid]
              );

              const strategy = conflict_strategy || config.conflict_strategy;

              if (existingUser.rows.length > 0) {
                // User exists, handle according to conflict strategy
                if (strategy === 'dingtalk_first') {
                  // Update with DingTalk data
                  const deptName = deptData.result?.find(d => d.dept_id === user.dept_id_list[0])?.name;
                  await pool.query(
                    `UPDATE profiles 
                     SET full_name = $1, department = $2, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $3`,
                    [user.name, deptName, existingUser.rows[0].id]
                  );
                  successCount++;
                } else if (strategy === 'local_first') {
                  // Keep local data, skip
                  skippedCount++;
                } else {
                  // Manual strategy: record conflict, need manual handling
                  skippedCount++;
                }
              } else {
                // User doesn't exist, create new user
                const email = user.email || `${user.userid}@company.local`;
                const password = user.mobile || '123456'; // Default password
                const deptName = deptData.result?.find(d => d.dept_id === user.dept_id_list[0])?.name;

                // Create user account
                await pool.query(
                  `INSERT INTO profiles 
                   (username, email, full_name, role, department, status, password_hash, dingtalk_userid)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                  [
                    user.userid,
                    email,
                    user.name,
                    'sales', // Default role
                    deptName,
                    'active',
                    password, // Note: In production, this should be hashed
                    user.userid // DingTalk user ID
                  ]
                );

                successCount++;
              }
            } catch (error) {
              console.error(`Failed to process user ${user.name}:`, error);
              failedCount++;
              failedDetails.push({
                userid: user.userid,
                name: user.name,
                error: error.message
              });
            }
          }

          hasMore = userData.result.has_more;
          cursor = userData.result.next_cursor || 0;
        }
        
        console.log(`[Dept ${deptId}] Completed: ${deptUserCount} users from ${deptName}`);
      }

      // 6. Update sync log
      const status = failedCount === 0 ? 'success' : (successCount > 0 ? 'partial' : 'failed');

      await pool.query(
        `UPDATE dingtalk_sync_logs 
         SET status = $1, total_users = $2, success_count = $3, 
             failed_count = $4, skipped_count = $5, 
             details = $6, completed_at = CURRENT_TIMESTAMP
         WHERE id = $7`,
        [
          status,
          totalUsers,
          successCount,
          failedCount,
          skippedCount,
          JSON.stringify({
            departments_synced: deptIdsToSync.length,
            failed_details: failedDetails
          }),
          syncLogId
        ]
      );

      // 7. Update config last_sync_at
      await pool.query(
        `UPDATE dingtalk_sync_config 
         SET last_sync_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [config.id]
      );

      console.log('Sync completed:', { totalUsers, successCount, failedCount, skippedCount });

      res.json({
        success: true,
        data: {
          sync_log_id: syncLogId,
          status,
          total_users: totalUsers,
          success_count: successCount,
          failed_count: failedCount,
          skipped_count: skippedCount,
          failed_details: failedDetails
        }
      });
    } catch (syncError) {
      console.error('Sync process error:', syncError);

      // Update sync log to failed
      await pool.query(
        `UPDATE dingtalk_sync_logs 
         SET status = $1, error_message = $2, completed_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        ['failed', syncError.message, syncLogId]
      );

      throw syncError;
    }
  } catch (error) {
    console.error('DingTalk sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Sync failed'
    });
  }
});

// Get DingTalk sync logs
app.get('/api/dingtalk/sync/logs', async (req, res) => {
  try {
    const { limit = 20, offset = 0, status } = req.query;

    let queryText = `
      SELECT l.*, p.username, p.full_name 
      FROM dingtalk_sync_logs l
      LEFT JOIN profiles p ON l.created_by = p.id
    `;
    const params = [];

    if (status) {
      queryText += ' WHERE l.status = $1';
      params.push(status);
    }

    queryText += ` ORDER BY l.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(queryText, params);

    // Get total count
    const countQuery = status
      ? 'SELECT COUNT(*) FROM dingtalk_sync_logs WHERE status = $1'
      : 'SELECT COUNT(*) FROM dingtalk_sync_logs';
    const countParams = status ? [status] : [];
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    console.error('Failed to fetch sync logs:', error);
    res.status(500).json({
      error: 'Failed to fetch sync logs',
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log('📊 Health check: http://localhost:${PORT}/api/health');

  // Initialize database
  await initializeDatabase();

  try {
    const dbStatus = await checkDatabase();
    if (dbStatus.status === 'connected') {
      console.log('✅ Database connected successfully');
    } else {
      console.error('❌ Database connection failed:', dbStatus.message);
    }
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
  }
});