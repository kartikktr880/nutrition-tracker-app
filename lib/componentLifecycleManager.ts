import { recordError, recordOperationLatency } from '@/lib/monitoring';
import { auditLogger } from '@/lib/audit-logger';
import { memoryManager } from '@/services/memoryManager';
import { performanceOptimizer } from '@/services/performanceOptimizer';

interface LifecycleHook {
  cleanup: () => Promise<void>;
  type: 'subscription' | 'timer' | 'event' | 'request' | 'other';
  description: string;
}

interface ComponentState {
  isMounted: boolean;
  lastActivity: Date;
  hooks: Map<string, LifecycleHook>;
  subscriptions: Set<{ unsubscribe: () => void; type: string }>;
  timers: Set<{ id: NodeJS.Timeout; type: string }>;
  eventListeners: Set<{ element: EventTarget; type: string; handler: EventListener }>;
  requests: Set<{ abort: () => void; type: string }>;
  memoryUsage: number;
  errorCount: number;
  lastError?: Error;
  performanceMetrics?: {
    lastCheck: Date;
    fps: number;
    memoryUsage: number;
    renderTime: number;
    scriptTime: number;
    styleTime: number;
    layoutTime: number;
    paintTime: number;
  };
  performanceWarningCallback?: (usage: number, limit: number) => void;
}

class ComponentLifecycleManager {
  private static instance: ComponentLifecycleManager;
  private components: Map<string, ComponentState> = new Map();
  private readonly CLEANUP_INTERVAL = 300000; // 5 minutes
  private readonly ERROR_THRESHOLD = 5;
  private readonly MEMORY_THRESHOLD = 50 * 1024 * 1024; // 50MB
  private cleanupInterval: NodeJS.Timeout | null = null;
  private memoryMonitorInterval: NodeJS.Timeout | null = null;
  private readonly PERFORMANCE_CHECK_INTERVAL = 5000; // 5 seconds
  private performanceCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startPeriodicCleanup();
    this.startMemoryMonitoring();
    this.startPerformanceMonitoring();
  }

  public static getInstance(): ComponentLifecycleManager {
    if (!ComponentLifecycleManager.instance) {
      ComponentLifecycleManager.instance = new ComponentLifecycleManager();
    }
    return ComponentLifecycleManager.instance;
  }

  private startPeriodicCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.performPeriodicCleanup();
    }, this.CLEANUP_INTERVAL);
  }

  private async performPeriodicCleanup() {
    const now = Date.now();
    for (const [componentId, state] of this.components) {
      if (!state.isMounted && now - state.lastActivity.getTime() > this.CLEANUP_INTERVAL) {
        await this.cleanupComponent(componentId);
      }
    }
  }

  private startMemoryMonitoring() {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }

    this.memoryMonitorInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 60000); // Check every minute
  }

  private async checkMemoryUsage() {
    try {
      const metrics = await memoryManager.getMemoryMetrics();
      const latestMetric = metrics[metrics.length - 1];
      
      if (latestMetric) {
        const usageRatio = latestMetric.usedJSHeapSize / latestMetric.jsHeapSizeLimit;
        
        // Update component memory usage
        this.components.get(this.currentComponentId)?.memoryUsage = latestMetric.usedJSHeapSize;
        this.components.get(this.currentComponentId)?.lastActivity = new Date();

        // Check for memory warnings
        if (usageRatio > this.memoryWarningThreshold) {
          this.handleMemoryWarning(latestMetric);
        }

        recordOperationLatency('component_memory_check', Date.now() - latestMetric.timestamp.getTime(), {
          componentId: this.currentComponentId,
          usageRatio,
          totalHeap: latestMetric.totalJSHeapSize,
          usedHeap: latestMetric.usedJSHeapSize
        });
      }
    } catch (error) {
      recordError('Component memory check failed', error instanceof Error ? error.message : String(error));
    }
  }

  private handleMemoryWarning(metrics: any) {
    const usageRatio = metrics.usedJSHeapSize / metrics.jsHeapSizeLimit;
    
    recordError('Component memory warning', {
      componentId: this.currentComponentId,
      usageRatio,
      totalHeap: metrics.totalJSHeapSize,
      usedHeap: metrics.usedJSHeapSize,
      limit: metrics.jsHeapSizeLimit
    });

    auditLogger.log({
      category: 'memory',
      severity: 'warning',
      message: 'Component memory warning',
      context: {
        componentId: this.currentComponentId,
        usageRatio,
        totalHeap: metrics.totalJSHeapSize,
        usedHeap: metrics.usedJSHeapSize,
        limit: metrics.jsHeapSizeLimit
      }
    });

    // Trigger component cleanup
    this.cleanupComponentResources(this.currentComponentId, true);
  }

  private async cleanupComponentResources(componentId: string, aggressive = false) {
    try {
      const state = this.components.get(componentId);
      if (!state) return;

      const resources = state.timers.size + state.subscriptions.size + state.requests.size + state.eventListeners.size;
      const cleanupPromises: Promise<void>[] = [];

      for (const timer of state.timers) {
        try {
          clearTimeout(timer.id);
        } catch (error) {
          recordError('Timer cleanup failed', error instanceof Error ? error.message : String(error), {
            componentId,
            timerType: timer.type
          });
        }
      }

      for (const subscription of state.subscriptions) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          recordError('Subscription cleanup failed', error instanceof Error ? error.message : String(error), {
            componentId,
            subscriptionType: subscription.type
          });
        }
      }

      for (const request of state.requests) {
        try {
          request.abort();
        } catch (error) {
          recordError('Request abort failed', error instanceof Error ? error.message : String(error), {
            componentId,
            requestType: request.type
          });
        }
      }

      for (const listener of state.eventListeners) {
        try {
          listener.element.removeEventListener(listener.type, listener.handler);
        } catch (error) {
          recordError('Event listener cleanup failed', error instanceof Error ? error.message : String(error), {
            componentId,
            eventType: listener.type
          });
        }
      }

      await Promise.all(cleanupPromises);
      this.components.delete(componentId);

      if (aggressive) {
        // Force garbage collection for this component
        memoryManager.forceGarbageCollection();
      }

      auditLogger.log({
        category: 'memory',
        severity: 'info',
        message: 'Component resources cleaned up',
        context: {
          componentId,
          aggressive,
          resourcesCleaned: resources
        }
      });
    } catch (error) {
      recordError('Component cleanup failed', error instanceof Error ? error.message : String(error));
    }
  }

  public registerComponent(componentId: string) {
      this.components.set(componentId, {
      isMounted: true,
      lastActivity: new Date(),
        hooks: new Map(),
      subscriptions: new Set(),
      timers: new Set(),
      eventListeners: new Set(),
      requests: new Set(),
      memoryUsage: 0,
      errorCount: 0
    });
  }

  public addSubscription(componentId: string, subscription: { unsubscribe: () => void }, type: string) {
    const state = this.components.get(componentId);
    if (!state) return;

    state.subscriptions.add({ unsubscribe: subscription.unsubscribe, type });
    state.lastActivity = new Date();
  }

  public addTimer(componentId: string, timerId: NodeJS.Timeout, type: string) {
    const state = this.components.get(componentId);
    if (!state) return;

    state.timers.add({ id: timerId, type });
    state.lastActivity = new Date();
  }

  public addEventListener(
    componentId: string,
    element: EventTarget,
    type: string,
    handler: EventListener
  ) {
    const state = this.components.get(componentId);
    if (!state) return;

    state.eventListeners.add({ element, type, handler });
    state.lastActivity = new Date();
  }

  public addRequest(componentId: string, abortController: AbortController, type: string) {
    const state = this.components.get(componentId);
    if (!state) return;

    state.requests.add({ abort: () => abortController.abort(), type });
    state.lastActivity = new Date();
  }

  public updateMemoryUsage(componentId: string, usage: number) {
    const state = this.components.get(componentId);
    if (!state) return;

    state.memoryUsage = usage;
    state.lastActivity = new Date();
  }

  public recordError(componentId: string, error: Error) {
    const state = this.components.get(componentId);
    if (!state) return;

    state.errorCount++;
    state.lastError = error;
    state.lastActivity = new Date();

    if (state.errorCount >= this.ERROR_THRESHOLD) {
      this.cleanupComponentResources(componentId);
    }
  }

  public unregisterComponent(componentId: string) {
    const state = this.components.get(componentId);
    if (state) {
      state.isMounted = false;
      state.lastActivity = new Date();
    }
  }

  public async addCleanupHook(
    componentId: string,
    hookId: string,
    cleanup: () => Promise<void>,
    type: LifecycleHook['type'],
    description: string
  ) {
    const state = this.components.get(componentId);
    if (!state) {
      recordError('Component not found', `Attempted to add cleanup hook to non-existent component: ${componentId}`);
      return;
    }

    state.hooks.set(hookId, { cleanup, type, description });
    state.lastActivity = new Date();
  }

  public async removeCleanupHook(componentId: string, hookId: string) {
    const state = this.components.get(componentId);
    if (!state) return;

    const hook = state.hooks.get(hookId);
    if (hook) {
      try {
        await hook.cleanup();
      } catch (error) {
        recordError('Cleanup hook error', error instanceof Error ? error.message : String(error), {
          componentId,
          hookId,
          type: hook.type
        });
      }
      state.hooks.delete(hookId);
    }
  }

  public async cleanupComponent(componentId: string) {
    const state = this.components.get(componentId);
    if (!state) return;

    const startTime = Date.now();
    const cleanupPromises: Promise<void>[] = [];

    for (const [hookId, hook] of state.hooks) {
      cleanupPromises.push(
        this.removeCleanupHook(componentId, hookId)
      );
    }

    try {
      await Promise.all(cleanupPromises);
      this.components.delete(componentId);

      const duration = Date.now() - startTime;
      recordOperationLatency('component_cleanup', duration, {
        componentId,
        hookCount: state.hooks.size
      });

      auditLogger.log({
        category: 'component',
        severity: 'info',
        message: `Component cleanup completed: ${componentId}`,
        context: {
          hookCount: state.hooks.size,
          duration
        }
      });
    } catch (error) {
      recordError('Component cleanup failed', error instanceof Error ? error.message : String(error), {
        componentId,
        hookCount: state.hooks.size
      });
    }
  }

  public getComponentState(componentId: string): ComponentState | undefined {
    return this.components.get(componentId);
  }

  private startPerformanceMonitoring() {
    if (this.performanceCheckInterval) {
      clearInterval(this.performanceCheckInterval);
    }

    this.performanceCheckInterval = setInterval(() => {
      this.checkComponentPerformance();
    }, this.PERFORMANCE_CHECK_INTERVAL);
  }

  private async checkComponentPerformance() {
    try {
      const metrics = performanceOptimizer.getMetrics();
      if (metrics.length === 0) return;

      const latestMetrics = metrics[metrics.length - 1];
      
      for (const [componentId, state] of this.components) {
        if (!state.isMounted) continue;

        // Update component performance metrics
        state.performanceMetrics = {
          lastCheck: new Date(),
          fps: latestMetrics.fps,
          memoryUsage: latestMetrics.memoryUsage,
          renderTime: latestMetrics.renderTime,
          scriptTime: latestMetrics.scriptTime,
          styleTime: latestMetrics.styleTime,
          layoutTime: latestMetrics.layoutTime,
          paintTime: latestMetrics.paintTime
        };

        // Check for performance issues
        if (latestMetrics.fps < 30 || latestMetrics.memoryUsage > 0.8) {
          await this.handlePerformanceWarning(componentId, latestMetrics);
        }

        recordOperationLatency('component_performance_check', 0, {
          componentId,
          fps: latestMetrics.fps,
          memoryUsage: latestMetrics.memoryUsage
        });
      }
    } catch (error) {
      recordError('Component performance check failed', error instanceof Error ? error.message : String(error));
    }
  }

  private async handlePerformanceWarning(componentId: string, metrics: any) {
    const component = this.components.get(componentId);
    if (!component) return;

    try {
      // Log performance warning
      auditLogger.log({
        category: 'performance',
        severity: 'warning',
        message: 'Component performance warning',
        context: {
          componentId,
          metrics
        }
      });

      // Trigger performance optimization
      await performanceOptimizer.optimizePerformance();

      // Notify component if callback exists
      if (component.performanceWarningCallback) {
        component.performanceWarningCallback(metrics.memoryUsage, 0.8);
      }

      // If performance is critically low, trigger aggressive cleanup
      if (metrics.fps < 20 || metrics.memoryUsage > 0.9) {
        await this.cleanupComponentResources(componentId, true);
      }
    } catch (error) {
      recordError('Performance warning handling failed', error instanceof Error ? error.message : String(error));
    }
  }

  public setPerformanceWarningCallback(
    componentId: string,
    callback: (usage: number, limit: number) => void
  ) {
    const component = this.components.get(componentId);
    if (component) {
      component.performanceWarningCallback = callback;
    }
  }

  public getComponentPerformanceMetrics(componentId: string) {
    const component = this.components.get(componentId);
    return component?.performanceMetrics;
  }

  public async cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }

    if (this.performanceCheckInterval) {
      clearInterval(this.performanceCheckInterval);
      this.performanceCheckInterval = null;
    }

    // Cleanup all components
    for (const componentId of this.components.keys()) {
      await this.cleanupComponent(componentId);
    }

    // Cleanup performance optimizer
    await performanceOptimizer.cleanup();

    this.components.clear();
  }
}

export const componentLifecycleManager = ComponentLifecycleManager.getInstance(); 