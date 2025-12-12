import type { Profile } from '@/types/types';

// 为了兼容性，我们使用更通用的用户类型
interface BaseUser {
  id: string;
  role: string;
  store_id?: string;
}

/**
 * 权限控制工具函数
 */

/**
 * 检查用户是否可以管理指定门店的排班
 * @param user 当前用户
 * @param storeId 要管理的门店ID
 * @returns 是否有权限
 */
export function canManageStoreSchedule(user: BaseUser | null, storeId?: string): boolean {
  if (!user) return false;
  
  // 管理员可以管理所有门店
  if (user.role === 'super_admin') return true;
  
  // 护士长只能管理自己门店的排班
  if (user.role === 'head_nurse') {
    return !storeId || user.store_id === storeId;
  }
  
  // 护士可以查看和管理自己的排班任务
  // 修复问题：护士用户 store_id 为 null 时，仍应能查看自己的排班
  if (user.role === 'nurse') {
    // 如果任务没有指定门店ID，或者任务门店与护士门店匹配，则允许访问
    // 对于护士角色，即使 store_id 为 null 也允许查看自己的排班
    return !storeId || user.store_id === storeId;
  }
  
  // 其他角色默认不能管理排班
  return false;
}

/**
 * 检查用户是否可以查看指定门店的排班
 * @param user 当前用户
 * @param storeId 要查看的门店ID
 * @returns 是否有权限
 */
export function canViewStoreSchedule(user: BaseUser | null, storeId?: string): boolean {
  if (!user) return false;
  
  // 管理员可以查看所有门店
  if (user.role === 'super_admin') return true;
  
  // 护士长只能查看自己门店的排班
  if (user.role === 'head_nurse') {
    return !storeId || user.store_id === storeId;
  }
  
  // 医生可以查看自己门店的排班
  if (user.role === 'doctor') {
    return !storeId || user.store_id === storeId;
  }
  
  // 护士可以查看自己门店的排班
  if (user.role === 'nurse') {
    return !storeId || user.store_id === storeId;
  }
  
  // 销售人员可以查看自己门店的排班
  if (user.role === 'sales') {
    return !storeId || user.store_id === storeId;
  }
  
  return false;
}

/**
 * 获取用户可以访问的门店ID
 * @param user 当前用户
 * @returns 可访问的门店ID，null表示可以访问所有门店
 */
export function getAccessibleStoreIds(user: BaseUser | null): string | null {
  if (!user) return null;
  
  // 管理员可以访问所有门店
  if (user.role === 'super_admin') return null;
  
  // 其他角色只能访问自己门店
  return user.store_id || null;
}

/**
 * 检查用户是否为管理员
 * @param user 当前用户
 * @returns 是否为管理员
 */
export function isAdmin(user: BaseUser | null): boolean {
  return user?.role === 'super_admin';
}

/**
 * 检查用户是否为护士长
 * @param user 当前用户
 * @returns 是否为护士长
 */
export function isHeadNurse(user: BaseUser | null): boolean {
  return user?.role === 'head_nurse';
}

/**
 * 获取用户角色显示名称
 * @param role 角色代码
 * @returns 角色显示名称
 */
export function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    super_admin: '超级管理员',
    head_nurse: '护士长',
    nurse: '护士',
    doctor: '医生',
    sales: '销售顾问',
  };
  
  return roleNames[role] || role;
}

/**
 * 检查用户是否可以处理特定工作流状态的预约
 * @param user 当前用户
 * @param appointment 预约信息
 * @returns 是否有权限
 */
export function canProcessAppointment(user: BaseUser | null, appointment: any): boolean {
  if (!user || !appointment) return false;
  
  // 超级管理员可以处理所有预约
  if (user.role === 'super_admin') return true;
  
  // 护士长只能处理需要护士长分配的预约
  if (user.role === 'head_nurse') {
    return ['pending_nurse_assignment', 'doctor_confirmed'].includes(appointment.workflow_status) &&
           (!appointment.store_id || user.store_id === appointment.store_id);
  }
  
  // 医生只能处理待医生确认的预约
  if (user.role === 'doctor') {
    return appointment.workflow_status === 'pending_doctor_confirmation' &&
           (!appointment.doctor_id || appointment.doctor_id === user.id) &&
           (!appointment.store_id || user.store_id === appointment.store_id);
  }
  
  return false;
}

/**
 * 获取工作流状态显示名称
 * @param status 工作流状态
 * @returns 状态显示名称
 */
export function getWorkflowStatusDisplayName(status: string): string {
  const statusNames: Record<string, string> = {
    pending_nurse_assignment: '待护士长分配',
    pending_doctor_confirmation: '待医生确认',
    doctor_confirmed: '医生已确认',
    doctor_rejected: '医生已拒绝',
    nurse_scheduled: '护士长已排班',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  };
  
  return statusNames[status] || status;
}

/**
 * 获取下一个有效的工作流状态
 * @param currentStatus 当前状态
 * @param userRole 用户角色
 * @returns 可转换的状态列表
 */
export function getNextWorkflowStatuses(currentStatus: string, userRole: string): string[] {
  const validStatuses: string[] = [];
  
  // 护士长可以操作的状态
  if (userRole === 'head_nurse') {
    if (['pending_nurse_assignment', 'doctor_confirmed'].includes(currentStatus)) {
      validStatuses.push('nurse_scheduled');
    }
    validStatuses.push('cancelled');
  }
  
  // 医生可以操作的状态
  if (userRole === 'doctor') {
    if (currentStatus === 'pending_doctor_confirmation') {
      validStatuses.push('doctor_confirmed', 'doctor_rejected');
    }
  }
  
  // 护士和护士长可以操作的状态
  if (userRole === 'nurse' || userRole === 'head_nurse') {
    if (currentStatus === 'nurse_scheduled') {
      validStatuses.push('in_progress');
    }
    if (currentStatus === 'in_progress') {
      validStatuses.push('completed');
    }
  }
  
  // 超级管理员可以进行所有状态转换
  if (userRole === 'super_admin') {
    validStatuses.push(
      'pending_nurse_assignment',
      'pending_doctor_confirmation',
      'doctor_confirmed',
      'doctor_rejected',
      'nurse_scheduled',
      'in_progress',
      'completed',
      'cancelled'
    );
  }
  
  return validStatuses;
}

/**
 * 检查用户是否可以确认预约
 * @param user 当前用户
 * @param appointment 预约信息
 * @returns 是否有权限
 */
export function canConfirmAppointment(user: BaseUser | null, appointment: any): boolean {
  if (!user || !appointment) return false;
  
  // 超级管理员可以确认所有预约
  if (user.role === 'super_admin') return true;
  
  // 检查门店权限
  if (appointment.store_id && user.store_id !== appointment.store_id) {
    return false;
  }
  
  // 只有医生可以确认待医生确认的预约
  if (user.role === 'doctor' &&
      appointment.workflow_status === 'pending_doctor_confirmation') {
    return true;
  }
  
  return false;
}

/**
 * 检查用户是否可以拒绝预约
 * @param user 当前用户
 * @param appointment 预约信息
 * @returns 是否有权限
 */
export function canRejectAppointment(user: BaseUser | null, appointment: any): boolean {
  if (!user || !appointment) return false;
  
  // 超级管理员可以拒绝所有预约
  if (user.role === 'super_admin') return true;
  
  // 检查门店权限
  if (appointment.store_id && user.store_id !== appointment.store_id) {
    return false;
  }
  
  // 只有医生可以拒绝待医生确认的预约
  if (user.role === 'doctor' &&
      appointment.workflow_status === 'pending_doctor_confirmation') {
    return true;
  }
  
  return false;
}

/**
 * 检查用户是否可以排班预约
 * @param user 当前用户
 * @param appointment 预约信息
 * @returns 是否有权限
 */
export function canScheduleAppointment(user: BaseUser | null, appointment: any): boolean {
  if (!user || !appointment) return false;
  
  // 超级管理员可以排班所有预约
  if (user.role === 'super_admin') return true;
  
  // 检查门店权限
  if (appointment.store_id && user.store_id !== appointment.store_id) {
    return false;
  }
  
  // 只有护士长可以排班待处理的预约
  if (user.role === 'head_nurse' &&
      (appointment.workflow_status === 'pending_nurse_assignment' ||
       appointment.workflow_status === 'doctor_confirmed')) {
    return true;
  }
  
  return false;
}

/**
 * 检查用户是否可以查看工作流历史
 * @param user 当前用户
 * @returns 是否有权限
 */
export function canViewWorkflowHistory(user: BaseUser | null): boolean {
  if (!user) return false;
  
  // 超级管理员、护士长、医生可以查看工作流历史
  return ['super_admin', 'head_nurse', 'doctor'].includes(user.role);
}

/**
 * 检查用户是否可以查看工作流统计
 * @param user 当前用户
 * @returns 是否有权限
 */
export function canViewWorkflowStatistics(user: BaseUser | null): boolean {
  if (!user) return false;
  
  // 超级管理员、护士长可以查看工作流统计
  return ['super_admin', 'head_nurse'].includes(user.role);
}

/**
 * 检查服务是否为护理类服务
 * @param serviceCategory 服务类别
 * @returns 是否为护理类服务
 */
export function isNursingService(serviceCategory: string): boolean {
  return serviceCategory === 'nursing';
}

/**
 * 检查服务是否为医生类服务
 * @param serviceCategory 服务类别
 * @returns 是否为医生类服务
 */
export function isDoctorService(serviceCategory: string): boolean {
  return ['consultation', 'report'].includes(serviceCategory);
}

/**
 * 检查服务是否需要医生确认
 * @param serviceCategory 服务类别
 * @returns 是否需要医生确认
 */
export function requiresDoctorConfirmation(serviceCategory: string): boolean {
  return ['consultation', 'report'].includes(serviceCategory);
}

/**
 * 检查服务是否需要护士排班
 * @param serviceCategory 服务类别
 * @returns 是否需要护士排班
 */
export function requiresNurseScheduling(serviceCategory: string): boolean {
  return ['nursing', 'consultation', 'report'].includes(serviceCategory);
}

/**
 * 检查用户是否可以访问护士长待处理预约列表
 * @param user 当前用户
 * @returns 是否有权限
 */
export function canAccessNursePendingAppointments(user: BaseUser | null): boolean {
  if (!user) return false;
  
  // 超级管理员和护士长可以访问
  return ['super_admin', 'head_nurse'].includes(user.role);
}

/**
 * 检查用户是否可以访问医生待处理预约列表
 * @param user 当前用户
 * @returns 是否有权限
 */
export function canAccessDoctorPendingAppointments(user: BaseUser | null): boolean {
  if (!user) return false;
  
  // 超级管理员和医生可以访问
  return ['super_admin', 'doctor'].includes(user.role);
}

/**
 * 检查用户是否可以更新工作流状态
 * @param user 当前用户
 * @param appointment 预约信息
 * @param targetStatus 目标状态
 * @returns 是否有权限
 */
export function canUpdateWorkflowStatus(user: BaseUser | null, appointment: any, targetStatus: string): boolean {
  if (!user || !appointment) return false;
  
  // 超级管理员可以进行所有状态转换
  if (user.role === 'super_admin') return true;
  
  // 检查门店权限
  if (appointment.store_id && user.store_id !== appointment.store_id) {
    return false;
  }
  
  const currentStatus = appointment.workflow_status;
  
  // 护士长权限
  if (user.role === 'head_nurse') {
    // 可以将待护士分配或医生已确认的预约转换为护士已排班
    if ((currentStatus === 'pending_nurse_assignment' || currentStatus === 'doctor_confirmed') &&
        targetStatus === 'nurse_scheduled') {
      return true;
    }
  }
  
  // 医生权限
  if (user.role === 'doctor') {
    // 可以将待医生确认的预约转换为医生已确认或医生已拒绝
    if (currentStatus === 'pending_doctor_confirmation' &&
        (targetStatus === 'doctor_confirmed' || targetStatus === 'doctor_rejected')) {
      return true;
    }
  }
  
  return false;
}

/**
 * 获取工作流状态的颜色标识
 * @param status 工作流状态
 * @returns 颜色标识
 */
export function getWorkflowStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    pending_nurse_assignment: 'orange', // 待护士分配
    pending_doctor_confirmation: 'blue', // 待医生确认
    doctor_confirmed: 'green', // 医生已确认
    doctor_rejected: 'red', // 医生已拒绝
    nurse_scheduled: 'purple', // 护士已排班
    in_progress: 'indigo', // 进行中
    completed: 'green', // 已完成
    cancelled: 'gray', // 已取消
  };
  
  return colorMap[status] || 'gray';
}

/**
 * 获取工作流状态的图标标识
 * @param status 工作流状态
 * @returns 图标标识
 */
export function getWorkflowStatusIcon(status: string): string {
  const iconMap: Record<string, string> = {
    pending_nurse_assignment: 'clock', // 待护士分配
    pending_doctor_confirmation: 'user-check', // 待医生确认
    doctor_confirmed: 'check-circle', // 医生已确认
    doctor_rejected: 'close-circle', // 医生已拒绝
    nurse_scheduled: 'calendar', // 护士已排班
    in_progress: 'play-circle', // 进行中
    completed: 'check-square', // 已完成
    cancelled: 'stop', // 已取消
  };
  
  return iconMap[status] || 'question-circle';
}

/**
 * 检查预约是否可以取消
 * @param user 当前用户
 * @param appointment 预约信息
 * @returns 是否可以取消
 */
export function canCancelAppointment(user: BaseUser | null, appointment: any): boolean {
  if (!user || !appointment) return false;
  
  // 超级管理员可以取消所有预约
  if (user.role === 'super_admin') return true;
  
  // 检查门店权限
  if (appointment.store_id && user.store_id !== appointment.store_id) {
    return false;
  }
  
  const currentStatus = appointment.workflow_status;
  
  // 只有特定状态的预约可以取消
  const cancellableStatuses = [
    'pending_nurse_assignment',
    'pending_doctor_confirmation',
    'doctor_confirmed',
    'nurse_scheduled'
  ];
  
  if (!cancellableStatuses.includes(currentStatus)) {
    return false;
  }
  
  // 护士长可以取消待分配和已排班的预约
  if (user.role === 'head_nurse') {
    return ['pending_nurse_assignment', 'doctor_confirmed', 'nurse_scheduled'].includes(currentStatus);
  }
  
  // 医生可以取消待确认的预约
  if (user.role === 'doctor') {
    return currentStatus === 'pending_doctor_confirmation';
  }
  
  return false;
}

/**
 * 检查用户是否可以访问护士任务页面
 * @param user 当前用户
 * @returns 是否有权限
 */
export function canAccessNurseTasks(user: BaseUser | null): boolean {
  if (!user) return false;
  
  // 护士、护士长和超级管理员可以访问护士任务
  return ['nurse', 'head_nurse', 'super_admin'].includes(user.role);
}

/**
 * 检查用户是否可以处理护士任务
 * @param user 当前用户
 * @param task 任务信息
 * @returns 是否有权限
 */
export function canProcessNurseTask(user: BaseUser | null, task: any): boolean {
  if (!user || !task) return false;
  
  // 超级管理员可以处理所有任务
  if (user.role === 'super_admin') return true;
  
  // 检查门店权限
  if (task.store_id && user.store_id !== task.store_id) {
    return false;
  }
  
  // 护士只能处理分配给自己的任务
  if (user.role === 'nurse') {
    return task.nurse_id === user.id;
  }
  
  // 护士长可以处理自己门店的所有任务，也可以给自己分配任务
  if (user.role === 'head_nurse') {
    // 可以处理分配给自己的任务
    if (task.nurse_id === user.id) return true;
    
    // 可以处理自己门店的任务（用于管理和重新分配）
    return !task.store_id || user.store_id === task.store_id;
  }
  
  return false;
}

/**
 * 检查用户是否可以开始执行任务
 * @param user 当前用户
 * @param task 任务信息
 * @returns 是否有权限
 */
export function canStartTask(user: BaseUser | null, task: any): boolean {
  if (!user || !task) return false;
  
  // 超级管理员可以开始所有任务
  if (user.role === 'super_admin') return true;
  
  // 只有分配给自己的任务才能开始
  if (task.nurse_id !== user.id) return false;
  
  // 护士和护士长都可以开始任务
  if (['nurse', 'head_nurse'].includes(user.role)) {
    return task.status === 'scheduled';
  }
  
  return false;
}

/**
 * 检查用户是否可以完成任务
 * @param user 当前用户
 * @param task 任务信息
 * @returns 是否有权限
 */
export function canCompleteTask(user: BaseUser | null, task: any): boolean {
  if (!user || !task) return false;
  
  // 超级管理员可以完成所有任务
  if (user.role === 'super_admin') return true;
  
  // 只有分配给自己的任务才能完成
  if (task.nurse_id !== user.id) return false;
  
  // 护士和护士长都可以完成任务
  if (['nurse', 'head_nurse'].includes(user.role)) {
    return task.status === 'in_progress';
  }
  
  return false;
}

/**
 * 检查用户是否可以给自己分配任务
 * @param user 当前用户
 * @param schedule 排班信息
 * @returns 是否有权限
 */
export function canSelfAssignTask(user: BaseUser | null, schedule: any): boolean {
  if (!user || !schedule) return false;
  
  // 超级管理员可以分配所有任务
  if (user.role === 'super_admin') return true;
  
  // 检查门店权限
  if (schedule.store_id && user.store_id !== schedule.store_id) {
    return false;
  }
  
  // 护士长可以给自己分配任务
  if (user.role === 'head_nurse') {
    return schedule.status === 'scheduled' && !schedule.nurse_id;
  }
  
  return false;
}

/**
 * 检查用户是否可以访问任务历史页面
 * @param user 当前用户
 * @returns 是否有权限
 */
export function canAccessTaskHistory(user: BaseUser | null): boolean {
  if (!user) return false;
  
  // 护士、护士长和超级管理员可以访问任务历史
  return ['nurse', 'head_nurse', 'super_admin'].includes(user.role);
}

/**
 * 检查用户是否可以查看所有任务历史数据
 * @param user 当前用户
 * @returns 是否有权限
 */
export function canViewAllTaskHistory(user: BaseUser | null): boolean {
  if (!user) return false;
  
  // 只有超级管理员可以查看所有数据
  return user.role === 'super_admin';
}

/**
 * 检查用户是否可以选择任务历史数据范围
 * @param user 当前用户
 * @returns 是否有权限
 */
export function canChooseTaskHistoryScope(user: BaseUser | null): boolean {
  if (!user) return false;
  
  // 护士长可以选择查看自己的数据或门店的数据
  return user.role === 'head_nurse';
}

/**
 * 获取用户可以访问的任务历史数据范围
 * @param user 当前用户
 * @param scope 选择的数据范围（仅护士长可用）
 * @returns 数据筛选参数
 */
export function getTaskHistoryFilters(user: BaseUser | null, scope?: 'self' | 'store'): {
  nurse_id?: string;
  store_id?: string;
} {
  if (!user) return {};
  
  // 超级管理员可以查看所有数据
  if (user.role === 'super_admin') {
    return {};
  }
  
  // 护士长可以选择数据范围
  if (user.role === 'head_nurse') {
    if (scope === 'self') {
      return { nurse_id: user.id };
    } else if (scope === 'store' && user.store_id) {
      return { store_id: user.store_id };
    }
    // 默认查看自己的数据
    return { nurse_id: user.id };
  }
  
  // 普通护士只能查看自己的数据
  if (user.role === 'nurse') {
    return { nurse_id: user.id };
  }
  
  return {};
}