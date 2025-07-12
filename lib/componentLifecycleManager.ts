import { auditLogger } from '@/lib/audit-logger';
import { recordError, recordOperationLatency } from '@/lib/monitoring';
import { memoryManager } from '@/services/memoryManager';
import { performanceOptimizer } from '@/services/performanceOptimizer';

export interface ComponentLifecycle {
  onMount?: () => void | Promise<void>;
  onUnmount?: () => void | Promise<void>;
  onUpdate?: (props: unknown) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
}

export interface ComponentState {
  id: string;
  lifecycle: ComponentLifecycle;
  mounted: boolean;
  lastUpdate: number;
  errorCount: number;
  performanceMetrics: {
    renderTime: number;
    memoryUsage: number;
    fps: number;
  };
  subscriptions: Set<unknown>;
  timers: Set<unknown>;
  requests: Set<unknown>;
  eventListeners: Set<unknown>;
  hooks: Map<string, unknown>;
  memoryUsage: number;
  lastError: Error | null;
  performanceWarningCallback?: (usage: number, limit: number) => void;
}

interface LifecycleHook {
  cleanup: () => Promise<void>;
  type: 'subscription' | 'timer' | 'event' | 'request' | 'other';
  description: string;
}

class ComponentLifecycleManager {
  private static instance: ComponentLifecycleManager;
  private components: Map<string, ComponentState> = new Map();
  private readonly CLEANUP_INTERVAL = 300000; // 5 minutes
  private readonly ERROR_THRESHOLD = 5;
  private readonly MEMORY_THRESHOLD = 50 * 1024 * 1024; // 50MB
  private readonly memoryWarningThreshold = 0.8; // 80% of heap limit
  private currentComponentId = '';
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
      if (!state.mounted && now - state.lastUpdate > this.CLEANUP_INTERVAL) {
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
        const component = this.components.get(this.currentComponentId);
        if (component) {
          component.memoryUsage = latestMetric.usedJSHeapSize;
          component.lastUpdate = Date.now();
        }

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

  private handleMemoryWarning(metrics: unknown) {
    const usageRatio = (metrics as unknown as { usedJSHeapSize: number; jsHeapSizeLimit: number }).usedJSHeapSize / (metrics as unknown as { jsHeapSizeLimit: number }).jsHeapSizeLimit;
    
    recordError('Component memory warning', new Error(`Memory warning for component ${this.currentComponentId}`));

    auditLogger.log({
      category: 'memory',
      severity: 'warning',
      message: 'Component memory warning',
      context: {
        componentId: this.currentComponentId,
        usageRatio,
        totalHeap: (metrics as unknown as { totalJSHeapSize: number }).totalJSHeapSize,
        usedHeap: (metrics as unknown as { usedJSHeapSize: number }).usedJSHeapSize,
        limit: (metrics as unknown as { jsHeapSizeLimit: number }).jsHeapSizeLimit
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
          clearTimeout((timer as unknown as { id: NodeJS.Timeout }).id);
        } catch (error) {
          recordError('Timer cleanup failed', error instanceof Error ? error.message : String(error), {
            componentId,
            timerType: (timer as unknown as { type: string }).type
          });
        }
      }

      for (const subscription of state.subscriptions) {
        try {
          (subscription as unknown as { unsubscribe: () => void }).unsubscribe();
        } catch (error) {
          recordError('Subscription cleanup failed', error instanceof Error ? error.message : String(error), {
            componentId,
            subscriptionType: (subscription as unknown as { type: string }).type
          });
        }
      }

      for (const request of state.requests) {
        try {
          (request as unknown as { abort: () => void }).abort();
        } catch (error) {
          recordError('Request abort failed', error instanceof Error ? error.message : String(error), {
            componentId,
            requestType: (request as unknown as { type: string }).type
          });
        }
      }

      for (const listener of state.eventListeners) {
        try {
          (listener as unknown as { element: EventTarget; type: string; handler: EventListener }).element.removeEventListener((listener as unknown as { type: string }).type, (listener as unknown as { handler: EventListener }).handler);
        } catch (error) {
          recordError('Event listener cleanup failed', error instanceof Error ? error.message : String(error), {
            componentId,
            eventType: (listener as unknown as { type: string }).type
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

  public registerComponent(componentId: string, lifecycle: ComponentLifecycle): void {
    const existingComponent = this.components.get(componentId);
    
    if (existingComponent) {
      // Update existing component
      existingComponent.lifecycle = lifecycle;
      existingComponent.lastUpdate = Date.now();
      return;
    }

    // Create new component state
    const componentState: ComponentState = {
      id: componentId,
      lifecycle,
      mounted: true,
      lastUpdate: Date.now(),
      errorCount: 0,
      performanceMetrics: {
        renderTime: 0,
        memoryUsage: 0,
        fps: 0
      },
      subscriptions: new Set(),
      timers: new Set(),
      requests: new Set(),
      eventListeners: new Set(),
      hooks: new Map(),
      memoryUsage: 0,
      lastError: null
    };

    this.components.set(componentId, componentState);
    
    // Call onMount if provided
    if (lifecycle.onMount) {
      const result = lifecycle.onMount();
      if (result instanceof Promise) {
        result.catch((error: unknown) => {
          this.recordError(componentId, error instanceof Error ? error : new Error(String(error)));
        });
      }
    }
  }

  public unregisterComponent(componentId: string): void {
    const component = this.components.get(componentId);
    if (component && component.lifecycle.onUnmount) {
      const result = component.lifecycle.onUnmount();
      if (result instanceof Promise) {
        result.catch((error: unknown) => {
          this.recordError(componentId, error instanceof Error ? error : new Error(String(error)));
        });
      }
    }
    this.components.delete(componentId);
  }

  public getComponent(componentId: string): ComponentState | undefined {
    return this.components.get(componentId);
  }

  public getAllComponents(): Map<string, ComponentState> {
    return new Map(this.components);
  }

  public cleanup(): void {
    for (const [componentId, _component] of this.components.entries()) {
      this.unregisterComponent(componentId);
    }
  }

  public addSubscription(componentId: string, subscription: { unsubscribe: () => void }, type: string) {
    const state = this.components.get(componentId);
    if (!state) return;

    state.subscriptions.add({ unsubscribe: subscription.unsubscribe, type });
    state.lastUpdate = Date.now();
  }

  public addTimer(componentId: string, timerId: NodeJS.Timeout, type: string) {
    const state = this.components.get(componentId);
    if (!state) return;

    state.timers.add({ id: timerId, type });
    state.lastUpdate = Date.now();
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
    state.lastUpdate = Date.now();
  }

  public addRequest(componentId: string, abortController: AbortController, type: string) {
    const state = this.components.get(componentId);
    if (!state) return;

    state.requests.add({ abort: () => abortController.abort(), type });
    state.lastUpdate = Date.now();
  }

  public updateMemoryUsage(componentId: string, usage: number) {
    const state = this.components.get(componentId);
    if (!state) return;

    state.memoryUsage = usage;
    state.lastUpdate = Date.now();
  }

  public recordError(componentId: string, error: Error) {
    const state = this.components.get(componentId);
    if (!state) return;

    state.errorCount++;
    state.lastError = error;
    state.lastUpdate = Date.now();

    if (state.errorCount >= this.ERROR_THRESHOLD) {
      this.cleanupComponentResources(componentId);
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
    state.lastUpdate = Date.now();
  }

  public async removeCleanupHook(componentId: string, hookId: string) {
    const state = this.components.get(componentId);
    if (!state) return;

    const hook = state.hooks.get(hookId);
    if (hook) {
      try {
        await (hook as LifecycleHook).cleanup();
      } catch (error) {
        recordError('Cleanup hook error', error instanceof Error ? error.message : String(error), {
          componentId,
          hookId,
          type: (hook as LifecycleHook).type
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

    for (const [hookId, _hook] of state.hooks) {
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
        if (!state.mounted) continue;

        // Update component performance metrics
        state.performanceMetrics = {
          renderTime: latestMetrics.renderTime,
          memoryUsage: latestMetrics.memoryUsage,
          fps: latestMetrics.fps
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

  private async handlePerformanceWarning(componentId: string, metrics: unknown) {
    const _component = this.components.get(componentId);
    if (!_component) return;

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

      // await performanceOptimizer.optimizePerformance();
      // logInfo('Performance optimization skipped'); // This line was removed from imports

      // Notify component if callback exists
      if (_component.performanceWarningCallback) {
        _component.performanceWarningCallback((metrics as unknown as { memoryUsage: number }).memoryUsage, 0.8);
      }

      // If performance is critically low, trigger aggressive cleanup
      if ((metrics as unknown as { fps: number }).fps < 20 || (metrics as unknown as { memoryUsage: number }).memoryUsage > 0.9) {
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

  public setCacheTTL(_cacheKey: string, _ttl: number): Promise<void> {
    // Implementation for setting cache TTL
    return Promise.resolve();
  }

  public setMemoryWarningCallback(
    componentId: string,
    callback: (usage: number, limit: number) => void
  ) {
    const state = this.components.get(componentId);
    if (state) {
      state.performanceWarningCallback = callback;
    }
  }

  public setCleanupCallback(
    componentId: string,
    _callback: () => void | Promise<void>
  ) {
    // Implementation for setting cleanup callback
    const state = this.components.get(componentId);
    if (state) {
      // Store cleanup callback in component state
    }
  }

  public async registerComponentCache<T>(
    _componentId: string,
    _cacheKey: string,
    _data: T,
    _ttl?: number
  ): Promise<void> {
    // Implementation for registering component cache
    return Promise.resolve();
  }

  public getComponentCache<T>(_componentId: string, _cacheKey: string): T | null {
    // Implementation for getting component cache
    return null;
  }
}

export const componentLifecycleManager = ComponentLifecycleManager.getInstance(); 