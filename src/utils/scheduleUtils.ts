import type { ScheduleWithDetails } from '@/types/types';

export interface ResourceConflict {
  type: 'room' | 'nurse';
  resourceId: string;
  resourceName: string;
  conflictingSchedules: Array<{
    id: string;
    customerName: string;
    timeStart: string;
    timeEnd: string;
    serviceName: string;
  }>;
}

// 检测时间段是否重叠
export function isTimeOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const [h1, m1, s1 = 0] = start1.split(':').map(Number);
  const [h2, m2, s2 = 0] = end1.split(':').map(Number);
  const [h3, m3, s3 = 0] = start2.split(':').map(Number);
  const [h4, m4, s4 = 0] = end2.split(':').map(Number);

  const start1Minutes = h1 * 60 + m1;
  const end1Minutes = h2 * 60 + m2;
  const start2Minutes = h3 * 60 + m3;
  const end2Minutes = h4 * 60 + m4;

  return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
}

// 检测资源冲突
export function detectResourceConflicts(
  existingSchedules: ScheduleWithDetails[],
  newSchedule: {
    scheduled_time_start: string;
    scheduled_time_end: string;
    room_id: string;
    nurse_id: string;
  },
  excludeScheduleId?: string
): ResourceConflict[] {
  const conflicts: ResourceConflict[] = [];

  // 过滤掉正在编辑的排班
  const relevantSchedules = existingSchedules.filter(
    schedule => schedule.id !== excludeScheduleId
  );

  // 检查房间冲突
  const roomConflicts = relevantSchedules.filter(
    schedule =>
      schedule.room_id === newSchedule.room_id &&
      isTimeOverlap(
        newSchedule.scheduled_time_start,
        newSchedule.scheduled_time_end,
        schedule.scheduled_time_start,
        schedule.scheduled_time_end
      )
  );

  if (roomConflicts.length > 0) {
    const room = roomConflicts[0].room;
    conflicts.push({
      type: 'room',
      resourceId: newSchedule.room_id,
      resourceName: room?.name || '未知房间',
      conflictingSchedules: roomConflicts.map(schedule => ({
        id: schedule.id,
        customerName: schedule.appointment?.customer_name || '未知客户',
        timeStart: schedule.scheduled_time_start,
        timeEnd: schedule.scheduled_time_end,
        serviceName: schedule.appointment?.service?.name || '未知服务',
      })),
    });
  }

  // 检查护士冲突
  const nurseConflicts = relevantSchedules.filter(
    schedule =>
      schedule.nurse_id === newSchedule.nurse_id &&
      isTimeOverlap(
        newSchedule.scheduled_time_start,
        newSchedule.scheduled_time_end,
        schedule.scheduled_time_start,
        schedule.scheduled_time_end
      )
  );

  if (nurseConflicts.length > 0) {
    const nurse = nurseConflicts[0].nurse;
    conflicts.push({
      type: 'nurse',
      resourceId: newSchedule.nurse_id,
      resourceName: nurse?.name || '未知护士',
      conflictingSchedules: nurseConflicts.map(schedule => ({
        id: schedule.id,
        customerName: schedule.appointment?.customer_name || '未知客户',
        timeStart: schedule.scheduled_time_start,
        timeEnd: schedule.scheduled_time_end,
        serviceName: schedule.appointment?.service?.name || '未知服务',
      })),
    });
  }

  return conflicts;
}
