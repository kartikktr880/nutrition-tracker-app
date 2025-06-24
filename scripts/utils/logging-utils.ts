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
                console.debug(formattedMessage);
                break;
            case 'info':
                console.info(formattedMessage);
                break;
            case 'warn':
                console.warn(formattedMessage);
                break;
            case 'error':
                console.error(formattedMessage);
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
        return logEntry;
    }

    static startLogGroup(groupName: string): void {
        this.state.currentGroup = groupName;
        this.state.logGroups[groupName] = [];
        console.group(groupName);
    }

    static endLogGroup(): void {
        if (this.state.currentGroup) {
            console.groupEnd();
            this.state.currentGroup = null;
        }
    }

    static count(label: string = 'default'): void {
        console.count(label);
    }

    static time(label: string): void {
        console.time(label);
    }

    static timeEnd(label: string): void {
        console.timeEnd(label);
    }

    static table(data: any, columns?: string[]): void {
        console.table(data, columns);
    }

    static trace(message?: string): void {
        console.trace(message);
    }

    static assert(condition: boolean, message?: string): void {
        console.assert(condition, message);
    }

    static clear(): void {
        console.clear();
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