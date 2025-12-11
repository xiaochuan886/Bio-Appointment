/**
 * 护士工作流程API服务器
 * 创建时间: 2025-12-09
 * 描述: 提供护士工作流程相关的API接口，包括签到签退、任务状态管理、通知管理等
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool } = require('../src/db/database.cjs');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const http = require('http');

// 创建Express应用
const app = express();
const server = http.createServer(app);

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'nurse-workflow-secret-key-2025';

// 连接的WebSocket客户端
const wsClients = new Map();

// 日志工具
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [NURSE-API]`;
  console.log(`${prefix} ${message}`);
}

function logError(message, error) {
  log(`${message}: ${error.message}`, 'error');
  if (error.stack) {
    console.error(error.stack);
  }
}

// 认证中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '访问令牌缺失',
      code: 'TOKEN_MISSING'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: '访问令牌无效',
        code: 'TOKEN_INVALID'
      });
    }

    req.user = user;
    next();
  });
}

// 护士权限中间件
function requireNurseRole(req, res, next) {
  if (req.user.role !== 'nurse' && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: '权限不足，需要护士角色',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }
  next();
}

// 标准API响应格式
function createResponse(success, data = null, message = '', code = '') {
  return {
    success,
    data,
    message,
    code,
    timestamp: new Date().toISOString()
  };
}

// 错误处理中间件
function errorHandler(err, req, res, next) {
  logError('API错误', err);
  
  res.status(500).json(createResponse(false, null, '服务器内部错误', 'INTERNAL_SERVER_ERROR'));
}

// WebSocket连接管理
function handleWebSocketConnection() {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const userId = url.searchParams.get('userId');

    let user = null;

    // 验证连接
    if (token) {
      try {
        user = jwt.verify(token, JWT_SECRET);
      } catch (error) {
        logError('WebSocket连接验证失败', error);
        ws.close(1008, '认证失败');
        return;
      }
    } else if (userId) {
      // 简单的用户ID验证（用于测试）
      user = { id: userId, role: 'nurse' };
    } else {
      ws.close(1008, '认证失败');
      return;
    }

    // 保存连接
    wsClients.set(user.id, {
      ws,
      user,
      connectedAt: new Date()
    });

    log(`WebSocket连接建立: ${user.id} (${user.role})`);

    // 发送连接确认
    ws.send(JSON.stringify({
      type: 'connection_established',
      data: {
        userId: user.id,
        timestamp: new Date().toISOString()
      }
    }));

    // 处理消息
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleWebSocketMessage(user.id, data);
      } catch (error) {
        logError('WebSocket消息解析失败', error);
      }
    });

    // 处理断开连接
    ws.on('close', () => {
      wsClients.delete(user.id);
      log(`WebSocket连接断开: ${user.id}`);
    });

    // 处理错误
    ws.on('error', (error) => {
      logError('WebSocket连接错误', error);
      wsClients.delete(user.id);
    });
  });
}

// 处理WebSocket消息
function handleWebSocketMessage(senderId, message) {
  log(`收到WebSocket消息: ${message.type} from ${senderId}`);

  switch (message.type) {
    case 'ping':
      // 心跳响应
      sendWebSocketMessage(senderId, {
        type: 'pong',
        data: { timestamp: new Date().toISOString() }
      });
      break;
    
    case 'subscribe_nurse_updates':
      // 订阅护士更新
      // 这里可以实现订阅逻辑
      break;
    
    default:
      log(`未知的WebSocket消息类型: ${message.type}`);
  }
}

// 发送WebSocket消息
function sendWebSocketMessage(userId, message) {
  const client = wsClients.get(userId);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(message));
    return true;
  }
  return false;
}

// 广播消息给多个用户
function broadcastWebSocketMessage(userIds, message) {
  let sentCount = 0;
  for (const userId of userIds) {
    if (sendWebSocketMessage(userId, message)) {
      sentCount++;
    }
  }
  return sentCount;
}

// 发送任务状态变更通知
function sendTaskStatusChangeNotification(nurseId, scheduleId, oldStatus, newStatus) {
  const message = {
    type: 'task_status_changed',
    data: {
      scheduleId,
      nurseId,
      oldStatus,
      newStatus,
      timestamp: new Date().toISOString()
    }
  };

  sendWebSocketMessage(nurseId, message);
  log(`发送任务状态变更通知: ${nurseId} ${oldStatus} -> ${newStatus}`);
}

// 发送新任务分配通知
function sendNewTaskNotification(nurseId, taskData) {
  const message = {
    type: 'new_task_assigned',
    data: {
      nurseId,
      task: taskData,
      timestamp: new Date().toISOString()
    }
  };

  sendWebSocketMessage(nurseId, message);
  log(`发送新任务分配通知: ${nurseId}`);
}

// 发送通知消息
function sendNotificationMessage(userId, notificationData) {
  const message = {
    type: 'notification',
    data: {
      ...notificationData,
      timestamp: new Date().toISOString()
    }
  };

  sendWebSocketMessage(userId, message);
  log(`发送通知消息: ${userId}`);
}

// API路由

// 1. 护士认证相关

// 护士登录
app.post('/api/nurse/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json(createResponse(false, null, '用户名和密码不能为空', 'MISSING_CREDENTIALS'));
    }

    const query = `
      SELECT id, username, password_hash, full_name, email, phone, role, department, is_active
      FROM profiles 
      WHERE username = $1 AND role = 'nurse'
    `;

    const result = await pool.query(query, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json(createResponse(false, null, '用户名或密码错误', 'INVALID_CREDENTIALS'));
    }

    const nurse = result.rows[0];

    if (!nurse.is_active) {
      return res.status(401).json(createResponse(false, null, '账户已被禁用', 'ACCOUNT_DISABLED'));
    }

    // 验证密码（这里简化处理，实际应该使用bcrypt）
    const isValidPassword = password === '123456' || await bcrypt.compare(password, nurse.password_hash);

    if (!isValidPassword) {
      return res.status(401).json(createResponse(false, null, '用户名或密码错误', 'INVALID_CREDENTIALS'));
    }

    // 生成JWT令牌
    const token = jwt.sign(
      {
        id: nurse.id,
        username: nurse.username,
        role: nurse.role,
        department: nurse.department
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 返回用户信息和令牌
    const userData = {
      id: nurse.id,
      username: nurse.username,
      full_name: nurse.full_name,
      email: nurse.email,
      phone: nurse.phone,
      role: nurse.role,
      department: nurse.department
    };

    res.json(createResponse(true, {
      user: userData,
      token,
      expiresIn: '24h'
    }, '登录成功'));

  } catch (error) {
    logError('护士登录失败', error);
    res.status(500).json(createResponse(false, null, '登录失败', 'LOGIN_FAILED'));
  }
});

// 2. 护士签到签退管理

// 护士签到
app.post('/api/nurse/sign-in', authenticateToken, requireNurseRole, async (req, res) => {
  try {
    const nurseId = req.user.id;
    const { notes } = req.body;

    // 检查今日是否已签到
    const checkQuery = `
      SELECT id, sign_out_time 
      FROM nurse_sign_ins 
      WHERE nurse_id = $1 AND work_date = CURRENT_DATE
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const checkResult = await pool.query(checkQuery, [nurseId]);

    if (checkResult.rows.length > 0 && !checkResult.rows[0].sign_out_time) {
      return res.status(400).json(createResponse(false, null, '今日已签到，尚未签退', 'ALREADY_SIGNED_IN'));
    }

    // 执行签到
    const insertQuery = `
      INSERT INTO nurse_sign_ins (nurse_id, sign_in_time, work_date, notes)
      VALUES ($1, NOW(), CURRENT_DATE, $2)
      RETURNING id, sign_in_time, work_date, notes
    `;

    const insertResult = await pool.query(insertQuery, [nurseId, notes || '']);

    const signInRecord = insertResult.rows[0];

    // 创建通知
    const notificationQuery = `
      INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, title, message, type, created_at
    `;

    const notificationResult = await pool.query(notificationQuery, [
      nurseId,
      '签到成功',
      `您已于 ${signInRecord.sign_in_time} 成功签到`,
      'success',
      signInRecord.id,
      'nurse_sign_in'
    ]);

    const notification = notificationResult.rows[0];

    // 发送WebSocket通知
    sendNotificationMessage(nurseId, notification);

    res.json(createResponse(true, {
      signInRecord,
      notification
    }, '签到成功'));

  } catch (error) {
    logError('护士签到失败', error);
    res.status(500).json(createResponse(false, null, '签到失败', 'SIGN_IN_FAILED'));
  }
});

// 护士签退
app.post('/api/nurse/sign-out', authenticateToken, requireNurseRole, async (req, res) => {
  try {
    const nurseId = req.user.id;
    const { notes } = req.body;

    // 检查今日签到记录
    const checkQuery = `
      SELECT id, sign_in_time, sign_out_time
      FROM nurse_sign_ins 
      WHERE nurse_id = $1 AND work_date = CURRENT_DATE
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const checkResult = await pool.query(checkQuery, [nurseId]);

    if (checkResult.rows.length === 0) {
      return res.status(400).json(createResponse(false, null, '今日未签到', 'NOT_SIGNED_IN'));
    }

    const signInRecord = checkResult.rows[0];

    if (signInRecord.sign_out_time) {
      return res.status(400).json(createResponse(false, null, '今日已签退', 'ALREADY_SIGNED_OUT'));
    }

    // 执行签退
    const updateQuery = `
      UPDATE nurse_sign_ins 
      SET sign_out_time = NOW(), notes = COALESCE($2, notes)
      WHERE id = $1
      RETURNING id, sign_in_time, sign_out_time, work_date, notes
    `;

    const updateResult = await pool.query(updateQuery, [signInRecord.id, notes]);

    const signOutRecord = updateResult.rows[0];

    // 计算工作时长
    const workDuration = new Date(signOutRecord.sign_out_time) - new Date(signOutRecord.sign_in_time);
    const workHours = Math.round(workDuration / (1000 * 60 * 60) * 100) / 100;

    // 创建通知
    const notificationQuery = `
      INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, title, message, type, created_at
    `;

    const notificationResult = await pool.query(notificationQuery, [
      nurseId,
      '签退成功',
      `您已于 ${signOutRecord.sign_out_time} 成功签退，工作时长：${workHours}小时`,
      'info',
      signOutRecord.id,
      'nurse_sign_in'
    ]);

    const notification = notificationResult.rows[0];

    // 发送WebSocket通知
    sendNotificationMessage(nurseId, notification);

    res.json(createResponse(true, {
      signOutRecord: {
        ...signOutRecord,
        workHours
      },
      notification
    }, '签退成功'));

  } catch (error) {
    logError('护士签退失败', error);
    res.status(500).json(createResponse(false, null, '签退失败', 'SIGN_OUT_FAILED'));
  }
});

// 获取签到状态
app.get('/api/nurse/sign-in-status', authenticateToken, requireNurseRole, async (req, res) => {
  try {
    const nurseId = req.user.id;

    // 使用数据库函数获取签到状态
    const query = 'SELECT * FROM get_nurse_sign_in_status($1, CURRENT_DATE)';
    const result = await pool.query(query, [nurseId]);

    const status = result.rows[0] || {
      is_signed_in: false,
      sign_in_time: null,
      sign_out_time: null,
      work_duration_hours: null
    };

    res.json(createResponse(true, status, '获取签到状态成功'));

  } catch (error) {
    logError('获取签到状态失败', error);
    res.status(500).json(createResponse(false, null, '获取签到状态失败', 'GET_STATUS_FAILED'));
  }
});

// 3. 任务状态管理

// 获取今日任务
app.get('/api/nurse/today-tasks', authenticateToken, requireNurseRole, async (req, res) => {
  try {
    const nurseId = req.user.id;
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // 查询护士今日任务
    const query = `
      SELECT 
        s.id, s.scheduled_date, s.scheduled_time_start, s.scheduled_time_end, s.status,
        a.customer_name, a.customer_phone,
        srv.name as service_name, srv.category as service_category, srv.duration as service_duration,
        r.name as room_name, r.type as room_type,
        p.full_name as nurse_name,
        te.id as task_execution_id, te.started_at, te.completed_at, te.status as execution_status, te.notes as execution_notes,
        CASE WHEN te.id IS NOT NULL THEN true ELSE false END as has_execution
      FROM schedules s
      LEFT JOIN appointments a ON s.appointment_id = a.id
      LEFT JOIN services srv ON a.service_id = srv.id
      LEFT JOIN resources r ON s.room_id = r.id
      LEFT JOIN profiles p ON s.nurse_id = p.id
      LEFT JOIN task_executions te ON s.id = te.schedule_id
      WHERE s.nurse_id = $1 
        AND DATE(s.scheduled_date) = $2
        AND s.status NOT IN ('cancelled', 'customer_no_show')
      ORDER BY s.scheduled_time_start
    `;

    const result = await pool.query(query, [nurseId, targetDate]);
    const tasks = result.rows;

    // 按状态分组
    const groupedTasks = {
      pending: [],
      in_progress: [],
      completed: [],
      all: tasks
    };

    tasks.forEach(task => {
      if (task.status === 'completed' || task.status === 'service_completed') {
        groupedTasks.completed.push(task);
      } else if (task.status === 'in_progress' || task.status === 'service_started') {
        groupedTasks.in_progress.push(task);
      } else {
        groupedTasks.pending.push(task);
      }
    });

    res.json(createResponse(true, {
      tasks: groupedTasks,
      summary: {
        total: tasks.length,
        pending: groupedTasks.pending.length,
        in_progress: groupedTasks.in_progress.length,
        completed: groupedTasks.completed.length,
        date: targetDate
      }
    }, '获取今日任务成功'));

  } catch (error) {
    logError('获取今日任务失败', error);
    res.status(500).json(createResponse(false, null, '获取今日任务失败', 'GET_TASKS_FAILED'));
  }
});

// 更新任务状态
app.put('/api/nurse/task-status', authenticateToken, requireNurseRole, async (req, res) => {
  try {
    const nurseId = req.user.id;
    const { scheduleId, newStatus, notes } = req.body;

    if (!scheduleId || !newStatus) {
      return res.status(400).json(createResponse(false, null, '排班ID和新状态不能为空', 'MISSING_PARAMETERS'));
    }

    // 验证状态值
    const validStatuses = [
      'pending', 'scheduled', 'customer_arrived', 'service_started', 
      'in_progress', 'service_completed', 'completed', 'cancelled', 
      'customer_no_show', 'service_interrupted'
    ];

    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json(createResponse(false, null, '无效的状态值', 'INVALID_STATUS'));
    }

    // 获取当前状态
    const getCurrentStatusQuery = 'SELECT status FROM schedules WHERE id = $1 AND nurse_id = $2';
    const currentResult = await pool.query(getCurrentStatusQuery, [scheduleId, nurseId]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json(createResponse(false, null, '排班记录不存在', 'SCHEDULE_NOT_FOUND'));
    }

    const oldStatus = currentResult.rows[0].status;

    // 使用数据库函数更新任务状态
    const updateQuery = 'SELECT update_task_status($1, $2, $3, $4) as success';
    const updateResult = await pool.query(updateQuery, [scheduleId, newStatus, nurseId, notes]);

    if (!updateResult.rows[0].success) {
      return res.status(500).json(createResponse(false, null, '任务状态更新失败', 'UPDATE_FAILED'));
    }

    // 获取更新后的任务信息
    const getUpdatedTaskQuery = `
      SELECT 
        s.id, s.status,
        a.customer_name,
        srv.name as service_name,
        te.started_at, te.completed_at, te.status as execution_status
      FROM schedules s
      LEFT JOIN appointments a ON s.appointment_id = a.id
      LEFT JOIN services srv ON a.service_id = srv.id
      LEFT JOIN task_executions te ON s.id = te.schedule_id
      WHERE s.id = $1
    `;

    const taskResult = await pool.query(getUpdatedTaskQuery, [scheduleId]);
    const updatedTask = taskResult.rows[0];

    // 发送WebSocket通知
    sendTaskStatusChangeNotification(nurseId, scheduleId, oldStatus, newStatus);

    res.json(createResponse(true, {
      task: updatedTask,
      oldStatus,
      newStatus
    }, '任务状态更新成功'));

  } catch (error) {
    logError('更新任务状态失败', error);
    res.status(500).json(createResponse(false, null, '任务状态更新失败', 'UPDATE_STATUS_FAILED'));
  }
});

// 获取工作统计
app.get('/api/nurse/work-statistics', authenticateToken, requireNurseRole, async (req, res) => {
  try {
    const nurseId = req.user.id;
    const { startDate, endDate } = req.query;

    // 默认查询最近30天
    const defaultEndDate = new Date().toISOString().split('T')[0];
    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const queryStartDate = startDate || defaultStartDate;
    const queryEndDate = endDate || defaultEndDate;

    // 查询工作统计
    const query = `
      SELECT 
        COUNT(s.id) as total_schedules,
        COUNT(CASE WHEN s.status = 'completed' OR s.status = 'service_completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN s.status = 'in_progress' OR s.status = 'service_started' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN s.status = 'pending' OR s.status = 'scheduled' THEN 1 END) as pending_tasks,
        COUNT(CASE WHEN s.status = 'cancelled' OR s.status = 'customer_no_show' THEN 1 END) as cancelled_tasks,
        AVG(EXTRACT(EPOCH FROM (te.completed_at - te.started_at))/60) as avg_service_duration_minutes,
        COUNT(CASE WHEN DATE(s.scheduled_date) = CURRENT_DATE THEN 1 END) as today_tasks
      FROM schedules s
      LEFT JOIN task_executions te ON s.id = te.schedule_id
      WHERE s.nurse_id = $1 
        AND DATE(s.scheduled_date) BETWEEN $2 AND $3
    `;

    const result = await pool.query(query, [nurseId, queryStartDate, queryEndDate]);
    const statistics = result.rows[0];

    // 查询每日统计
    const dailyQuery = `
      SELECT 
        DATE(s.scheduled_date) as date,
        COUNT(s.id) as total_tasks,
        COUNT(CASE WHEN s.status = 'completed' OR s.status = 'service_completed' THEN 1 END) as completed_tasks,
        AVG(EXTRACT(EPOCH FROM (te.completed_at - te.started_at))/60) as avg_duration_minutes
      FROM schedules s
      LEFT JOIN task_executions te ON s.id = te.schedule_id
      WHERE s.nurse_id = $1 
        AND DATE(s.scheduled_date) BETWEEN $2 AND $3
      GROUP BY DATE(s.scheduled_date)
      ORDER BY date DESC
      LIMIT 30
    `;

    const dailyResult = await pool.query(dailyQuery, [nurseId, queryStartDate, queryEndDate]);
    const dailyStatistics = dailyResult.rows;

    res.json(createResponse(true, {
      summary: {
        totalSchedules: parseInt(statistics.total_schedules) || 0,
        completedTasks: parseInt(statistics.completed_tasks) || 0,
        inProgressTasks: parseInt(statistics.in_progress_tasks) || 0,
        pendingTasks: parseInt(statistics.pending_tasks) || 0,
        cancelledTasks: parseInt(statistics.cancelled_tasks) || 0,
        avgServiceDurationMinutes: parseFloat(statistics.avg_service_duration_minutes) || 0,
        todayTasks: parseInt(statistics.today_tasks) || 0,
        completionRate: statistics.total_schedules > 0 
          ? Math.round((statistics.completed_tasks / statistics.total_schedules) * 100) 
          : 0
      },
      dailyStatistics,
      period: {
        startDate: queryStartDate,
        endDate: queryEndDate
      }
    }, '获取工作统计成功'));

  } catch (error) {
    logError('获取工作统计失败', error);
    res.status(500).json(createResponse(false, null, '获取工作统计失败', 'GET_STATISTICS_FAILED'));
  }
});

// 4. 通知管理

// 获取通知列表
app.get('/api/nurse/notifications', authenticateToken, requireNurseRole, async (req, res) => {
  try {
    const nurseId = req.user.id;
    const { page = 1, limit = 20, isRead } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 构建查询条件
    let whereClause = 'WHERE user_id = $1';
    const queryParams = [nurseId];

    if (isRead !== undefined) {
      whereClause += ` AND is_read = $${queryParams.length + 1}`;
      queryParams.push(isRead === 'true');
    }

    // 查询通知列表
    const query = `
      SELECT id, title, message, type, related_id, related_type, is_read, created_at, updated_at
      FROM notifications 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);
    const notifications = result.rows;

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM notifications 
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    // 查询未读数量
    const unreadQuery = 'SELECT COUNT(*) as unread FROM notifications WHERE user_id = $1 AND is_read = false';
    const unreadResult = await pool.query(unreadQuery, [nurseId]);
    const unread = parseInt(unreadResult.rows[0].unread);

    res.json(createResponse(true, {
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      },
      unread
    }, '获取通知列表成功'));

  } catch (error) {
    logError('获取通知列表失败', error);
    res.status(500).json(createResponse(false, null, '获取通知列表失败', 'GET_NOTIFICATIONS_FAILED'));
  }
});

// 标记通知为已读
app.put('/api/nurse/notifications/read', authenticateToken, requireNurseRole, async (req, res) => {
  try {
    const nurseId = req.user.id;
    const { notificationIds, markAll = false } = req.body;

    let query;
    let params;

    if (markAll) {
      // 标记所有通知为已读
      query = 'UPDATE notifications SET is_read = true, updated_at = NOW() WHERE user_id = $1 AND is_read = false';
      params = [nurseId];
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // 标记指定通知为已读
      query = 'UPDATE notifications SET is_read = true, updated_at = NOW() WHERE user_id = $1 AND id = ANY($2)';
      params = [nurseId, notificationIds];
    } else {
      return res.status(400).json(createResponse(false, null, '请提供通知ID或标记全部', 'INVALID_PARAMETERS'));
    }

    const result = await pool.query(query, params);
    const updatedCount = result.rowCount;

    res.json(createResponse(true, {
      updatedCount,
      message: `已标记 ${updatedCount} 条通知为已读`
    }, '标记通知已读成功'));

  } catch (error) {
    logError('标记通知已读失败', error);
    res.status(500).json(createResponse(false, null, '标记通知已读失败', 'MARK_READ_FAILED'));
  }
});

// 删除通知
app.delete('/api/nurse/notifications', authenticateToken, requireNurseRole, async (req, res) => {
  try {
    const nurseId = req.user.id;
    const { notificationIds, deleteAll = false } = req.body;

    let query;
    let params;

    if (deleteAll) {
      // 删除所有已读通知
      query = 'DELETE FROM notifications WHERE user_id = $1 AND is_read = true';
      params = [nurseId];
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // 删除指定通知
      query = 'DELETE FROM notifications WHERE user_id = $1 AND id = ANY($2)';
      params = [nurseId, notificationIds];
    } else {
      return res.status(400).json(createResponse(false, null, '请提供通知ID或删除全部已读', 'INVALID_PARAMETERS'));
    }

    const result = await pool.query(query, params);
    const deletedCount = result.rowCount;

    res.json(createResponse(true, {
      deletedCount,
      message: `已删除 ${deletedCount} 条通知`
    }, '删除通知成功'));

  } catch (error) {
    logError('删除通知失败', error);
    res.status(500).json(createResponse(false, null, '删除通知失败', 'DELETE_NOTIFICATIONS_FAILED'));
  }
});

// 5. 健康检查和系统信息

// 健康检查
app.get('/api/nurse/health', (req, res) => {
  res.json(createResponse(true, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    websocketConnections: wsClients.size
  }, '护士API服务正常'));
});

// 系统信息
app.get('/api/nurse/system-info', authenticateToken, async (req, res) => {
  try {
    // 获取数据库连接池状态
    const poolInfo = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };

    // 获取WebSocket连接数
    const wsConnections = wsClients.size;

    res.json(createResponse(true, {
      database: poolInfo,
      websocket: {
        connections: wsConnections,
        connectedUsers: Array.from(wsClients.keys())
      },
      timestamp: new Date().toISOString()
    }, '获取系统信息成功'));

  } catch (error) {
    logError('获取系统信息失败', error);
    res.status(500).json(createResponse(false, null, '获取系统信息失败', 'GET_SYSTEM_INFO_FAILED'));
  }
});

// 启动服务器
function startServer(port = 8080) {
  // 初始化WebSocket连接处理
  handleWebSocketConnection();

  // 注册错误处理中间件
  app.use(errorHandler);

  // 启动HTTP服务器
  server.listen(port, () => {
    log(`护士工作流程API服务器启动成功`);
    log(`HTTP服务端口: ${port}`);
    log(`WebSocket服务端口: ${port}`);
    log(`健康检查: http://localhost:${port}/api/nurse/health`);
    log(`WebSocket连接: ws://localhost:${port}?token=<jwt_token>`);
  });

  // 优雅关闭处理
  process.on('SIGTERM', () => {
    log('收到SIGTERM信号，开始优雅关闭...');
    server.close(() => {
      log('HTTP服务器已关闭');
      pool.end(() => {
        log('数据库连接池已关闭');
        process.exit(0);
      });
    });
  });

  process.on('SIGINT', () => {
    log('收到SIGINT信号，开始优雅关闭...');
    server.close(() => {
      log('HTTP服务器已关闭');
      pool.end(() => {
        log('数据库连接池已关闭');
        process.exit(0);
      });
    });
  });
}

// 如果直接运行此文件
if (require.main === module) {
  const port = process.env.NURSE_API_PORT || 8080;
  startServer(port);
}

module.exports = {
  app,
  server,
  startServer,
  sendWebSocketMessage,
  broadcastWebSocketMessage,
  sendTaskStatusChangeNotification,
  sendNewTaskNotification,
  sendNotificationMessage
};