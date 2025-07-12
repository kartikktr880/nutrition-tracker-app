import { logError, logWarn, logInfo, logDebug } from './logger';
import fs from 'fs';
import path from 'path';
import { ExerciseSession } from '@/types/exercise';

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

export function backupSessionData(session: ExerciseSession): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `session_backup_${timestamp}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  try {
    // Ensure backup directory exists
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    fs.writeFileSync(filepath, JSON.stringify(session, null, 2), 'utf8');
    logInfo(`Session data backed up to ${filepath}`);
  } catch (error) {
    logError('Failed to backup session data:', error as Error | undefined);
  }
} 