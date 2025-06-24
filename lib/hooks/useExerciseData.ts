import { useState, useCallback } from 'react';
import { exerciseDataService } from '@/lib/services/exercise-data.service';
import { ExerciseSession, ExerciseProgress, ExerciseGoal } from '@/types/exercise';

export function useExerciseData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Session Management
  const getSessions = useCallback(async (startDate?: Date, endDate?: Date) => {
    setLoading(true);
    setError(null);
    try {
      const sessions = await exerciseDataService.getSessions(startDate, endDate);
      return sessions;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createSession = useCallback(async (session: Partial<ExerciseSession>) => {
    setLoading(true);
    setError(null);
    try {
      const newSession = await exerciseDataService.createSession(session);
      return newSession;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Progress Management
  const getProgress = useCallback(async (startDate?: Date, endDate?: Date) => {
    setLoading(true);
    setError(null);
    try {
      const progress = await exerciseDataService.getProgress(startDate, endDate);
      return progress;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch progress');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createProgress = useCallback(async (progress: Partial<ExerciseProgress>) => {
    setLoading(true);
    setError(null);
    try {
      const newProgress = await exerciseDataService.createProgress(progress);
      return newProgress;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create progress');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Goal Management
  const getGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const goals = await exerciseDataService.getGoals();
      return goals;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goals');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createGoal = useCallback(async (goal: Partial<ExerciseGoal>) => {
    setLoading(true);
    setError(null);
    try {
      const newGoal = await exerciseDataService.createGoal(goal);
      return newGoal;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create goal');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Offline Support
  const queueSync = useCallback(async (operation: any) => {
    setLoading(true);
    setError(null);
    try {
      await exerciseDataService.queueSync(operation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue sync operation');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getSessions,
    createSession,
    getProgress,
    createProgress,
    getGoals,
    createGoal,
    queueSync,
  };
} 