import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import React, { useEffect, useState, useCallback } from 'react';

import { ExerciseGoal } from '@/types/exercise';
import { logWarn as _logWarn, logInfo as _logInfo, logDebug as _logDebug } from 'src/utils/logger';

interface ExerciseGoalsProps {
  exerciseId: string;
}

export const ExerciseGoals: React.FC<ExerciseGoalsProps> = ({ exerciseId }) => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<ExerciseGoal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    targetSets: 0,
    targetReps: 0,
    targetWeight: 0,
    targetDuration: 0,
    deadline: '',
    description: '',
  });

  const _fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/exercise/goals?exerciseId=${exerciseId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch goals');
      }
      const data = await response.json();
      setGoals(data);
    } catch (error) {
      _logWarn();
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    _fetchGoals();
  }, [_fetchGoals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/exercise/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          exerciseId,
          userId: session?.user?.id,
          status: 'in-progress',
          progress: 0,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create goal');
      }

      const newGoal = await response.json();
      setGoals(prev => [...prev, newGoal]);
      setShowForm(false);
      setFormData({
        targetSets: 0,
        targetReps: 0,
        targetWeight: 0,
        targetDuration: 0,
        deadline: '',
        description: '',
      });
    } catch (error) {
      _logWarn();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'description' ? value : Number(value),
    }));
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <p>Loading goals...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-white rounded-lg shadow-lg"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Exercise Goals</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancel' : 'Add Goal'}
        </button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6 p-4 bg-gray-50 rounded-lg"
        >
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Sets
                </label>
                <input
                  type="number"
                  name="targetSets"
                  value={formData.targetSets}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Reps
                </label>
                <input
                  type="number"
                  name="targetReps"
                  value={formData.targetReps}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Weight (kg)
                </label>
                <input
                  type="number"
                  name="targetWeight"
                  value={formData.targetWeight}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Duration (min)
                </label>
                <input
                  type="number"
                  name="targetDuration"
                  value={formData.targetDuration}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deadline
              </label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                rows={3}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Goal
            </button>
          </form>
        </motion.div>
      )}

      <div className="space-y-4">
        {goals.map(goal => (
          <motion.div
            key={goal.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{goal.description}</h3>
                <p className="text-sm text-gray-600">
                  Deadline: {new Date(goal.deadline).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded text-sm ${
                  goal.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {goal.status}
              </span>
            </div>
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span>Progress</span>
                <span>{goal.progress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${goal.progress}%` }}
                ></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Target Sets</p>
                <p className="font-medium">{goal.targetSets}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Target Reps</p>
                <p className="font-medium">{goal.targetReps}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Target Weight</p>
                <p className="font-medium">{goal.targetWeight} kg</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Target Duration</p>
                <p className="font-medium">{goal.targetDuration} min</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}; 