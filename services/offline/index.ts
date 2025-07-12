import { logError, logWarn, logInfo, logDebug } from '../../utils/logger';
interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  timestamp: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  retryCount: number;
  priority?: 'high' | 'normal' | 'low';
}

interface ConflictResolution {
  strategy: 'server' | 'client' | 'manual';
  resolution: any;
  timestamp: number;
  operationId: string;
  entity: string;
  type: string;
  originalData: any;
  serverData: any;
}

class OfflineService {
  private static instance: OfflineService;
  private syncQueue: SyncOperation[] = [];
  private isOnline: boolean = navigator.onLine;
  private syncInProgress = false;
  private maxRetries = 3;
  private syncInterval = 30000; // 30 seconds
  private syncTimer: NodeJS.Timeout | null = null;
  private maxQueueSize = 1000;
  private requestTimeout = 30000; // 30 seconds
  private batchSize = 10;
  private conflictListeners: ((conflict: ConflictResolution) => void)[] = [];

  private constructor() {
    this.initializeService();
  }

  public static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  private initializeService(): void {
    // Load existing queue from IndexedDB
    this.loadSyncQueue();

    // Set up online/offline event listeners
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Start sync timer if online
    if (this.isOnline) {
      this.startSyncTimer();
    }
  }

  private async loadSyncQueue(): Promise<void> {
    try {
      const queue = localStorage.getItem('syncQueue');
      if (queue) {
        this.syncQueue = JSON.parse(queue);
      }
    } catch (error) {
      logError('Failed to load sync queue:', error as Error | undefined);
    }
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
    } catch (error) {
      logError('Failed to save sync queue:', error as Error | undefined);
    }
  }

  private handleOnline(): void {
    this.isOnline = true;
    this.startSyncTimer();
    this.processSyncQueue();
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.stopSyncTimer();
  }

  private startSyncTimer(): void {
    if (!this.syncTimer) {
      this.syncTimer = setInterval(() => {
        this.processSyncQueue();
      }, this.syncInterval);
    }
  }

  private stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  public isOnlineStatus(): boolean {
    return this.isOnline;
  }

  public async queueOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'status' | 'retryCount'>): Promise<string> {
    // Check queue size limit
    if (this.syncQueue.length >= this.maxQueueSize) {
      throw new Error('Sync queue is full. Please try again later.');
    }

    const syncOperation: SyncOperation = {
      ...operation,
      id: this.generateUUID(),
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    };

    this.syncQueue.push(syncOperation);
    await this.saveSyncQueue();

    if (this.isOnline && !this.syncInProgress) {
      this.processSyncQueue();
    }

    return syncOperation.id;
  }

  private generateUUID(): string {
    // Fallback for browsers that don't support crypto.randomUUID()
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  public addConflictListener(listener: (conflict: ConflictResolution) => void): void {
    this.conflictListeners.push(listener);
  }

  public removeConflictListener(listener: (conflict: ConflictResolution) => void): void {
    this.conflictListeners = this.conflictListeners.filter(l => l !== listener);
  }

  private async executeOperation(operation: SyncOperation): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const endpoint = `/api/${operation.entity}`;
      const options: RequestInit = {
        method: operation.type === 'create' ? 'POST' : operation.type === 'update' ? 'PUT' : 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: operation.type !== 'delete' ? JSON.stringify(operation.data) : undefined,
        signal: controller.signal
      };

      const response = await fetch(endpoint, options);

      if (!response.ok) {
        if (response.status === 409) {
          await this.handleConflict(operation, await response.json());
        } else if (response.status >= 500) {
          // Server error - retry later
          throw new Error(`Server error: ${response.status}`);
        } else {
          // Client error - don't retry
          operation.status = 'failed';
          throw new Error(`Client error: ${response.status}`);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async handleConflict(operation: SyncOperation, serverData: any): Promise<void> {
    const resolution: ConflictResolution = {
      strategy: 'server',
      resolution: serverData,
      timestamp: Date.now(),
      operationId: operation.id,
      entity: operation.entity,
      type: operation.type,
      originalData: operation.data,
      serverData: serverData
    };

    // Store conflict resolution
    const conflicts = JSON.parse(localStorage.getItem('conflictResolutions') || '[]');
    conflicts.push(resolution);

    // Clean up old conflicts
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const recentConflicts = conflicts.filter((conflict: ConflictResolution) => 
      conflict.timestamp > sevenDaysAgo
    );
    
    localStorage.setItem('conflictResolutions', JSON.stringify(recentConflicts));

    // Notify listeners
    this.conflictListeners.forEach(listener => listener(resolution));

    // Update operation with resolved data
    operation.data = resolution.resolution;
    operation.status = 'pending';
    operation.retryCount = 0;
    await this.saveSyncQueue();
  }

  public async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;

    try {
      while (this.syncQueue.length > 0) {
        const operation = this.syncQueue.shift();
        if (operation) {
          await this.processOperation(operation);
        }
      }
    } catch (error) {
      logError('Error processing sync queue:', error as Error | undefined);
    } finally {
      this.syncInProgress = false;
      await this.saveSyncQueue();
    }
  }

  private async processOperation(operation: SyncOperation): Promise<void> {
    if (operation.retryCount >= this.maxRetries) {
      operation.status = 'failed';
      return;
    }

    operation.status = 'in_progress';
    operation.retryCount++;
    await this.saveSyncQueue();

    try {
      await this.executeOperation(operation);
      operation.status = 'completed';
    } catch (error) {
      logError(`Operation failed: ${operation.id}`, error as Error | undefined);
      operation.status = 'failed';
    }

    await this.saveSyncQueue();
  }

  public getSyncStatus(): { total: number; pending: number; failed: number } {
    return {
      total: this.syncQueue.length,
      pending: this.syncQueue.filter(op => op.status === 'pending').length,
      failed: this.syncQueue.filter(op => op.status === 'failed').length
    };
  }

  public async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    await this.saveSyncQueue();
  }

  public async backupQueue(): Promise<void> {
    try {
      const backup = {
        queue: this.syncQueue,
        timestamp: Date.now()
      };
      localStorage.setItem('syncQueueBackup', JSON.stringify(backup));
    } catch (error) {
      logError('Failed to backup sync queue:', error as Error | undefined);
    }
  }

  public async restoreQueue(): Promise<void> {
    try {
      const backup = localStorage.getItem('syncQueueBackup');
      if (backup) {
        const { queue, timestamp } = JSON.parse(backup);
        // Only restore if backup is less than 24 hours old
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          this.syncQueue = queue;
          await this.saveSyncQueue();
        }
      }
    } catch (error) {
      logError('Failed to restore sync queue:', error as Error | undefined);
    }
  }

  public getState(): { isOnline: boolean; queueSize: number; syncInProgress: boolean } {
    return {
      isOnline: this.isOnline,
      queueSize: this.syncQueue.length,
      syncInProgress: this.syncInProgress
    };
  }

  public async resolveConflict(conflictIndex: number, resolution: 'server' | 'client' | 'manual'): Promise<void> {
    // This is a simplified implementation
    // In a real app, you would handle the actual conflict resolution
    logInfo(`Resolving conflict ${conflictIndex} with resolution: ${resolution}`);
    
    // Remove the conflict from the queue
    if (conflictIndex >= 0 && conflictIndex < this.syncQueue.length) {
      this.syncQueue.splice(conflictIndex, 1);
      await this.saveSyncQueue();
    }
  }
}

export default OfflineService; 