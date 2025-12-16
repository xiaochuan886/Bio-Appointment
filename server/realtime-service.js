class RealtimeService {
  constructor(databasePool) {
    this.pool = databasePool;
    this.wss = null;
  }
  
  setWebSocketServer(webSocketServer) {
    this.wss = webSocketServer;
    console.log('🔌 WebSocket server set in real-time service');
  }
  
  async initializeDatabase() {
    try {
      // Create notification settings table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS notification_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          notification_type VARCHAR(50) NOT NULL,
          enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, notification_type)
        )
      `);
      
      // Create notification history table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS notification_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          notification_type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          data JSONB,
          read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create indexes for better performance
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
        CREATE INDEX IF NOT EXISTS idx_notification_history_read ON notification_history(read);
        CREATE INDEX IF NOT EXISTS idx_notification_history_created_at ON notification_history(created_at);
        CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
      `);
      
      console.log('✅ Notification tables initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize notification tables:', error);
      throw error;
    }
  }
  
  async getNotificationSettings(userId) {
    try {
      const result = await this.pool.query(
        'SELECT notification_type, enabled FROM notification_settings WHERE user_id = $1',
        [userId]
      );
      
      // Convert to object with default values
      const settings = {
        task_status_change: true,
        new_task_assignment: true,
        schedule_change: true,
        new_appointment: true,
        appointment_status_change: true,
        system_announcement: true
      };
      
      result.rows.forEach(row => {
        settings[row.notification_type] = row.enabled;
      });
      
      return settings;
    } catch (error) {
      console.error('Failed to get notification settings:', error);
      return {};
    }
  }
  
  async updateNotificationSettings(userId, settings) {
    try {
      await this.pool.query('BEGIN');
      
      for (const [notificationType, enabled] of Object.entries(settings)) {
        await this.pool.query(`
          INSERT INTO notification_settings (user_id, notification_type, enabled)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, notification_type)
          DO UPDATE SET
            enabled = EXCLUDED.enabled,
            updated_at = CURRENT_TIMESTAMP
        `, [userId, notificationType, enabled]);
      }
      
      await this.pool.query('COMMIT');
      return true;
    } catch (error) {
      await this.pool.query('ROLLBACK');
      console.error('Failed to update notification settings:', error);
      return false;
    }
  }
  
  async addNotificationToHistory(userId, notificationType, title, message, data = null) {
    try {
      const result = await this.pool.query(`
        INSERT INTO notification_history (user_id, notification_type, title, message, data)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, created_at
      `, [userId, notificationType, title, message, JSON.stringify(data)]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Failed to add notification to history:', error);
      return null;
    }
  }
  
  async getNotificationHistory(userId, limit = 50, offset = 0, unreadOnly = false) {
    try {
      let query = `
        SELECT id, notification_type, title, message, data, read, created_at
        FROM notification_history
        WHERE user_id = $1
      `;
      let params = [userId];
      
      if (unreadOnly) {
        query += ' AND read = false';
      }
      
      query += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
      params.push(limit, offset);
      
      const result = await this.pool.query(query, params);
      
      // Parse JSON data for each notification
      return result.rows.map(row => ({
        ...row,
        data: row.data ? JSON.parse(row.data) : null
      }));
    } catch (error) {
      console.error('Failed to get notification history:', error);
      return [];
    }
  }
  
  async markNotificationsAsRead(userId, notificationIds = null) {
    try {
      let query = 'UPDATE notification_history SET read = true WHERE user_id = $1';
      let params = [userId];
      
      if (notificationIds && notificationIds.length > 0) {
        query += ` AND id = ANY($2)`;
        params.push(notificationIds);
      }
      
      const result = await this.pool.query(query, params);
      return result.rowCount;
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      return 0;
    }
  }
  
  async getUnreadNotificationCount(userId) {
    try {
      const result = await this.pool.query(
        'SELECT COUNT(*) as count FROM notification_history WHERE user_id = $1 AND read = false',
        [userId]
      );
      
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Failed to get unread notification count:', error);
      return 0;
    }
  }
  
  async determineRecipients(notificationType, data) {
    try {
      const recipients = [];
      
      switch (notificationType) {
        case 'task_status_change':
          // Notify assigned nurse and head nurses of the store
          if (data.assigned_to) {
            recipients.push({ userId: data.assigned_to, type: 'user' });
          }
          if (data.store_id) {
            const headNurses = await this.pool.query(
              'SELECT id FROM profiles WHERE role = $1 AND store_id = $2 AND status = $3',
              ['head_nurse', data.store_id, 'active']
            );
            headNurses.rows.forEach(nurse => {
              recipients.push({ userId: nurse.id, type: 'user' });
            });
          }
          break;
          
        case 'new_task_assignment':
          // Notify assigned nurse
          if (data.assigned_to) {
            recipients.push({ userId: data.assigned_to, type: 'user' });
          }
          break;
          
        case 'schedule_change':
          // Notify affected nurse and head nurses of the store
          if (data.nurse_id) {
            recipients.push({ userId: data.nurse_id, type: 'user' });
          }
          if (data.store_id) {
            const headNurses = await this.pool.query(
              'SELECT id FROM profiles WHERE role = $1 AND store_id = $2 AND status = $3',
              ['head_nurse', data.store_id, 'active']
            );
            headNurses.rows.forEach(nurse => {
              recipients.push({ userId: nurse.id, type: 'user' });
            });
          }
          break;
          
        case 'new_appointment':
          // Notify head nurses of the store
          if (data.store_id) {
            const headNurses = await this.pool.query(
              'SELECT id FROM profiles WHERE role = $1 AND store_id = $2 AND status = $3',
              ['head_nurse', data.store_id, 'active']
            );
            headNurses.rows.forEach(nurse => {
              recipients.push({ userId: nurse.id, type: 'user' });
            });
          }
          break;
          
        case 'appointment_status_change':
          // Notify assigned nurse (if any) and head nurses of the store
          if (data.nurse_id) {
            recipients.push({ userId: data.nurse_id, type: 'user' });
          }
          if (data.store_id) {
            const headNurses = await this.pool.query(
              'SELECT id FROM profiles WHERE role = $1 AND store_id = $2 AND status = $3',
              ['head_nurse', data.store_id, 'active']
            );
            headNurses.rows.forEach(nurse => {
              recipients.push({ userId: nurse.id, type: 'user' });
            });
          }
          break;
          
        case 'system_announcement':
          // Notify all active users
          const allUsers = await this.pool.query(
            'SELECT id FROM profiles WHERE status = $1',
            ['active']
          );
          allUsers.rows.forEach(user => {
            recipients.push({ userId: user.id, type: 'user' });
          });
          break;
          
        default:
          console.warn('Unknown notification type:', notificationType);
      }
      
      return recipients;
    } catch (error) {
      console.error('Failed to determine recipients:', error);
      return [];
    }
  }
  
  async sendNotification(notificationType, title, message, data = null, targetRooms = null) {
    try {
      if (!this.wss) {
        console.warn('WebSocket server not available, skipping notification');
        return 0;
      }
      
      const notification = {
        type: 'notification',
        notificationType,
        title,
        message,
        data,
        timestamp: new Date().toISOString()
      };
      
      let sentCount = 0;
      
      if (targetRooms && targetRooms.length > 0) {
        // Send to specific rooms
        for (const room of targetRooms) {
          sentCount += this.wss.broadcast(notification, room);
        }
      } else {
        // Determine recipients and send to specific users
        const recipients = await this.determineRecipients(notificationType, data);
        
        for (const recipient of recipients) {
          // Check if user has this notification type enabled
          const settings = await this.getNotificationSettings(recipient.userId);
          if (settings[notificationType] !== false) {
            // Add to history
            await this.addNotificationToHistory(
              recipient.userId,
              notificationType,
              title,
              message,
              data
            );
            
            // Send real-time notification
            sentCount += this.wss.sendToUser(recipient.userId, notification);
          }
        }
      }
      
      console.log(`📢 Notification sent: ${notificationType} to ${sentCount} recipients`);
      return sentCount;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return 0;
    }
  }
  
  // Convenience methods for common notification types
  
  async notifyTaskStatusChange(taskId, oldStatus, newStatus, assignedTo, storeId) {
    return this.sendNotification(
      'task_status_change',
      '任务状态变更',
      `任务状态从 "${oldStatus}" 变更为 "${newStatus}"`,
      { taskId, oldStatus, newStatus, assigned_to: assignedTo, store_id: storeId }
    );
  }
  
  async notifyNewTaskAssignment(taskId, taskTitle, assignedTo) {
    return this.sendNotification(
      'new_task_assignment',
      '新任务分配',
      `您有新的任务: ${taskTitle}`,
      { taskId, taskTitle, assigned_to: assignedTo }
    );
  }
  
  async notifyScheduleChange(scheduleId, nurseId, storeId, changeType) {
    return this.sendNotification(
      'schedule_change',
      '排班变更',
      `您的排班已${changeType}`,
      { scheduleId, nurse_id: nurseId, store_id: storeId, changeType }
    );
  }
  
  async notifyNewAppointment(appointmentId, customerName, serviceName, storeId) {
    return this.sendNotification(
      'new_appointment',
      '新预约',
      `新预约: ${customerName} - ${serviceName}`,
      { appointmentId, customerName, serviceName, store_id: storeId }
    );
  }
  
  async notifyAppointmentStatusChange(appointmentId, oldStatus, newStatus, nurseId, storeId) {
    return this.sendNotification(
      'appointment_status_change',
      '预约状态变更',
      `预约状态从 "${oldStatus}" 变更为 "${newStatus}"`,
      { appointmentId, oldStatus, newStatus, nurse_id: nurseId, store_id: storeId }
    );
  }
  
  async notifySystemAnnouncement(title, message) {
    return this.sendNotification(
      'system_announcement',
      title,
      message,
      null,
      ['role:super_admin', 'role:head_nurse', 'role:nurse', 'role:doctor', 'role:sales']
    );
  }
}

export { RealtimeService };