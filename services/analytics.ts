/**
 * Analytics service for tracking user interactions and performance metrics
 */

export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
}

export interface ErrorEvent {
  errorType: string;
  errorMessage: string;
  context?: Record<string, any>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'count' | 'percent' | 'bytes';
  tags?: Record<string, string>;
}

interface AnalyticsError {
  errorType: string;
  errorMessage: string;
  context?: Record<string, any>;
}

interface AnalyticsOptions {
  sampleRate?: number; // 0 to 1
  sessionTimeout?: number; // in minutes
  queueSize?: number;
  flushInterval?: number; // in milliseconds
}

const DEFAULT_OPTIONS: Required<AnalyticsOptions> = {
  sampleRate: 1, // 100% sampling by default
  sessionTimeout: 30, // 30 minutes
  queueSize: 100,
  flushInterval: 30000 // 30 seconds
};

class AnalyticsService {
  private queue: Array<{ type: 'event' | 'error'; data: any; timestamp: number }> = [];
  private options: Required<AnalyticsOptions>;
  private sessionId: string;
  private lastActivityTime: number;
  private flushTimeoutId: NodeJS.Timeout | null = null;

  constructor(options: AnalyticsOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.sessionId = this.generateSessionId();
    this.lastActivityTime = Date.now();
    this.startAutoFlush();
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private shouldSample(): boolean {
    return Math.random() < this.options.sampleRate;
  }

  private checkSession(): void {
    const now = Date.now();
    const minutesSinceLastActivity = (now - this.lastActivityTime) / (1000 * 60);

    if (minutesSinceLastActivity >= this.options.sessionTimeout) {
      // Start new session
      this.sessionId = this.generateSessionId();
      this.trackEvent({
        category: 'Session',
        action: 'new_session'
      });
    }

    this.lastActivityTime = now;
  }

  private startAutoFlush(): void {
    if (this.flushTimeoutId) {
      clearInterval(this.flushTimeoutId);
    }

    this.flushTimeoutId = setInterval(() => {
      this.flush();
    }, this.options.flushInterval);
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      // In a real app, this would send to an analytics service
      console.log('Sending analytics batch:', events);

      // Track the flush event itself (but don't queue it)
      console.log('Analytics flush:', {
        timestamp: Date.now(),
        batchSize: events.length,
        sessionId: this.sessionId
      });
    } catch (err) {
      // Put failed events back in the queue
      this.queue = [...events, ...this.queue].slice(-this.options.queueSize);
      console.error('Failed to flush analytics:', err);
    }
  }

  trackEvent(event: AnalyticsEvent): void {
    if (!this.shouldSample()) return;
    this.checkSession();

    const enrichedEvent = {
      ...event,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      metadata: {
        ...event.metadata,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
        screenSize: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    this.queue.push({
      type: 'event',
      data: enrichedEvent,
      timestamp: Date.now()
    });

    // Auto-flush if queue is full
    if (this.queue.length >= this.options.queueSize) {
      this.flush();
    }
  }

  trackError(error: AnalyticsError): void {
    // Always track errors regardless of sampling
    this.checkSession();

    const enrichedError = {
      ...error,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      context: {
        ...error.context,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown'
      }
    };

    this.queue.push({
      type: 'error',
      data: enrichedError,
      timestamp: Date.now()
    });

    // Flush immediately on errors
    this.flush();
  }

  // Performance monitoring
  trackPerformance(metric: {
    name: string;
    value: number;
    unit?: 'ms' | 'bytes' | 'count';
    tags?: Record<string, string>;
  }): void {
    if (!this.shouldSample()) return;

    this.trackEvent({
      category: 'Performance',
      action: metric.name,
      value: metric.value,
      metadata: {
        unit: metric.unit || 'ms',
        tags: metric.tags
      }
    });
  }

  // Session management
  async getSessionData(): Promise<{
    id: string;
    startTime: number;
    lastActivityTime: number;
    duration: number;
  }> {
    return {
      id: this.sessionId,
      startTime: parseInt(this.sessionId.split('-')[1], 36),
      lastActivityTime: this.lastActivityTime,
      duration: Date.now() - this.lastActivityTime
    };
  }

  // Cleanup
  destroy(): void {
    if (this.flushTimeoutId) {
      clearInterval(this.flushTimeoutId);
      this.flushTimeoutId = null;
    }
    this.flush();
  }
}

// Export singleton instance
export const analytics = new AnalyticsService(); 