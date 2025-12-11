/**
 * 实时任务更新Hook
 * 创建时间: 2025-12-09
 * 描述: 自动管理WebSocket连接和消息处理，实现实时任务状态更新
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { nurseApiClient, Notification, NurseTask } from '../services/nurse-api-client';

// WebSocket消息类型
export interface WebSocketMessage {
  type: 'task_status_changed' | 'schedule_updated' | 'new_task_assigned' | 'task_cancelled' | 'notification' | 'connection_established' | 'pong';
  data: {
    taskId?: string;
    scheduleId?: string;
    newStatus?: string;
    oldStatus?: string;
    nurseId?: string;
    title?: string;
    message?: string;
    timestamp?: string;
    task?: NurseTask;
    notification?: Notification;
    userId?: string;
  };
}

// 连接状态枚举
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

// Hook配置接口
interface UseRealtimeTaskUpdatesConfig {
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  enableNotifications?: boolean;
  onConnectionChange?: (status: ConnectionStatus) => void;
  onTaskUpdate?: (task: NurseTask, oldStatus: string, newStatus: string) => void;
  onNewTask?: (task: NurseTask) => void;
  onNotification?: (notification: Notification) => void;
  onError?: (error: Error) => void;
}

// Hook返回值接口
interface UseRealtimeTaskUpdatesReturn {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  lastMessage: WebSocketMessage | null;
  unreadNotifications: number;
  recentTasks: NurseTask[];
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  sendMessage: (message: any) => boolean;
  markNotificationsRead: () => Promise<void>;
  clearRecentTasks: () => void;
}

// 默认配置
const defaultConfig: UseRealtimeTaskUpdatesConfig = {
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  heartbeatInterval: 30000,
  enableNotifications: true
};

export const useRealtimeTaskUpdates = (config: UseRealtimeTaskUpdatesConfig = {}): UseRealtimeTaskUpdatesReturn => {
  const finalConfig = { ...defaultConfig, ...config };
  
  // 状态管理
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(ConnectionStatus.DISCONNECTED);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [recentTasks, setRecentTasks] = useState<NurseTask[]>([]);
  
  // 引用管理
  const reconnectAttemptsRef = useRef(0);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<any[]>([]);
  
  // 处理连接状态变化
  const handleConnectionChange = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
    setIsConnected(status === ConnectionStatus.CONNECTED);
    finalConfig.onConnectionChange?.(status);
  }, [finalConfig]);
  
  // 处理任务更新
  const handleTaskUpdate = useCallback((task: NurseTask, oldStatus: string, newStatus: string) => {
    setRecentTasks(prev => {
      // 更新现有任务或添加新任务
      const existingIndex = prev.findIndex(t => t.id === task.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = task;
        return updated;
      } else {
        // 限制最近任务数量
        return [task, ...prev].slice(0, 10);
      }
    });
    
    finalConfig.onTaskUpdate?.(task, oldStatus, newStatus);
  }, [finalConfig]);
  
  // 处理新任务分配
  const handleNewTask = useCallback((task: NurseTask) => {
    setRecentTasks(prev => [task, ...prev].slice(0, 10));
    finalConfig.onNewTask?.(task);
    
    // 显示浏览器通知
    if (finalConfig.enableNotifications && 'Notification' in window) {
      new Notification('新任务分配', {
        body: `您有新的任务：${task.service_name} - ${task.customer_name}`,
        icon: '/favicon.ico',
        tag: task.id
      });
    }
  }, [finalConfig]);
  
  // 处理通知消息
  const handleNotification = useCallback((notification: Notification) => {
    setUnreadNotifications(prev => prev + 1);
    finalConfig.onNotification?.(notification);
    
    // 显示浏览器通知
    if (finalConfig.enableNotifications && 'Notification' in window) {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      });
    }
  }, [finalConfig]);
  
  // 处理WebSocket消息
  const handleMessage = useCallback((message: WebSocketMessage) => {
    setLastMessage(message);
    
    switch (message.type) {
      case 'connection_established':
        handleConnectionChange(ConnectionStatus.CONNECTED);
        reconnectAttemptsRef.current = 0;
        
        // 发送队列中的消息
        while (messageQueueRef.current.length > 0) {
          const queuedMessage = messageQueueRef.current.shift();
          if (queuedMessage) {
            nurseApiClient.emit('message', queuedMessage);
          }
        }
        break;
        
      case 'task_status_changed':
        if (message.data.task && message.data.oldStatus && message.data.newStatus) {
          handleTaskUpdate(message.data.task, message.data.oldStatus, message.data.newStatus);
        }
        break;
        
      case 'new_task_assigned':
        if (message.data.task) {
          handleNewTask(message.data.task);
        }
        break;
        
      case 'notification':
        if (message.data.notification) {
          handleNotification(message.data.notification);
        }
        break;
        
      case 'pong':
        // 心跳响应，重置心跳超时
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
          heartbeatTimeoutRef.current = null;
        }
        break;
        
      default:
        console.log('未处理的WebSocket消息:', message);
    }
  }, [handleConnectionChange, handleTaskUpdate, handleNewTask, handleNotification]);
  
  // 处理连接错误
  const handleError = useCallback((error: Error) => {
    console.error('WebSocket连接错误:', error);
    handleConnectionChange(ConnectionStatus.ERROR);
    finalConfig.onError?.(error);
  }, [handleConnectionChange, finalConfig]);
  
  // 处理连接关闭
  const handleClose = useCallback(() => {
    handleConnectionChange(ConnectionStatus.DISCONNECTED);
    
    // 自动重连
    if (finalConfig.autoReconnect && reconnectAttemptsRef.current < (finalConfig.maxReconnectAttempts || 5)) {
      handleConnectionChange(ConnectionStatus.RECONNECTING);
      
      reconnectAttemptsRef.current++;
      const delay = (finalConfig.reconnectDelay || 1000) * reconnectAttemptsRef.current;
      
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnect();
      }, delay);
    }
  }, [handleConnectionChange, finalConfig]);
  
  // 启动心跳
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }
    
    heartbeatTimeoutRef.current = setTimeout(() => {
      // 发送心跳消息
      sendMessage({ type: 'ping' });
      
      // 如果没有收到响应，认为连接断开
      heartbeatTimeoutRef.current = setTimeout(() => {
        console.warn('心跳超时，连接可能已断开');
        handleClose();
      }, (finalConfig.heartbeatInterval || 30000));
    }, (finalConfig.heartbeatInterval || 30000));
  }, [finalConfig, handleClose]);
  
  // 停止心跳
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);
  
  // 连接WebSocket
  const connect = useCallback(async () => {
    try {
      handleConnectionChange(ConnectionStatus.CONNECTING);
      
      // 设置API客户端的事件监听器
      nurseApiClient.on('taskStatusChanged', (data: any) => {
        handleMessage({
          type: 'task_status_changed',
          data
        });
      });
      
      nurseApiClient.on('newTaskAssigned', (data: any) => {
        handleMessage({
          type: 'new_task_assigned',
          data
        });
      });
      
      nurseApiClient.on('notification', (data: any) => {
        handleMessage({
          type: 'notification',
          data
        });
      });
      
      // 连接WebSocket
      await nurseApiClient.connectWebSocket();
      
      // 启动心跳
      startHeartbeat();
      
    } catch (error) {
      handleError(error as Error);
    }
  }, [handleConnectionChange, handleMessage, handleError, startHeartbeat]);
  
  // 断开连接
  const disconnect = useCallback(() => {
    stopHeartbeat();
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    nurseApiClient.disconnectWebSocket();
    handleConnectionChange(ConnectionStatus.DISCONNECTED);
    reconnectAttemptsRef.current = 0;
  }, [stopHeartbeat, handleConnectionChange]);
  
  // 重新连接
  const reconnect = useCallback(async () => {
    disconnect();
    await connect();
  }, [disconnect, connect]);
  
  // 发送消息
  const sendMessage = useCallback((message: any): boolean => {
    try {
      if (isConnected) {
        // 这里可以通过API客户端发送消息
        // nurseApiClient.emit('message', message);
        return true;
      } else {
        // 连接未建立时，将消息加入队列
        messageQueueRef.current.push(message);
        return false;
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      return false;
    }
  }, [isConnected]);
  
  // 标记通知为已读
  const markNotificationsRead = useCallback(async () => {
    try {
      await nurseApiClient.markNotificationsRead([], true);
      setUnreadNotifications(0);
    } catch (error) {
      console.error('标记通知已读失败:', error);
    }
  }, []);
  
  // 清除最近任务
  const clearRecentTasks = useCallback(() => {
    setRecentTasks([]);
  }, []);
  
  // 请求通知权限
  useEffect(() => {
    if (finalConfig.enableNotifications && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [finalConfig.enableNotifications]);
  
  // 组件挂载时自动连接
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);
  
  // 监听页面可见性变化
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏时停止心跳
        stopHeartbeat();
      } else if (isConnected) {
        // 页面显示且连接正常时重启心跳
        startHeartbeat();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, stopHeartbeat, startHeartbeat]);
  
  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = () => {
      if (connectionStatus === ConnectionStatus.DISCONNECTED || connectionStatus === ConnectionStatus.ERROR) {
        reconnect();
      }
    };
    
    const handleOffline = () => {
      handleConnectionChange(ConnectionStatus.ERROR);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectionStatus, handleConnectionChange, reconnect]);
  
  return {
    isConnected,
    connectionStatus,
    lastMessage,
    unreadNotifications,
    recentTasks,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    markNotificationsRead,
    clearRecentTasks
  };
};

// 连接状态显示组件
interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
  className?: string;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  status,
  className = ''
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          label: '已连接',
          icon: '●'
        };
      case ConnectionStatus.CONNECTING:
      case ConnectionStatus.RECONNECTING:
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          label: status === ConnectionStatus.CONNECTING ? '连接中' : '重连中',
          icon: '○'
        };
      case ConnectionStatus.DISCONNECTED:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          label: '未连接',
          icon: '○'
        };
      case ConnectionStatus.ERROR:
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          label: '连接错误',
          icon: '●'
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          label: '未知状态',
          icon: '○'
        };
    }
  };
  
  const config = getStatusConfig();
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className={`${config.color} ${config.bgColor} px-2 py-1 rounded-full text-xs font-medium`}>
        {config.icon}
      </span>
      <span className="text-sm text-gray-600">{config.label}</span>
    </div>
  );
};

// 实时更新状态栏组件
interface RealtimeStatusBarProps {
  isConnected: boolean;
  unreadNotifications: number;
  recentTasksCount: number;
  onMarkNotificationsRead?: () => void;
  onClearRecentTasks?: () => void;
  className?: string;
}

export const RealtimeStatusBar: React.FC<RealtimeStatusBarProps> = ({
  isConnected,
  unreadNotifications,
  recentTasksCount,
  onMarkNotificationsRead,
  onClearRecentTasks,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-between p-3 bg-white border-b border-gray-200 ${className}`}>
      <div className="flex items-center space-x-4">
        <ConnectionStatusIndicator 
          status={isConnected ? ConnectionStatus.CONNECTED : ConnectionStatus.DISCONNECTED} 
        />
        
        {unreadNotifications > 0 && (
          <button
            onClick={onMarkNotificationsRead}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200 transition-colors"
          >
            <span>通知</span>
            <span className="bg-blue-600 text-white rounded-full px-1.5 py-0.5 text-xs">
              {unreadNotifications}
            </span>
          </button>
        )}
        
        {recentTasksCount > 0 && (
          <button
            onClick={onClearRecentTasks}
            className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm hover:bg-gray-200 transition-colors"
          >
            <span>最近任务</span>
            <span className="bg-gray-600 text-white rounded-full px-1.5 py-0.5 text-xs">
              {recentTasksCount}
            </span>
          </button>
        )}
      </div>
      
      <div className="text-xs text-gray-500">
        最后更新: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default useRealtimeTaskUpdates;