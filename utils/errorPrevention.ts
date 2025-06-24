import { ExerciseSession } from '@/types/exercise';
import { validateSessionData } from './validation';
import { logAudit } from './auditLog';
import { recoveryManager } from './recovery';
import { encryptData, decryptData } from './encryption';

interface ErrorPreventionConfig {
  maxRetries: number;
  retryDelay: number;
  validationTimeout: number;
  maxConcurrentOperations: number;
  maxOperationAge: number;
  cleanupInterval: number;
}

interface OperationState {
  id: string;
  type: 'create' | 'update' | 'delete';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  lastError?: string;
  timestamp: string;
  userId: string;
  data: ExerciseSession;
  validationErrors?: string[];
}

class ErrorPreventionManager {
  private static instance: ErrorPreventionManager;
  private config: ErrorPreventionConfig;
  private operationStates: Map<string, OperationState>;
  private activeOperations: Set<string>;
  private cleanupTimer?: NodeJS.Timeout;

  private constructor() {
    this.config = {
      maxRetries: 3,
      retryDelay: 5000,
      validationTimeout: 30000,
      maxConcurrentOperations: 5,
      maxOperationAge: 3600000, // 1 hour
      cleanupInterval: 300000 // 5 minutes
    };
    this.operationStates = new Map();
    this.activeOperations = new Set();
    this.startCleanupTimer();
  }

  public static getInstance(): ErrorPreventionManager {
    if (!ErrorPreventionManager.instance) {
      ErrorPreventionManager.instance = new ErrorPreventionManager();
    }
    return ErrorPreventionManager.instance;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOperations();
    }, this.config.cleanupInterval);
  }

  public async validateOperation(
    type: 'create' | 'update' | 'delete',
    data: ExerciseSession
  ): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      const errors: string[] = [];

      // Validate session data
      if (type !== 'delete') {
        const validationError = validateSessionData(data);
        if (validationError) {
          errors.push(validationError);
        }
      }

      // Check for concurrent operations
      if (this.activeOperations.size >= this.config.maxConcurrentOperations) {
        errors.push('Too many concurrent operations. Please try again later.');
      }

      // Check for duplicate operations
      const existingOperation = Array.from(this.operationStates.values()).find(
        op => op.type === type && 
             op.status === 'pending' && 
             op.id === data.id &&
             op.userId === data.userId
      );

      if (existingOperation) {
        errors.push('Duplicate operation detected. Please wait for the current operation to complete.');
      }

      // Check for stale operations
      const staleOperation = Array.from(this.operationStates.values()).find(
        op => op.type === type && 
             op.status === 'pending' && 
             op.id === data.id &&
             op.userId === data.userId &&
             Date.now() - new Date(op.timestamp).getTime() > this.config.maxOperationAge
      );

      if (staleOperation) {
        errors.push('Stale operation detected. Please try again.');
        this.operationStates.delete(staleOperation.id);
        this.activeOperations.delete(staleOperation.id);
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      return { 
        valid: false, 
        errors: [error instanceof Error ? error.message : 'Unknown validation error'] 
      };
    }
  }

  public async trackOperation(
    type: 'create' | 'update' | 'delete',
    data: ExerciseSession
  ): Promise<string> {
    const operationId = crypto.randomUUID();
    const operationState: OperationState = {
      id: operationId,
      type,
      status: 'pending',
      retryCount: 0,
      timestamp: new Date().toISOString(),
      userId: data.userId,
      data
    };

    this.operationStates.set(operationId, operationState);
    this.activeOperations.add(operationId);

    logAudit({
      userId: data.userId,
      action: 'track_operation',
      details: {
        type,
        operationId,
        status: 'pending'
      }
    });

    return operationId;
  }

  public async updateOperationStatus(
    operationId: string,
    status: 'processing' | 'completed' | 'failed',
    error?: string
  ): Promise<void> {
    const operation = this.operationStates.get(operationId);
    if (!operation) {
      throw new Error('Operation not found');
    }

    operation.status = status;
    if (error) {
      operation.lastError = error;
    }

    if (status === 'completed' || status === 'failed') {
      this.activeOperations.delete(operationId);
    }

    this.operationStates.set(operationId, operation);

    logAudit({
      userId: operation.userId,
      action: 'update_operation_status',
      details: {
        type: operation.type,
        operationId,
        status,
        error
      }
    });
  }

  public async handleOperationError(
    operationId: string,
    error: Error,
    data: ExerciseSession
  ): Promise<void> {
    const operation = this.operationStates.get(operationId);
    if (!operation) {
      throw new Error('Operation not found');
    }

    operation.retryCount++;
    operation.lastError = error.message;

    if (operation.retryCount >= this.config.maxRetries) {
      // Add to recovery queue
      await recoveryManager.addToRecoveryQueue(
        operation.type,
        data,
        error.message
      );

      await this.updateOperationStatus(operationId, 'failed', error.message);
    } else {
      // Retry after delay
      setTimeout(async () => {
        await this.updateOperationStatus(operationId, 'pending');
      }, this.config.retryDelay);
    }

    this.operationStates.set(operationId, operation);

    logAudit({
      userId: operation.userId,
      action: 'handle_operation_error',
      details: {
        type: operation.type,
        operationId,
        error: error.message,
        retryCount: operation.retryCount
      }
    });
  }

  public async getOperationStatus(operationId: string): Promise<OperationState | null> {
    return this.operationStates.get(operationId) || null;
  }

  public async cleanupOperations(): Promise<void> {
    const now = Date.now();
    for (const [id, operation] of this.operationStates.entries()) {
      const operationTime = new Date(operation.timestamp).getTime();
      if (now - operationTime > this.config.maxOperationAge) {
        this.operationStates.delete(id);
        this.activeOperations.delete(id);

        logAudit({
          userId: operation.userId,
          action: 'cleanup_operation',
          details: {
            type: operation.type,
            operationId: id,
            reason: 'operation_age_exceeded'
          }
        });
      }
    }
  }

  public async getActiveOperations(): Promise<OperationState[]> {
    return Array.from(this.operationStates.values())
      .filter(op => op.status === 'pending' || op.status === 'processing');
  }

  public async getFailedOperations(): Promise<OperationState[]> {
    return Array.from(this.operationStates.values())
      .filter(op => op.status === 'failed');
  }

  public async getOperationHistory(userId: string): Promise<OperationState[]> {
    return Array.from(this.operationStates.values())
      .filter(op => op.userId === userId);
  }

  public async resetOperation(operationId: string): Promise<void> {
    const operation = this.operationStates.get(operationId);
    if (!operation) {
      throw new Error('Operation not found');
    }

    operation.status = 'pending';
    operation.retryCount = 0;
    operation.lastError = undefined;
    operation.timestamp = new Date().toISOString();

    this.operationStates.set(operationId, operation);
    this.activeOperations.add(operationId);

    logAudit({
      userId: operation.userId,
      action: 'reset_operation',
      details: {
        type: operation.type,
        operationId
      }
    });
  }
}

export const errorPreventionManager = ErrorPreventionManager.getInstance(); 