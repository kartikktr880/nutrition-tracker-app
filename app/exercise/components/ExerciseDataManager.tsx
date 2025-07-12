import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';

import { useExerciseData } from '@/lib/hooks/useExerciseData';
import { ExerciseSession, ExerciseProgress, ExerciseGoal } from '@/types/exercise';

export function ExerciseDataManager() {
  const {
    loading,
    error,
    getSessions,
    createSession,
    getProgress,
    createProgress,
    getGoals,
    createGoal,
  } = useExerciseData();

  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [progress, setProgress] = useState<ExerciseProgress[]>([]);
  const [goals, setGoals] = useState<ExerciseGoal[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [fetchedSessions, fetchedProgress, fetchedGoals] = await Promise.all([
        getSessions(),
        getProgress(),
        getGoals(),
      ]);

      setSessions(fetchedSessions);
      setProgress(fetchedProgress);
      setGoals(fetchedGoals);
    };

    fetchData();
  }, [getSessions, getProgress, getGoals]);

  const handleCreateSession = async () => {
    const newSession = await createSession({
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
      type: 'cardio',
      intensity: 'medium',
      caloriesBurned: 300,
    });

    if (newSession) {
      setSessions((prev) => [...prev, newSession]);
    }
  };

  const handleCreateProgress = async () => {
    const newProgress = await createProgress({
      date: new Date().toISOString(),
      weight: 75,
      bodyFatPercentage: 20,
      measurements: {
        chest: 100,
        waist: 80,
        hips: 90,
      },
    });

    if (newProgress) {
      setProgress((prev) => [...prev, newProgress]);
    }
  };

  const handleCreateGoal = async () => {
    const newGoal = await createGoal({
      type: 'weight',
      target: 70,
      deadline: new Date(Date.now() + 30 * 24 * 3600000).toISOString(), // 30 days later
      status: 'in-progress',
    });

    if (newGoal) {
      setGoals((prev) => [...prev, newGoal]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-white rounded-lg shadow"
        >
          <h3 className="text-lg font-semibold mb-2">Sessions</h3>
          <p className="text-gray-600 mb-4">{sessions.length} sessions recorded</p>
          <button
            onClick={handleCreateSession}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition"
          >
            Add Session
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 bg-white rounded-lg shadow"
        >
          <h3 className="text-lg font-semibold mb-2">Progress</h3>
          <p className="text-gray-600 mb-4">{progress.length} progress entries</p>
          <button
            onClick={handleCreateProgress}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition"
          >
            Add Progress
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 bg-white rounded-lg shadow"
        >
          <h3 className="text-lg font-semibold mb-2">Goals</h3>
          <p className="text-gray-600 mb-4">{goals.length} active goals</p>
          <button
            onClick={handleCreateGoal}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition"
          >
            Add Goal
          </button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 bg-white rounded-lg shadow"
        >
          <h3 className="text-lg font-semibold mb-4">Recent Sessions</h3>
          <div className="space-y-2">
            {sessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className="p-2 bg-gray-50 rounded flex justify-between items-center"
              >
                <span>{session.exerciseId}</span>
                <span className="text-sm text-gray-500">
                  {new Date(session.startTime).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="p-4 bg-white rounded-lg shadow"
        >
          <h3 className="text-lg font-semibold mb-4">Active Goals</h3>
          <div className="space-y-2">
            {goals
              .filter((goal) => goal.status === 'in-progress')
              .slice(0, 5)
              .map((goal) => (
                <div
                  key={goal.id}
                  className="p-2 bg-gray-50 rounded flex justify-between items-center"
                >
                  <span>{goal.description}</span>
                  <span className="text-sm text-gray-500">
                    Target: {goal.targetWeight}kg
                  </span>
                </div>
              ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
} 