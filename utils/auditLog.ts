import fs from 'fs';
import path from 'path';

export interface AuditLogEntry {
  timestamp: string;
  userId?: string;
  action: string;
  endpoint: string;
  method: string;
  status: number;
  requestId?: string;
  clientVersion?: string;
  ip?: string;
  details?: Record<string, any>;
}

const LOG_FILE = path.resolve(process.cwd(), 'logs', 'audit.log');

export function logAudit(entry: AuditLogEntry) {
  const logEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  const logLine = JSON.stringify(logEntry) + '\n';
  try {
    // Ensure logs directory exists
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, logLine, 'utf8');
  } catch (error) {
    // Fallback: log to console if file write fails
    console.error('Audit log write failed:', error, logEntry);
  }
} 