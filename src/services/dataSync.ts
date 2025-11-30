import { query, transaction, getRedisClient } from '@/db/connection';
import { realtimeService, type RealtimeEvent } from './realtime';

/**
 * Data synchronization service for triggering real-time updates
 */
export class DataSyncService {
  /**
   * Trigger real-time event for appointment changes
   */
  static async notifyAppointmentChange(
    type: 'created' | 'updated' | 'deleted',
    appointmentId: string,
    userId?: string,
    data?: any
  ) {
    const eventType = `appointment_${type}` as const;

    const event: RealtimeEvent = {
      type: eventType,
      data: {
        appointmentId,
        userId,
        ...data,
      },
      userId,
      timestamp: new Date().toISOString(),
    };

    await realtimeService.publishEvent(event);
  }

  /**
   * Trigger real-time event for schedule changes
   */
  static async notifyScheduleChange(
    type: 'created' | 'updated' | 'deleted',
    scheduleId: string,
    userId?: string,
    data?: any
  ) {
    const eventType = `schedule_${type}` as const;

    const event: RealtimeEvent = {
      type: eventType,
      data: {
        scheduleId,
        userId,
        ...data,
      },
      userId,
      timestamp: new Date().toISOString(),
    };

    await realtimeService.publishEvent(event);
  }

  /**
   * Trigger real-time event for task execution changes
   */
  static async notifyTaskChange(
    taskExecutionId: string,
    status: string,
    userId?: string,
    data?: any
  ) {
    const event: RealtimeEvent = {
      type: 'task_updated',
      data: {
        taskExecutionId,
        status,
        userId,
        ...data,
      },
      userId,
      timestamp: new Date().toISOString(),
    };

    await realtimeService.publishEvent(event);
  }

  /**
   * Trigger real-time event for user profile changes
   */
  static async notifyUserChange(
    userId: string,
    changes: Record<string, any>,
    updatedBy?: string
  ) {
    const event: RealtimeEvent = {
      type: 'user_updated',
      data: {
        userId,
        changes,
        updatedBy,
      },
      userId: updatedBy,
      timestamp: new Date().toISOString(),
    };

    await realtimeService.publishEvent(event);
  }

  /**
   * Enhanced appointment creation with real-time notification
   */
  static async createAppointmentWithNotification(
    appointmentData: any,
    userId?: string
  ) {
    return await transaction(async (client) => {
      // Insert appointment
      const insertQuery = `
        INSERT INTO appointments (
          customer_name, customer_phone, companion_names, total_people,
          service_id, requested_date, requested_time_start, requested_time_end,
          estimated_duration, is_urgent, notes, sales_id, doctor_id, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        )
        RETURNING *
      `;

      const values = [
        appointmentData.customer_name,
        appointmentData.customer_phone,
        appointmentData.companion_names || [],
        appointmentData.total_people || 1,
        appointmentData.service_id,
        appointmentData.requested_date,
        appointmentData.requested_time_start,
        appointmentData.requested_time_end,
        appointmentData.estimated_duration,
        appointmentData.is_urgent || false,
        appointmentData.notes,
        appointmentData.sales_id,
        appointmentData.doctor_id,
        userId || appointmentData.created_by,
      ];

      const result = await client.query(insertQuery, values);
      const newAppointment = result.rows[0];

      // Trigger real-time notification
      await this.notifyAppointmentChange(
        'created',
        newAppointment.id,
        userId,
        { appointment: newAppointment }
      );

      return newAppointment;
    });
  }

  /**
   * Enhanced schedule update with real-time notification
   */
  static async updateScheduleWithNotification(
    scheduleId: string,
    updates: any,
    userId?: string
  ) {
    return await transaction(async (client) => {
      // Build SET clause dynamically
      const updateFields = Object.keys(updates);
      const setClause = updateFields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      const values = [scheduleId, ...Object.values(updates)];

      const updateQuery = `
        UPDATE schedules
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      const updatedSchedule = result.rows[0];

      if (!updatedSchedule) {
        throw new Error('Schedule not found');
      }

      // Trigger real-time notification
      await this.notifyScheduleChange(
        'updated',
        scheduleId,
        userId,
        { schedule: updatedSchedule, changes: updates }
      );

      return updatedSchedule;
    });
  }

  /**
   * Enhanced task execution update with real-time notification
   */
  static async updateTaskExecutionWithNotification(
    taskExecutionId: string,
    updates: any,
    userId?: string
  ) {
    return await transaction(async (client) => {
      // Build SET clause dynamically
      const updateFields = Object.keys(updates);
      const setClause = updateFields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      const values = [taskExecutionId, ...Object.values(updates)];

      const updateQuery = `
        UPDATE task_executions
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      const updatedTask = result.rows[0];

      if (!updatedTask) {
        throw new Error('Task execution not found');
      }

      // Trigger real-time notification for status changes
      if (updates.status) {
        await this.notifyTaskChange(
          taskExecutionId,
          updates.status,
          userId,
          { task: updatedTask }
        );
      }

      return updatedTask;
    });
  }

  /**
   * Get data changes since a specific timestamp
   */
  static async getChangesSince(
    table: string,
    sinceTimestamp: string,
    userId?: string
  ) {
    const query = `
      SELECT * FROM ${table}
      WHERE updated_at > $1
      ${userId ? 'AND created_by = $2 OR updated_by = $2' : ''}
      ORDER BY updated_at ASC
      LIMIT 100
    `;

    const params = userId ? [sinceTimestamp, userId] : [sinceTimestamp];
    const result = await query(query, params);

    return result.rows;
  }

  /**
   * Sync data changes for offline clients
   */
  static async syncOfflineChanges(
    lastSyncTimestamp: string,
    userId?: string
  ) {
    const changes = {
      appointments: await this.getChangesSince('appointments', lastSyncTimestamp, userId),
      schedules: await this.getChangesSince('schedules', lastSyncTimestamp, userId),
      taskExecutions: await this.getChangesSince('task_executions', lastSyncTimestamp, userId),
      users: userId ? await this.getChangesSince('profiles', lastSyncTimestamp) : [],
    };

    return {
      changes,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Batch notification for multiple changes
   */
  static async notifyBatchChanges(events: RealtimeEvent[]) {
    for (const event of events) {
      await realtimeService.publishEvent(event);
    }
  }

  /**
   * Cleanup old events from storage
   */
  static async cleanupOldEvents(olderThanHours: number = 24) {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - olderThanHours);

    try {
      // Cleanup Redis events
      const redisClient = getRedisClient();
      if (redisClient) {
        // This would need to be implemented based on your Redis structure
        console.log('Cleaning up old events from storage');
      }
    } catch (error) {
      console.error('Failed to cleanup old events:', error);
    }
  }
}

export default DataSyncService;