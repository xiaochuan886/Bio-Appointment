
const { query } = require('../db/connection');

class DingTalkNotifyService {
  /**
   * Send a work notification to users
   * @param {string[]} userIds - List of DingTalk UserIDs
   * @param {object} message - Message content (markdown or text)
   */
  async sendWorkNotification(userIds, message) {
    console.log(`[DingTalk Notify] Sending to ${userIds.join(',')}:`, message);
    
    // In a real implementation, this would:
    // 1. Get the access token from DB or cache
    // 2. Call DingTalk API: https://oapi.dingtalk.com/topapi/message/corpconversation/asyncsend_v2
    
    try {
        // Mock implementation
        const configResult = await query('SELECT * FROM dingtalk_sync_config LIMIT 1');
        const config = configResult.rows[0];
        
        if (!config || !config.app_key) {
            console.warn('[DingTalk Notify] No DingTalk config found, skipping notification.');
            return;
        }

        // Simulate API call
        // const accessToken = await getAccessToken(config.app_key, config.app_secret);
        // await axios.post(...)
        
        console.log('[DingTalk Notify] Notification sent successfully (mock).');
        return true;
    } catch (error) {
        console.error('[DingTalk Notify] Failed to send notification:', error);
        return false;
    }
  }

  /**
   * Notify Head Nurse about Urgent Order
   */
  async notifyUrgentOrder(appointment, headNurseId) {
    const message = {
        msgtype: "markdown",
        markdown: {
            title: "【紧急】急单预约提醒",
            text: `### ⚠️ 急单预约提醒\n\n**客户**: ${appointment.customer_name}\n**项目**: ${appointment.service_name}\n**时间**: ${appointment.requested_time_start}\n\n请立即处理！`
        }
    };
    return this.sendWorkNotification([headNurseId], message);
  }

  /**
   * Notify Sales about Doctor's Decision
   */
  async notifyDoctorDecision(appointment, doctorId, decision, note) {
      const title = decision === 'accepted' ? '预约已接受' : '预约已拒绝';
      const color = decision === 'accepted' ? '#00AA00' : '#FF0000';
      const message = {
          msgtype: "markdown",
          markdown: {
              title: title,
              text: `### <font color="${color}">${title}</font>\n\n**客户**: ${appointment.customer_name}\n**医生**: ${appointment.doctor_name}\n**备注**: ${note || '无'}\n\n请查看详情。`
          }
      };
      // Assuming appointment has sales_id, we need to fetch sales DingTalk ID
      // This is a placeholder
      return this.sendWorkNotification(['sales_dingtalk_id_placeholder'], message);
  }
}

module.exports = new DingTalkNotifyService();
