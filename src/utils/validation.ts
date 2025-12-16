/**
 * 数据验证和错误处理工具函数
 */

// 为了兼容性，我们使用更通用的用户类型
interface BaseUser {
  id: string;
  role: string;
  store_id?: string;
}

interface ValidationResult {
  valid: boolean;
  message?: string;
  isRetryable?: boolean; // 修复TypeScript错误
}

/**
 * 验证门店访问权限
 * @param user 当前用户
 * @param storeId 要访问的门店ID
 * @param action 操作类型
 * @returns 验证结果
 */
export function validateStoreAccess(
  user: BaseUser | null,
  storeId?: string,
  action: 'view' | 'manage' = 'view'
): ValidationResult {
  console.log('🔍 [DEBUG] validateStoreAccess 被调用:', {
    user: user ? {
      id: user.id,
      role: user.role,
      store_id: user.store_id,
      hasStoreId: !!user.store_id
    } : null,
    storeId,
    action
  });

  if (!user) {
    console.log('🔍 [DEBUG] 用户未登录，返回 false');
    return { valid: false, message: '用户未登录' };
  }

  // 管理员可以访问所有门店
  if (user.role === 'super_admin') {
    console.log('🔍 [DEBUG] 超级管理员，返回 true');
    return { valid: true };
  }

  // 其他角色需要检查门店匹配
  if (!user.store_id) {
    console.log('🔍 [DEBUG] 用户没有 store_id，检查是否为时序问题...');
    
    // 检查是否是时序问题（用户信息还未完全加载）
    if (user.id && user.role && !user.store_id) {
      console.log('🔍 [DEBUG] 检测到可能的时序问题，用户有ID和角色但缺少store_id');
      console.log('🔍 [DEBUG] 延迟验证，等待用户信息完全加载...');
      
      // 返回一个特殊的错误码，让前端可以重试
      return {
        valid: false,
        message: '用户信息加载中，请稍后重试',
        isRetryable: true // 添加重试标识
      };
    }
    
    console.log('🔍 [DEBUG] 用户确实没有门店分配');
    console.log('🔍 [DEBUG] 用户完整信息:', JSON.stringify(user, null, 2));
    return { valid: false, message: '用户未分配门店' };
  }

  if (storeId && user.store_id !== storeId) {
    return { 
      valid: false, 
      message: `权限不足：您只能${action === 'manage' ? '管理' : '查看'}自己门店的${action === 'manage' ? '排班' : '信息'}` 
    };
  }

  return { valid: true };
}

/**
 * 验证排班数据完整性
 * @param schedule 排班数据
 * @returns 验证结果
 */
export function validateScheduleData(schedule: any): { valid: boolean; message?: string } {
  if (!schedule) {
    return { valid: false, message: '排班数据为空' };
  }

  if (!schedule.appointment_id) {
    return { valid: false, message: '排班缺少关联预约' };
  }

  if (!schedule.scheduled_date) {
    return { valid: false, message: '排班日期不能为空' };
  }

  if (!schedule.scheduled_time_start || !schedule.scheduled_time_end) {
    return { valid: false, message: '排班时间不能为空' };
  }

  // 验证时间格式
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  if (!timeRegex.test(schedule.scheduled_time_start) || !timeRegex.test(schedule.scheduled_time_end)) {
    return { valid: false, message: '时间格式不正确' };
  }

  // 验证时间逻辑（开始时间应该早于结束时间）
  const startTime = schedule.scheduled_time_start.split(':').map(Number);
  const endTime = schedule.scheduled_time_end.split(':').map(Number);
  const startMinutes = startTime[0] * 60 + startTime[1];
  const endMinutes = endTime[0] * 60 + endTime[1];
  
  if (startMinutes >= endMinutes) {
    return { valid: false, message: '开始时间必须早于结束时间' };
  }

  return { valid: true };
}

/**
 * 验证预约数据完整性
 * @param appointment 预约数据
 * @returns 验证结果
 */
export function validateAppointmentData(appointment: any): { valid: boolean; message?: string } {
  if (!appointment) {
    return { valid: false, message: '预约数据为空' };
  }

  if (!appointment.customer_name) {
    return { valid: false, message: '客户姓名不能为空' };
  }

  if (!appointment.service_id) {
    return { valid: false, message: '服务项目不能为空' };
  }

  if (!appointment.requested_date) {
    return { valid: false, message: '预约日期不能为空' };
  }

  if (!appointment.estimated_duration || appointment.estimated_duration <= 0) {
    return { valid: false, message: '预估时长必须大于0' };
  }

  return { valid: true };
}

/**
 * 处理API错误的通用函数
 * @param error 错误对象
 * @param context 错误上下文
 * @returns 用户友好的错误消息
 */
export function handleApiError(error: any, context: string): string {
  console.error(`[${context}] API错误:`, error);
  
  // 如果是网络错误
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return '网络连接失败，请检查网络连接';
  }
  
  // 如果是HTTP状态码错误
  if (error.status) {
    switch (error.status) {
      case 401:
        return '登录已过期，请重新登录';
      case 403:
        return '权限不足，无法执行此操作';
      case 404:
        return '请求的资源不存在';
      case 500:
        return '服务器内部错误，请稍后重试';
      default:
        return `请求失败 (${error.status})`;
    }
  }
  
  // 如果是自定义错误消息
  if (error.message) {
    return error.message;
  }
  
  // 默认错误消息
  return `${context}失败，请稍后重试`;
}

/**
 * 验证时间冲突
 * @param existingSchedules 现有排班
 * @param newSchedule 新排班
 * @returns 是否有冲突
 */
export function hasTimeConflict(existingSchedules: any[], newSchedule: any): boolean {
  if (!newSchedule.scheduled_time_start || !newSchedule.scheduled_time_end) {
    return false;
  }
  
  const newStart = newSchedule.scheduled_time_start.split(':').map(Number);
  const newEnd = newSchedule.scheduled_time_end.split(':').map(Number);
  const newStartMinutes = newStart[0] * 60 + newStart[1];
  const newEndMinutes = newEnd[0] * 60 + newEnd[1];
  
  return existingSchedules.some(schedule => {
    if (!schedule.scheduled_time_start || !schedule.scheduled_time_end) {
      return false;
    }
    
    // 跳过同ID的排班（编辑时）
    if (schedule.id === newSchedule.id) {
      return false;
    }
    
    // 检查是否同一天
    if (schedule.scheduled_date !== newSchedule.scheduled_date) {
      return false;
    }
    
    // 检查是否有资源冲突（房间或护士）
    if (schedule.room_id !== newSchedule.room_id && schedule.nurse_id !== newSchedule.nurse_id) {
      return false;
    }
    
    const existingStart = schedule.scheduled_time_start.split(':').map(Number);
    const existingEnd = schedule.scheduled_time_end.split(':').map(Number);
    const existingStartMinutes = existingStart[0] * 60 + existingStart[1];
    const existingEndMinutes = existingEnd[0] * 60 + existingEnd[1];
    
    // 检查时间重叠
    return newStartMinutes < existingEndMinutes && existingStartMinutes < newEndMinutes;
  });
}

/**
 * 格式化错误消息显示
 * @param error 错误对象
 * @param defaultMessage 默认消息
 * @returns 格式化后的错误消息
 */
export function formatErrorMessage(error: any, defaultMessage: string = '操作失败'): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return defaultMessage;
}