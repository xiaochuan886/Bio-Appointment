/**
 * 门店排班权限测试
 * 这些测试用于验证门店范围限制和权限控制是否正常工作
 */

import { 
  canManageStoreSchedule, 
  canViewStoreSchedule, 
  getAccessibleStoreIds,
  isAdmin,
  isHeadNurse
} from '@/utils/permissions';
import { 
  validateStoreAccess, 
  validateScheduleData, 
  validateAppointmentData,
  hasTimeConflict 
} from '@/utils/validation';

// 测试用户数据
const mockUsers = {
  superAdmin: {
    id: '1',
    role: 'super_admin',
    store_id: undefined
  },
  headNurse: {
    id: '2',
    role: 'head_nurse',
    store_id: 'store-1'
  },
  headNurseNoStore: {
    id: '3',
    role: 'head_nurse',
    store_id: undefined
  },
  doctor: {
    id: '4',
    role: 'doctor',
    store_id: 'store-1'
  },
  nurse: {
    id: '5',
    role: 'nurse',
    store_id: 'store-1'
  }
};

// 测试门店ID
const testStoreIds = {
  sameStore: 'store-1',
  differentStore: 'store-2',
  undefined: undefined
};

// 测试排班数据
const mockSchedule = {
  id: 'schedule-1',
  appointment_id: 'appointment-1',
  scheduled_date: '2025-12-07',
  scheduled_time_start: '09:00',
  scheduled_time_end: '10:00',
  room_id: 'room-1',
  nurse_id: 'nurse-1'
};

// 测试预约数据
const mockAppointment = {
  customer_name: '测试客户',
  service_id: 'service-1',
  requested_date: '2025-12-07',
  estimated_duration: 60
};

/**
 * 权限控制测试
 */
export function testPermissionControls() {
  console.log('=== 权限控制测试 ===');
  
  // 测试管理员权限
  console.log('管理员权限测试:');
  console.log(`- 可以管理所有门店: ${canManageStoreSchedule(mockUsers.superAdmin, testStoreIds.differentStore)}`);
  console.log(`- 可以查看所有门店: ${canViewStoreSchedule(mockUsers.superAdmin, testStoreIds.differentStore)}`);
  console.log(`- 可访问门店ID: ${getAccessibleStoreIds(mockUsers.superAdmin)}`);
  console.log(`- 是管理员: ${isAdmin(mockUsers.superAdmin)}`);
  
  // 测试护士长权限
  console.log('\n护士长权限测试:');
  console.log(`- 可以管理自己门店: ${canManageStoreSchedule(mockUsers.headNurse, testStoreIds.sameStore)}`);
  console.log(`- 不能管理其他门店: ${canManageStoreSchedule(mockUsers.headNurse, testStoreIds.differentStore)}`);
  console.log(`- 可以查看自己门店: ${canViewStoreSchedule(mockUsers.headNurse, testStoreIds.sameStore)}`);
  console.log(`- 不能查看其他门店: ${canViewStoreSchedule(mockUsers.headNurse, testStoreIds.differentStore)}`);
  console.log(`- 可访问门店ID: ${getAccessibleStoreIds(mockUsers.headNurse)}`);
  console.log(`- 是护士长: ${isHeadNurse(mockUsers.headNurse)}`);
  
  // 测试无门店护士长
  console.log('\n无门店护士长测试:');
  console.log(`- 不能管理任何门店: ${canManageStoreSchedule(mockUsers.headNurseNoStore, testStoreIds.sameStore)}`);
  console.log(`- 可访问门店ID: ${getAccessibleStoreIds(mockUsers.headNurseNoStore)}`);
}

/**
 * 数据验证测试
 */
export function testDataValidation() {
  console.log('\n=== 数据验证测试 ===');
  
  // 测试门店访问验证
  console.log('门店访问验证测试:');
  const validAccess = validateStoreAccess(mockUsers.headNurse, testStoreIds.sameStore, 'manage');
  console.log(`- 有效访问: ${validAccess.valid}, 消息: ${validAccess.message}`);
  
  const invalidAccess = validateStoreAccess(mockUsers.headNurse, testStoreIds.differentStore, 'manage');
  console.log(`- 无效访问: ${invalidAccess.valid}, 消息: ${invalidAccess.message}`);
  
  // 测试排班数据验证
  console.log('\n排班数据验证测试:');
  const validSchedule = validateScheduleData(mockSchedule);
  console.log(`- 有效排班: ${validSchedule.valid}, 消息: ${validSchedule.message}`);
  
  const invalidSchedule = validateScheduleData({ ...mockSchedule, scheduled_time_start: '10:00', scheduled_time_end: '09:00' });
  console.log(`- 无效排班(时间错误): ${invalidSchedule.valid}, 消息: ${invalidSchedule.message}`);
  
  // 测试预约数据验证
  console.log('\n预约数据验证测试:');
  const validAppointment = validateAppointmentData(mockAppointment);
  console.log(`- 有效预约: ${validAppointment.valid}, 消息: ${validAppointment.message}`);
  
  const invalidAppointment = validateAppointmentData({ ...mockAppointment, customer_name: '' });
  console.log(`- 无效预约(缺少客户名): ${invalidAppointment.valid}, 消息: ${invalidAppointment.message}`);
}

/**
 * 时间冲突测试
 */
export function testTimeConflicts() {
  console.log('\n=== 时间冲突测试 ===');
  
  const existingSchedules = [
    {
      ...mockSchedule,
      id: 'existing-1',
      scheduled_time_start: '09:00',
      scheduled_time_end: '10:00',
      room_id: 'room-1'
    }
  ];
  
  const newScheduleNoConflict = {
    ...mockSchedule,
    id: 'new-1',
    scheduled_time_start: '10:00',
    scheduled_time_end: '11:00',
    room_id: 'room-2'
  };
  
  const newScheduleWithConflict = {
    ...mockSchedule,
    id: 'new-2',
    scheduled_time_start: '09:30',
    scheduled_time_end: '10:30',
    room_id: 'room-1'
  };
  
  console.log(`无冲突测试: ${hasTimeConflict(existingSchedules, newScheduleNoConflict)}`);
  console.log(`有冲突测试: ${hasTimeConflict(existingSchedules, newScheduleWithConflict)}`);
  console.log(`自编辑测试(同ID): ${hasTimeConflict(existingSchedules, { ...newScheduleWithConflict, id: 'existing-1' })}`);
}

/**
 * 运行所有测试
 */
export function runAllTests() {
  console.log('开始门店排班权限测试...\n');
  
  testPermissionControls();
  testDataValidation();
  testTimeConflicts();
  
  console.log('\n=== 测试完成 ===');
  console.log('所有测试已运行，请检查控制台输出验证结果。');
}

// 如果在浏览器环境中，可以将测试函数暴露到全局
if (typeof window !== 'undefined') {
  (window as any).storeScheduleTests = {
    testPermissionControls,
    testDataValidation,
    testTimeConflicts,
    runAllTests
  };
}