import { useState, useCallback } from 'react';

import { exerciseFormService } from '@/lib/services/exercise-form.service';
import { ExerciseFormCheck, ExerciseFormTemplate } from '@/types/exercise';

export function useExerciseForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Template Management
  const getFormTemplates = useCallback(async (exerciseId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const templates = await exerciseFormService.getFormTemplates(exerciseId);
      return templates;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch form templates');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createFormTemplate = useCallback(async (template: Partial<ExerciseFormTemplate>) => {
    setLoading(true);
    setError(null);
    try {
      const newTemplate = await exerciseFormService.createFormTemplate(template);
      return newTemplate;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create form template');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Form Check Management
  const getFormChecks = useCallback(async (exerciseId?: string, startDate?: Date, endDate?: Date) => {
    setLoading(true);
    setError(null);
    try {
      const checks = await exerciseFormService.getFormChecks(exerciseId, startDate, endDate);
      return checks;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch form checks');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createFormCheck = useCallback(async (check: Partial<ExerciseFormCheck>) => {
    setLoading(true);
    setError(null);
    try {
      const newCheck = await exerciseFormService.createFormCheck(check);
      return newCheck;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create form check');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateFormCheck = useCallback(async (id: string, check: Partial<ExerciseFormCheck>) => {
    setLoading(true);
    setError(null);
    try {
      const updatedCheck = await exerciseFormService.updateFormCheck(id, check);
      return updatedCheck;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update form check');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper Methods
  const calculateFormScore = useCallback((checklist: { completed: boolean; importance: string }[]) => {
    return exerciseFormService.calculateFormScore(checklist);
  }, []);

  return {
    loading,
    error,
    getFormTemplates,
    createFormTemplate,
    getFormChecks,
    createFormCheck,
    updateFormCheck,
    calculateFormScore,
  };
} 