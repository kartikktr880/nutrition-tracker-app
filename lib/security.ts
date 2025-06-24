import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { withRetry } from '@/lib/retry';
import { recordOperationLatency, recordError } from '@/lib/monitoring';
import { sessionStore } from './session-store';
import { auditLogger } from './audit-logger';

interface SecurityConfig {
  sessionTimeout: number;
  maxLoginAttempts: number;
  loginAttemptWindow: number;
  maxOperationAge: number;
  maxPendingOperations: number;
  maxRetries: number;
  retryDelay: number;
  csrfSecret: string;
}

interface SessionData {
  userId: string;
  createdAt: number;
  lastActivity: number;
  loginAttempts: number;
  isLocked: boolean;
}

class SecurityService {
  private static instance: SecurityService;
  private config: SecurityConfig;
  private lastCleanupTime: number = Date.now();
  private isInitialized: boolean = false;

  private constructor() {
    this.config = {
      sessionTimeout: 3600 * 1000, // 1 hour
      maxLoginAttempts: 5,
      loginAttemptWindow: 300 * 1000, // 5 minutes
      maxOperationAge: 24 * 60 * 60 * 1000, // 24 hours
      maxPendingOperations: 100,
      maxRetries: 3,
      retryDelay: 1000, // 1 second
      csrfSecret: process.env.CSRF_SECRET || 'placeholder_secret'
    };
  }

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await sessionStore.initialize();
      await auditLogger.initialize();
      await this.cleanupSessions();

      // Start session cleanup interval
      setInterval(() => this.cleanupSessions(), 5 * 60 * 1000); // Every 5 minutes

      this.isInitialized = true;
    } catch (error) {
      recordError('security_initialization', error instanceof Error ? error.name : 'Unknown');
      throw error;
    }
  }

  private async cleanupSessions(): Promise<void> {
    try {
      await sessionStore.cleanupExpiredSessions(this.config.sessionTimeout);
      this.lastCleanupTime = Date.now();
    } catch (error) {
      recordError('session_cleanup', error instanceof Error ? error.name : 'Unknown');
    }
  }

  async createSession(userId: string): Promise<string> {
    const sessionId = crypto.randomUUID();
    await sessionStore.setSession(sessionId, {
      id: sessionId,
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      loginAttempts: 0,
      isLocked: false
    });

    await auditLogger.log({
      category: 'authentication',
      action: 'session_created',
      userId,
      sessionId,
      severity: 'info'
    });

    return sessionId;
  }

  async validateSession(sessionId: string): Promise<boolean> {
    const session = await sessionStore.getSession(sessionId);
    if (!session) {
      await auditLogger.log({
        category: 'authentication',
        action: 'session_validation_failed',
        sessionId,
        severity: 'warning',
        details: { reason: 'session_not_found' }
      });
      return false;
    }

    const now = Date.now();
    if (now - session.lastActivity > this.config.sessionTimeout) {
      await sessionStore.deleteSession(sessionId);
      await auditLogger.log({
        category: 'authentication',
        action: 'session_expired',
        userId: session.userId,
        sessionId,
        severity: 'info'
      });
      return false;
    }

    await sessionStore.updateSessionActivity(sessionId);
    return true;
  }

  async invalidateSession(sessionId: string): Promise<void> {
    const session = await sessionStore.getSession(sessionId);
    await sessionStore.deleteSession(sessionId);
    
    if (session) {
      await auditLogger.log({
        category: 'authentication',
        action: 'session_invalidated',
        userId: session.userId,
        sessionId,
        severity: 'info'
      });
    }
  }

  async trackLoginAttempt(userId: string): Promise<boolean> {
    const sessions = await sessionStore.getSessionsByUserId(userId);
    const session = sessions[0];
    if (!session) return true;

    const now = Date.now();
    if (now - session.createdAt > this.config.loginAttemptWindow) {
      session.loginAttempts = 1;
      session.createdAt = now;
      await sessionStore.setSession(session.id, session);
      return true;
    }

    session.loginAttempts++;
    if (session.loginAttempts >= this.config.maxLoginAttempts) {
      session.isLocked = true;
      await sessionStore.setSession(session.id, session);
      
      await auditLogger.log({
        category: 'security',
        action: 'account_locked',
        userId,
        severity: 'warning',
        details: { 
          reason: 'max_login_attempts_exceeded',
          attempts: session.loginAttempts
        }
      });
      
      return false;
    }

    await sessionStore.setSession(session.id, session);
    return true;
  }

  async isAccountLocked(userId: string): Promise<boolean> {
    const sessions = await sessionStore.getSessionsByUserId(userId);
    const session = sessions[0]; // Get the most recent session
    return session?.isLocked || false;
  }

  async resetLoginAttempts(userId: string): Promise<void> {
    const sessions = await sessionStore.getSessionsByUserId(userId);
    const session = sessions[0];
    if (session) {
      session.loginAttempts = 0;
      session.isLocked = false;
      await sessionStore.setSession(session.id, session);
      
      await auditLogger.log({
        category: 'security',
        action: 'login_attempts_reset',
        userId,
        severity: 'info'
      });
    }
  }

  async generateCSRFToken(sessionId: string): Promise<string> {
    const session = await sessionStore.getSession(sessionId);
    if (!session) throw new Error('Invalid session');

    const data = `${sessionId}:${session.userId}:${this.config.csrfSecret}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async validateCSRFToken(sessionId: string, token: string): Promise<boolean> {
    const session = await sessionStore.getSession(sessionId);
    if (!session) return false;

    const generatedToken = await this.generateCSRFToken(sessionId);
    const isValid = generatedToken === token;

    if (!isValid) {
      await auditLogger.log({
        category: 'security',
        action: 'csrf_validation_failed',
        userId: session.userId,
        sessionId,
        severity: 'warning'
      });
    }

    return isValid;
  }

  async encryptSensitiveData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const key = await this.getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    );

    const result = new Uint8Array(iv.length + encryptedData.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encryptedData), iv.length);

    return btoa(String.fromCharCode(...result));
  }

  async decryptSensitiveData(encryptedData: string): Promise<string> {
    const data = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const iv = data.slice(0, 12);
    const encrypted = data.slice(12);
    const key = await this.getEncryptionKey();

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  }

  private async getEncryptionKey(): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.config.csrfSecret),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('nutrition-tracker-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async getActiveSessionCount(): Promise<number> {
    try {
      const sessions = await sessionStore.getAllSessions();
      return sessions.filter(session => !session.isLocked).length;
    } catch (error) {
      recordError('get_active_session_count', error instanceof Error ? error.name : 'Unknown');
      return 0;
    }
  }

  async getLockedAccountCount(): Promise<number> {
    try {
      const sessions = await sessionStore.getAllSessions();
      return sessions.filter(session => session.isLocked).length;
    } catch (error) {
      recordError('get_locked_account_count', error instanceof Error ? error.name : 'Unknown');
      return 0;
    }
  }

  async getLastCleanupTime(): Promise<number> {
    return this.lastCleanupTime;
  }
}

export const securityService = SecurityService.getInstance();
export default securityService; 