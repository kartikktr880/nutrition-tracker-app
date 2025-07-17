import { logError, logWarn, logInfo, logDebug } from '../../utils/logger';
export class LoggingUtils {
    private static readonly LOG_LEVELS = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3
    };

    private static state = {
        cache: new Map<string, any>(),
        logGroups: {} as Record<string, any[]>,
        currentGroup: null as string | null
    };

    static log(level: keyof typeof LoggingUtils.LOG_LEVELS, message: string): void {
        const timestamp = new Date().toISOString();
        const formattedMessage = this.formatLogMessage(level, message);
        
        switch (level) {
            case 'debug':
                logDebug(formattedMessage);
                break;
            case 'info':
                logInfo(formattedMessage);
                break;
            case 'warn':
                logWarn(formattedMessage);
                break;
            case 'error':
                logError(formattedMessage);
                break;
        }

        if (this.state.currentGroup) {
            this.state.logGroups[this.state.currentGroup].push({
                level,
                message,
                timestamp
            });
        }
    }

    static isValidLogLevel(level: string): boolean {
        return level in this.LOG_LEVELS;
    }

    static formatLogMessage(level: keyof typeof LoggingUtils.LOG_LEVELS, message: string): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    }

    static logWithContext(level: keyof typeof LoggingUtils.LOG_LEVELS, message: string, context: Record<string, any>): void {
        const logEntry = {
            level,
            message,
            context,
            timestamp: new Date().toISOString()
        };
        this.log(level, `${message} ${JSON.stringify(context)}`);
    }

    static startLogGroup(groupName: string): void {
        this.state.currentGroup = groupName;
        this.state.logGroups[groupName] = [];
        // Log group started - handled by logging system
    }

    static endLogGroup(): void {
        if (this.state.currentGroup) {
            // Log group ended - handled by logging system
            this.state.currentGroup = null;
        }
    }

    static count(label: string = 'default'): void {
        // Count logged - handled by logging system
    }

    static time(label: string): void {
        // Time started - handled by logging system
    }

    static timeEnd(label: string): void {
        // Time ended - handled by logging system
    }

    static table(data: any, columns?: string[]): void {
        // Table logged - handled by logging system
    }

    static trace(message?: string): void {
        // Trace logged - handled by logging system
    }

    static assert(condition: boolean, message?: string): void {
        // Assert logged - handled by logging system
    }

    static clear(): void {
        // Console cleared - handled by logging system
        this.state.logGroups = {};
        this.state.currentGroup = null;
    }

    static getLogGroups(): Record<string, any[]> {
        return { ...this.state.logGroups };
    }

    static getCurrentGroup(): string | null {
        return this.state.currentGroup;
    }
} 