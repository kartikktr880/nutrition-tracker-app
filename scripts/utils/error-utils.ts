/**
 * Error Utilities
 * Enhanced error handling and recovery system
 */

import { LoggingUtils } from './logging-utils';
import { StorageUtils } from './storage-utils';

export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

export enum ErrorCategory {
    NETWORK = 'network',
    STORAGE = 'storage',
    VALIDATION = 'validation',
    RUNTIME = 'runtime',
    UI = 'ui',
    API = 'api',
    AUTH = 'auth',
    PERFORMANCE = 'performance'
}

interface ErrorContext {
        timestamp: number;
    category: ErrorCategory;
    severity: ErrorSeverity;
        message: string;
    stack?: string;
    additionalInfo?: any;
    recoveryAttempted: boolean;
    recoverySuccessful: boolean;
}

interface ErrorRecoveryStrategy {
    category: ErrorCategory;
    severity: ErrorSeverity;
    handler: (error: Error, context: ErrorContext) => Promise<boolean>;
}

export class ErrorUtils {
    private static instance: ErrorUtils;
    private observers: Array<(error: Error, context: ErrorContext) => void> = [];
    private errorHistory: ErrorContext[] = [];
    private readonly maxHistorySize = 100;
    private recoveryStrategies: ErrorRecoveryStrategy[] = [];

    private constructor() {
        this.initializeRecoveryStrategies();
    }

    static getInstance(): ErrorUtils {
        if (!ErrorUtils.instance) {
            ErrorUtils.instance = new ErrorUtils();
        }
        return ErrorUtils.instance;
    }

    private initializeRecoveryStrategies(): void {
        this.recoveryStrategies = [
            {
                category: ErrorCategory.NETWORK,
                severity: ErrorSeverity.MEDIUM,
                handler: this.handleNetworkError.bind(this)
            },
            {
                category: ErrorCategory.STORAGE,
                severity: ErrorSeverity.HIGH,
                handler: this.handleStorageError.bind(this)
            },
            {
                category: ErrorCategory.VALIDATION,
                severity: ErrorSeverity.LOW,
                handler: this.handleValidationError.bind(this)
            },
            {
                category: ErrorCategory.RUNTIME,
                severity: ErrorSeverity.CRITICAL,
                handler: this.handleRuntimeError.bind(this)
            },
            {
                category: ErrorCategory.UI,
                severity: ErrorSeverity.MEDIUM,
                handler: this.handleUIError.bind(this)
            },
            {
                category: ErrorCategory.API,
                severity: ErrorSeverity.HIGH,
                handler: this.handleAPIError.bind(this)
            },
            {
                category: ErrorCategory.AUTH,
                severity: ErrorSeverity.HIGH,
                handler: this.handleAuthError.bind(this)
            },
            {
                category: ErrorCategory.PERFORMANCE,
                severity: ErrorSeverity.MEDIUM,
                handler: this.handlePerformanceError.bind(this)
            }
        ];
    }

    async handleError(error: Error, category: ErrorCategory, severity: ErrorSeverity, additionalInfo?: any): Promise<void> {
        const context: ErrorContext = {
                timestamp: Date.now(),
                category,
            severity,
                message: error.message,
                stack: error.stack,
            additionalInfo,
            recoveryAttempted: false,
            recoverySuccessful: false
        };

        // Log error
        LoggingUtils.log('error', `Error occurred: ${error.message}`);

        // Add to history
        this.addToHistory(context);

        // Attempt recovery
        await this.attemptRecovery(error, context);

        // Notify observers
        this.notifyObservers(error, context);
    }

    private addToHistory(context: ErrorContext): void {
        this.errorHistory.unshift(context);
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.pop();
        }
    }

    private async attemptRecovery(error: Error, context: ErrorContext): Promise<void> {
        const strategy = this.recoveryStrategies.find(
            s => s.category === context.category && s.severity === context.severity
        );

        if (strategy) {
            context.recoveryAttempted = true;
            try {
                context.recoverySuccessful = await strategy.handler(error, context);
                if (context.recoverySuccessful) {
                    LoggingUtils.log('info', `Error recovery successful: ${error.message}`);
                } else {
                    LoggingUtils.log('warn', `Error recovery failed: ${error.message}`);
                }
            } catch (recoveryError) {
                LoggingUtils.log('error', `Error during recovery attempt: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`);
                context.recoverySuccessful = false;
            }
        }
    }

    private async handleNetworkError(error: Error, context: ErrorContext): Promise<boolean> {
        try {
            // Implement network error recovery
            // For example, retry failed requests or switch to offline mode
            return true;
        } catch {
            return false;
        }
    }

    private async handleStorageError(error: Error, context: ErrorContext): Promise<boolean> {
        try {
            // Implement storage error recovery
            // For example, clear corrupted data or switch to alternative storage
            await StorageUtils.clearCorruptedData();
            return true;
        } catch {
            return false;
        }
    }

    private async handleValidationError(error: Error, context: ErrorContext): Promise<boolean> {
        try {
            // Implement validation error recovery
            // For example, reset form or provide default values
            return true;
        } catch {
            return false;
        }
    }

    private async handleRuntimeError(error: Error, context: ErrorContext): Promise<boolean> {
        try {
            // Implement runtime error recovery
            // For example, reload application or reset state
            window.location.reload();
                return true;
        } catch {
            return false;
        }
    }

    private async handleUIError(error: Error, context: ErrorContext): Promise<boolean> {
        try {
            // Implement UI error recovery
            // For example, reset UI state or show fallback UI
            return true;
        } catch {
            return false;
        }
    }

    private async handleAPIError(error: Error, context: ErrorContext): Promise<boolean> {
        try {
            // Implement API error recovery
            // For example, retry request or use cached data
            return true;
        } catch {
            return false;
        }
    }

    private async handleAuthError(error: Error, context: ErrorContext): Promise<boolean> {
        try {
            // Implement auth error recovery
            // For example, refresh token or redirect to login
            return true;
        } catch {
            return false;
        }
    }

    private async handlePerformanceError(error: Error, context: ErrorContext): Promise<boolean> {
        try {
            // Implement performance error recovery
            // For example, enable performance mode or clear caches
            return true;
        } catch {
            return false;
        }
    }

    addObserver(observer: (error: Error, context: ErrorContext) => void): void {
        this.observers.push(observer);
    }

    removeObserver(observer: (error: Error, context: ErrorContext) => void): void {
        this.observers = this.observers.filter(obs => obs !== observer);
    }

    private notifyObservers(error: Error, context: ErrorContext): void {
        this.observers.forEach(observer => observer(error, context));
    }

    getErrorHistory(): ErrorContext[] {
        return [...this.errorHistory];
    }

    getErrorStats(): { [key in ErrorCategory]: number } {
        const stats = Object.values(ErrorCategory).reduce((acc, category) => {
            acc[category] = 0;
            return acc;
        }, {} as { [key in ErrorCategory]: number });

        this.errorHistory.forEach(error => {
            stats[error.category]++;
        });

        return stats;
    }

    cleanup(): void {
        this.observers = [];
        this.errorHistory = [];
    }
}

export const errorUtils = ErrorUtils.getInstance(); 