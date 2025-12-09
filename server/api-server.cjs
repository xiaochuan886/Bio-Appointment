const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const PORT = 3001;

// Create HTTP server for WebSocket
const server = http.createServer(app);

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

    // Mock admin user for testing (support both email and username)
    if ((email === 'admin@test.com' || email === 'admin') && password === 'admin123') {
      const adminUser = {
        id: 'admin-id',
        email: 'admin@test.com',
        username: 'admin',
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

    // Try to get user from database (support both email and username)
    const result = await pool.query('SELECT * FROM profiles WHERE email = $1 OR username = $1', [email]);

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
    const { role, status, store_id } = req.query;
    let query = 'SELECT * FROM profiles';
    let params = [];
    const conditions = [];
    
    // Build WHERE conditions
    if (role) {
      conditions.push(`role = $${params.length + 1}`);
      params.push(role);
    }
    
    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    
    if (store_id) {
      conditions.push(`store_id = $${params.length + 1}`);
      params.push(store_id);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
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

// Create user (profile)
app.post('/api/profiles', async (req, res) => {
  try {
    const {
      username,
      email,
      full_name,
      role,
      password,
      phone,
      department,
      status = 'active'
    } = req.body;

    // Validate required fields
    if (!username || !email || !full_name || !role) {
      return res.status(400).json({
        error: 'Missing required fields: username, email, full_name, role'
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM profiles WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: 'User already exists'
      });
    }

    // Create user
    const result = await pool.query(
      `INSERT INTO profiles (username, email, full_name, role, password_hash, phone, department, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [username, email, full_name, role, password, phone, department, status]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create user:', error);
    res.status(500).json({
      error: 'Failed to create user',
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
      // Get details of appointments using this service for better error message
      const appointmentDetails = await pool.query(
        'SELECT id, customer_name, requested_date FROM appointments WHERE service_id = $1 LIMIT 3',
        [id]
      );
      
      const appointmentList = appointmentDetails.rows.map(apt =>
        `- ${apt.customer_name} (${apt.requested_date})`
      ).join('\n');
      
      return res.status(400).json({
        error: 'Cannot delete service',
        message: '无法删除服务',
        details: `该服务被 ${appointmentCheck.rows[0].count} 个预约使用，无法删除。\n\n使用该服务的预约：\n${appointmentList}\n\n建议：\n1. 将服务状态设置为"禁用"而不是删除\n2. 先删除或修改使用该服务的预约`,
        appointmentCount: parseInt(appointmentCheck.rows[0].count),
        appointments: appointmentDetails.rows
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
    const { type, status, store_id } = req.query;
    let query = 'SELECT * FROM resources';
    let params = [];
    const conditions = [];

    if (type) {
      conditions.push(`type = $${params.length + 1}`);
      params.push(type);
    }
    
    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    
    if (store_id) {
      conditions.push(`store_id = $${params.length + 1}`);
      params.push(store_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY name';

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
    // 获取用户信息进行权限验证
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: '请先登录以访问排班数据'
      });
    }

    // 获取用户详细信息
    let userResult;
    if (user && user.userId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(user.userId)) {
        userResult = await pool.query(
          'SELECT id, role, store_id FROM profiles WHERE id = $1',
          [user.userId]
        );
      } else {
        userResult = { rows: [{ id: user.userId, role: user.role, store_id: null }] };
      }
    }

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found',
        message: '用户不存在'
      });
    }

    const userProfile = userResult.rows[0];
    const { date, start_date, end_date, nurse_id, store_id } = req.query;
    
    console.log('🔍 [DEBUG] 排班查询参数:', { date, start_date, end_date, nurse_id, store_id });
    console.log('🔍 [DEBUG] 用户信息:', { userId: userProfile.id, role: userProfile.role, store_id: userProfile.store_id });
    
    // 参数验证
    if (nurse_id && nurse_id !== 'null' && nurse_id !== 'undefined') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      // Allow both UUID format and mock IDs for development
      if (!uuidRegex.test(nurse_id) && !nurse_id.startsWith('admin-') && !nurse_id.startsWith('nurse-') && !nurse_id.startsWith('doctor-')) {
        return res.status(400).json({
          error: 'Invalid nurse_id format',
          message: '护士ID格式无效，必须是有效的UUID格式或有效的用户ID'
        });
      }
    }

    if (store_id && store_id !== 'null' && store_id !== 'undefined') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      // Allow both UUID format and mock IDs for development
      if (!uuidRegex.test(store_id) && !store_id.startsWith('store-')) {
        return res.status(400).json({
          error: 'Invalid store_id format',
          message: '门店ID格式无效，必须是有效的UUID格式或有效的门店ID'
        });
      }
    }

    // 日期格式验证
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (date && !dateRegex.test(date)) {
      return res.status(400).json({
        error: 'Invalid date format',
        message: '日期格式无效，请使用YYYY-MM-DD格式'
      });
    }
    if (start_date && !dateRegex.test(start_date)) {
      return res.status(400).json({
        error: 'Invalid start_date format',
        message: '开始日期格式无效，请使用YYYY-MM-DD格式'
      });
    }
    if (end_date && !dateRegex.test(end_date)) {
      return res.status(400).json({
        error: 'Invalid end_date format',
        message: '结束日期格式无效，请使用YYYY-MM-DD格式'
      });
    }
    
    let query = `
      SELECT
        s.*,
        a.customer_name,
        a.service_id,
        a.estimated_duration,
        a.is_urgent,
        a.store_id as appointment_store_id,
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

    // 权限控制：护士只能查看自己的排班
    if (userProfile.role === 'nurse') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(userProfile.id)) {
        // UUID格式：使用UUID比较
        conditions.push(`s.nurse_id = $${params.length + 1}::uuid`);
        params.push(userProfile.id);
      } else {
        // 非UUID格式：使用文本比较
        conditions.push(`s.nurse_id::text = $${params.length + 1}`);
        params.push(userProfile.id);
      }
    }
    
    // 护士长只能查看自己门店的排班
    if (userProfile.role === 'head_nurse' && userProfile.store_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(userProfile.store_id)) {
        // UUID格式：使用UUID比较
        conditions.push(`a.store_id = $${params.length + 1}::uuid`);
        params.push(userProfile.store_id);
      } else {
        // 非UUID格式：使用文本比较
        conditions.push(`a.store_id::text = $${params.length + 1}`);
        params.push(userProfile.store_id);
      }
    }

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

    // 只有管理员和护士长可以按护士ID筛选
    if (nurse_id && (userProfile.role === 'super_admin' || userProfile.role === 'head_nurse')) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(nurse_id)) {
        // UUID格式：使用UUID比较
        conditions.push(`s.nurse_id = $${params.length + 1}::uuid`);
        params.push(nurse_id);
      } else {
        // 非UUID格式：使用文本比较
        conditions.push(`s.nurse_id::text = $${params.length + 1}`);
        params.push(nurse_id);
      }
    }
    
    // 只有管理员可以按门店ID筛选
    if (store_id && userProfile.role === 'super_admin') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(store_id)) {
        // UUID格式：使用UUID比较
        conditions.push(`a.store_id = $${params.length + 1}::uuid`);
        params.push(store_id);
      } else {
        // 非UUID格式：使用文本比较
        conditions.push(`a.store_id::text = $${params.length + 1}`);
        params.push(store_id);
      }
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
          store_id: row.appointment_store_id,
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
      companion_names,
      store_id,
      doctor_id
    } = req.body;

    // Validate store_id is provided
    if (!store_id) {
      return res.status(400).json({
        error: 'Store ID is required'
      });
    }

    // Validate that the store exists
    const storeCheck = await pool.query('SELECT * FROM stores WHERE id = $1', [store_id]);
    if (storeCheck.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid store ID'
      });
    }

    // Get service information to determine workflow
    const serviceResult = await pool.query('SELECT category, name FROM services WHERE id = $1', [service_id]);
    if (serviceResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid service ID'
      });
    }

    const service = serviceResult.rows[0];
    let workflowStatus;
    let requiresNurseScheduling = true;

    // Determine initial workflow status based on service category
    if (service.category === 'nursing') {
      workflowStatus = 'pending_nurse_assignment';
      requiresNurseScheduling = true;
    } else if (service.category === 'consultation' || service.category === 'report') {
      workflowStatus = 'pending_doctor_confirmation';
      requiresNurseScheduling = false; // 医生服务不需要护士长排班
    } else {
      // Default to nursing workflow for unknown categories
      workflowStatus = 'pending_nurse_assignment';
      requiresNurseScheduling = true;
    }

    console.log(`[DEBUG] Creating appointment:`, {
      service_category: service.category,
      workflow_status: workflowStatus,
      requires_nurse_scheduling: requiresNurseScheduling,
      customer_name,
      store_id,
      requested_date
    });

    const result = await pool.query(
      `INSERT INTO appointments (customer_name, customer_phone, service_id, requested_date, requested_time_start, requested_time_end, notes, total_people, estimated_duration, is_urgent, companion_names, store_id, doctor_id, workflow_status, requires_nurse_scheduling)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
      [customer_name, customer_phone, service_id, requested_date, requested_time_start, requested_time_end, notes, total_people, estimated_duration, is_urgent, companion_names, store_id, doctor_id, workflowStatus, requiresNurseScheduling]
    );

    const appointment = result.rows[0];
    
    console.log(`[DEBUG] 预约创建成功:`, {
      appointment_id: appointment.id,
      workflow_status: appointment.workflow_status,
      requires_nurse_scheduling: appointment.requires_nurse_scheduling,
      service_category: service.category
    });

    // [DingTalk] Handle Urgent Order Notification
    if (is_urgent) {
      try {
        // Get Head Nurses for the specific store
        const headNurses = await pool.query("SELECT username FROM profiles WHERE role = 'head_nurse' AND status = 'active' AND store_id = $1", [store_id]);
        const headNurseIds = headNurses.rows.map(n => n.username); // Assuming username is DingTalk ID for now
        
        if (headNurseIds.length > 0) {
          await sendDingTalkNotification(headNurseIds, {
            msgtype: "markdown",
            markdown: {
              title: "【紧急】急单预约提醒",
              text: `### ⚠️ 急单预约提醒\n\n**客户**: ${customer_name}\n**服务**: ${service.name}\n**时间**: ${requested_time_start}\n\n请立即处理！`
            }
          });
        }
      } catch (notifyError) {
        console.error('[DingTalk] Failed to send urgent notification:', notifyError);
      }
    }

    // [DingTalk] Handle Doctor Notification for consultation/report services
    if (workflowStatus === 'pending_doctor_confirmation' && doctor_id) {
      try {
        const doctorResult = await pool.query('SELECT username FROM profiles WHERE id = $1', [doctor_id]);
        if (doctorResult.rows.length > 0) {
          await sendDingTalkNotification([doctorResult.rows[0].username], {
            msgtype: "markdown",
            markdown: {
              title: "【待确认】预约通知",
              text: `### 📋 预约待确认\n\n**客户**: ${customer_name}\n**服务**: ${service.name}\n**时间**: ${requested_date} ${requested_time_start}\n\n请确认预约！`
            }
          });
        }
      } catch (notifyError) {
        console.error('[DingTalk] Failed to send doctor notification:', notifyError);
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
    const { status, customer_name, requested_date, store_id } = req.query;
    let query = 'SELECT a.*, s.name as service_name, s.category as service_category, s.base_duration as service_base_duration, s.requires_doctor as service_requires_doctor, s.allow_companions as service_allow_companions, s.is_active as service_is_active, st.name as store_name FROM appointments a LEFT JOIN services s ON a.service_id = s.id LEFT JOIN stores st ON a.store_id = st.id';
    let params = [];
    const conditions = [];

    // Build WHERE clause based on filters
    if (status) {
      if (status.includes(',')) {
        const statuses = status.split(',');
        conditions.push(`a.status = ANY($${params.length + 1})`);
        params.push(statuses);
      } else {
        conditions.push(`a.status = $${params.length + 1}`);
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
    if (store_id) {
      conditions.push(`a.store_id = $${params.length + 1}`);
      params.push(store_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY requested_date DESC';

    console.log(`🔍 [DEBUG] 获取预约查询: ${query}`);
    console.log(`🔍 [DEBUG] 查询参数:`, params);

    const result = await pool.query(query, params);
    console.log(`🔍 [DEBUG] 返回预约数量: ${result.rows.length}`);
    
    // Map flat result to include service and store objects
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
      } : null,
      store: row.store_name ? {
        id: row.store_id,
        name: row.store_name
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

// Get cancelled appointments
app.get('/api/appointments/cancelled', async (req, res) => {
  try {
    const { requested_date_from, requested_date_to, store_id } = req.query;
    
    console.log('🔍 [DEBUG] 获取已取消预约API被调用:', {
      requested_date_from,
      requested_date_to,
      store_id,
      query: req.query
    });
    
    // Get user info to check permissions
    const user = await getUserFromToken(req);
    if (!user) {
      console.log('🔍 [DEBUG] 用户未认证');
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Get user details from database
    let userResult;
    if (user && user.userId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(user.userId)) {
        userResult = await pool.query(
          'SELECT id, role, store_id FROM profiles WHERE id = $1',
          [user.userId]
        );
      } else {
        userResult = { rows: [{ id: user.userId, role: user.role, store_id: null }] };
      }
    } else {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    if (!userResult || userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found'
      });
    }

    const userProfile = userResult.rows[0];

    // Check if user is head_nurse or admin
    if (userProfile.role !== 'head_nurse' && userProfile.role !== 'super_admin') {
      console.log('🔍 [DEBUG] 权限不足:', {
        userProfile,
        requiredRole: 'head_nurse or super_admin'
      });
      return res.status(403).json({
        error: 'Access denied. Only head nurses can access this endpoint.'
      });
    }
    
    console.log('🔍 [DEBUG] 权限验证通过:', {
      userProfile,
      dateRange: { requested_date_from, requested_date_to }
    });

    // Build query conditions
    let query = `
      SELECT
        a.*,
        s.name as service_name,
        s.category as service_category,
        s.base_duration as service_duration,
        st.name as store_name,
        p2.full_name as doctor_name
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN stores st ON a.store_id = st.id
      LEFT JOIN profiles p2 ON a.doctor_id = p2.id
      WHERE a.status = 'cancelled'
    `;
    
    let params = [];
    const conditions = [];

    // Add date range filter
    if (requested_date_from) {
      conditions.push(`a.requested_date >= $${params.length + 1}`);
      params.push(requested_date_from);
    }
    
    if (requested_date_to) {
      conditions.push(`a.requested_date <= $${params.length + 1}`);
      params.push(requested_date_to);
    }

    // Add store filter (head nurses can only see their store's appointments)
    if (userProfile.role === 'head_nurse') {
      conditions.push(`a.store_id = $${params.length + 1}`);
      params.push(userProfile.store_id);
    } else if (store_id && userProfile.role === 'super_admin') {
      conditions.push(`a.store_id = $${params.length + 1}`);
      params.push(store_id);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.requested_date DESC, a.created_at DESC';

    console.log('🔍 [DEBUG] 执行已取消预约查询:', {
      query,
      params
    });

    const result = await pool.query(query, params);
    
    console.log('🔍 [DEBUG] 已取消预约查询结果:', {
      返回数量: result.rows.length,
      数据样本: result.rows[0] || '无数据'
    });
    
    // Transform data to include service and store objects
    const appointments = result.rows.map(row => ({
      ...row,
      service: row.service_name ? {
        id: row.service_id,
        name: row.service_name,
        category: row.service_category,
        duration: row.service_duration
      } : null,
      store: row.store_name ? {
        id: row.store_id,
        name: row.store_name
      } : null,
      doctor: row.doctor_name ? {
        name: row.doctor_name
      } : null
    }));

    res.json(appointments);
  } catch (error) {
    console.error('Failed to fetch cancelled appointments:', error);
    res.status(500).json({
      error: 'Failed to fetch cancelled appointments',
      message: error.message
    });
  }
});

// Get nurse pending appointments
app.get('/api/appointments/nurse-pending', async (req, res) => {
  try {
    const { requested_date_from, requested_date_to, store_id } = req.query;
    
    console.log('🔍 [DEBUG] 护士长待排班API被调用:', {
      requested_date_from,
      requested_date_to,
      store_id,
      query: req.query
    });
    
    // Get user info to check permissions
    const user = await getUserFromToken(req);
    if (!user) {
      console.log('🔍 [DEBUG] 用户未认证');
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Get user details from database
    let userResult;
    if (user && user.userId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(user.userId)) {
        userResult = await pool.query(
          'SELECT id, role, store_id FROM profiles WHERE id = $1',
          [user.userId]
        );
      } else {
        userResult = { rows: [{ id: user.userId, role: user.role, store_id: null }] };
      }
    }

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found'
      });
    }

    const userProfile = userResult.rows[0];

    // Check if user is head_nurse or admin
    if (userProfile.role !== 'head_nurse' && userProfile.role !== 'super_admin') {
      console.log('🔍 [DEBUG] 权限不足:', {
        userProfile,
        requiredRole: 'head_nurse or super_admin'
      });
      return res.status(403).json({
        error: 'Access denied. Only head nurses can access this endpoint.'
      });
    }
    
    console.log('🔍 [DEBUG] 权限验证通过:', {
      userProfile,
      dateRange: { requested_date_from, requested_date_to }
    });

    // Build query conditions
    let query = `
      SELECT
        a.*,
        s.name as service_name,
        s.category as service_category,
        s.base_duration as service_duration,
        st.name as store_name,
        p2.full_name as doctor_name
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN stores st ON a.store_id = st.id
      LEFT JOIN profiles p2 ON a.doctor_id = p2.id
      WHERE a.workflow_status IN ('pending_nurse_assignment', 'doctor_confirmed')
        AND a.status != 'cancelled'
        AND s.category = 'nursing' -- 只显示护理服务
        AND a.requires_nurse_scheduling = true -- 确保只显示需要护士长排班的预约
    `;
    
    let params = [];
    const conditions = [];

    // Add date range filter
    if (requested_date_from) {
      conditions.push(`a.requested_date >= $${params.length + 1}`);
      params.push(requested_date_from);
    }
    
    if (requested_date_to) {
      conditions.push(`a.requested_date <= $${params.length + 1}`);
      params.push(requested_date_to);
    }

    // Add store filter (head nurses can only see their store's appointments)
    if (userProfile.role === 'head_nurse') {
      conditions.push(`a.store_id = $${params.length + 1}`);
      params.push(userProfile.store_id);
    } else if (store_id && userProfile.role === 'super_admin') {
      conditions.push(`a.store_id = $${params.length + 1}`);
      params.push(store_id);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.requested_date ASC, a.requested_time_start ASC';

    console.log('🔍 [DEBUG] 执行护士待排班查询:', {
      query,
      params
    });

    const result = await pool.query(query, params);
    
    console.log('🔍 [DEBUG] 护士待排班查询结果:', {
      返回数量: result.rows.length,
      数据样本: result.rows[0] || '无数据'
    });
    
    // Transform the data to include service and store objects
    const appointments = result.rows.map(row => ({
      ...row,
      service: row.service_name ? {
        id: row.service_id,
        name: row.service_name,
        category: row.service_category,
        duration: row.service_duration
      } : null,
      store: row.store_name ? {
        id: row.store_id,
        name: row.store_name
      } : null,
      nurse: row.nurse_name ? {
        name: row.nurse_name
      } : null,
      doctor: row.doctor_name ? {
        name: row.doctor_name
      } : null
    }));

    res.json(appointments);
  } catch (error) {
    console.error('Failed to fetch nurse pending appointments:', error);
    res.status(500).json({
      error: 'Failed to fetch nurse pending appointments',
      message: error.message
    });
  }
});

// Get doctor pending appointments
app.get('/api/appointments/doctor-pending', async (req, res) => {
  try {
    const { store_id } = req.query;
    
    // Get user info to check permissions
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Get user details from database
    let userResult;
    if (user && user.userId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(user.userId)) {
        userResult = await pool.query(
          'SELECT id, role, store_id FROM profiles WHERE id = $1',
          [user.userId]
        );
      } else {
        userResult = { rows: [{ id: user.userId, role: user.role, store_id: null }] };
      }
    }

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found'
      });
    }

    const userProfile = userResult.rows[0];

    // Check if user is doctor or admin
    if (userProfile.role !== 'doctor' && userProfile.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Access denied. Only doctors can access this endpoint.'
      });
    }

    // Build query conditions
    let query = `
      SELECT
        a.*,
        s.name as service_name,
        s.category as service_category,
        s.base_duration as service_duration,
        st.name as store_name
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN stores st ON a.store_id = st.id
      WHERE a.workflow_status = 'pending_doctor_confirmation'
        AND a.status != 'cancelled'
        AND s.category IN ('consultation', 'report') -- 只显示医生服务
    `;
    
    let params = [];
    const conditions = [];

    // For doctors, only show appointments assigned to them or without doctor assignment
    if (userProfile.role === 'doctor') {
      conditions.push(`(a.doctor_id = $${params.length + 1} OR a.doctor_id IS NULL)`);
      params.push(userProfile.id);
      
      // Also filter by doctor's store
      conditions.push(`a.store_id = $${params.length + 1}`);
      params.push(userProfile.store_id);
    } else if (store_id && userProfile.role === 'super_admin') {
      conditions.push(`a.store_id = $${params.length + 1}`);
      params.push(store_id);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.requested_date ASC, a.requested_time_start ASC';

    const result = await pool.query(query, params);
    
    // Transform the data to include service and store objects
    const appointments = result.rows.map(row => ({
      ...row,
      service: row.service_name ? {
        id: row.service_id,
        name: row.service_name,
        category: row.service_category,
        duration: row.service_duration
      } : null,
      store: row.store_name ? {
        id: row.store_id,
        name: row.store_name
      } : null
    }));

    res.json(appointments);
  } catch (error) {
    console.error('Failed to fetch doctor pending appointments:', error);
    res.status(500).json({
      error: 'Failed to fetch doctor pending appointments',
      message: error.message
    });
  }
});

// Doctor confirm appointment
app.put('/api/appointments/:id/doctor-confirm', async (req, res) => {
  try {
    const { id } = req.params;
    const { doctor_id, doctor_note } = req.body;
    
    // Get user info to check permissions
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Get user details from database
    let userResult;
    if (user && user.userId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(user.userId)) {
        userResult = await pool.query(
          'SELECT id, role FROM profiles WHERE id = $1',
          [user.userId]
        );
      } else {
        userResult = { rows: [{ id: user.userId, role: user.role }] };
      }
    }

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found'
      });
    }

    const userProfile = userResult.rows[0];

    // Check if user is doctor or admin
    if (userProfile.role !== 'doctor' && userProfile.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Access denied. Only doctors can confirm appointments.'
      });
    }

    // Get current appointment
    const appointmentResult = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Appointment not found'
      });
    }

    const appointment = appointmentResult.rows[0];

    // Check if appointment is in correct status
    if (appointment.workflow_status !== 'pending_doctor_confirmation') {
      return res.status(400).json({
        error: 'Appointment is not in pending doctor confirmation status'
      });
    }

    // 获取预约信息以确定服务类型
    const appointmentInfo = await pool.query(
      'SELECT a.*, s.category as service_category FROM appointments a LEFT JOIN services s ON a.service_id = s.id WHERE a.id = $1',
      [id]
    );
    
    if (appointmentInfo.rows.length === 0) {
      return res.status(404).json({
        error: 'Appointment not found'
      });
    }
    
    const appointmentWithService = appointmentInfo.rows[0];
    let newStatus;
    
    // 根据服务类型决定确认后的状态
    if (appointmentWithService.service_category === 'consultation' || appointmentWithService.service_category === 'report') {
      // 医生服务直接完成，不需要护士长排班
      newStatus = 'doctor_completed';
    } else {
      // 护理服务需要护士长排班
      newStatus = 'doctor_confirmed';
    }
    
    // Update appointment workflow status
    const result = await pool.query(
      `UPDATE appointments
       SET workflow_status = $1,
           doctor_confirmed_at = CURRENT_TIMESTAMP,
           doctor_note = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [newStatus, doctor_note, id]
    );

    const updatedAppointment = result.rows[0];

    // [DingTalk] 只有护理服务才需要通知护士长
    if (newStatus === 'doctor_confirmed') {
      try {
        const headNurses = await pool.query(
          "SELECT username FROM profiles WHERE role = 'head_nurse' AND status = 'active' AND store_id = $1",
          [updatedAppointment.store_id]
        );
        
        if (headNurses.rows.length > 0) {
          const serviceResult = await pool.query('SELECT name FROM services WHERE id = $1', [updatedAppointment.service_id]);
          const serviceName = serviceResult.rows[0]?.name || '未知服务';
          
          await sendDingTalkNotification(headNurses.rows.map(n => n.username), {
            msgtype: "markdown",
            markdown: {
              title: "【已确认】医生确认预约",
              text: `### ✅ 医生确认预约\n\n**客户**: ${updatedAppointment.customer_name}\n**服务**: ${serviceName}\n**医生备注**: ${doctor_note || '无'}\n\n请安排护士排班！`
            }
          });
        }
      } catch (notifyError) {
        console.error('[DingTalk] Failed to send nurse notification:', notifyError);
      }
    }

    res.json(updatedAppointment);
  } catch (error) {
    console.error('Failed to confirm appointment:', error);
    res.status(500).json({
      error: 'Failed to confirm appointment',
      message: error.message
    });
  }
});

// Doctor reject appointment
app.put('/api/appointments/:id/doctor-reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { doctor_id, doctor_note } = req.body;
    
    // Get user info to check permissions
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Get user details from database
    let userResult;
    if (user && user.userId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(user.userId)) {
        userResult = await pool.query(
          'SELECT id, role FROM profiles WHERE id = $1',
          [user.userId]
        );
      } else {
        userResult = { rows: [{ id: user.userId, role: user.role }] };
      }
    }

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found'
      });
    }

    const userProfile = userResult.rows[0];

    // Check if user is doctor or admin
    if (userProfile.role !== 'doctor' && userProfile.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Access denied. Only doctors can reject appointments.'
      });
    }

    // Get current appointment
    const appointmentResult = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Appointment not found'
      });
    }

    const appointment = appointmentResult.rows[0];

    // Check if appointment is in correct status
    if (appointment.workflow_status !== 'pending_doctor_confirmation') {
      return res.status(400).json({
        error: 'Appointment is not in pending doctor confirmation status'
      });
    }

    // Update appointment workflow status
    const result = await pool.query(
      `UPDATE appointments
       SET workflow_status = 'doctor_rejected',
           doctor_note = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [doctor_note, id]
    );

    const updatedAppointment = result.rows[0];

    // [DingTalk] Notify sales about the rejection
    try {
      // Find sales users to notify
      const salesUsers = await pool.query(
        "SELECT username FROM profiles WHERE role = 'sales' AND status = 'active'"
      );
      
      if (salesUsers.rows.length > 0) {
        const serviceResult = await pool.query('SELECT name FROM services WHERE id = $1', [updatedAppointment.service_id]);
        const serviceName = serviceResult.rows[0]?.name || '未知服务';
        
        await sendDingTalkNotification(salesUsers.rows.map(u => u.username), {
          msgtype: "markdown",
          markdown: {
            title: "【已拒绝】医生拒绝预约",
            text: `### ❌ 医生拒绝预约\n\n**客户**: ${updatedAppointment.customer_name}\n**服务**: ${serviceName}\n**拒绝原因**: ${doctor_note || '未提供原因'}\n\n请联系客户重新安排！`
          }
        });
      }
    } catch (notifyError) {
      console.error('[DingTalk] Failed to send sales notification:', notifyError);
    }

    res.json(updatedAppointment);
  } catch (error) {
    console.error('Failed to reject appointment:', error);
    res.status(500).json({
      error: 'Failed to reject appointment',
      message: error.message
    });
  }
});

// Update appointment workflow
app.put('/api/appointments/:id/workflow', async (req, res) => {
  try {
    const { id } = req.params;
    const { workflow_status, note } = req.body;
    
    // Get user info to check permissions
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Get user details from database
    let userResult;
    if (user && user.userId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(user.userId)) {
        userResult = await pool.query(
          'SELECT id, role FROM profiles WHERE id = $1',
          [user.userId]
        );
      } else {
        userResult = { rows: [{ id: user.userId, role: user.role }] };
      }
    }

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found'
      });
    }

    const userProfile = userResult.rows[0];

    // Get current appointment
    const appointmentResult = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Appointment not found'
      });
    }

    const appointment = appointmentResult.rows[0];
    const currentStatus = appointment.workflow_status;

    // Validate workflow status transition based on user role
    let validTransition = false;
    
    if (userProfile.role === 'head_nurse') {
      // Head nurses can schedule appointments that are pending nurse assignment or doctor confirmed
      if ((currentStatus === 'pending_nurse_assignment' || currentStatus === 'doctor_confirmed') &&
          workflow_status === 'nurse_scheduled') {
        validTransition = true;
      }
    } else if (userProfile.role === 'doctor') {
      // Doctors can confirm or reject appointments pending doctor confirmation
      if (currentStatus === 'pending_doctor_confirmation' &&
          (workflow_status === 'doctor_confirmed' || workflow_status === 'doctor_rejected' || workflow_status === 'doctor_completed')) {
        validTransition = true;
      }
    } else if (userProfile.role === 'super_admin') {
      // Admins can make any valid transition
      validTransition = true;
    }

    if (!validTransition) {
      return res.status(400).json({
        error: 'Invalid workflow status transition for your role',
        current_status: currentStatus,
        requested_status: workflow_status,
        user_role: userProfile.role
      });
    }

    // Update appointment workflow status
    const updateFields = ['workflow_status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const updateValues = [workflow_status];
    let paramIndex = 2;

    // Add timestamp for specific status changes
    if (workflow_status === 'doctor_confirmed') {
      updateFields.push(`doctor_confirmed_at = CURRENT_TIMESTAMP`);
    } else if (workflow_status === 'nurse_scheduled') {
      updateFields.push(`forwarded_to_nurse_at = CURRENT_TIMESTAMP`);
    }

    // Add note if provided
    if (note) {
      updateFields.push(`notes = $${paramIndex}`);
      updateValues.push(note);
      paramIndex++;
    }

    updateValues.push(id);

    const result = await pool.query(
      `UPDATE appointments
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      updateValues
    );

    const updatedAppointment = result.rows[0];

    // Log the workflow change
    try {
      await pool.query(
        `INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id, note)
         VALUES ('appointments', $1, 'workflow_update',
                 json_build_object('workflow_status', $2),
                 json_build_object('workflow_status', $3),
                 $4, $5)`,
        [id, currentStatus, workflow_status, userProfile.id, note || 'Workflow status updated']
      );
    } catch (logError) {
      console.error('Failed to log workflow change:', logError);
    }

    res.json(updatedAppointment);
  } catch (error) {
    console.error('Failed to update appointment workflow:', error);
    res.status(500).json({
      error: 'Failed to update appointment workflow',
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
    const { store_id } = req.query;
    let query = `SELECT * FROM resources
     WHERE type = 'room' AND status = 'available'`;
    let params = [];
    
    if (store_id) {
      query += ` AND store_id = $${params.length + 1}`;
      params.push(store_id);
    }
    
    query += ` ORDER BY name`;

    const result = await pool.query(query, params);

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
    console.log('🔍 [DEBUG] getAvailableNurses API被调用:', { query: req.query, store_id: req.query.store_id });
    
    const { store_id } = req.query;
    let query = `SELECT * FROM profiles
     WHERE role = 'nurse'`;
    let params = [];
    
    if (store_id) {
      query += ` AND store_id = $${params.length + 1}`;
      params.push(store_id);
    }
    
    query += ` ORDER BY full_name`;

    console.log('🔍 [DEBUG] 护士查询SQL:', query);
    console.log('🔍 [DEBUG] 护士查询参数:', params);

    const result = await pool.query(query, params);

    console.log('🔍 [DEBUG] 护士查询结果:', {
      返回数量: result.rows.length,
      数据样本: result.rows[0] || '无数据'
    });

    res.json(result.rows);
  } catch (error) {
    console.error('🔍 [DEBUG] 护士查询失败:', error);
    res.status(500).json({
      error: 'Failed to fetch available nurses',
      message: error.message
    });
  }
});

// Get doctors
app.get('/api/doctors', async (req, res) => {
  try {
    const { store_id } = req.query;
    let query = 'SELECT id, username, full_name, department, status FROM profiles WHERE role = $1';
    let params = ['doctor'];
    
    if (store_id) {
      query += ' AND store_id = $2';
      params.push(store_id);
    }
    
    query += ' ORDER BY full_name';
    
    const result = await pool.query(query, params);
    
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
    const { store_id } = req.query;
    let query = 'SELECT id, username, full_name, department FROM profiles WHERE role = $1 AND status = $2';
    let params = ['doctor', 'active'];
    
    if (store_id) {
      query += ' AND store_id = $3';
      params.push(store_id);
    }
    
    query += ' ORDER BY full_name';
    
    const result = await pool.query(query, params);
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
    const { store_id } = req.query;
    console.log('🔍 [DEBUG] 开始获取护士数据...', { store_id });
    
    let query = 'SELECT id, username, full_name, role, department, status FROM profiles WHERE role IN ($1, $2)';
    let params = ['nurse', 'head_nurse'];
    
    if (store_id) {
      query += ' AND store_id = $3';
      params.push(store_id);
    }
    
    query += ' ORDER BY role, full_name';
    
    const result = await pool.query(query, params);
    
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
    const { store_id } = req.query;
    console.log('🔍 [DEBUG] 开始获取房间数据...', { store_id });
    
    let query = 'SELECT id, name, type, status, store_id FROM resources WHERE type = $1';
    let params = ['room'];
    
    if (store_id) {
      query += ' AND store_id = $2';
      params.push(store_id);
    }
    
    query += ' ORDER BY name';
    
    const result = await pool.query(query, params);
    
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
        store_id: resource.store_id,
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

// Update room
app.put('/api/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log(`[DEBUG] Updating room ${id} with:`, JSON.stringify(updates));

    // Check if room exists
    const existingRoom = await pool.query('SELECT * FROM resources WHERE id = $1 AND type = $2', [id, 'room']);
    
    if (existingRoom.rows.length === 0) {
      return res.status(404).json({
        error: 'Room not found'
      });
    }

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    // Note: room_type is frontend concept, database type should always be 'room'
    // We don't update the type field as it should remain 'room'
    // The room_type information is derived from the name in GET operations
    
    // Handle is_available to status conversion
    if (updates.is_available !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      values.push(updates.is_available ? 'available' : 'unavailable');
      paramIndex++;
    }

    // Handle other fields
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'room_type' && key !== 'is_available') {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
    
    // Debug log to verify store_id is being processed
    if (updates.store_id !== undefined) {
      console.log(`[DEBUG] Updating room store_id to: ${updates.store_id}`);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update'
      });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE resources SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex} AND type = 'room'
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Room not found'
      });
    }

    // Transform response to match frontend expected format
    const updatedRoom = result.rows[0];
    
    // Use the room_type from the request if provided, otherwise infer from name
    let room_type = 'treatment'; // default
    if (updates.room_type !== undefined) {
      room_type = updates.room_type;
    } else {
      // Fallback to name-based inference
      if (updatedRoom.name && updatedRoom.name.includes('VIP')) {
        room_type = 'vip';
      } else if (updatedRoom.name && updatedRoom.name.includes('咨询')) {
        room_type = 'consultation';
      }
    }

    const response = {
      id: updatedRoom.id,
      name: updatedRoom.name,
      room_type: room_type,
      is_available: updatedRoom.status === 'available',
      store_id: updatedRoom.store_id,
      created_at: updatedRoom.created_at,
      updated_at: updatedRoom.updated_at
    };

    console.log(`[DEBUG] Room updated successfully:`, response);
    res.json(response);
  } catch (error) {
    console.error('Failed to update room:', error);
    res.status(500).json({
      error: 'Failed to update room',
      message: error.message
    });
  }
});

// Delete room
app.delete('/api/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if room exists
    const existingRoom = await pool.query('SELECT * FROM resources WHERE id = $1 AND type = $2', [id, 'room']);
    
    if (existingRoom.rows.length === 0) {
      return res.status(404).json({
        error: 'Room not found'
      });
    }

    // Check if room is being used by any schedules
    const scheduleCheck = await pool.query(
      'SELECT COUNT(*) as count FROM schedules WHERE room_id = $1',
      [id]
    );

    if (parseInt(scheduleCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete room',
        message: 'Room is being used by existing schedules'
      });
    }

    const result = await pool.query(
      'DELETE FROM resources WHERE id = $1 AND type = $2 RETURNING *',
      [id, 'room']
    );

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Failed to delete room:', error);
    res.status(500).json({
      error: 'Failed to delete room',
      message: error.message
    });
  }
});

// Create room
app.post('/api/rooms', async (req, res) => {
  try {
    const {
      name,
      type,
      is_available = true,
      store_id
    } = req.body;

    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({
        error: 'Missing required fields: name, type'
      });
    }

    const result = await pool.query(
      `INSERT INTO resources (name, type, status, store_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, type, is_available ? 'available' : 'unavailable', store_id]
    );

    // Transform response to match frontend expected format
    const newRoom = result.rows[0];
    let room_type = 'treatment'; // default
    if (newRoom.name.includes('VIP')) {
      room_type = 'vip';
    } else if (newRoom.name.includes('咨询')) {
      room_type = 'consultation';
    }

    const response = {
      id: newRoom.id,
      name: newRoom.name,
      room_type: room_type,
      is_available: newRoom.status === 'available',
      store_id: newRoom.store_id,
      created_at: newRoom.created_at,
      updated_at: newRoom.updated_at
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Failed to create room:', error);
    res.status(500).json({
      error: 'Failed to create room',
      message: error.message
    });
  }
});

// Create schedule
app.post('/api/schedules', async (req, res) => {
  try {
    // 获取用户信息进行权限验证
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: '请先登录以创建排班'
      });
    }

    // 获取用户详细信息
    let userResult;
    if (user && user.userId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(user.userId)) {
        userResult = await pool.query(
          'SELECT id, role, store_id FROM profiles WHERE id = $1',
          [user.userId]
        );
      } else {
        userResult = { rows: [{ id: user.userId, role: user.role, store_id: null }] };
      }
    }

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found',
        message: '用户不存在'
      });
    }

    const userProfile = userResult.rows[0];

    // 只有护士长和医生可以创建排班
    if (userProfile.role !== 'head_nurse' && userProfile.role !== 'doctor' && userProfile.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: '只有护士长、医生和管理员可以创建排班'
      });
    }

    const {
      appointment_id,
      scheduled_date,
      scheduled_time_start,
      scheduled_time_end,
      room_id,
      nurse_id,
      notes
    } = req.body;

    // 参数验证
    if (!appointment_id) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: '缺少必需参数：appointment_id'
      });
    }

    // UUID格式验证
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(appointment_id)) {
      return res.status(400).json({
        error: 'Invalid appointment_id format',
        message: '预约ID格式无效，必须是有效的UUID格式'
      });
    }

    if (room_id && !uuidRegex.test(room_id)) {
      return res.status(400).json({
        error: 'Invalid room_id format',
        message: '房间ID格式无效，必须是有效的UUID格式'
      });
    }

    if (nurse_id && !uuidRegex.test(nurse_id) && !nurse_id.startsWith('admin-') && !nurse_id.startsWith('nurse-') && !nurse_id.startsWith('doctor-')) {
      return res.status(400).json({
        error: 'Invalid nurse_id format',
        message: '护士ID格式无效，必须是有效的UUID格式或有效的用户ID'
      });
    }

    // 日期格式验证
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!scheduled_date || !dateRegex.test(scheduled_date)) {
      return res.status(400).json({
        error: 'Invalid scheduled_date format',
        message: '排班日期格式无效，请使用YYYY-MM-DD格式'
      });
    }

    // 时间格式验证
    const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
    if (!scheduled_time_start || !timeRegex.test(scheduled_time_start)) {
      return res.status(400).json({
        error: 'Invalid scheduled_time_start format',
        message: '开始时间格式无效，请使用HH:MM:SS格式'
      });
    }

    if (!scheduled_time_end || !timeRegex.test(scheduled_time_end)) {
      return res.status(400).json({
        error: 'Invalid scheduled_time_end format',
        message: '结束时间格式无效，请使用HH:MM:SS格式'
      });
    }

    // 验证预约是否存在并获取门店信息
    const appointmentResult = await pool.query('SELECT store_id FROM appointments WHERE id = $1', [appointment_id]);
    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Appointment not found',
        message: '预约不存在'
      });
    }
    
    const appointmentStoreId = appointmentResult.rows[0].store_id;
    
    // 门店权限检查：护士长和医生只能操作自己门店的预约
    if (userProfile.role !== 'super_admin' && userProfile.store_id !== appointmentStoreId) {
      return res.status(403).json({
        error: 'Access denied',
        message: '您只能操作自己门店的预约'
      });
    }
    
    // 检查房间是否属于同一门店
    if (room_id) {
      const roomResult = await pool.query('SELECT store_id FROM resources WHERE id = $1', [room_id]);
      if (roomResult.rows.length === 0 || roomResult.rows[0].store_id !== appointmentStoreId) {
        return res.status(400).json({
          error: 'Invalid room',
          message: '房间不属于预约所在门店'
        });
      }
    }
    
    // 检查护士是否属于同一门店
    if (nurse_id) {
      const nurseResult = await pool.query('SELECT store_id FROM profiles WHERE id = $1', [nurse_id]);
      if (nurseResult.rows.length === 0 || nurseResult.rows[0].store_id !== appointmentStoreId) {
        return res.status(400).json({
          error: 'Invalid nurse',
          message: '护士不属于预约所在门店'
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO schedules (appointment_id, scheduled_date, scheduled_time_start, scheduled_time_end, room_id, nurse_id, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled')
       RETURNING *`,
      [appointment_id, scheduled_date, scheduled_time_start, scheduled_time_end, room_id, nurse_id, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create schedule:', error);
    res.status(500).json({
      error: 'Failed to create schedule',
      message: '创建排班失败：' + error.message
    });
  }
});

// Update schedule
app.put('/api/schedules/:id', async (req, res) => {
  try {
    // 获取用户信息进行权限验证
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: '请先登录以更新排班'
      });
    }

    // 获取用户详细信息
    let userResult;
    if (user && user.userId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(user.userId)) {
        userResult = await pool.query(
          'SELECT id, role, store_id FROM profiles WHERE id = $1',
          [user.userId]
        );
      } else {
        userResult = { rows: [{ id: user.userId, role: user.role, store_id: null }] };
      }
    }

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found',
        message: '用户不存在'
      });
    }

    const userProfile = userResult.rows[0];
    const { id } = req.params;

    // UUID格式验证
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: 'Invalid schedule ID format',
        message: '排班ID格式无效，必须是有效的UUID格式'
      });
    }

    // 检查排班是否存在并获取相关信息
    const scheduleResult = await pool.query(
      `SELECT s.*, a.store_id as appointment_store_id, a.customer_name
       FROM schedules s
       LEFT JOIN appointments a ON s.appointment_id = a.id
       WHERE s.id = $1`,
      [id]
    );

    if (scheduleResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Schedule not found',
        message: '排班不存在'
      });
    }

    const schedule = scheduleResult.rows[0];
    const appointmentStoreId = schedule.appointment_store_id;

    // 权限检查
    // 护士只能更新自己的排班
    if (userProfile.role === 'nurse' && schedule.nurse_id !== userProfile.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: '护士只能更新自己的排班'
      });
    }

    // 护士长和医生只能操作自己门店的排班
    if ((userProfile.role === 'head_nurse' || userProfile.role === 'doctor') &&
        userProfile.store_id !== appointmentStoreId) {
      return res.status(403).json({
        error: 'Access denied',
        message: '您只能操作自己门店的排班'
      });
    }

    const updates = req.body;

    // 参数验证
    if (updates.room_id && !uuidRegex.test(updates.room_id)) {
      return res.status(400).json({
        error: 'Invalid room_id format',
        message: '房间ID格式无效，必须是有效的UUID格式'
      });
    }

    if (updates.nurse_id && !uuidRegex.test(updates.nurse_id) && !updates.nurse_id.startsWith('admin-') && !updates.nurse_id.startsWith('nurse-') && !updates.nurse_id.startsWith('doctor-')) {
      return res.status(400).json({
        error: 'Invalid nurse_id format',
        message: '护士ID格式无效，必须是有效的UUID格式或有效的用户ID'
      });
    }

    // 日期格式验证
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (updates.scheduled_date && !dateRegex.test(updates.scheduled_date)) {
      return res.status(400).json({
        error: 'Invalid scheduled_date format',
        message: '排班日期格式无效，请使用YYYY-MM-DD格式'
      });
    }

    // 时间格式验证
    const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
    if (updates.scheduled_time_start && !timeRegex.test(updates.scheduled_time_start)) {
      return res.status(400).json({
        error: 'Invalid scheduled_time_start format',
        message: '开始时间格式无效，请使用HH:MM:SS格式'
      });
    }

    if (updates.scheduled_time_end && !timeRegex.test(updates.scheduled_time_end)) {
      return res.status(400).json({
        error: 'Invalid scheduled_time_end format',
        message: '结束时间格式无效，请使用HH:MM:SS格式'
      });
    }

    // 检查房间是否属于同一门店
    if (updates.room_id) {
      const roomResult = await pool.query('SELECT store_id FROM resources WHERE id = $1', [updates.room_id]);
      if (roomResult.rows.length === 0 || roomResult.rows[0].store_id !== appointmentStoreId) {
        return res.status(400).json({
          error: 'Invalid room',
          message: '房间不属于预约所在门店'
        });
      }
    }

    // 检查护士是否属于同一门店
    if (updates.nurse_id) {
      const nurseResult = await pool.query('SELECT store_id FROM profiles WHERE id = $1', [updates.nurse_id]);
      if (nurseResult.rows.length === 0 || nurseResult.rows[0].store_id !== appointmentStoreId) {
        return res.status(400).json({
          error: 'Invalid nurse',
          message: '护士不属于预约所在门店'
        });
      }
    }

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
        error: 'No valid fields to update',
        message: '没有提供有效的更新字段'
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
        error: 'Schedule not found',
        message: '排班不存在'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update schedule:', error);
    res.status(500).json({
      error: 'Failed to update schedule',
      message: '更新排班失败：' + error.message
    });
  }
});

// Delete schedule
app.delete('/api/schedules/:id', async (req, res) => {
  try {
    // 获取用户信息进行权限验证
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: '请先登录以删除排班'
      });
    }

    // 获取用户详细信息
    let userResult;
    if (user && user.userId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(user.userId)) {
        userResult = await pool.query(
          'SELECT id, role, store_id FROM profiles WHERE id = $1',
          [user.userId]
        );
      } else {
        userResult = { rows: [{ id: user.userId, role: user.role, store_id: null }] };
      }
    }

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found',
        message: '用户不存在'
      });
    }

    const userProfile = userResult.rows[0];
    const { id } = req.params;

    // UUID格式验证
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: 'Invalid schedule ID format',
        message: '排班ID格式无效，必须是有效的UUID格式'
      });
    }

    // 检查排班是否存在并获取相关信息
    const scheduleResult = await pool.query(
      `SELECT s.*, a.store_id as appointment_store_id, a.customer_name
       FROM schedules s
       LEFT JOIN appointments a ON s.appointment_id = a.id
       WHERE s.id = $1`,
      [id]
    );

    if (scheduleResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Schedule not found',
        message: '排班不存在'
      });
    }

    const schedule = scheduleResult.rows[0];
    const appointmentStoreId = schedule.appointment_store_id;

    // 权限检查
    // 护士只能删除自己的排班
    if (userProfile.role === 'nurse' && schedule.nurse_id !== userProfile.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: '护士只能删除自己的排班'
      });
    }

    // 护士长和医生只能操作自己门店的排班
    if ((userProfile.role === 'head_nurse' || userProfile.role === 'doctor') &&
        userProfile.store_id !== appointmentStoreId) {
      return res.status(403).json({
        error: 'Access denied',
        message: '您只能操作自己门店的排班'
      });
    }

    // 只有护士长、医生和管理员可以删除排班
    if (userProfile.role !== 'head_nurse' && userProfile.role !== 'doctor' && userProfile.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: '只有护士长、医生和管理员可以删除排班'
      });
    }

    const result = await pool.query(
      'DELETE FROM schedules WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Schedule not found',
        message: '排班不存在'
      });
    }

    res.json({
      message: '排班删除成功',
      deleted_schedule: result.rows[0]
    });
  } catch (error) {
    console.error('Failed to delete schedule:', error);
    res.status(500).json({
      error: 'Failed to delete schedule',
      message: '删除排班失败：' + error.message
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
      `SELECT p.id, p.username, p.email, p.full_name, p.role, p.department, p.status,
              p.created_at, p.updated_at, p.dingtalk_userid, p.store_id,
              s.name as store_name
       FROM profiles p
       LEFT JOIN stores s ON p.store_id = s.id
       ORDER BY p.created_at DESC`
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
    const { full_name, role, department, status, store_id } = req.body;
    
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
    if (store_id !== undefined) {
      updateFields.push(`store_id = $${paramIndex++}`);
      updateValues.push(store_id);
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

// Reset user password
app.put('/api/users/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;
    
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long'
      });
    }
    
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM profiles WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Update password (in production, this should be hashed)
    const result = await pool.query(
      'UPDATE profiles SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [new_password, id]
    );
    
    console.log(`Password reset for user: ${existingUser.rows[0].username}`);
    
    res.json({
      message: 'Password reset successfully',
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        full_name: result.rows[0].full_name
      }
    });
  } catch (error) {
    console.error('Failed to reset password:', error);
    res.status(500).json({
      error: 'Failed to reset password',
      message: error.message
    });
  }
});

// Update user email
app.put('/api/users/:id/email', async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }
    
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM profiles WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // Check if email is already used by another user
    const emailCheck = await pool.query(
      'SELECT id FROM profiles WHERE email = $1 AND id != $2',
      [email, id]
    );
    
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'Email is already in use by another user'
      });
    }
    
    // Update email
    const result = await pool.query(
      'UPDATE profiles SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [email, id]
    );
    
    console.log(`Email updated for user: ${existingUser.rows[0].username} to ${email}`);
    
    res.json({
      message: 'Email updated successfully',
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        email: result.rows[0].email,
        full_name: result.rows[0].full_name
      }
    });
  } catch (error) {
    console.error('Failed to update email:', error);
    res.status(500).json({
      error: 'Failed to update email',
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

// ==================== Store Management Endpoints ====================

// Middleware to extract user info from token
async function getUserFromToken(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7);
    // For mock tokens, decode the payload
    if (token.startsWith('mock.')) {
      const parts = token.split('.');
      if (parts.length < 2) {
        console.error('Invalid mock token format');
        return null;
      }
      
      const base64Payload = parts[1];
      try {
        const decodedString = Buffer.from(base64Payload, 'base64').toString();
        const payload = JSON.parse(decodedString);
        return payload;
      } catch (decodeError) {
        console.error('Failed to decode mock token payload:', decodeError);
        console.error('Base64 payload:', base64Payload);
        // Return a default mock user for development
        return {
          userId: 'admin-id',
          email: 'admin@test.com',
          role: 'super_admin'
        };
      }
    }
    
    // In production, verify JWT token here
    return null;
  } catch (error) {
    console.error('Error extracting user from token:', error);
    return null;
  }
}

// Middleware to check store access permissions
async function checkStoreAccess(req, res, next) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    // Get user details from database
    let userResult;
    if (user && user.userId) {
      // Check if userId is a valid UUID format, if not, skip database query
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(user.userId)) {
        userResult = await pool.query(
          'SELECT id, role, store_id FROM profiles WHERE id = $1',
          [user.userId]
        );
      } else {
        // For mock users with non-UUID IDs, create a mock user result
        userResult = { rows: [{
          id: user.userId,
          role: user.role,
          store_id: null
        }] };
      }
    } else {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found'
      });
    }
    
    const userProfile = userResult.rows[0];
    req.user = userProfile;
    
    // Super admin and sales can access all stores
    if (userProfile.role === 'super_admin' || userProfile.role === 'sales') {
      return next();
    }
    
    // For other roles, check if they have access to the requested store
    const storeId = req.params.id || req.query.store_id || req.body.store_id;
    
    if (storeId && userProfile.store_id !== storeId) {
      return res.status(403).json({
        error: 'Access denied. You can only access your own store data.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Store access check error:', error);
    res.status(500).json({
      error: 'Failed to check store access',
      message: error.message
    });
  }
}

// Get all stores
app.get('/api/stores', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM stores';
    let countQuery = 'SELECT COUNT(*) as total FROM stores';
    const params = [];
    const conditions = [];
    
    // Build WHERE conditions
    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    
    if (search) {
      conditions.push(`name ILIKE $${params.length + 1}`);
      params.push(`%${search}%`);
    }
    
    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }
    
    // Add pagination
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    // Execute queries
    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2))
    ]);
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      stores: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Failed to fetch stores:', error);
    res.status(500).json({
      error: 'Failed to fetch stores',
      message: error.message
    });
  }
});

// Get store by ID
app.get('/api/stores/:id', checkStoreAccess, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM stores WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Store not found'
      });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch store:', error);
    res.status(500).json({
      error: 'Failed to fetch store',
      message: error.message
    });
  }
});

// Create new store
app.post('/api/stores', async (req, res) => {
  try {
    const {
      name,
      address,
      phone,
      contact_person,
      status = 'active',
      description,
      business_hours
    } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({
        error: 'Store name is required'
      });
    }
    
    // Get user info for created_by field
    const user = await getUserFromToken(req);
    let createdBy = null;
    
    if (user && user.userId) {
      // Check if userId is a valid UUID format, if not, set to null
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      createdBy = uuidRegex.test(user.userId) ? user.userId : null;
    }
    
    const result = await pool.query(
      `INSERT INTO stores (name, address, phone, contact_person, status, description, business_hours, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, address, phone, contact_person, status, description, JSON.stringify(business_hours), createdBy]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create store:', error);
    res.status(500).json({
      error: 'Failed to create store',
      message: error.message
    });
  }
});

// Update store
app.put('/api/stores/:id', checkStoreAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Check if store exists
    const existingStore = await pool.query('SELECT * FROM stores WHERE id = $1', [id]);
    
    if (existingStore.rows.length === 0) {
      return res.status(404).json({
        error: 'Store not found'
      });
    }
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        if (key === 'business_hours') {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update'
      });
    }
    
    // Get user info for updated_by field
    const user = await getUserFromToken(req);
    if (user && user.userId) {
      // Check if userId is a valid UUID format, if not, set to null
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const updatedBy = uuidRegex.test(user.userId) ? user.userId : null;
      updateFields.push(`updated_by = $${paramIndex}`);
      values.push(updatedBy);
      paramIndex++;
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const result = await pool.query(
      `UPDATE stores SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update store:', error);
    res.status(500).json({
      error: 'Failed to update store',
      message: error.message
    });
  }
});

// Delete store
app.delete('/api/stores/:id', checkStoreAccess, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if store exists
    const existingStore = await pool.query('SELECT * FROM stores WHERE id = $1', [id]);
    
    if (existingStore.rows.length === 0) {
      return res.status(404).json({
        error: 'Store not found'
      });
    }
    
    // Check for dependencies
    const [profilesCheck, resourcesCheck, appointmentsCheck] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM profiles WHERE store_id = $1', [id]),
      pool.query('SELECT COUNT(*) as count FROM resources WHERE store_id = $1', [id]),
      pool.query('SELECT COUNT(*) as count FROM appointments WHERE store_id = $1', [id])
    ]);
    
    const hasDependencies =
      parseInt(profilesCheck.rows[0].count) > 0 ||
      parseInt(resourcesCheck.rows[0].count) > 0 ||
      parseInt(appointmentsCheck.rows[0].count) > 0;
    
    if (hasDependencies) {
      return res.status(400).json({
        error: 'Cannot delete store',
        message: 'Store has associated users, resources, or appointments. Please reassign or delete them first.',
        dependencies: {
          users: parseInt(profilesCheck.rows[0].count),
          resources: parseInt(resourcesCheck.rows[0].count),
          appointments: parseInt(appointmentsCheck.rows[0].count)
        }
      });
    }
    
    // Delete store
    await pool.query('DELETE FROM stores WHERE id = $1', [id]);
    
    res.json({ message: 'Store deleted successfully' });
  } catch (error) {
    console.error('Failed to delete store:', error);
    res.status(500).json({
      error: 'Failed to delete store',
      message: error.message
    });
  }
});

// Get store resources
app.get('/api/stores/:id/resources', checkStoreAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    
    // Check if store exists
    const storeCheck = await pool.query('SELECT * FROM stores WHERE id = $1', [id]);
    
    if (storeCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Store not found'
      });
    }
    
    // Get resources using the database function
    const result = await pool.query(
      'SELECT * FROM get_store_resources($1, $2)',
      [id, type || null]
    );
    
    // Group resources by type
    const resources = {
      nurses: [],
      doctors: [],
      rooms: [],
      equipment: []
    };
    
    result.rows.forEach(resource => {
      switch (resource.type) {
        case 'nurse':
          resources.nurses.push(resource);
          break;
        case 'doctor':
          resources.doctors.push(resource);
          break;
        case 'room':
          resources.rooms.push(resource);
          break;
        case 'equipment':
          resources.equipment.push(resource);
          break;
        default:
          // Handle other resource types if needed
          if (!resources[resource.type]) {
            resources[resource.type] = [];
          }
          resources[resource.type].push(resource);
      }
    });
    
    res.json({
      store_id: id,
      resources
    });
  } catch (error) {
    console.error('Failed to fetch store resources:', error);
    res.status(500).json({
      error: 'Failed to fetch store resources',
      message: error.message
    });
  }
});

// Get store staff
app.get('/api/stores/:id/staff', checkStoreAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.query;
    
    // Check if store exists
    const storeCheck = await pool.query('SELECT * FROM stores WHERE id = $1', [id]);
    
    if (storeCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Store not found'
      });
    }
    
    // Get staff using the database function
    const result = await pool.query(
      'SELECT * FROM get_store_staff($1, $2)',
      [id, role || null]
    );
    
    res.json({
      store_id: id,
      staff: result.rows
    });
  } catch (error) {
    console.error('Failed to fetch store staff:', error);
    res.status(500).json({
      error: 'Failed to fetch store staff',
      message: error.message
    });
  }
});

// Initialize WebSocket server and real-time service
let realtimeService = null;

async function initializeRealtimeServices() {
  try {
    // Import and initialize WebSocket server
    const { WebSocketServer } = require('./websocket-server.js');
    const { RealtimeService } = require('./realtime-service.js');
    
    // Create WebSocket server
    const wss = new WebSocketServer({ server });
    
    // Initialize real-time service
    realtimeService = new RealtimeService(pool);
    
    // Initialize notification tables
    await realtimeService.initializeDatabase();
    
    // Set up real-time service with WebSocket server
    realtimeService.setWebSocketServer(wss);
    
    console.log('✅ WebSocket server and real-time service initialized');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize real-time services:', error);
    return false;
  }
}

// Make realtime service available to routes
app.use((req, res, next) => {
  req.realtimeService = realtimeService;
  next();
});

// Start server
server.listen(PORT, async () => {
  console.log('🚀 API Server running on http://localhost:' + PORT);
  console.log('📊 Health check: http://localhost:' + PORT + '/api/health');
  console.log('🔌 WebSocket server: ws://localhost:' + PORT);

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

  // Initialize real-time services
  const realtimeInitialized = await initializeRealtimeServices();
  if (realtimeInitialized) {
    console.log('✅ Real-time services ready');
  } else {
    console.error('❌ Real-time services initialization failed');
  }
});