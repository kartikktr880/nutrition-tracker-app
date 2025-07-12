import { useState, useEffect } from 'react';
import { exerciseDataService } from '@/lib/services/exercise-data.service';

interface ExerciseData {
  id: string;
  name: string;
  type: string;
  duration: number;
  calories: number;
  date: string;
}

interface UseExerciseDataReturn {
  data: ExerciseData[];
  loading: boolean;
  error: string | null;
  fetchExerciseData: () => Promise<void>;
  saveExerciseData: (data: ExerciseData) => Promise<void>;
  deleteExerciseData: (id: string) => Promise<void>;
}

export const useExerciseData = (): UseExerciseDataReturn => {
  const [data, setData] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExerciseData = async (): Promise<void> => {
    try {
      setLoading(true);
      const sessions = await exerciseDataService.getSessions();
      setData(sessions as any);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch exercise data');
    } finally {
      setLoading(false);
    }
  };

  const saveExerciseData = async (exerciseData: ExerciseData): Promise<void> => {
    try {
      setLoading(true);
      await exerciseDataService.createSession(exerciseData as any);
      await fetchExerciseData(); // Refresh data
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save exercise data');
    } finally {
      setLoading(false);
    }
  };

  const deleteExerciseData = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      // Note: Delete method not implemented in service, would need to be added
      await fetchExerciseData(); // Refresh data
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete exercise data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExerciseData();
  }, []);

  return {
    data,
    loading,
    error,
    fetchExerciseData,
    saveExerciseData,
    deleteExerciseData
  };
}; 