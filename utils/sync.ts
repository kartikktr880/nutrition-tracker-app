import { ExerciseSession } from '@/types/exercise';
import { validateSessionData } from './validation';
import { encryptData, decryptData } from './encryption';

interface SyncQueue {
  id: string;
  action: 'create' | 'update' | 'delete';
  data: ExerciseSession;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  error?: string;
}

interface SyncConfig {
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  syncInterval: number;
}

const DEFAULT_CONFIG: SyncConfig = {
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  batchSize: 10,
  syncInterval: 30000 // 30 seconds
};

class SyncManager {
  private queue: SyncQueue[] = [];
  private isProcessing = false;
  private config: SyncConfig;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadQueue();
    this.startSyncInterval();
  }

  private loadQueue(): void {
    try {
      const savedQueue = localStorage.getItem('syncQueue');
      if (savedQueue) {
        this.queue = JSON.parse(savedQueue);
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
      this.queue = [];
    }
  }

  private saveQueue(): void {
    try {
      localStorage.setItem('syncQueue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  private startSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.syncInterval = setInterval(() => this.processQueue(), this.config.syncInterval);
  }

  public async addToQueue(session: ExerciseSession, action: 'create' | 'update' | 'delete'): Promise<void> {
    try {
      // Validate session data before adding to queue
      const validationError = validateSessionData(session);
      if (validationError) {
        throw new Error(`Validation failed: ${validationError}`);
      }

      const queueItem: SyncQueue = {
        id: crypto.randomUUID(),
        action,
        data: session,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0
      };

      this.queue.push(queueItem);
      this.saveQueue();

      // Trigger immediate sync if not already processing
      if (!this.isProcessing) {
        await this.processQueue();
      }
    } catch (error) {
      console.error('Error adding to sync queue:', error);
      throw error;
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;
      const pendingItems = this.queue.filter(item => item.status === 'pending' || item.status === 'failed');
      
      for (let i = 0; i < pendingItems.length; i += this.config.batchSize) {
        const batch = pendingItems.slice(i, i + this.config.batchSize);
        await Promise.all(batch.map(item => this.processItem(item)));
      }
    } catch (error) {
      console.error('Error processing sync queue:', error);
    } finally {
      this.isProcessing = false;
      this.saveQueue();
    }
  }

  private async processItem(item: SyncQueue): Promise<void> {
    if (item.retryCount >= this.config.maxRetries) {
      item.status = 'failed';
      item.error = 'Max retries exceeded';
      return;
    }

    try {
      item.status = 'processing';
      this.saveQueue();

      const encryptedData = await encryptData(item.data);
      
      const response = await fetch(`/api/exercise/session`, {
        method: item.action === 'delete' ? 'DELETE' : item.action === 'create' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': item.id,
          'X-Client-Version': '1.0.0'
        },
        body: JSON.stringify(encryptedData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      item.status = 'completed';
    } catch (error) {
      item.status = 'failed';
      item.error = error instanceof Error ? error.message : 'Unknown error';
      item.retryCount++;

      if (item.retryCount < this.config.maxRetries) {
        setTimeout(() => this.processQueue(), this.config.retryDelay);
      }
    } finally {
      this.saveQueue();
    }
  }

  public getQueueStatus(): { total: number; pending: number; failed: number } {
    return {
      total: this.queue.length,
      pending: this.queue.filter(item => item.status === 'pending').length,
      failed: this.queue.filter(item => item.status === 'failed').length
    };
  }

  public clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }

  public cleanup(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

// Export a singleton instance
export const syncManager = new SyncManager(); 