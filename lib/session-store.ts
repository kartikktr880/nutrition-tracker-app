import { openDB, DBSchema as _DBSchema, IDBPDatabase } from 'idb';

import { logError, logWarn as _logWarn, logInfo as _logInfo, logDebug as _logDebug } from '../utils/logger';

interface SessionData {
  id: string;
  userId: string;
  createdAt: number;
  lastActivity: number;
  loginAttempts: number;
  isLocked: boolean;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
  };
}

interface SessionStoreSchema {
  sessions: {
    key: string;
    value: SessionData;
    indexes: {
      'by-userId': string;
      'by-lastActivity': number;
    };
  };
}

class SessionStore {
  private static instance: SessionStore;
  private db: IDBPDatabase<SessionStoreSchema> | null = null;
  private isInitialized = false;

  static getInstance(): SessionStore {
    if (!SessionStore.instance) {
      SessionStore.instance = new SessionStore();
    }
    return SessionStore.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.db = await openDB<SessionStoreSchema>('session-store', 1, {
        upgrade(db) {
          const store = db.createObjectStore('sessions', { keyPath: 'id' });
          store.createIndex('by-userId', 'userId');
          store.createIndex('by-lastActivity', 'lastActivity');
        },
      });

      this.isInitialized = true;
    } catch (error) {
      logError('Failed to initialize session store:', error);
      throw error;
    }
  }

  async setSession(sessionId: string, data: SessionData): Promise<void> {
    if (!this.db) throw new Error('Session store not initialized');

    try {
      await this.db.put('sessions', { ...data, id: sessionId });
    } catch (error) {
      logError('Failed to set session:', error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<SessionData | undefined> {
    if (!this.db) throw new Error('Session store not initialized');

    try {
      const session = await this.db.get('sessions', sessionId);
      if (session && !session.id) session.id = sessionId;
      return session;
    } catch (error) {
      logError('Failed to get session:', error);
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!this.db) throw new Error('Session store not initialized');

    try {
      await this.db.delete('sessions', sessionId);
    } catch (error) {
      logError('Failed to delete session:', error);
      throw error;
    }
  }

  async getSessionsByUserId(userId: string): Promise<SessionData[]> {
    if (!this.db) throw new Error('Session store not initialized');

    try {
      const index = this.db.transaction('sessions').store.index('by-userId');
      const sessions = await index.getAll(userId);
      // Ensure all sessions have an id field
      return sessions.map((s: unknown) => {
        if (typeof s === 'object' && s !== null && 'id' in s) {
          return { ...(s as SessionData), id: (s as SessionData).id || '' };
        }
        // Fallback for unexpected structure
        return { id: '', userId: '', createdAt: 0, lastActivity: 0, loginAttempts: 0, isLocked: false };
      });
    } catch (error) {
      logError('Failed to get sessions by user ID:', error);
      throw error;
    }
  }

  async cleanupExpiredSessions(maxAge: number): Promise<void> {
    if (!this.db) throw new Error('Session store not initialized');

    try {
      const now = Date.now();
      const index = this.db.transaction('sessions').store.index('by-lastActivity');
      const expiredSessions = await index.getAllKeys(IDBKeyRange.upperBound(now - maxAge));

      const tx = this.db.transaction('sessions', 'readwrite');
      await Promise.all(expiredSessions.map(key => tx.store.delete(key)));
      await tx.done;
    } catch (error) {
      logError('Failed to cleanup expired sessions:', error);
      throw error;
    }
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    if (!this.db) throw new Error('Session store not initialized');

    try {
      const session = await this.getSession(sessionId);
      if (session) {
        session.lastActivity = Date.now();
        await this.setSession(sessionId, session);
      }
    } catch (error) {
      logError('Failed to update session activity:', error);
      throw error;
    }
  }

  async getAllSessions(): Promise<SessionData[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      return await this.db.getAll('sessions');
    } catch (error) {
      logError('Failed to get all sessions:', error);
      throw error;
    }
  }
}

export const sessionStore = SessionStore.getInstance();
export default sessionStore; 