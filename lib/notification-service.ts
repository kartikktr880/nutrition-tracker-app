import { auditLogger } from './audit-logger';

type NotificationChannel = 'browser' | 'email' | 'webhook';
type NotificationPriority = 'low' | 'medium' | 'high';

interface NotificationPreferences {
  channels: NotificationChannel[];
  priority: NotificationPriority;
  enabled: boolean;
}

interface Notification {
  id: string;
  timestamp: number;
  title: string;
  message: string;
  priority: NotificationPriority;
  channel: NotificationChannel;
  status: 'pending' | 'sent' | 'failed';
  metadata?: Record<string, unknown>;
}

class NotificationService {
  private static instance: NotificationService;
  private notifications: Notification[] = [];
  private preferences: NotificationPreferences = {
    channels: ['browser'],
    priority: 'high',
    enabled: true
  };

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await auditLogger.initialize();
      this.cleanupOldNotifications();
      this.setupBrowserNotifications();
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      throw error;
    }
  }

  private cleanupOldNotifications(): void {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.notifications = this.notifications.filter(n => n.timestamp > oneWeekAgo);
  }

  private async setupBrowserNotifications(): Promise<void> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Browser notifications not permitted');
      }
    }
  }

  async sendNotification(
    title: string,
    message: string,
    priority: NotificationPriority = 'medium',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!this.preferences.enabled) return;

    const notification: Notification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      title,
      message,
      priority,
      channel: this.preferences.channels[0],
      status: 'pending',
      metadata
    };

    try {
      await this.sendToChannels(notification);
      notification.status = 'sent';
      this.notifications.push(notification);
      await this.logNotification(notification);
    } catch (error) {
      notification.status = 'failed';
      this.notifications.push(notification);
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  private async sendToChannels(notification: Notification): Promise<void> {
    for (const channel of this.preferences.channels) {
      switch (channel) {
        case 'browser':
          await this.sendBrowserNotification(notification);
          break;
        case 'email':
          // Email notification implementation would go here
          break;
        case 'webhook':
          // Webhook notification implementation would go here
          break;
      }
    }
  }

  private async sendBrowserNotification(notification: Notification): Promise<void> {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      });
    }
  }

  private async logNotification(notification: Notification): Promise<void> {
    await auditLogger.log({
      category: 'system',
      action: 'notification',
      severity: notification.priority === 'high' ? 'warning' : 'info',
      details: `Notification sent: ${notification.title}`,
      metadata: {
        notificationId: notification.id,
        channel: notification.channel,
        status: notification.status
      }
    });
  }

  getNotificationHistory(): Notification[] {
    return [...this.notifications].sort((a, b) => b.timestamp - a.timestamp);
  }

  updatePreferences(preferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
  }

  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }
}

export const notificationService = NotificationService.getInstance(); 