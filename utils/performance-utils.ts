import { BenchmarkMetrics, OptimizationMetrics, EventMetrics, SubscriptionMetrics, ResourceMetrics, LoadMetrics } from './performance-types';

export function createBenchmarkSnapshot(component: any, config: any): BenchmarkMetrics {
  return {
    timestamp: Date.now()
  };
}

export function createOptimizationSnapshot(component: any, config: any): OptimizationMetrics {
  return {
    timestamp: Date.now()
  };
}

export function createEventListenerSnapshot(component: any, count: number, latency: number): EventMetrics {
  return {
    timestamp: Date.now()
  };
}

export function createSubscriptionSnapshot(component: any, count: number, memory: number): SubscriptionMetrics {
  return {
    timestamp: Date.now()
  };
}

export function createTestResource(component: any, type: string): any {
  return {
    timestamp: Date.now()
  };
}

export function createMemorySnapshot(component: any, memory: number): ResourceMetrics {
  return {
    timestamp: Date.now(),
    heapSize: memory
  };
}

export function createResourceSnapshot(component: any, metrics: Partial<ResourceMetrics>): ResourceMetrics {
  return {
    timestamp: Date.now(),
    heapSize: metrics.heapSize
  };
}

export function createLoadSnapshot(component: any, metrics: Partial<LoadMetrics>): LoadMetrics {
  return {
    timestamp: Date.now()
  };
} 