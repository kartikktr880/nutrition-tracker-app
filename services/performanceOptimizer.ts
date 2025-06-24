import { recordError, recordOperationLatency } from '@/lib/monitoring';
import { auditLogger } from '@/lib/audit-logger';
import { memoryManager } from '@/services/memoryManager';
import { requestManager } from '@/services/requestManager';

interface PerformanceMetrics {
  timestamp: Date;
  fps: number;
  memoryUsage: number;
  networkRequests: number;
  renderTime: number;
  scriptTime: number;
  styleTime: number;
  layoutTime: number;
  paintTime: number;
}

interface OptimizationConfig {
  targetFPS?: number;
  memoryThreshold?: number;
  networkThreshold?: number;
  renderThreshold?: number;
  bundleSizeThreshold?: number;
}

class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private readonly DEFAULT_TARGET_FPS = 60;
  private readonly DEFAULT_MEMORY_THRESHOLD = 0.8; // 80% of heap limit
  private readonly DEFAULT_NETWORK_THRESHOLD = 1000; // 1 second
  private readonly DEFAULT_RENDER_THRESHOLD = 16; // 16ms (60fps)
  private readonly DEFAULT_BUNDLE_SIZE_THRESHOLD = 200 * 1024; // 200KB
  private readonly METRICS_CHECK_INTERVAL = 1000; // 1 second
  private readonly METRICS_HISTORY_LIMIT = 60; // 1 minute of history

  private metrics: PerformanceMetrics[] = [];
  private metricsInterval: NodeJS.Timeout | null = null;
  private config: OptimizationConfig;
  private isOptimizing: boolean = false;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = {
      targetFPS: this.DEFAULT_TARGET_FPS,
      memoryThreshold: this.DEFAULT_MEMORY_THRESHOLD,
      networkThreshold: this.DEFAULT_NETWORK_THRESHOLD,
      renderThreshold: this.DEFAULT_RENDER_THRESHOLD,
      bundleSizeThreshold: this.DEFAULT_BUNDLE_SIZE_THRESHOLD
    };
    this.startMetricsCollection();
  }

  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  private startMetricsCollection() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.METRICS_CHECK_INTERVAL);

    // Start FPS monitoring
    this.startFPSMonitoring();
  }

  private startFPSMonitoring() {
    if (this.fpsUpdateInterval) {
      clearInterval(this.fpsUpdateInterval);
    }

    this.lastFrameTime = performance.now();
    this.frameCount = 0;

    const updateFPS = () => {
      const now = performance.now();
      const elapsed = now - this.lastFrameTime;
      
      if (elapsed >= 1000) {
        const fps = Math.round((this.frameCount * 1000) / elapsed);
        this.updateFPS(fps);
        this.frameCount = 0;
        this.lastFrameTime = now;
      }

      this.frameCount++;
      requestAnimationFrame(updateFPS);
    };

    requestAnimationFrame(updateFPS);

    this.fpsUpdateInterval = setInterval(() => {
      this.checkPerformanceMetrics();
    }, 1000);
  }

  private updateFPS(fps: number) {
    if (this.metrics.length > 0) {
      const lastMetric = this.metrics[this.metrics.length - 1];
      lastMetric.fps = fps;
    }
  }

  private async collectMetrics() {
    try {
      const metrics: PerformanceMetrics = {
        timestamp: new Date(),
        fps: 0,
        memoryUsage: 0,
        networkRequests: 0,
        renderTime: 0,
        scriptTime: 0,
        styleTime: 0,
        layoutTime: 0,
        paintTime: 0
      };

      // Collect memory metrics
      const memoryMetrics = await memoryManager.getMemoryMetrics();
      if (memoryMetrics.length > 0) {
        const latestMemory = memoryMetrics[memoryMetrics.length - 1];
        metrics.memoryUsage = latestMemory.usedJSHeapSize / latestMemory.jsHeapSizeLimit;
      }

      // Collect performance metrics
      if (window.performance) {
        const perfEntries = performance.getEntriesByType('measure');
        for (const entry of perfEntries) {
          switch (entry.name) {
            case 'render':
              metrics.renderTime = entry.duration;
              break;
            case 'script':
              metrics.scriptTime = entry.duration;
              break;
            case 'style':
              metrics.styleTime = entry.duration;
              break;
            case 'layout':
              metrics.layoutTime = entry.duration;
              break;
            case 'paint':
              metrics.paintTime = entry.duration;
              break;
          }
        }
      }

      // Add metrics to history
      this.metrics.push(metrics);
      if (this.metrics.length > this.METRICS_HISTORY_LIMIT) {
        this.metrics.shift();
      }

      recordOperationLatency('performance_metrics_collection', 0, {
        fps: metrics.fps,
        memoryUsage: metrics.memoryUsage,
        renderTime: metrics.renderTime
      });
    } catch (error) {
      recordError('Performance metrics collection failed', error instanceof Error ? error.message : String(error));
    }
  }

  private checkPerformanceMetrics() {
    if (this.metrics.length === 0) return;

    const latestMetrics = this.metrics[this.metrics.length - 1];
    const needsOptimization = this.detectPerformanceIssues(latestMetrics);

    if (needsOptimization && !this.isOptimizing) {
      this.optimizePerformance();
    }
  }

  private detectPerformanceIssues(metrics: PerformanceMetrics): boolean {
    return (
      metrics.fps < (this.config.targetFPS ?? this.DEFAULT_TARGET_FPS) ||
      metrics.memoryUsage > (this.config.memoryThreshold ?? this.DEFAULT_MEMORY_THRESHOLD) ||
      metrics.renderTime > (this.config.renderThreshold ?? this.DEFAULT_RENDER_THRESHOLD) ||
      metrics.networkRequests > 0 && metrics.networkRequests * 1000 > (this.config.networkThreshold ?? this.DEFAULT_NETWORK_THRESHOLD)
    );
  }

  private async optimizePerformance() {
    if (this.isOptimizing) return;

    this.isOptimizing = true;
    try {
      // Analyze performance issues
      const issues = this.analyzePerformanceIssues();
      
      // Apply optimizations based on issues
      for (const issue of issues) {
        await this.applyOptimization(issue);
      }

      auditLogger.log({
        category: 'performance',
        severity: 'info',
        message: 'Performance optimization applied',
        context: { issues }
      });
    } catch (error) {
      recordError('Performance optimization failed', error instanceof Error ? error.message : String(error));
    } finally {
      this.isOptimizing = false;
    }
  }

  private analyzePerformanceIssues(): string[] {
    const issues: string[] = [];
    if (this.metrics.length === 0) return issues;

    const latestMetrics = this.metrics[this.metrics.length - 1];
    const averageMetrics = this.calculateAverageMetrics();

    if (latestMetrics.fps < (this.config.targetFPS ?? this.DEFAULT_TARGET_FPS)) {
      issues.push('low_fps');
    }

    if (latestMetrics.memoryUsage > (this.config.memoryThreshold ?? this.DEFAULT_MEMORY_THRESHOLD)) {
      issues.push('high_memory_usage');
    }

    if (latestMetrics.renderTime > (this.config.renderThreshold ?? this.DEFAULT_RENDER_THRESHOLD)) {
      issues.push('slow_rendering');
    }

    if (latestMetrics.scriptTime > averageMetrics.scriptTime * 1.5) {
      issues.push('slow_script_execution');
    }

    if (latestMetrics.styleTime > averageMetrics.styleTime * 1.5) {
      issues.push('slow_style_processing');
    }

    if (latestMetrics.layoutTime > averageMetrics.layoutTime * 1.5) {
      issues.push('slow_layout_calculation');
    }

    if (latestMetrics.paintTime > averageMetrics.paintTime * 1.5) {
      issues.push('slow_painting');
    }

    return issues;
  }

  private calculateAverageMetrics(): PerformanceMetrics {
    const sum = this.metrics.reduce((acc, metric) => ({
      timestamp: new Date(),
      fps: acc.fps + metric.fps,
      memoryUsage: acc.memoryUsage + metric.memoryUsage,
      networkRequests: acc.networkRequests + metric.networkRequests,
      renderTime: acc.renderTime + metric.renderTime,
      scriptTime: acc.scriptTime + metric.scriptTime,
      styleTime: acc.styleTime + metric.styleTime,
      layoutTime: acc.layoutTime + metric.layoutTime,
      paintTime: acc.paintTime + metric.paintTime
    }));

    const count = this.metrics.length;
    return {
      timestamp: new Date(),
      fps: sum.fps / count,
      memoryUsage: sum.memoryUsage / count,
      networkRequests: sum.networkRequests / count,
      renderTime: sum.renderTime / count,
      scriptTime: sum.scriptTime / count,
      styleTime: sum.styleTime / count,
      layoutTime: sum.layoutTime / count,
      paintTime: sum.paintTime / count
    };
  }

  private async applyOptimization(issue: string) {
    switch (issue) {
      case 'low_fps':
        await this.optimizeRendering();
        break;
      case 'high_memory_usage':
        await this.optimizeMemory();
        break;
      case 'slow_rendering':
        await this.optimizeRendering();
        break;
      case 'slow_script_execution':
        await this.optimizeScriptExecution();
        break;
      case 'slow_style_processing':
        await this.optimizeStyleProcessing();
        break;
      case 'slow_layout_calculation':
        await this.optimizeLayout();
        break;
      case 'slow_painting':
        await this.optimizePainting();
        break;
    }
  }

  private async optimizeRendering() {
    // Implement rendering optimizations
    // 1. Reduce unnecessary re-renders
    // 2. Use requestAnimationFrame for animations
    // 3. Implement virtual scrolling for long lists
    // 4. Optimize CSS animations
    // 5. Use transform and opacity for animations
  }

  private async optimizeMemory() {
    // Trigger memory cleanup
    await memoryManager.cleanup();
  }

  private async optimizeScriptExecution() {
    // Implement script execution optimizations
    // 1. Defer non-critical scripts
    // 2. Use web workers for heavy computations
    // 3. Implement code splitting
    // 4. Optimize event handlers
  }

  private async optimizeStyleProcessing() {
    // Implement style processing optimizations
    // 1. Reduce style recalculations
    // 2. Use CSS containment
    // 3. Optimize selectors
    // 4. Minimize style changes
  }

  private async optimizeLayout() {
    // Implement layout optimizations
    // 1. Reduce layout thrashing
    // 2. Use CSS containment
    // 3. Batch DOM reads and writes
    // 4. Use CSS transforms
  }

  private async optimizePainting() {
    // Implement painting optimizations
    // 1. Reduce paint areas
    // 2. Use CSS containment
    // 3. Optimize layers
    // 4. Use will-change
  }

  public setConfig(config: Partial<OptimizationConfig>) {
    this.config = { ...this.config, ...config };
  }

  public getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  public async cleanup() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.fpsUpdateInterval) {
      clearInterval(this.fpsUpdateInterval);
      this.fpsUpdateInterval = null;
    }

    this.metrics = [];
    this.isOptimizing = false;
  }
}

export const performanceOptimizer = PerformanceOptimizer.getInstance(); 