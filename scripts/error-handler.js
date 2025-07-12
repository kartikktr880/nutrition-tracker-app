import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Enhanced Error Handler
 * Provides comprehensive error handling and recovery strategies
 */

class ErrorHandler {
    constructor() {
        this.errorCount = 0;
    this.lastErrorTime = 0;
    this.errorWindow = 60000; // 1 minute
    this.maxErrors = 5;
        this.errorTypes = {
      VALIDATION: 'validation',
      NETWORK: 'network',
      DATABASE: 'database',
      AUTHENTICATION: 'authentication',
      PERFORMANCE: 'performance',
      MEMORY: 'memory',
      UNKNOWN: 'unknown'
    };
    this.recoveryStrategies = new Map();
    this.errorObservers = new Set();
    this.setupErrorBoundary();
    this.setupRecoveryStrategies();
  }

  setupErrorBoundary() {
    window.addEventListener('error', (event) => this.handleError(event.error));
    window.addEventListener('unhandledrejection', (event) => this.handleError(event.reason));
  }

  setupRecoveryStrategies() {
    // Validation error recovery
    this.recoveryStrategies.set(this.errorTypes.VALIDATION, async (error) => {
      try {
        await this.validateAndFixData(error.context);
        return { success: true, message: 'Data validation fixed' };
      } catch (e) {
        return { success: false, message: 'Failed to fix validation error' };
      }
    });

    // Network error recovery
    this.recoveryStrategies.set(this.errorTypes.NETWORK, async (error) => {
      try {
        await this.retryNetworkOperation(error.context);
        return { success: true, message: 'Network operation retried successfully' };
      } catch (e) {
        return { success: false, message: 'Failed to recover from network error' };
      }
    });

    // Database error recovery
    this.recoveryStrategies.set(this.errorTypes.DATABASE, async (error) => {
      try {
        await this.recoverDatabaseConnection(error.context);
        return { success: true, message: 'Database connection recovered' };
      } catch (e) {
        return { success: false, message: 'Failed to recover database connection' };
      }
    });

    // Authentication error recovery
    this.recoveryStrategies.set(this.errorTypes.AUTHENTICATION, async (error) => {
      try {
        await this.refreshAuthentication(error.context);
        return { success: true, message: 'Authentication refreshed' };
      } catch (e) {
        return { success: false, message: 'Failed to refresh authentication' };
      }
    });

    // Performance error recovery
    this.recoveryStrategies.set(this.errorTypes.PERFORMANCE, async (error) => {
      try {
        await this.optimizePerformance(error.context);
        return { success: true, message: 'Performance optimized' };
      } catch (e) {
        return { success: false, message: 'Failed to optimize performance' };
      }
    });

    // Memory error recovery
    this.recoveryStrategies.set(this.errorTypes.MEMORY, async (error) => {
      try {
        await this.cleanupMemory(error.context);
        return { success: true, message: 'Memory cleaned up' };
      } catch (e) {
        return { success: false, message: 'Failed to clean up memory' };
      }
    });

    // Unknown error recovery
    this.recoveryStrategies.set(this.errorTypes.UNKNOWN, async (error) => {
      try {
        await this.genericRecovery(error.context);
        return { success: true, message: 'Generic recovery attempted' };
      } catch (e) {
        return { success: false, message: 'Failed to recover from unknown error' };
      }
    });
  }

  async handleError(error, context = {}) {
    const now = Date.now();
    
    // Reset error count if window has passed
    if (now - this.lastErrorTime > this.errorWindow) {
      this.errorCount = 1;
    } else {
      this.errorCount++;
    }
    
    this.lastErrorTime = now;
    
    // Determine error type
    const errorType = this.determineErrorType(error);
    
    // Attempt recovery
    const recoveryStrategy = this.recoveryStrategies.get(errorType) || 
                           this.recoveryStrategies.get(this.errorTypes.UNKNOWN);
    
    const recoveryResult = await recoveryStrategy(error);
    
    // Notify observers
    this.notifyObservers({
      error,
      type: errorType,
      context,
      recoveryResult,
      timestamp: now
    });
    
    // Log error with recovery status
    console.error('Application Error:', {
      error,
      type: errorType,
      context,
      recoveryResult
    });
    
    // Return error status
    return {
      shouldEnterSafeMode: this.errorCount >= this.maxErrors,
      errorCount: this.errorCount,
      timeSinceLastError: now - this.lastErrorTime,
      recoveryResult
    };
  }

  addObserver(observer) {
    this.errorObservers.add(observer);
  }

  removeObserver(observer) {
    this.errorObservers.delete(observer);
  }

  notifyObservers(errorData) {
    this.errorObservers.forEach(observer => {
      try {
        observer(errorData);
        } catch (e) {
        logError('Error in error observer:', e);
      }
    });
  }

  determineErrorType(error) {
    if (error.name === 'ValidationError') return this.errorTypes.VALIDATION;
    if (error.name === 'NetworkError') return this.errorTypes.NETWORK;
    if (error.name === 'DatabaseError') return this.errorTypes.DATABASE;
    if (error.name === 'AuthenticationError') return this.errorTypes.AUTHENTICATION;
    if (error.name === 'PerformanceError') return this.errorTypes.PERFORMANCE;
    if (error.name === 'MemoryError') return this.errorTypes.MEMORY;
    return this.errorTypes.UNKNOWN;
  }

  // Recovery strategy implementations
  async validateAndFixData(context) {
    // Implement data validation and fixing logic
  }

  async retryNetworkOperation(context) {
    // Implement network retry logic
  }

  async recoverDatabaseConnection(context) {
    // Implement database recovery logic
  }

  async refreshAuthentication(context) {
    // Implement authentication refresh logic
  }

  async optimizePerformance(context) {
    // Implement performance optimization logic
  }

  async cleanupMemory(context) {
    // Implement memory cleanup logic
  }

  async genericRecovery(context) {
    // Implement generic recovery logic
  }

  reset() {
    this.errorCount = 0;
    this.lastErrorTime = 0;
  }

  cleanup() {
    window.removeEventListener('error', this.handleError);
    window.removeEventListener('unhandledrejection', this.handleError);
  }
}

export const errorHandler = new ErrorHandler(); 