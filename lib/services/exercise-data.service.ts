import { ExerciseSession, ExerciseProgress, ExerciseGoal } from '@/types/exercise';

import { logError, logWarn as _logWarn, logInfo as _logInfo, logDebug as _logDebug } from '../../utils/logger';

class ExerciseDataService {
  private static instance: ExerciseDataService;
  private cache: Map<string, unknown>;
  private syncQueue: unknown[];

  private constructor() {
    this.cache = new Map();
    this.syncQueue = [];
  }

  public static getInstance(): ExerciseDataService {
    if (!ExerciseDataService.instance) {
      ExerciseDataService.instance = new ExerciseDataService();
    }
    return ExerciseDataService.instance;
  }

  // Session Management
  async getSessions(startDate?: Date, endDate?: Date): Promise<ExerciseSession[]> {
    const cacheKey = `sessions_${startDate?.toISOString()}_${endDate?.toISOString()}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as Promise<ExerciseSession[]>;
    }

    const response = await fetch(
      `/api/exercise/data?type=sessions${
        startDate ? `&startDate=${startDate.toISOString()}` : ''
      }${endDate ? `&endDate=${endDate.toISOString()}` : ''}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch sessions');
    }

    const data = await response.json();
    this.cache.set(cacheKey, data);
    return data as Promise<ExerciseSession[]>;
  }

  async createSession(session: Partial<ExerciseSession>): Promise<ExerciseSession> {
    const response = await fetch('/api/exercise/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'session', ...session }),
    });

    if (!response.ok) {
      throw new Error('Failed to create session');
    }

    const data = await response.json();
    this.invalidateCache('sessions');
    return data as Promise<ExerciseSession>;
  }

  // Progress Management
  async getProgress(startDate?: Date, endDate?: Date): Promise<ExerciseProgress[]> {
    const cacheKey = `progress_${startDate?.toISOString()}_${endDate?.toISOString()}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as Promise<ExerciseProgress[]>;
    }

    const response = await fetch(
      `/api/exercise/data?type=progress${
        startDate ? `&startDate=${startDate.toISOString()}` : ''
      }${endDate ? `&endDate=${endDate.toISOString()}` : ''}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch progress');
    }

    const data = await response.json();
    this.cache.set(cacheKey, data);
    return data as Promise<ExerciseProgress[]>;
  }

  async createProgress(progress: Partial<ExerciseProgress>): Promise<ExerciseProgress> {
    const response = await fetch('/api/exercise/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'progress', ...progress }),
    });

    if (!response.ok) {
      throw new Error('Failed to create progress');
    }

    const data = await response.json();
    this.invalidateCache('progress');
    return data as Promise<ExerciseProgress>;
  }

  // Goal Management
  async getGoals(): Promise<ExerciseGoal[]> {
    const cacheKey = 'goals';
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as Promise<ExerciseGoal[]>;
    }

    const response = await fetch('/api/exercise/data?type=goals');

    if (!response.ok) {
      throw new Error('Failed to fetch goals');
    }

    const data = await response.json();
    this.cache.set(cacheKey, data);
    return data as Promise<ExerciseGoal[]>;
  }

  async createGoal(goal: Partial<ExerciseGoal>): Promise<ExerciseGoal> {
    const response = await fetch('/api/exercise/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'goal', ...goal }),
    });

    if (!response.ok) {
      throw new Error('Failed to create goal');
    }

    const data = await response.json();
    this.invalidateCache('goals');
    return data as Promise<ExerciseGoal>;
  }

  // Cache Management
  private invalidateCache(type: string) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(type)) {
        this.cache.delete(key);
      }
    }
  }

  // Offline Support
  async queueSync(operation: unknown) {
    this.syncQueue.push(operation);
    await this.processSyncQueue();
  }

  private async processSyncQueue() {
    if (this.syncQueue.length === 0) return;

    const operation = this.syncQueue[0];
    try {
      await this.executeOperation(operation);
      this.syncQueue.shift();
      await this.processSyncQueue();
    } catch (error) {
      logError('Sync operation failed:', error);
      // Retry logic can be implemented here
    }
  }

  private async executeOperation(operation: unknown) {
    if (typeof operation !== 'object' || operation === null) {
      throw new Error('Invalid operation');
    }
    const { type, method, data } = operation as { type: string; method: string; data: unknown };
    const safeData = (typeof data === 'object' && data !== null) ? data : {};
    const response = await fetch('/api/exercise/data', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...safeData }),
    });

    if (!response.ok) {
      throw new Error(`Failed to execute ${method} operation for ${type}`);
    }
  }
}

export const exerciseDataService = ExerciseDataService.getInstance();