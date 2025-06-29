import { prisma } from '@/lib/prisma';
import { recordError, recordOperationLatency } from '@/lib/monitoring';
import { auditLogger } from '@/lib/audit-logger';

interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffFactor: number;
  maxDelay: number;
}

interface DatabaseError extends Error {
  code?: string;
  meta?: any;
  severity?: 'FATAL' | 'ERROR' | 'WARNING';
}

interface ConnectionPool {
  isConnected: boolean;
  lastCheck: Date;
  errorCount: number;
  lastError?: DatabaseError;
}

interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: Date;
  halfOpenTimeout: NodeJS.Timeout | null;
}

class DatabaseErrorHandler {
  private static instance: DatabaseErrorHandler;
  private readonly defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    backoffFactor: 2,
    maxDelay: 10000
  };
  private readonly circuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeout: 30000, // 30 seconds
    halfOpenTimeout: 5000 // 5 seconds
  };
  private connectionPool: Map<string, ConnectionPool> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private fallbackCache: Map<string, any> = new Map();

  private constructor() {
    this.initializeConnectionPool();
    this.initializeCircuitBreakers();
    this.startHealthChecks();
  }

  public static getInstance(): DatabaseErrorHandler {
    if (!DatabaseErrorHandler.instance) {
      DatabaseErrorHandler.instance = new DatabaseErrorHandler();
    }
    return DatabaseErrorHandler.instance;
  }

  private initializeConnectionPool() {
    this.connectionPool.set('prisma', {
      isConnected: false,
      lastCheck: new Date(),
      errorCount: 0
    });
    this.connectionPool.set('indexeddb', {
      isConnected: false,
      lastCheck: new Date(),
      errorCount: 0
    });
    this.connectionPool.set('firebase', {
      isConnected: false,
      lastCheck: new Date(),
      errorCount: 0
    });
  }

  private initializeCircuitBreakers() {
    for (const dbType of this.connectionPool.keys()) {
      this.circuitBreakers.set(dbType, {
        isOpen: false,
        failureCount: 0,
        lastFailureTime: new Date(),
        halfOpenTimeout: null
      });
    }
  }

  private startHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  private async performHealthChecks() {
    for (const [dbType, pool] of this.connectionPool) {
      try {
        switch (dbType) {
          case 'prisma':
            await this.checkPrismaConnection();
            break;
          case 'indexeddb':
            await this.checkIndexedDBConnection();
            break;
          case 'firebase':
            await this.checkFirebaseConnection();
            break;
        }
      } catch (error) {
        this.handleConnectionError(dbType, error as DatabaseError);
      }
    }
  }

  private async checkPrismaConnection() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      this.updateConnectionStatus('prisma', true);
    } catch (error) {
      this.updateConnectionStatus('prisma', false, error as DatabaseError);
      throw error;
    }
  }

  private async checkIndexedDBConnection() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('nutrition-tracker', 1);
      request.onerror = () => {
        this.updateConnectionStatus('indexeddb', false, new Error('IndexedDB connection failed'));
        reject(new Error('IndexedDB connection failed'));
      };
      request.onsuccess = () => {
        this.updateConnectionStatus('indexeddb', true);
        resolve();
      };
    });
  }

  private async checkFirebaseConnection() {
    // Firebase connection check would go here
    // This is a placeholder as Firebase connection is typically handled by the Firebase SDK
    this.updateConnectionStatus('firebase', true);
  }

  private updateConnectionStatus(dbType: string, isConnected: boolean, error?: DatabaseError) {
    const pool = this.connectionPool.get(dbType);
    if (pool) {
      pool.isConnected = isConnected;
      pool.lastCheck = new Date();
      if (!isConnected) {
        pool.errorCount++;
        pool.lastError = error;
      } else {
        pool.errorCount = 0;
        pool.lastError = undefined;
      }
    }
  }

  private isRetryableError(error: DatabaseError): boolean {
    const retryableCodes = [
      'P1001', // Connection error
      'P1002', // Connection timeout
      'P1008', // Connection timeout
      'P1017', // Server closed connection
      'P2024', // Connection pool timeout
      'P2034', // Transaction deadlock
      'P2035', // Transaction timeout
    ];

    return retryableCodes.includes(error.code || '') || 
           error.message.includes('connection') ||
           error.message.includes('timeout') ||
           error.message.includes('network');
  }

  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryConfig: RetryConfig = this.defaultRetryConfig
  ): Promise<T> {
    let lastError: DatabaseError;
    let attempt = 0;

    while (attempt < retryConfig.maxRetries) {
      try {
        const startTime = Date.now();
        const result = await operation();
        const duration = Date.now() - startTime;
        
        recordOperationLatency('database_operation', duration);
        return result;
      } catch (error) {
        lastError = error as DatabaseError;
        
        if (!this.isRetryableError(lastError)) {
          throw lastError;
        }

        attempt++;
        if (attempt === retryConfig.maxRetries) {
          break;
        }

        const delay = Math.min(
          retryConfig.retryDelay * Math.pow(retryConfig.backoffFactor, attempt - 1),
          retryConfig.maxDelay
        );
        await this.wait(delay);
      }
    }

    recordError('database_operation_failed', JSON.stringify({
      error: lastError,
      attempts: attempt,
      operation: operation.name
    }));

    throw lastError;
  }

  private async executeWithCircuitBreaker<T>(
    dbType: string,
    operation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>
  ): Promise<T> {
    const circuitBreaker = this.circuitBreakers.get(dbType);
    if (!circuitBreaker) {
      throw new Error(`No circuit breaker found for ${dbType}`);
    }

    if (circuitBreaker.isOpen) {
      if (Date.now() - circuitBreaker.lastFailureTime.getTime() > this.circuitBreakerConfig.resetTimeout) {
        // Try half-open state
        try {
          circuitBreaker.isOpen = false;
          const result = await operation();
          this.resetCircuitBreaker(dbType);
          return result;
        } catch (error) {
          this.tripCircuitBreaker(dbType);
          if (fallbackOperation) {
            return this.executeFallback(dbType, fallbackOperation);
          }
          throw error;
        }
      }
      
      if (fallbackOperation) {
        return this.executeFallback(dbType, fallbackOperation);
      }
      throw new Error(`Circuit breaker is open for ${dbType}`);
    }

    try {
      const result = await operation();
      this.resetCircuitBreaker(dbType);
      return result;
    } catch (error) {
      this.handleCircuitBreakerFailure(dbType, error as DatabaseError);
      if (fallbackOperation) {
        return this.executeFallback(dbType, fallbackOperation);
      }
      throw error;
    }
  }

  private handleCircuitBreakerFailure(dbType: string, error: DatabaseError) {
    const circuitBreaker = this.circuitBreakers.get(dbType);
    if (!circuitBreaker) return;

    circuitBreaker.failureCount++;
    circuitBreaker.lastFailureTime = new Date();

    if (circuitBreaker.failureCount >= this.circuitBreakerConfig.failureThreshold) {
      this.tripCircuitBreaker(dbType);
    }
  }

  private tripCircuitBreaker(dbType: string) {
    const circuitBreaker = this.circuitBreakers.get(dbType);
    if (!circuitBreaker) return;

    circuitBreaker.isOpen = true;
    circuitBreaker.halfOpenTimeout = setTimeout(() => {
      circuitBreaker.isOpen = false;
      circuitBreaker.failureCount = 0;
    }, this.circuitBreakerConfig.resetTimeout);

    recordError('circuit_breaker_tripped', {
      dbType,
      timestamp: new Date(),
      failureCount: circuitBreaker.failureCount
    });
  }

  private resetCircuitBreaker(dbType: string) {
    const circuitBreaker = this.circuitBreakers.get(dbType);
    if (!circuitBreaker) return;

    circuitBreaker.failureCount = 0;
    if (circuitBreaker.halfOpenTimeout) {
      clearTimeout(circuitBreaker.halfOpenTimeout);
      circuitBreaker.halfOpenTimeout = null;
    }
  }

  private async executeFallback<T>(dbType: string, fallbackOperation: () => Promise<T>): Promise<T> {
    try {
      const result = await fallbackOperation();
      this.fallbackCache.set(dbType, {
        data: result,
        timestamp: new Date()
      });
      return result;
    } catch (error) {
      recordError('fallback_operation_failed', {
        dbType,
        error,
        timestamp: new Date()
      });
      throw error;
    }
  }

  public async executeOperation<T>(
    dbType: string,
    operation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>
  ): Promise<T> {
    return this.executeWithCircuitBreaker(dbType, 
      () => this.executeWithRetry(operation),
      fallbackOperation
    );
  }

  public async withRetry<T>(
    operation: () => Promise<T>,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    return this.executeWithRetry(operation, config);
  }

  public async handleTransaction<T>(
    operations: (() => Promise<T>)[],
    retryConfig?: Partial<RetryConfig>
  ): Promise<T[]> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    
    return this.executeWithRetry(async () => {
      const results: T[] = [];
      
      try {
        await prisma.$transaction(async (tx) => {
          for (const operation of operations) {
            const result = await operation();
            results.push(result);
          }
        });
        
        return results;
      } catch (error) {
        recordError('database_transaction_failed', {
          error,
          operations: operations.map(op => op.name)
        });
        throw error;
      }
    }, config);
  }

  public async checkConnection(): Promise<boolean> {
    try {
      await this.withRetry(async () => {
        await prisma.$queryRaw`SELECT 1`;
      });
      return true;
    } catch (error) {
      recordError('database_connection_check_failed', { error });
      return false;
    }
  }

  public getConnectionStatus(): Record<string, ConnectionPool> {
    return Object.fromEntries(this.connectionPool);
  }

  private handleConnectionError(dbType: string, error: DatabaseError) {
    this.updateConnectionStatus(dbType, false, error);
    recordError(`database_connection_error_${dbType}`, JSON.stringify({
      error,
      dbType,
      timestamp: new Date()
    }));

    auditLogger.log({
      category: 'database',
      severity: 'error',
      message: `Database connection error for ${dbType}`,
      context: { error }
    });
  }

  public async cleanup() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  public async recoverConnection(dbType: string): Promise<boolean> {
    const circuitBreaker = this.circuitBreakers.get(dbType);
    if (!circuitBreaker) return false;

    try {
      switch (dbType) {
        case 'prisma':
          await this.checkPrismaConnection();
          break;
        case 'indexeddb':
          await this.checkIndexedDBConnection();
          break;
        case 'firebase':
          await this.checkFirebaseConnection();
          break;
        default:
          return false;
      }

      this.resetCircuitBreaker(dbType);
      this.updateConnectionStatus(dbType, true);
      return true;
    } catch (error) {
      this.handleConnectionError(dbType, error as DatabaseError);
      return false;
    }
  }
}

export const databaseErrorHandler = DatabaseErrorHandler.getInstance(); 