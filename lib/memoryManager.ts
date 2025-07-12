import { auditLogger } from './audit-logger';
import { recordError, recordOperationLatency } from './monitoring';

interface Resource {
  id: string;
  type: 'subscription' | 'timer' | 'event' | 'request' | 'cache' | 'other';
  cleanup: () => Promise<void>;
  description: string;
  createdAt: Date;
  lastAccessed: Date;
  size?: number;
}

interface MemoryStats {
  totalResources: number;
  resourcesByType: Record<string, number>;
  totalSize: number;
  lastCleanup: Date;
}

class MemoryManager {
  private static instance: MemoryManager;
  private resources: Map<string, Resource> = new Map();
  private readonly CLEANUP_INTERVAL = 300000; // 5 minutes
  private readonly MAX_RESOURCE_AGE = 3600000; // 1 hour
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private cleanupInterval: NodeJS.Timeout | null = null;
  private stats: MemoryStats = {
    totalResources: 0,
    resourcesByType: {},
    totalSize: 0,
    lastCleanup: new Date()
  };

  private constructor() {
    this.startPeriodicCleanup();
  }

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
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
    const startTime = Date.now();
    const now = Date.now();
    const cleanupPromises: Promise<void>[] = [];

    for (const [id, resource] of this.resources) {
      const age = now - resource.createdAt.getTime();
      const inactiveTime = now - resource.lastAccessed.getTime();

      if (age > this.MAX_RESOURCE_AGE || inactiveTime > this.MAX_RESOURCE_AGE) {
        cleanupPromises.push(this.cleanupResource(id));
      }
    }

    try {
      await Promise.all(cleanupPromises);
      this.updateStats();

      const duration = Date.now() - startTime;
      recordOperationLatency('memory_cleanup', duration, {
        cleanedResources: cleanupPromises.length,
        remainingResources: this.resources.size
      });

      auditLogger.log({
        category: 'memory',
        severity: 'info',
        message: 'Periodic memory cleanup completed',
        context: {
          cleanedResources: cleanupPromises.length,
          remainingResources: this.resources.size,
          duration
        }
      });
    } catch (error) {
      recordError('Memory cleanup failed', error instanceof Error ? error.message : String(error));
    }
  }

  public async registerResource(
    type: Resource['type'],
    cleanup: () => Promise<void>,
    description: string,
    size?: number
  ): Promise<string> {
    const id = `resource-${Math.random().toString(36).substr(2, 9)}`;
    const resource: Resource = {
      id,
      type,
      cleanup,
      description,
      createdAt: new Date(),
      lastAccessed: new Date(),
      size
    };

    this.resources.set(id, resource);
    this.updateStats();

    // Check if we need to perform emergency cleanup
    if (this.stats.totalSize > this.MAX_CACHE_SIZE) {
      await this.performEmergencyCleanup();
    }

    return id;
  }

  public async cleanupResource(id: string): Promise<void> {
    const resource = this.resources.get(id);
    if (!resource) return;

    try {
      await resource.cleanup();
      this.resources.delete(id);
      this.updateStats();

      auditLogger.log({
        category: 'memory',
        severity: 'info',
        message: 'Resource cleaned up',
        context: {
          resourceId: id,
          resourceType: resource.type,
          description: resource.description
        }
      });
    } catch (error) {
      recordError('Resource cleanup failed', error instanceof Error ? error.message : String(error), {
        resourceId: id,
        resourceType: resource.type
      });
    }
  }

  public async cleanupAll(): Promise<void> {
    const cleanupPromises: Promise<void>[] = [];
    for (const id of this.resources.keys()) {
      cleanupPromises.push(this.cleanupResource(id));
    }

    await Promise.all(cleanupPromises);
    this.updateStats();
  }

  public touchResource(id: string): void {
    const resource = this.resources.get(id);
    if (resource) {
      resource.lastAccessed = new Date();
    }
  }

  private async performEmergencyCleanup(): Promise<void> {
    const startTime = Date.now();
    const cleanupPromises: Promise<void>[] = [];

    // Sort resources by last accessed time
    const sortedResources = Array.from(this.resources.entries())
      .sort(([, a], [, b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime());

    // Clean up oldest resources until we're under the limit
    for (const [id, _resource] of sortedResources) {
      if (this.stats.totalSize <= this.MAX_CACHE_SIZE) break;
      cleanupPromises.push(this.cleanupResource(id));
    }

    try {
      await Promise.all(cleanupPromises);
      this.updateStats();

      const duration = Date.now() - startTime;
      recordOperationLatency('emergency_memory_cleanup', duration, {
        cleanedResources: cleanupPromises.length,
        remainingResources: this.resources.size
      });

      auditLogger.log({
        category: 'memory',
        severity: 'warning',
        message: 'Emergency memory cleanup performed',
        context: {
          cleanedResources: cleanupPromises.length,
          remainingResources: this.resources.size,
          duration
        }
      });
    } catch (error) {
      recordError('Emergency cleanup failed', error instanceof Error ? error.message : String(error));
    }
  }

  private updateStats(): void {
    const resourcesByType: Record<string, number> = {};
    let totalSize = 0;

    for (const resource of this.resources.values()) {
      resourcesByType[resource.type] = (resourcesByType[resource.type] || 0) + 1;
      totalSize += resource.size || 0;
    }

    this.stats = {
      totalResources: this.resources.size,
      resourcesByType,
      totalSize,
      lastCleanup: new Date()
    };
  }

  public getStats(): MemoryStats {
    return { ...this.stats };
  }

  public async cleanup(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    await this.cleanupAll();
  }
}

export const memoryManager = MemoryManager.getInstance(); 