import { v4 as uuidv4 } from 'uuid';

// Define log levels
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

interface LoggerConfig {
  persistToStorage?: boolean;
  maxStoredLogs?: number;
  storageKey?: string;
}

// Default configuration
const defaultConfig: LoggerConfig = {
  persistToStorage: true,
  maxStoredLogs: 1000,
  storageKey: 'nutrition_tracker_logs'
};

// Current configuration
let loggerConfig: LoggerConfig = { ...defaultConfig };

// Default log level from environment or localStorage
let currentLogLevel = LogLevel.INFO;

// Try to get log level from localStorage if available
try {
  const storedLevel = localStorage.getItem('log_level');
  if (storedLevel) {
    currentLogLevel = parseInt(storedLevel, 10);
  }
} catch (e) {
  // Ignore errors (might be running in SSR environment)
}

// Helper function to format log messages
const formatMessage = (message: string, data?: any): string => {
  const timestamp = new Date().toISOString();
  let formattedMessage = `[${timestamp}] ${message}`;
  
  if (data !== undefined) {
    try {
      if (typeof data === 'object' && data !== null) {
        formattedMessage += ` ${JSON.stringify(data)}`;
  } else {
        formattedMessage += ` ${data}`;
      }
    } catch (e) {
      formattedMessage += ' [Unstringifiable data]';
    }
  }
  
  return formattedMessage;
};

// Helper function to persist logs to localStorage
const persistLog = (level: LogLevel, message: string, data?: any): void => {
  if (!loggerConfig.persistToStorage) return;
  
  try {
    // Get existing logs
    const storedLogsString = localStorage.getItem(loggerConfig.storageKey || defaultConfig.storageKey!);
    const storedLogs: LogEntry[] = storedLogsString ? JSON.parse(storedLogsString) : [];
    
    // Add new log entry
    const newLog: LogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      level,
      message,
      data: data !== undefined ? data : undefined
    };
    
    // Add to beginning for newest-first order
    storedLogs.unshift(newLog);
    
    // Trim logs if exceeding max count
    const trimmedLogs = storedLogs.slice(0, loggerConfig.maxStoredLogs || defaultConfig.maxStoredLogs);
    
    // Save back to localStorage
    localStorage.setItem(loggerConfig.storageKey || defaultConfig.storageKey!, JSON.stringify(trimmedLogs));
  } catch (e) {
    // Silently fail if localStorage is not available or quota is exceeded
    console.error('Failed to persist log to localStorage:', e);
  }
};

// Log functions for different levels
export const logDebug = (message: string, data?: any): void => {
  if (currentLogLevel <= LogLevel.DEBUG) {
    console.debug(formatMessage(message, data));
    persistLog(LogLevel.DEBUG, message, data);
  }
};

export const logInfo = (message: string, data?: any): void => {
  if (currentLogLevel <= LogLevel.INFO) {
    console.info(formatMessage(message, data));
    persistLog(LogLevel.INFO, message, data);
  }
};

export const logWarn = (message: string, data?: any): void => {
  if (currentLogLevel <= LogLevel.WARN) {
    console.warn(formatMessage(message, data));
    persistLog(LogLevel.WARN, message, data);
}
};

export const logError = (message: string, data?: any): void => {
  if (currentLogLevel <= LogLevel.ERROR) {
    console.error(formatMessage(message, data));
    persistLog(LogLevel.ERROR, message, data);
    
    // In a production app, you might want to send errors to a monitoring service
    try {
      // Example: Send to monitoring service
      // monitoring.captureError({ message, data });
    } catch (e) {
      // Ignore errors in error reporting
    }
  }
};

// Set log level
export const setLogLevel = (level: LogLevel): void => {
  currentLogLevel = level;
  try {
    localStorage.setItem('log_level', level.toString());
  } catch (e) {
    // Ignore errors
  }
};

// Get current log level
export const getLogLevel = (): LogLevel => {
  return currentLogLevel;
};

// Configure logger
export const configureLogger = (config: LoggerConfig): void => {
  loggerConfig = { ...defaultConfig, ...config };
};

// Get logs from storage
export const getStoredLogs = (
  filter?: { level?: LogLevel, fromDate?: Date, toDate?: Date }
): LogEntry[] => {
  try {
    const storedLogsString = localStorage.getItem(loggerConfig.storageKey || defaultConfig.storageKey!);
    if (!storedLogsString) return [];
    
    let logs: LogEntry[] = JSON.parse(storedLogsString);
    
    // Apply filters if provided
    if (filter) {
      if (filter.level !== undefined) {
        logs = logs.filter(log => log.level === filter.level);
      }
      
      if (filter.fromDate) {
        const fromTimestamp = filter.fromDate.toISOString();
        logs = logs.filter(log => log.timestamp >= fromTimestamp);
      }
      
      if (filter.toDate) {
        const toTimestamp = filter.toDate.toISOString();
        logs = logs.filter(log => log.timestamp <= toTimestamp);
      }
    }
    
    return logs;
  } catch (e) {
    console.error('Failed to retrieve logs from localStorage:', e);
    return [];
  }
};

// Clear stored logs
export const clearStoredLogs = (): void => {
  try {
    localStorage.removeItem(loggerConfig.storageKey || defaultConfig.storageKey!);
  } catch (e) {
    console.error('Failed to clear logs from localStorage:', e);
}
};

// Export log level enum and types
export { LogLevel };
export type { LogEntry, LoggerConfig };