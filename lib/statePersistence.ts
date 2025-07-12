import { logError, logWarn as _logWarn, logInfo as _logInfo, logDebug as _logDebug } from '../utils/logger';
class StatePersistence {
  public async saveState(key: string, data: unknown): Promise<void> {
    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(key, serializedData);
    } catch (error) {
      logError(`Failed to save state for key ${key}:`, error);
      throw error;
    }
  }

  public async loadState<T>(key: string, defaultValue?: T): Promise<T | null> {
    try {
      const serializedData = localStorage.getItem(key);
      if (serializedData === null) {
        return defaultValue || null;
      }
      return JSON.parse(serializedData) as T;
    } catch (error) {
      logError(`Failed to load state for key ${key}:`, error);
      return defaultValue || null;
    }
  }

  public async removeState(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      logError(`Failed to remove state for key ${key}:`, error);
      throw error;
    }
  }

  public async clearAllState(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      logError('Failed to clear all state:', error);
      throw error;
    }
  }
}

export const statePersistence = new StatePersistence(); 