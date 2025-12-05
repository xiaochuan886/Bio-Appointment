"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const connection_1 = require("../src/db/connection");
const auth_1 = require("../src/services/auth");
const api_1 = require("../src/services/api");
const app = (0, express_1.default)();
const PORT = 3001;
// Middleware
app.use((0, cors_1.default)({
    origin: 'http://127.0.0.1:5173',
    credentials: true,
}));
app.use(express_1.default.json());
// Initialize database
let dbInitialized = false;
async function ensureDatabase() {
    if (!dbInitialized) {
        await (0, connection_1.initializeConnections)();
        dbInitialized = true;
    }
}
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('API Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});
// Routes
// Health check
app.get('/api/health', async (req, res) => {
    try {
        const healthStatus = await (await Promise.resolve().then(() => __importStar(require('../src/db/connection')))).healthCheck();
        res.json({
            status: 'healthy',
            database: healthStatus,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Authentication routes
app.post('/api/auth/login', async (req, res) => {
    try {
        await ensureDatabase();
        const credentials = req.body;
        const result = await auth_1.AuthService.login(credentials);
        res.json(result);
    }
    catch (error) {
        res.status(401).json({
            error: 'Authentication failed',
            message: error instanceof Error ? error.message : 'Invalid credentials'
        });
    }
});
app.post('/api/auth/register', async (req, res) => {
    try {
        await ensureDatabase();
        const credentials = req.body;
        const result = await auth_1.AuthService.register(credentials);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({
            error: 'Registration failed',
            message: error instanceof Error ? error.message : 'Registration error'
        });
    }
});
app.post('/api/auth/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({
                error: 'Refresh token required'
            });
        }
        const tokens = await auth_1.AuthService.refreshToken(refreshToken);
        res.json(tokens);
    }
    catch (error) {
        res.status(401).json({
            error: 'Token refresh failed',
            message: error instanceof Error ? error.message : 'Invalid refresh token'
        });
    }
});
app.post('/api/auth/logout', async (req, res) => {
    try {
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({
            error: 'Logout failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Protected routes middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Access token required'
        });
    }
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    try {
        const decoded = auth_1.AuthService.verifyToken(token);
        const user = await auth_1.AuthService.getUserById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                error: 'Invalid token - user not found'
            });
        }
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(401).json({
            error: 'Invalid token',
            message: error instanceof Error ? error.message : 'Token verification failed'
        });
    }
};
// API routes (protected)
app.use('/api', authenticateToken);
// Profiles
app.get('/api/profiles', async (req, res) => {
    try {
        await ensureDatabase();
        const profiles = await api_1.ApiService.getProfiles();
        res.json(profiles);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch profiles',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/profiles/:id', async (req, res) => {
    try {
        await ensureDatabase();
        const { id } = req.params;
        const profile = await api_1.ApiService.getProfile(id);
        if (!profile) {
            return res.status(404).json({
                error: 'Profile not found'
            });
        }
        res.json(profile);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch profile',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Services
app.get('/api/services', async (req, res) => {
    try {
        await ensureDatabase();
        const { category } = req.query;
        const services = await api_1.ApiService.getServices(category);
        res.json(services);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch services',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Resources
app.get('/api/resources', async (req, res) => {
    try {
        await ensureDatabase();
        const { type, status } = req.query;
        const resources = await api_1.ApiService.getResources(type, status);
        res.json(resources);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch resources',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Appointments
app.get('/api/appointments', async (req, res) => {
    try {
        await ensureDatabase();
        const filters = req.query;
        const appointments = await api_1.ApiService.getAppointments(filters);
        res.json(appointments);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch appointments',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/api/appointments', async (req, res) => {
    try {
        await ensureDatabase();
        const appointmentData = req.body;
        const userId = req.user?.id;
        const appointment = await api_1.ApiService.createAppointment({
            ...appointmentData,
            created_by: userId,
        });
        res.status(201).json(appointment);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to create appointment',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Nurses
app.get('/api/profiles/nurses/available', async (req, res) => {
    try {
        await ensureDatabase();
        const result = await (0, connection_1.query)('SELECT id, username, full_name, department FROM profiles WHERE role = $1 AND status = $2 ORDER BY full_name', ['nurse', 'active']);
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch nurses',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/nurses', async (req, res) => {
    try {
        await ensureDatabase();
        const result = await (0, connection_1.query)('SELECT id, name, skill_level, is_available FROM nurses ORDER BY name');
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch nurses',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/api/nurses', async (req, res) => {
    try {
        await ensureDatabase();
        const { name, skill_level, is_available } = req.body;
        const result = await (0, connection_1.query)('INSERT INTO nurses (name, skill_level, is_available) VALUES ($1, $2, $3) RETURNING *', [name, skill_level, is_available]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to create nurse',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Doctors
app.get('/api/doctors', async (req, res) => {
    try {
        await ensureDatabase();
        const result = await (0, connection_1.query)('SELECT id, name, specialty, is_available FROM doctors ORDER BY name');
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch doctors',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/doctors/available', async (req, res) => {
    try {
        await ensureDatabase();
        const result = await (0, connection_1.query)('SELECT id, username, full_name, department FROM profiles WHERE role = $1 AND status = $2 ORDER BY full_name', ['doctor', 'active']);
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch available doctors',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/api/doctors', async (req, res) => {
    try {
        await ensureDatabase();
        const { name, specialty, is_available } = req.body;
        const result = await (0, connection_1.query)('INSERT INTO doctors (name, specialty, is_available) VALUES ($1, $2, $3) RETURNING *', [name, specialty, is_available]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to create doctor',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Rooms
app.get('/api/resources/rooms/available', async (req, res) => {
    try {
        await ensureDatabase();
        const result = await (0, connection_1.query)('SELECT id, name, type as room_type, is_available FROM rooms WHERE is_available = true ORDER BY name');
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch available rooms',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/rooms', async (req, res) => {
    try {
        await ensureDatabase();
        const result = await (0, connection_1.query)('SELECT id, name, type as room_type, is_available FROM rooms ORDER BY name');
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch rooms',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/api/rooms', async (req, res) => {
    try {
        await ensureDatabase();
        const { name, type, is_available } = req.body;
        const result = await (0, connection_1.query)('INSERT INTO rooms (name, type, is_available) VALUES ($1, $2, $3) RETURNING id, name, type as room_type, is_available', [name, type, is_available]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to create room',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Schedules
app.get('/api/schedules', async (req, res) => {
    try {
        await ensureDatabase();
        const filters = req.query;
        const schedules = await api_1.ApiService.getSchedules(filters);
        res.json(schedules);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch schedules',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Task Executions
app.get('/api/task-executions', async (req, res) => {
    try {
        await ensureDatabase();
        const filters = req.query;
        const tasks = await api_1.ApiService.getTaskExecutions(filters);
        res.json(tasks);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch task executions',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        await ensureDatabase();
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const stats = await api_1.ApiService.getDashboardStats(date);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch dashboard stats',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Resource availability
app.get('/api/resources/availability', async (req, res) => {
    try {
        await ensureDatabase();
        const { date, time_start, time_end } = req.query;
        if (!date || !time_start || !time_end) {
            return res.status(400).json({
                error: 'Missing required parameters: date, time_start, time_end'
            });
        }
        const availability = await api_1.ApiService.getResourceAvailability(date, time_start, time_end);
        res.json(availability);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch resource availability',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// ==================== DingTalk APIs ====================
// Get DingTalk configuration
app.get('/api/dingtalk/config', async (req, res) => {
    try {
        await ensureDatabase();
        const result = await (0, connection_1.query)('SELECT * FROM dingtalk_sync_config ORDER BY created_at DESC LIMIT 1');
        const config = result.rows[0] || null;
        res.json(config);
    }
    catch (error) {
        console.error('Failed to fetch DingTalk config:', error);
        res.status(500).json({
            error: 'Failed to fetch DingTalk configuration',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Save/Update DingTalk configuration
app.post('/api/dingtalk/config', async (req, res) => {
    try {
        await ensureDatabase();
        const { app_key, app_secret, agent_id, corp_id, sync_enabled = false, auto_sync_enabled = false, sync_schedule = 'daily', sync_time = '02:00:00', conflict_strategy = 'manual', selected_departments = [] } = req.body;
        // Verify user is super_admin
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userResult = await (0, connection_1.query)('SELECT role FROM profiles WHERE id = $1', [userId]);
        if (!userResult.rows[0] || userResult.rows[0].role !== 'super_admin') {
            return res.status(403).json({
                error: 'Permission denied: Only super admins can configure DingTalk'
            });
        }
        // Check if config exists
        const existingConfig = await (0, connection_1.query)('SELECT id FROM dingtalk_sync_config LIMIT 1');
        let result;
        if (existingConfig.rows.length > 0) {
            // Update existing config
            result = await (0, connection_1.query)(`UPDATE dingtalk_sync_config 
         SET app_key = $1, app_secret = $2, agent_id = $3, corp_id = $4,
             sync_enabled = $5, auto_sync_enabled = $6, sync_schedule = $7,
             sync_time = $8, conflict_strategy = $9, selected_departments = $10,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $11
         RETURNING *`, [
                app_key, app_secret, agent_id, corp_id,
                sync_enabled, auto_sync_enabled, sync_schedule,
                sync_time, conflict_strategy, JSON.stringify(selected_departments),
                existingConfig.rows[0].id
            ]);
        }
        else {
            // Insert new config
            result = await (0, connection_1.query)(`INSERT INTO dingtalk_sync_config 
         (app_key, app_secret, agent_id, corp_id, sync_enabled, auto_sync_enabled,
          sync_schedule, sync_time, conflict_strategy, selected_departments)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`, [
                app_key, app_secret, agent_id, corp_id,
                sync_enabled, auto_sync_enabled, sync_schedule,
                sync_time, conflict_strategy, JSON.stringify(selected_departments)
            ]);
        }
        console.log('DingTalk config saved:', { app_key, agent_id, sync_enabled });
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Failed to save DingTalk config:', error);
        res.status(500).json({
            error: 'Failed to save DingTalk configuration',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Trigger DingTalk sync
app.post('/api/dingtalk/sync', async (req, res) => {
    try {
        await ensureDatabase();
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Verify user is super_admin
        const userResult = await (0, connection_1.query)('SELECT role FROM profiles WHERE id = $1', [userId]);
        if (!userResult.rows[0] || userResult.rows[0].role !== 'super_admin') {
            return res.status(403).json({
                error: 'Permission denied: Only super admins can trigger sync'
            });
        }
        const { sync_type = 'manual', selected_departments = [], conflict_strategy } = req.body;
        // Get DingTalk config
        const configResult = await (0, connection_1.query)('SELECT * FROM dingtalk_sync_config LIMIT 1');
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
        const logResult = await (0, connection_1.query)(`INSERT INTO dingtalk_sync_logs 
       (sync_type, status, created_by, started_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING id`, [sync_type, 'running', userId]);
        const syncLogId = logResult.rows[0].id;
        try {
            // 1. Get DingTalk access token
            console.log('Getting DingTalk access token...');
            const tokenResponse = await fetch(`https://oapi.dingtalk.com/gettoken?appkey=${encodeURIComponent(config.app_key)}&appsecret=${encodeURIComponent(config.app_secret)}`);
            const tokenData = await tokenResponse.json();
            if (tokenData.errcode !== 0 || !tokenData.access_token) {
                throw new Error(`Failed to get DingTalk access token: ${tokenData.errmsg}`);
            }
            const accessToken = tokenData.access_token;
            console.log('Access token obtained successfully');
            // 2. Get department list
            console.log('Fetching DingTalk departments...');
            const deptResponse = await fetch(`https://oapi.dingtalk.com/topapi/v2/department/listsub?access_token=${accessToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dept_id: 1 })
            });
            const deptData = await deptResponse.json();
            if (deptData.errcode !== 0 || !deptData.result) {
                throw new Error(`Failed to fetch departments: ${deptData.errmsg}`);
            }
            console.log(`Found ${deptData.result.length} departments`);
            // 3. Sync departments to department_mapping table
            for (const dept of deptData.result) {
                await (0, connection_1.query)(`INSERT INTO dingtalk_department_mapping 
           (dingtalk_dept_id, dingtalk_dept_name, parent_id, order_num, enabled)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (dingtalk_dept_id) 
           DO UPDATE SET 
             dingtalk_dept_name = EXCLUDED.dingtalk_dept_name,
             parent_id = EXCLUDED.parent_id,
             order_num = EXCLUDED.order_num,
             updated_at = CURRENT_TIMESTAMP`, [dept.dept_id.toString(), dept.name, dept.parent_id.toString(), dept.order, true]);
            }
            // 4. Get departments to sync
            const deptIdsToSync = selected_departments.length > 0
                ? selected_departments
                : deptData.result.map((d) => d.dept_id.toString());
            console.log(`Syncing users from ${deptIdsToSync.length} departments...`);
            // 5. Sync users
            let totalUsers = 0;
            let successCount = 0;
            let failedCount = 0;
            let skippedCount = 0;
            const failedDetails = [];
            for (const deptId of deptIdsToSync) {
                console.log(`Syncing users from department ${deptId}...`);
                let cursor = 0;
                let hasMore = true;
                while (hasMore) {
                    const userResponse = await fetch(`https://oapi.dingtalk.com/topapi/v2/user/list?access_token=${accessToken}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            dept_id: parseInt(deptId),
                            cursor,
                            size: 100
                        })
                    });
                    const userData = await userResponse.json();
                    if (userData.errcode !== 0 || !userData.result) {
                        console.error(`Failed to fetch users from department ${deptId}:`, userData.errmsg);
                        break;
                    }
                    const users = userData.result.list;
                    totalUsers += users.length;
                    for (const user of users) {
                        try {
                            // Check if user exists
                            const existingUser = await (0, connection_1.query)('SELECT id, username, full_name FROM profiles WHERE username = $1', [user.userid]);
                            const strategy = conflict_strategy || config.conflict_strategy;
                            if (existingUser.rows.length > 0) {
                                // User exists, handle according to conflict strategy
                                if (strategy === 'dingtalk_first') {
                                    // Update with DingTalk data
                                    const deptName = deptData.result?.find((d) => d.dept_id === user.dept_id_list[0])?.name;
                                    await (0, connection_1.query)(`UPDATE profiles 
                     SET full_name = $1, department = $2, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $3`, [user.name, deptName, existingUser.rows[0].id]);
                                    successCount++;
                                }
                                else if (strategy === 'local_first') {
                                    // Keep local data, skip
                                    skippedCount++;
                                }
                                else {
                                    // Manual strategy: record conflict, need manual handling
                                    skippedCount++;
                                }
                            }
                            else {
                                // User doesn't exist, create new user
                                const email = user.email || `${user.userid}@company.local`;
                                const password = user.mobile || '123456'; // Default password
                                const deptName = deptData.result?.find((d) => d.dept_id === user.dept_id_list[0])?.name;
                                // Create user account
                                await (0, connection_1.query)(`INSERT INTO profiles 
                   (username, email, full_name, role, department, status, password_hash)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                                    user.userid,
                                    email,
                                    user.name,
                                    'sales', // Default role
                                    deptName,
                                    'active',
                                    password // Note: In production, this should be hashed
                                ]);
                                successCount++;
                            }
                        }
                        catch (error) {
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
            }
            // 6. Update sync log
            const status = failedCount === 0 ? 'success' : (successCount > 0 ? 'partial' : 'failed');
            await (0, connection_1.query)(`UPDATE dingtalk_sync_logs 
         SET status = $1, total_users = $2, success_count = $3, 
             failed_count = $4, skipped_count = $5, 
             details = $6, completed_at = CURRENT_TIMESTAMP
         WHERE id = $7`, [
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
            ]);
            // 7. Update config last_sync_at
            await (0, connection_1.query)(`UPDATE dingtalk_sync_config 
         SET last_sync_at = CURRENT_TIMESTAMP
         WHERE id = $1`, [config.id]);
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
        }
        catch (syncError) {
            console.error('Sync process error:', syncError);
            // Update sync log to failed
            await (0, connection_1.query)(`UPDATE dingtalk_sync_logs 
         SET status = $1, error_message = $2, completed_at = CURRENT_TIMESTAMP
         WHERE id = $3`, ['failed', syncError.message, syncLogId]);
            throw syncError;
        }
    }
    catch (error) {
        console.error('DingTalk sync error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Sync failed'
        });
    }
});
// Get DingTalk sync logs
app.get('/api/dingtalk/sync/logs', async (req, res) => {
    try {
        await ensureDatabase();
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
        const result = await (0, connection_1.query)(queryText, params);
        // Get total count
        const countQuery = status
            ? 'SELECT COUNT(*) FROM dingtalk_sync_logs WHERE status = $1'
            : 'SELECT COUNT(*) FROM dingtalk_sync_logs';
        const countParams = status ? [status] : [];
        const countResult = await (0, connection_1.query)(countQuery, countParams);
        res.json({
            logs: result.rows,
            total: parseInt(countResult.rows[0].count)
        });
    }
    catch (error) {
        console.error('Failed to fetch sync logs:', error);
        res.status(500).json({
            error: 'Failed to fetch sync logs',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// ==================== User Management APIs ====================
// Get all users (admin only)
app.get('/api/users', async (req, res) => {
    try {
        await ensureDatabase();
        // Verify user is super_admin
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userResult = await (0, connection_1.query)('SELECT role FROM profiles WHERE id = $1', [userId]);
        if (!userResult.rows[0] || userResult.rows[0].role !== 'super_admin') {
            return res.status(403).json({
                error: 'Permission denied: Only super admins can view users'
            });
        }
        console.log('🔍 [DEBUG] 获取所有用户列表，请求者:', userId);
        const result = await (0, connection_1.query)('SELECT * FROM profiles ORDER BY created_at DESC');
        console.log(`🔍 [DEBUG] 返回 ${result.rows.length} 个用户`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch users:', error);
        res.status(500).json({
            error: 'Failed to fetch users',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Update user (admin only)
app.put('/api/users/:id', async (req, res) => {
    try {
        await ensureDatabase();
        // Verify user is super_admin
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userResult = await (0, connection_1.query)('SELECT role FROM profiles WHERE id = $1', [userId]);
        if (!userResult.rows[0] || userResult.rows[0].role !== 'super_admin') {
            return res.status(403).json({
                error: 'Permission denied: Only super admins can update users'
            });
        }
        const { id } = req.params;
        const { full_name, role, department, status } = req.body;
        console.log('🔍 [DEBUG] 更新用户请求:', {
            targetUserId: id,
            requesterId: userId,
            updates: { full_name, role, department, status },
            timestamp: new Date().toISOString()
        });
        // Check if user exists
        const existingUser = await (0, connection_1.query)('SELECT * FROM profiles WHERE id = $1', [id]);
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
        const result = await (0, connection_1.query)(updateQuery, updateValues);
        if (result.rows.length === 0) {
            console.log('🔍 [DEBUG] 更新失败，未找到用户');
            return res.status(404).json({
                error: 'User not found'
            });
        }
        console.log('🔍 [DEBUG] 更新成功，新数据:', result.rows[0]);
        console.log('🔍 [DEBUG] 特别是用户角色:', result.rows[0].role);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('🔍 [DEBUG] 更新用户失败:', error);
        res.status(500).json({
            error: 'Failed to update user',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Create user (admin only)
app.post('/api/users', async (req, res) => {
    try {
        await ensureDatabase();
        // Verify user is super_admin
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userResult = await (0, connection_1.query)('SELECT role FROM profiles WHERE id = $1', [userId]);
        if (!userResult.rows[0] || userResult.rows[0].role !== 'super_admin') {
            return res.status(403).json({
                error: 'Permission denied: Only super admins can create users'
            });
        }
        const { username, password, full_name, role, department } = req.body;
        console.log('🔍 [DEBUG] 创建用户请求:', {
            username,
            full_name,
            role,
            department,
            requesterId: userId
        });
        // Check if username exists
        const existingUser = await (0, connection_1.query)('SELECT id FROM profiles WHERE username = $1', [username]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                error: 'Username already exists'
            });
        }
        // Create user (in production, hash the password)
        const result = await (0, connection_1.query)(`INSERT INTO profiles (username, password_hash, full_name, role, department, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING *`, [username, password, full_name, role, department]);
        console.log('🔍 [DEBUG] 用户创建成功:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Failed to create user:', error);
        res.status(500).json({
            error: 'Failed to create user',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Delete user (admin only) - soft delete
app.delete('/api/users/:id', async (req, res) => {
    try {
        await ensureDatabase();
        // Verify user is super_admin
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userResult = await (0, connection_1.query)('SELECT role FROM profiles WHERE id = $1', [userId]);
        if (!userResult.rows[0] || userResult.rows[0].role !== 'super_admin') {
            return res.status(403).json({
                error: 'Permission denied: Only super admins can delete users'
            });
        }
        const { id } = req.params;
        // Prevent self-deletion
        if (id === userId) {
            return res.status(400).json({
                error: 'Cannot delete your own account'
            });
        }
        // Soft delete: set status to 'disabled'
        const result = await (0, connection_1.query)(`UPDATE profiles
       SET status = 'disabled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found'
            });
        }
        console.log('🔍 [DEBUG] 用户已软删除:', result.rows[0]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Failed to delete user:', error);
        res.status(500).json({
            error: 'Failed to delete user',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Start server
app.listen(PORT, async () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    console.log('📊 Health check: http://localhost:${PORT}/api/health');
    try {
        await ensureDatabase();
        console.log('✅ Database initialized successfully');
    }
    catch (error) {
        console.error('❌ Failed to initialize database:', error);
    }
});
exports.default = app;
