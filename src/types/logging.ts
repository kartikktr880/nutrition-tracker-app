import { format, transports } from 'winston';

export interface LogMeta {
  [key: string]: unknown;
}

export interface LoggerStream {
  write: (message: string) => void;
}

export interface LoggerConfig {
  level: string;
  format: ReturnType<typeof format.combine>;
  transports: transports.StreamTransportInstance[];
}

export interface LoggerTransport {
  filename?: string;
  level?: string;
  maxsize?: number;
  maxFiles?: number;
  format?: ReturnType<typeof format.combine>;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  category: string;
  severity: LogLevel;
  message: string;
  context?: LogMeta;
  userId?: string;
}

export type AuditLogInput = Omit<AuditLogEntry, 'id' | 'timestamp'>; 