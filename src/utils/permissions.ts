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