import { openDB, IDBPDatabase } from 'idb';

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  category: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  context?: Record<string, any>;
  userId?: string;
}

interface AuditLogSchema {
  logs: {
    key: string;
    value: AuditLogEntry;
    indexes: {
      'by-timestamp': Date;
      'by-category': string;
      'by-severity': string;
      'by-userId': string;
    };
  };
}

class AuditLogger {
  private static instance: AuditLogger;
  private db: IDBPDatabase<AuditLogSchema> | null = null;
  private isInitialized = false;
  private readonly maxLogAge: number = 90 * 24 * 60 * 60 * 1000; // 90 days

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.db = await openDB<AuditLogSchema>('audit-logs', 1, {
        upgrade(db) {
          const store = db.createObjectStore('logs', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
          store.createIndex('by-category', 'category');
          store.createIndex('by-severity', 'severity');
          store.createIndex('by-userId', 'userId');
        },
      });

      // Start cleanup interval
      setInterval(() => this.cleanup(), 24 * 60 * 60 * 1000); // Daily cleanup
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audit logger:', error);
      throw error;
    }
  }

  private async cleanup(): Promise<void> {
    if (!this.db) return;

    try {
      const cutoffDate = new Date(Date.now() - this.maxLogAge);
      const tx = this.db.transaction('logs', 'readwrite');
      const index = tx.store.index('by-timestamp');
      
      let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoffDate));
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      
      await tx.done;
    } catch (error) {
      console.error('Failed to cleanup audit logs:', error);
    }
  }

  public async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.db) {
      throw new Error('Audit logger not initialized');
    }

    try {
      const logEntry: AuditLogEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      };

      await this.db.add('logs', logEntry);

      // In production, you might want to send this to a logging service
      if (process.env.NODE_ENV === 'production') {
        // TODO: Implement logging service integration
        console.log(`[${entry.severity.toUpperCase()}] ${entry.message}`, entry.context);
      }
    } catch (error) {
      console.error('Failed to log audit entry:', error);
    }
  }

  public async query(options: {
    startDate?: Date;
    endDate?: Date;
    category?: string;
    severity?: string;
    userId?: string;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.db) {
      throw new Error('Audit logger not initialized');
    }

    try {
      const tx = this.db.transaction('logs', 'readonly');
      const store = tx.store;
      const index = store.index('by-timestamp');

      // Build key range based on date filters
      let keyRange: IDBKeyRange | undefined;
      if (options.startDate || options.endDate) {
        keyRange = IDBKeyRange.bound(
          options.startDate || new Date(0),
          options.endDate || new Date()
        );
      }

      // Query logs
      const logs: AuditLogEntry[] = [];
      let cursor = await index.openCursor(keyRange);
      
      while (cursor) {
        const entry = cursor.value;
        
        // Apply additional filters
        if (
          (!options.category || entry.category === options.category) &&
          (!options.severity || entry.severity === options.severity) &&
          (!options.userId || entry.userId === options.userId)
        ) {
          logs.push(entry);
          
          // Apply limit if specified
          if (options.limit && logs.length >= options.limit) {
            break;
          }
        }
        
        cursor = await cursor.continue();
      }

      return logs;
    } catch (error) {
      console.error('Failed to query audit logs:', error);
      return [];
    }
  }
}

export const auditLogger = AuditLogger.getInstance(); 