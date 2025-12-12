/**
 * 日期格式化工具函数
 * 统一处理项目中的日期显示格式，避免显示时区信息
 */

import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param date 日期字符串或Date对象
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: string | Date): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'yyyy-MM-dd');
  } catch (error) {
    console.warn('日期格式化失败:', date, error);
    return String(date);
  }
}

/**
 * 格式化日期为中文格式 YYYY年MM月DD日
 * @param date 日期字符串或Date对象
 * @returns 格式化后的中文日期字符串
 */
export function formatDateChinese(date: string | Date): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'yyyy年MM月dd日', { locale: zhCN });
  } catch (error) {
    console.warn('中文日期格式化失败:', date, error);
    return String(date);
  }
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm 格式
 * @param date 日期字符串或Date对象
 * @returns 格式化后的日期时间字符串
 */
export function formatDateTime(date: string | Date): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'yyyy-MM-dd HH:mm');
  } catch (error) {
    console.warn('日期时间格式化失败:', date, error);
    return String(date);
  }
}

/**
 * 格式化时间为 HH:mm 格式
 * @param time 时间字符串
 * @returns 格式化后的时间字符串
 */
export function formatTime(time: string): string {
  if (!time) return '';
  
  // 如果时间格式是 HH:mm:ss，截取前5位
  if (time.includes(':') && time.length > 5) {
    return time.substring(0, 5);
  }
  
  return time;
}

/**
 * 格式化日期为简短格式 MM/DD
 * @param date 日期字符串或Date对象
 * @returns 格式化后的简短日期字符串
 */
export function formatDateShort(date: string | Date): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'MM/dd');
  } catch (error) {
    console.warn('简短日期格式化失败:', date, error);
    return String(date);
  }
}

/**
 * 格式化日期为月份格式 YYYY/MM
 * @param date 日期字符串或Date对象
 * @returns 格式化后的月份字符串
 */
export function formatMonth(date: string | Date): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'yyyy/MM');
  } catch (error) {
    console.warn('月份格式化失败:', date, error);
    return String(date);
  }
}

/**
 * 检查日期字符串是否包含时区信息
 * @param dateString 日期字符串
 * @returns 是否包含时区信息
 */
export function hasTimezoneInfo(dateString: string): boolean {
  return dateString.includes('T') && (dateString.includes('Z') || dateString.includes('+') || dateString.includes('-'));
}

/**
 * 清理日期字符串，移除时区信息
 * @param dateString 日期字符串
 * @returns 清理后的日期字符串
 */
export function cleanDateString(dateString: string): string {
  if (!dateString) return '';
  
  // 如果包含时区信息，使用格式化函数处理
  if (hasTimezoneInfo(dateString)) {
    return formatDate(dateString);
  }
  
  return dateString;
}