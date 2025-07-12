import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import React, { useState, useEffect, useCallback } from 'react';

import { ExerciseProgress as ExerciseProgressType, ExerciseGoal } from '@/types/exercise';
import { logError, logWarn as _logWarn, logInfo as _logInfo, logDebug as _logDebug } from 'src/utils/logger';

interface ExerciseProgressProps {
  exerciseId: string;
}

export const ExerciseProgress: React.FC<ExerciseProgressProps> = ({ exerciseId }) => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ExerciseProgressType[]>([]);
  const [goals, setGoals] = useState<ExerciseGoal[]>([]);
  const [currentGoal, setCurrentGoal] = useState<ExerciseGoal | null>(null);

  const _fetchProgressData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [progressResponse, goalsResponse] = await Promise.all([
        fetch(`/api/exercise/progress?exerciseId=${exerciseId}`),
        fetch(`/api/exercise/goals?exerciseId=${exerciseId}`),
      ]);

      if (!progressResponse.ok || !goalsResponse.ok) {
        throw new Error('Failed to fetch progress data');
      }

      const [progressData, goalsData] = await Promise.all([
        progressResponse.json(),
        goalsResponse.json(),
      ]);

      setProgress(progressData);
      setGoals(goalsData);

      // Find current active goal
      const activeGoal = goalsData.find(
        (goal: ExerciseGoal) => goal.status === 'in-progress'
      );
      setCurrentGoal(activeGoal || null);
    } catch (error) {
      logError();
      _logWarn();
      setError(error instanceof Error ? error.message : 'An error occurred while fetching progress data');
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    _fetchProgressData();
  }, [_fetchProgressData]);

  const addProgress = async (data: Partial<ExerciseProgressType>) => {
    setError(null);
    try {
      // Validate data before sending
      if (data.sets && data.sets < 0) throw new Error('Sets cannot be negative');
      if (data.reps && data.reps < 0) throw new Error('Reps cannot be negative');
      if (data.weight && data.weight < 0) throw new Error('Weight cannot be negative');
      if (data.duration && data.duration < 0) throw new Error('Duration cannot be negative');

      const response = await fetch('/api/exercise/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          exerciseId,
          userId: session?.user?.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add progress');
      }

      const newProgress = await response.json();
      
      // Update progress state atomically
      setProgress(prev => [...prev, newProgress]);
      
      // Update goal progress with the new data
      if (currentGoal) {
        const progress = calculateGoalProgress(newProgress);
        const status = progress >= 100 ? 'completed' : 'in-progress';
        
        setCurrentGoal(prev => {
          if (!prev) return null;
          return {
            ...prev,
            progress,
            status,
          };
        });
      }
    } catch (error) {
      logError();
      _logWarn();
      setError(error instanceof Error ? error.message : 'An error occurred while adding progress');
    }
  };

  const calculateGoalProgress = (newProgress: ExerciseProgressType): number => {
    if (!currentGoal) return 0;

    // Validate exercise type compatibility
    if (newProgress.exerciseType !== currentGoal.exerciseType) {
      _logWarn();
      return 0;
    }

    // Define weights for different metrics
    const weights = {
      sets: 0.3,
      reps: 0.3,
      weight: 0.2,
      duration: 0.2
    };

    // Calculate individual progress percentages with validation
    const setsProgress = currentGoal.targetSets > 0 
      ? Math.min((newProgress.sets / currentGoal.targetSets) * 100, 100)
      : 0;
    
    const repsProgress = currentGoal.targetReps > 0
      ? Math.min((newProgress.reps / currentGoal.targetReps) * 100, 100)
      : 0;
    
    const weightProgress = currentGoal.targetWeight > 0
      ? Math.min((newProgress.weight / currentGoal.targetWeight) * 100, 100)
      : 0;
    
    const durationProgress = currentGoal.targetDuration > 0
      ? Math.min((newProgress.duration / currentGoal.targetDuration) * 100, 100)
      : 0;

    // Calculate weighted average
    const weightedProgress = 
      (setsProgress * weights.sets) +
      (repsProgress * weights.reps) +
      (weightProgress * weights.weight) +
      (durationProgress * weights.duration);

    // Cap progress at 100%
    return Math.min(Math.max(weightedProgress, 0), 100);
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading progress...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p className="font-medium">Error</p>
          <p>{error}</p>
          <button
            onClick={_fetchProgressData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (progress.length === 0 && goals.length === 0) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">No Progress Data</h3>
          <p className="text-gray-600 mb-4">Start tracking your exercise progress to see your improvements over time.</p>
          <button
            onClick={() => addProgress({
              date: new Date().toISOString(),
              sets: 0,
              reps: 0,
              weight: 0,
              duration: 0,
              intensity: 2, // 2 = medium
            })}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
          >
            Start Tracking
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-white rounded-lg shadow-lg"
    >
      <h2 className="text-2xl font-bold mb-6">Exercise Progress</h2>

      {currentGoal && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Current Goal</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span>Progress</span>
                <span>{currentGoal.progress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${currentGoal.progress}%` }}
                ></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Target Sets</p>
                <p className="font-medium">{currentGoal.targetSets}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Target Reps</p>
                <p className="font-medium">{currentGoal.targetReps}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Target Weight</p>
                <p className="font-medium">{currentGoal.targetWeight} kg</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Target Duration</p>
                <p className="font-medium">{currentGoal.targetDuration} min</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Recent Progress</h3>
        <div className="space-y-4">
          {progress.slice(0, 5).map(p => (
            <div key={p.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium">
                    {new Date(p.date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Sets</p>
                  <p className="font-medium">{p.sets}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Reps</p>
                  <p className="font-medium">{p.reps}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Weight</p>
                  <p className="font-medium">{p.weight} kg</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-medium">{p.duration} min</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Intensity</p>
                  <p className="font-medium">{p.intensity}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => addProgress({})}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Add Progress
      </button>
    </motion.div>
  );
}; 