import { query, getRedisClient } from '@/db/connection';

export interface RealtimeEvent {
  type: 'appointment_created' | 'appointment_updated' | 'appointment_deleted' |
        'schedule_created' | 'schedule_updated' | 'schedule_deleted' |
        'task_updated' | 'user_updated';
  data: any;
  userId?: string;
  timestamp: string;
}

export interface RealtimeSubscription {
  id: string;
  eventTypes: string[];
  callback: (event: RealtimeEvent) => void;
  userId?: string;
}

/**
 * Real-time data synchronization service
 */
export class RealtimeService {
  private static instance: RealtimeService;
  private subscriptions: Map<string, RealtimeSubscription> = new Map();
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  private constructor() {
    this.initializeWebSocket();
    this.setupDatabaseListeners();
  }

  static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  /**
   * Initialize WebSocket connection
   */
  private async initializeWebSocket() {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;

    try {
      const wsUrl = this.getWebSocketUrl();
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connection established');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.resubscribeAll();
      };

      this.ws.onmessage = (event) => {
        try {
          const realtimeEvent: RealtimeEvent = JSON.parse(event.data);
          this.handleRealtimeEvent(realtimeEvent);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.ws = null;
        this.isConnecting = false;
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  /**
   * Get WebSocket URL
   */
  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/api/realtime`;
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.initializeWebSocket();
    }, delay);
  }

  /**
   * Setup database change notifications
   */
  private async setupDatabaseListeners() {
    try {
      // Listen to PostgreSQL notifications
      const client = await query('LISTEN realtime_changes');

      // This would need to be implemented on the backend
      // For now, we'll poll for changes
      this.startChangePolling();
    } catch (error) {
      console.error('Failed to setup database listeners:', error);
      this.startChangePolling();
    }
  }

  /**
   * Start polling for changes (fallback method)
   */
  private startChangePolling() {
    const pollInterval = 5000; // 5 seconds

    const poll = async () => {
      try {
        const redisClient = getRedisClient();
        if (redisClient) {
          // Check for new events in Redis
          const events = await redisClient.lRange('realtime_events', 0, -1);

          for (const eventStr of events) {
            try {
              const event: RealtimeEvent = JSON.parse(eventStr);
              this.handleRealtimeEvent(event);
            } catch (error) {
              console.error('Failed to parse Redis event:', error);
            }
          }

          // Clear processed events
          if (events.length > 0) {
            await redisClient.lTrim('realtime_events', events.length, -1);
          }
        }
      } catch (error) {
        console.error('Error polling for changes:', error);
      }
    };

    // Start polling
    setInterval(poll, pollInterval);
  }

  /**
   * Handle incoming real-time events
   */
  private handleRealtimeEvent(event: RealtimeEvent) {
    const relevantSubscriptions = Array.from(this.subscriptions.values()).filter(
      subscription =>
        subscription.eventTypes.includes(event.type) &&
        (!subscription.userId || subscription.userId === event.userId)
    );

    for (const subscription of relevantSubscriptions) {
      try {
        subscription.callback(event);
      } catch (error) {
        console.error('Error in subscription callback:', error);
      }
    }
  }

  /**
   * Subscribe to real-time events
   */
  subscribe(
    eventTypes: string[],
    callback: (event: RealtimeEvent) => void,
    userId?: string
  ): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const subscription: RealtimeSubscription = {
      id: subscriptionId,
      eventTypes,
      callback,
      userId,
    };

    this.subscriptions.set(subscriptionId, subscription);

    // If WebSocket is connected, send subscription message
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        subscriptionId,
        eventTypes,
        userId,
      }));
    }

    return subscriptionId;
  }

  /**
   * Unsubscribe from real-time events
   */
  unsubscribe(subscriptionId: string) {
    this.subscriptions.delete(subscriptionId);

    // If WebSocket is connected, send unsubscribe message
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        subscriptionId,
      }));
    }
  }

  /**
   * Resubscribe to all events after reconnection
   */
  private resubscribeAll() {
    for (const subscription of this.subscriptions.values()) {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'subscribe',
          subscriptionId: subscription.id,
          eventTypes: subscription.eventTypes,
          userId: subscription.userId,
        }));
      }
    }
  }

  /**
   * Publish a real-time event
   */
  async publishEvent(event: RealtimeEvent) {
    try {
      // Add timestamp if not present
      if (!event.timestamp) {
        event.timestamp = new Date().toISOString();
      }

      // Store in Redis for polling fallback
      const redisClient = getRedisClient();
      if (redisClient) {
        await redisClient.rPush('realtime_events', JSON.stringify(event));
        // Set expiration for events (24 hours)
        await redisClient.expire('realtime_events', 86400);
      }

      // Send via WebSocket if connected
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(event));
      }

    } catch (error) {
      console.error('Failed to publish event:', error);
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (this.isConnecting) return 'connecting';
    if (this.ws?.readyState === WebSocket.OPEN) return 'connected';
    return 'disconnected';
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.subscriptions.clear();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Export singleton instance
export const realtimeService = RealtimeService.getInstance();

// React hook for using real-time functionality
import { useEffect, useRef } from 'react';

export function useRealtime(
  eventTypes: string[],
  callback: (event: RealtimeEvent) => void,
  userId?: string
) {
  const subscriptionIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Subscribe to events
    subscriptionIdRef.current = realtimeService.subscribe(eventTypes, callback, userId);

    // Cleanup on unmount
    return () => {
      if (subscriptionIdRef.current) {
        realtimeService.unsubscribe(subscriptionIdRef.current);
      }
    };
  }, [eventTypes.join(','), callback, userId]);

  return realtimeService.getConnectionStatus();
}

// Convenience functions for common event types
export const RealtimeEvents = {
  APPOINTMENT_CREATED: 'appointment_created',
  APPOINTMENT_UPDATED: 'appointment_updated',
  APPOINTMENT_DELETED: 'appointment_deleted',
  SCHEDULE_CREATED: 'schedule_created',
  SCHEDULE_UPDATED: 'schedule_updated',
  SCHEDULE_DELETED: 'schedule_deleted',
  TASK_UPDATED: 'task_updated',
  USER_UPDATED: 'user_updated',
} as const;

export default realtimeService;