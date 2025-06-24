import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { Exercise, ExerciseSession } from '@/types/exercise';
import { encryptData, decryptData } from '@/utils/encryption';
import { validateExerciseData, validateSessionData } from '@/utils/validation';
import { validateRequest } from '@/utils/requestValidation';
import { ExerciseErrorBoundary } from './ErrorBoundary';
import { syncManager } from '@/utils/sync';

// MET values for different exercise types and intensities
const MET_VALUES = {
  strength: {
    low: 3.0,
    medium: 4.0,
    high: 6.0,
    veryHigh: 8.0
  },
  cardio: {
    low: 4.0,
    medium: 6.0,
    high: 8.0,
    veryHigh: 12.0
  },
  flexibility: {
    low: 2.5,
    medium: 3.0,
    high: 4.0,
    veryHigh: 5.0
  }
};

interface ExerciseTrackerProps {
  onSessionComplete: (session: ExerciseSession) => void;
}

export const ExerciseTracker: React.FC<ExerciseTrackerProps> = ({ onSessionComplete }) => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [userWeight, setUserWeight] = useState<number>(70);
  const [activeSessions, setActiveSessions] = useState<Map<string, ExerciseSession>>(new Map());
  const [sessionData, setSessionData] = useState<ExerciseSession>(() => ({
    id: '',
    userId: session?.user?.id || '',
    exerciseId: '',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    sets: 0,
    reps: 0,
    weight: 0,
    duration: 0,
    intensity: 'medium',
    caloriesBurned: 0,
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  const [currentSession, setCurrentSession] = useState<ExerciseSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ total: 0, pending: 0, failed: 0 });

  useEffect(() => {
    if (session?.user?.id) {
      setSessionData(prev => ({ ...prev, userId: session.user.id }));
    }
  }, [session?.user?.id]);

  useEffect(() => {
    const fetchUserWeight = async () => {
      if (!session?.user?.id) {
        setError('User not authenticated');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Validate request before sending
        const request = new Request('/api/user/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.user.id}`,
            'Content-Type': 'application/json',
            'X-Request-ID': crypto.randomUUID(),
            'X-Client-Version': '1.0.0'
          },
          credentials: 'include'
        });

        const validationResult = await validateRequest(request);
        if (!validationResult.isValid) {
          throw new Error(validationResult.error || 'Request validation failed');
        }

        const response = await fetch(request);
        
        if (!response.ok) {
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            throw new Error(`Rate limit exceeded. Please try again after ${retryAfter} seconds.`);
          }
          throw new Error('Failed to fetch user weight');
        }
        
        const encryptedData = await response.json();
        const data = await decryptData(encryptedData);
        
        if (!data.weight || data.weight <= 0) {
          throw new Error('Invalid weight data received');
        }
        
        setUserWeight(data.weight);
      } catch (error) {
        console.error('Error fetching user weight:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch user weight');
      } finally {
        setLoading(false);
      }
    };
    fetchUserWeight();
  }, [session?.user?.id]);

  useEffect(() => {
    // Check sync status periodically
    const interval = setInterval(() => {
      const status = syncManager.getQueueStatus();
      setSyncStatus(status);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const startExercise = async (exercise: Exercise) => {
    if (!session?.user?.id) {
      setError('User not authenticated');
      return;
    }

    // Validate exercise data
    const validationError = validateExerciseData(exercise);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Check if exercise is already in progress
    if (currentExercise) {
      setError('Exercise already in progress. Please end current exercise first.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const sessionId = `session_${Date.now()}`;
      const newSession: ExerciseSession = {
        ...sessionData,
        id: sessionId,
        userId: session.user.id,
        exerciseId: exercise.id,
        startTime: new Date().toISOString(),
        sets: 0,
        reps: 0,
        weight: 0,
        duration: 0,
      };

      // Validate session data
      const sessionValidationError = validateSessionData(newSession);
      if (sessionValidationError) {
        throw new Error(sessionValidationError);
      }

      // Encrypt sensitive session data
      const encryptedSession = await encryptData(newSession);

      // Add to sync queue
      await syncManager.addToQueue(newSession, 'create');

      setCurrentExercise(exercise);
      setActiveSessions(prev => new Map(prev).set(sessionId, encryptedSession));
      setSessionData(newSession);
    } catch (error) {
      console.error('Error starting exercise:', error);
      setError(error instanceof Error ? error.message : 'Failed to start exercise');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateCaloriesBurned = (duration: number, exercise: Exercise, weight: number): number => {
    // Validate input parameters
    if (!exercise || !weight || duration <= 0) {
      console.warn('Invalid parameters for calorie calculation');
      return 0;
    }

    const exerciseType = exercise.type || 'strength';
    const intensity = exercise.intensity || 'medium';
    
    // Validate exercise type and intensity
    if (!MET_VALUES[exerciseType] || !MET_VALUES[exerciseType][intensity]) {
      console.warn(`Invalid exercise type (${exerciseType}) or intensity (${intensity})`);
      return 0;
    }

    try {
      const MET = MET_VALUES[exerciseType][intensity];
      const calories = Math.round(MET * weight * (duration / 60));
      return Math.max(0, calories); // Ensure non-negative calories
    } catch (error) {
      console.error('Error calculating calories:', error);
      return 0;
    }
  };

  const endExercise = async () => {
    if (!currentExercise) {
      setError('No exercise in progress');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const endTime = new Date();
      const startTime = new Date(sessionData.startTime);
      const duration = (endTime.getTime() - startTime.getTime()) / 1000 / 60; // in minutes

      if (duration < 0) {
        throw new Error('Invalid exercise duration');
      }

      const updatedSession = {
        ...sessionData,
        endTime: endTime.toISOString(),
        duration,
        caloriesBurned: calculateCaloriesBurned(duration, currentExercise, userWeight),
      };

      // Validate updated session data
      const validationError = validateSessionData(updatedSession);
      if (validationError) {
        throw new Error(validationError);
      }

      // Encrypt session data before sending
      const encryptedSession = await encryptData(updatedSession);

      // Add to sync queue
      await syncManager.addToQueue(updatedSession, 'update');

      setSessionData(updatedSession);
      setCurrentExercise(null);
      setActiveSessions(prev => {
        const newSessions = new Map(prev);
        newSessions.delete(sessionData.id);
        return newSessions;
      });
      onSessionComplete(encryptedSession);
    } catch (error) {
      console.error('Error ending exercise:', error);
      setError(error instanceof Error ? error.message : 'Failed to end exercise');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSessionProgress = async (sessionId: string, updates: Partial<ExerciseSession>) => {
    setActiveSessions(prev => {
      const newSessions = new Map(prev);
      const encryptedSession = newSessions.get(sessionId);
      if (encryptedSession) {
        (async () => {
          try {
            setIsLoading(true);
            setError(null);

            const session = await decryptData(encryptedSession);
            const updatedSession = { ...session, ...updates };
            
            // Validate updated session
            const validationError = validateSessionData(updatedSession);
            if (validationError) {
              setError(validationError);
              return;
            }

            // Encrypt updated session
            const newEncryptedSession = await encryptData(updatedSession);
            newSessions.set(sessionId, newEncryptedSession);

            // Add to sync queue
            await syncManager.addToQueue(updatedSession, 'update');

            setCurrentSession(updatedSession);
          } catch (error) {
            console.error('Error updating session:', error);
            setError(error instanceof Error ? error.message : 'Failed to update session');
          } finally {
            setIsLoading(false);
          }
        })();
      }
      return newSessions;
    });
  };

  return (
    <ExerciseErrorBoundary>
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-6">Exercise Tracker</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        {syncStatus.failed > 0 && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-600">
              {syncStatus.failed} sync operations failed. Please check your connection.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading...</span>
          </div>
        ) : (
          <>
            {currentExercise ? (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Current Exercise</h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium">{currentExercise.name}</p>
                  <p className="text-gray-600">{currentExercise.description}</p>
                  <div className="mt-4">
                    <button
                      onClick={endExercise}
                      className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      End Exercise
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Start New Exercise</h3>
                {/* Add exercise selection UI here */}
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Session Summary</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p>Duration: {sessionData.duration.toFixed(1)} minutes</p>
                <p>Calories Burned: {sessionData.caloriesBurned.toFixed(0)} kcal</p>
                <p>Exercises Completed: {sessionData.sets}</p>
              </div>
            </div>

            {activeSessions.size > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Active Sessions</h3>
                <div className="space-y-4">
                  {Array.from(activeSessions.values()).map(session => (
                    <div key={session.id} className="p-4 bg-gray-50 rounded-lg">
                      <p>Session ID: {session.id}</p>
                      <p>Duration: {((new Date().getTime() - new Date(session.startTime).getTime()) / 1000 / 60).toFixed(1)} minutes</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ExerciseErrorBoundary>
  );
}; 