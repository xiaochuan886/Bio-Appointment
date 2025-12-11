/**
 * 护士工作流程API客户端
 * 创建时间: 2025-12-09
 * 描述: 提供统一的护士工作流程API调用封装，包含类型定义和状态常量
 */

// 基础API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  code: string;
  timestamp: string;
}

// 分页响应类型
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 用户信息类型
export interface NurseUser {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
}

// 登录响应类型
export interface LoginResponse {
  user: NurseUser;
  token: string;
  expiresIn: string;
}

// 护士任务类型
export interface NurseTask {
  id: string;
  scheduled_date: string;
  scheduled_time_start: string;
  scheduled_time_end: string;
  status: string;
  customer_name: string;
  customer_phone?: string;
  service_name: string;
  service_category: string;
  service_duration?: number;
  room_name: string;
  room_type: string;
  nurse_name: string;
  task_execution_id?: string;
  started_at?: string;
  completed_at?: string;
  execution_status?: string;
  execution_notes?: string;
  has_execution: boolean;
}

// 任务分组类型
export interface GroupedTasks {
  pending: NurseTask[];
  in_progress: NurseTask[];
  completed: NurseTask[];
  all: NurseTask[];
}

// 任务摘要类型
export interface TaskSummary {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  date: string;
}

// 签到记录类型
export interface SignInRecord {
  id: string;
  nurse_id: string;
  sign_in_time: string;
  sign_out_time?: string;
  work_date: string;
  notes?: string;
  work_hours?: number;
}

// 签到状态类型
export interface SignInStatus {
  is_signed_in: boolean;
  sign_in_time?: string;
  sign_out_time?: string;
  work_duration_hours?: number;
}

// 通知类型
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  related_id?: string;
  related_type?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

// 工作统计类型
export interface WorkStatistics {
  totalSchedules: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  cancelledTasks: number;
  avgServiceDurationMinutes: number;
  todayTasks: number;
  completionRate: number;
}

// 每日统计类型
export interface DailyStatistics {
  date: string;
  total_tasks: number;
  completed_tasks: number;
  avg_duration_minutes?: number;
}

// 统计响应类型
export interface StatisticsResponse {
  summary: WorkStatistics;
  dailyStatistics: DailyStatistics[];
  period: {
    startDate: string;
    endDate: string;
  };
}

// 系统信息类型
export interface SystemInfo {
  database: {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  };
  websocket: {
    connections: number;
    connectedUsers: string[];
  };
  timestamp: string;
}

// 任务状态常量
export const TaskStatus = {
  PENDING: 'pending',
  SCHEDULED: 'scheduled',
  CUSTOMER_ARRIVED: 'customer_arrived',
  SERVICE_STARTED: 'service_started',
  IN_PROGRESS: 'in_progress',
  SERVICE_COMPLETED: 'service_completed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  CUSTOMER_NO_SHOW: 'customer_no_show',
  SERVICE_INTERRUPTED: 'service_interrupted',
} as const;

export type TaskStatusType = typeof TaskStatus[keyof typeof TaskStatus];

// 任务执行状态常量
export const TaskExecutionStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  INTERRUPTED: 'interrupted',
} as const;

export type TaskExecutionStatusType = typeof TaskExecutionStatus[keyof typeof TaskExecutionStatus];

// 通知类型常量
export const NotificationType = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success',
} as const;

export type NotificationTypeEnum = typeof NotificationType[keyof typeof NotificationType];

// API错误类型
export class ApiError extends Error {
  constructor(
    public message: string,
    public code: string,
    public status: number = 500
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// API客户端类
export class NurseApiClient {
  private baseURL: string;
  private wsURL: string;
  private token: string | null = null;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(baseURL: string = 'http://localhost:8080') {
    this.baseURL = baseURL;
    this.wsURL = baseURL.replace('http://', 'ws://').replace('https://', 'wss://');
  }

  // 设置认证令牌
  setToken(token: string): void {
    this.token = token;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
      this.connectWebSocket();
    }
  }

  // 获取认证令牌
  getToken(): string | null {
    return this.token;
  }

  // 清除认证令牌
  clearToken(): void {
    this.token = null;
    if (this.ws) {
      this.ws.close();
    }
  }

  // 通用HTTP请求方法
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data: ApiResponse<T> = await response.json();

      if (!data.success) {
        throw new ApiError(
          data.message || '请求失败',
          data.code || 'UNKNOWN_ERROR',
          response.status
        );
      }

      return data.data as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : '网络请求失败',
        'NETWORK_ERROR'
      );
    }
  }

  // GET请求
  private async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return this.request<T>(url.pathname + url.search);
  }

  // POST请求
  private async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT请求
  private async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE请求
  private async delete<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // WebSocket连接管理
  connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.token) {
        reject(new Error('需要先设置认证令牌'));
        return;
      }

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      try {
        this.ws = new WebSocket(`${this.wsURL}?token=${this.token}`);

        this.ws.onopen = () => {
          console.log('WebSocket连接已建立');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleWebSocketMessage(message);
          } catch (error) {
            console.error('WebSocket消息解析失败:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket连接已关闭');
          this.stopHeartbeat();
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket连接错误:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // 断开WebSocket连接
  disconnectWebSocket(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // 尝试重连WebSocket
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('WebSocket重连次数已达上限');
      return;
    }

    this.reconnectAttempts++;
    console.log(`尝试WebSocket重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connectWebSocket().catch((error) => {
        console.error('WebSocket重连失败:', error);
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  // 启动心跳
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 30秒心跳
  }

  // 停止心跳
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 处理WebSocket消息
  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'connection_established':
        console.log('WebSocket连接确认:', message.data);
        break;
      case 'pong':
        // 心跳响应
        break;
      case 'task_status_changed':
        this.emit('taskStatusChanged', message.data);
        break;
      case 'new_task_assigned':
        this.emit('newTaskAssigned', message.data);
        break;
      case 'notification':
        this.emit('notification', message.data);
        break;
      default:
        console.log('未处理的WebSocket消息:', message);
    }
  }

  // 事件发射器
  private eventListeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // API方法

  // 1. 认证相关

  /**
   * 护士登录
   * @param username 用户名
   * @param password 密码
   * @returns 登录响应
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await this.post<LoginResponse>('/api/nurse/login', {
      username,
      password,
    });
    
    this.setToken(response.token);
    return response;
  }

  /**
   * 登出
   */
  logout(): void {
    this.clearToken();
  }

  // 2. 签到签退管理

  /**
   * 护士签到
   * @param notes 签到备注
   * @returns 签到记录
   */
  async signIn(notes?: string): Promise<{ signInRecord: SignInRecord; notification: Notification }> {
    return this.post('/api/nurse/sign-in', { notes });
  }

  /**
   * 护士签退
   * @param notes 签退备注
   * @returns 签退记录
   */
  async signOut(notes?: string): Promise<{ signOutRecord: SignInRecord; notification: Notification }> {
    return this.post('/api/nurse/sign-out', { notes });
  }

  /**
   * 获取签到状态
   * @returns 签到状态
   */
  async getSignInStatus(): Promise<SignInStatus> {
    return this.get('/api/nurse/sign-in-status');
  }

  // 3. 任务管理

  /**
   * 获取今日任务
   * @param date 日期 (可选，默认今天)
   * @returns 任务列表和摘要
   */
  async getTodayTasks(date?: string): Promise<{ tasks: GroupedTasks; summary: TaskSummary }> {
    return this.get('/api/nurse/today-tasks', { date });
  }

  /**
   * 更新任务状态
   * @param scheduleId 排班ID
   * @param newStatus 新状态
   * @param notes 备注
   * @returns 更新后的任务信息
   */
  async updateTaskStatus(
    scheduleId: string,
    newStatus: TaskStatusType,
    notes?: string
  ): Promise<{ task: NurseTask; oldStatus: string; newStatus: string }> {
    return this.put('/api/nurse/task-status', {
      scheduleId,
      newStatus,
      notes,
    });
  }

  /**
   * 获取工作统计
   * @param startDate 开始日期 (可选)
   * @param endDate 结束日期 (可选)
   * @returns 工作统计数据
   */
  async getWorkStatistics(startDate?: string, endDate?: string): Promise<StatisticsResponse> {
    return this.get('/api/nurse/work-statistics', { startDate, endDate });
  }

  // 4. 通知管理

  /**
   * 获取通知列表
   * @param page 页码 (默认1)
   * @param limit 每页数量 (默认20)
   * @param isRead 是否已读 (可选)
   * @returns 通知列表和分页信息
   */
  async getNotifications(
    page: number = 1,
    limit: number = 20,
    isRead?: boolean
  ): Promise<{ notifications: Notification[]; pagination: any; unread: number }> {
    return this.get('/api/nurse/notifications', { page, limit, isRead });
  }

  /**
   * 标记通知为已读
   * @param notificationIds 通知ID数组 (可选)
   * @param markAll 是否标记全部 (默认false)
   * @returns 操作结果
   */
  async markNotificationsRead(
    notificationIds?: string[],
    markAll: boolean = false
  ): Promise<{ updatedCount: number; message: string }> {
    return this.put('/api/nurse/notifications/read', {
      notificationIds,
      markAll,
    });
  }

  /**
   * 删除通知
   * @param notificationIds 通知ID数组 (可选)
   * @param deleteAll 是否删除全部已读 (默认false)
   * @returns 操作结果
   */
  async deleteNotifications(
    notificationIds?: string[],
    deleteAll: boolean = false
  ): Promise<{ deletedCount: number; message: string }> {
    return this.delete('/api/nurse/notifications', {
      notificationIds,
      deleteAll,
    });
  }

  // 5. 系统信息

  /**
   * 健康检查
   * @returns 系统健康状态
   */
  async healthCheck(): Promise<any> {
    return this.get('/api/nurse/health');
  }

  /**
   * 获取系统信息
   * @returns 系统信息
   */
  async getSystemInfo(): Promise<SystemInfo> {
    return this.get('/api/nurse/system-info');
  }
}

// 创建默认API客户端实例
export const nurseApiClient = new NurseApiClient();

// 工具函数

/**
 * 格式化任务状态显示文本
 * @param status 任务状态
 * @returns 显示文本
 */
export function formatTaskStatus(status: TaskStatusType): string {
  const statusMap: Record<TaskStatusType, string> = {
    [TaskStatus.PENDING]: '待处理',
    [TaskStatus.SCHEDULED]: '已排班',
    [TaskStatus.CUSTOMER_ARRIVED]: '客户已到达',
    [TaskStatus.SERVICE_STARTED]: '服务已开始',
    [TaskStatus.IN_PROGRESS]: '进行中',
    [TaskStatus.SERVICE_COMPLETED]: '服务已完成',
    [TaskStatus.COMPLETED]: '已完成',
    [TaskStatus.CANCELLED]: '已取消',
    [TaskStatus.CUSTOMER_NO_SHOW]: '客户未到',
    [TaskStatus.SERVICE_INTERRUPTED]: '服务中断',
  };

  return statusMap[status] || status;
}

/**
 * 获取任务状态颜色
 * @param status 任务状态
 * @returns 颜色类名
 */
export function getTaskStatusColor(status: TaskStatusType): string {
  const colorMap: Record<TaskStatusType, string> = {
    [TaskStatus.PENDING]: 'bg-gray-100 text-gray-800',
    [TaskStatus.SCHEDULED]: 'bg-blue-100 text-blue-800',
    [TaskStatus.CUSTOMER_ARRIVED]: 'bg-yellow-100 text-yellow-800',
    [TaskStatus.SERVICE_STARTED]: 'bg-orange-100 text-orange-800',
    [TaskStatus.IN_PROGRESS]: 'bg-purple-100 text-purple-800',
    [TaskStatus.SERVICE_COMPLETED]: 'bg-green-100 text-green-800',
    [TaskStatus.COMPLETED]: 'bg-green-100 text-green-800',
    [TaskStatus.CANCELLED]: 'bg-red-100 text-red-800',
    [TaskStatus.CUSTOMER_NO_SHOW]: 'bg-red-100 text-red-800',
    [TaskStatus.SERVICE_INTERRUPTED]: 'bg-red-100 text-red-800',
  };

  return colorMap[status] || 'bg-gray-100 text-gray-800';
}

/**
 * 格式化通知类型显示文本
 * @param type 通知类型
 * @returns 显示文本
 */
export function formatNotificationType(type: NotificationTypeEnum): string {
  const typeMap: Record<NotificationTypeEnum, string> = {
    [NotificationType.INFO]: '信息',
    [NotificationType.WARNING]: '警告',
    [NotificationType.ERROR]: '错误',
    [NotificationType.SUCCESS]: '成功',
  };

  return typeMap[type] || type;
}

/**
 * 获取通知类型图标
 * @param type 通知类型
 * @returns 图标类名
 */
export function getNotificationIcon(type: NotificationTypeEnum): string {
  const iconMap: Record<NotificationTypeEnum, string> = {
    [NotificationType.INFO]: 'fas fa-info-circle',
    [NotificationType.WARNING]: 'fas fa-exclamation-triangle',
    [NotificationType.ERROR]: 'fas fa-exclamation-circle',
    [NotificationType.SUCCESS]: 'fas fa-check-circle',
  };

  return iconMap[type] || 'fas fa-info-circle';
}

/**
 * 格式化时间
 * @param timeString 时间字符串
 * @returns 格式化后的时间
 */
export function formatTime(timeString: string): string {
  if (!timeString) return '';
  
  try {
    const date = new Date(timeString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return timeString;
  }
}

/**
 * 格式化时长
 * @param minutes 分钟数
 * @returns 格式化后的时长
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0分钟';
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (hours > 0) {
    return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`;
  }
  
  return `${mins}分钟`;
}

export default nurseApiClient;