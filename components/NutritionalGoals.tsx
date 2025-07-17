import React, { useState, useEffect } from 'react';

import { useComponentLifecycle } from '../lib/hooks/useComponentLifecycle';
import { analytics } from '../services/analytics';
import { monitoring } from '../services/monitoring';
import { storage } from '../services/storage';
import { NutritionalGoals as NutritionalGoalsType } from '../types/nutrition';
import { logWarn } from '../utils/logger';

interface NutritionalGoalsProps {
  userId: string;
  onUpdate?: (goals: NutritionalGoalsType) => void;
}

const DEFAULT_GOALS: NutritionalGoalsType = {
  dailyCalories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
  fiber: 30,
  sugar: 50,
  sodium: 2300,
  water: 2500,
  mealDistribution: {
    breakfast: 25,
    lunch: 35,
    dinner: 30,
    snacks: 10
  }
};

export const NutritionalGoals: React.FC<NutritionalGoalsProps> = ({ userId, onUpdate }) => {
  const [goals, setGoals] = useState<NutritionalGoalsType>(DEFAULT_GOALS);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use component lifecycle hook
  useComponentLifecycle({
    onMemoryWarning: (usage, limit) => {
      logWarn(`Memory usage warning in NutritionalGoals: ${usage}MB/${limit}MB`);
      analytics.trackEvent({
        category: 'Performance',
        action: 'memory_warning',
        label: 'NutritionalGoals'
      });
    },
    onPerformanceWarning: (metrics) => {
      logWarn('Performance warning in NutritionalGoals:', metrics);
      analytics.trackEvent({
        category: 'Performance',
        action: 'performance_warning',
        label: 'NutritionalGoals',
        metadata: metrics
      });
    },
    performanceWarningThreshold: {
      fps: 30,
      memoryUsage: 0.8,
      renderTime: 16.67
    },
    cacheKey: `nutritional_goals_${userId}`,
    cacheTTL: 30 * 60 * 1000, // 30 minutes since goals change less frequently
    rateLimitKey: `goals_operations_${userId}`,
    rateLimit: 20,
    rateLimitWindow: 60 * 1000 // 1 minute
  });

  useEffect(() => {
    const loadGoals = async () => {
      try {
        const savedGoals = await storage.getItem<NutritionalGoalsType>(`goals_${userId}`);
        if (savedGoals) {
          setGoals(savedGoals);
          analytics.trackEvent({
            category: 'Goals',
            action: 'load_goals',
            label: userId
          });
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to load goals';
        setError(error);
        analytics.trackError({
          errorType: 'goals_load_error',
          errorMessage: error,
          context: { userId }
        });
        throw err; // Re-throw to be caught by initializeComponent
      }
    };
    loadGoals();
  }, [userId]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Validate meal distribution totals to 100%
      const totalDistribution = Object.values(goals.mealDistribution).reduce(
        (a: number, b: number) => a + b,
        0,
      );
      if (Math.abs(totalDistribution - 100) > 0.1) {
        throw new Error('Meal distribution must total 100%');
      }

      await storage.setItem(`goals_${userId}`, goals);
      onUpdate?.(goals);
      setIsEditing(false);

      analytics.trackEvent({
        category: 'Goals',
        action: 'update_goals',
        label: userId,
        metadata: { goals }
      });

      monitoring.track('nutrition_goals_updates', 1);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to save goals';
      setError(error);
      analytics.trackError({
        errorType: 'goals_save_error',
        errorMessage: error,
        context: { userId, goals }
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (
    field: keyof NutritionalGoalsType,
    value: number,
  ) => {
    setGoals((prev: NutritionalGoalsType) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleMealDistributionChange = (
    meal: keyof NutritionalGoalsType['mealDistribution'],
    value: number,
  ) => {
    setGoals((prev: NutritionalGoalsType) => ({
      ...prev,
      mealDistribution: {
        ...prev.mealDistribution,
        [meal]: value,
      },
    }));
  };

  const renderMacroDistribution = () => {
    const total = goals.protein * 4 + goals.carbs * 4 + goals.fat * 9; // calories from each macro
    const proteinPercent = Math.round((goals.protein * 4 / total) * 100);
    const carbsPercent = Math.round((goals.carbs * 4 / total) * 100);
    const fatPercent = Math.round((goals.fat * 9 / total) * 100);

    return (
      <div className="macro-distribution">
        <h4 className="text-lg font-semibold mb-2">Macro Distribution</h4>
        <div className="flex h-4 rounded-full overflow-hidden">
          <div 
            className="bg-blue-500" 
            style={{ width: `${proteinPercent}%` }}
            title={`Protein: ${proteinPercent}%`}
          />
          <div 
            className="bg-green-500" 
            style={{ width: `${carbsPercent}%` }}
            title={`Carbs: ${carbsPercent}%`}
          />
          <div 
            className="bg-yellow-500" 
            style={{ width: `${fatPercent}%` }}
            title={`Fat: ${fatPercent}%`}
          />
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span>Protein {proteinPercent}%</span>
          <span>Carbs {carbsPercent}%</span>
          <span>Fat {fatPercent}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <span className="sr-only">Dismiss</span>
            <svg className="h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <title>Close</title>
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Nutritional Goals</h2>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Edit Goals
            </button>
          ) : (
            <div className="space-x-2">
              <button
                onClick={() => setIsEditing(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">Daily Targets</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Daily Calories
                </label>
                <input
                  type="number"
                  value={goals.dailyCalories}
                  onChange={(e) => handleChange('dailyCalories', +e.target.value)}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Protein (g)
                </label>
                <input
                  type="number"
                  value={goals.protein}
                  onChange={(e) => handleChange('protein', +e.target.value)}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Carbohydrates (g)
                </label>
                <input
                  type="number"
                  value={goals.carbs}
                  onChange={(e) => handleChange('carbs', +e.target.value)}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fat (g)
                </label>
                <input
                  type="number"
                  value={goals.fat}
                  onChange={(e) => handleChange('fat', +e.target.value)}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min="0"
                />
              </div>
            </div>

            {renderMacroDistribution()}
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Additional Targets</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fiber (g)
                </label>
                <input
                  type="number"
                  value={goals.fiber}
                  onChange={(e) => handleChange('fiber', +e.target.value)}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Sugar (g)
                </label>
                <input
                  type="number"
                  value={goals.sugar}
                  onChange={(e) => handleChange('sugar', +e.target.value)}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Sodium (mg)
                </label>
                <input
                  type="number"
                  value={goals.sodium}
                  onChange={(e) => handleChange('sodium', +e.target.value)}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Water (ml)
                </label>
                <input
                  type="number"
                  value={goals.water}
                  onChange={(e) => handleChange('water', +e.target.value)}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min="0"
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="text-xl font-semibold mb-4">Meal Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(goals.mealDistribution).map(([meal, percentage]) => (
                <div key={meal}>
                  <label className="block text-sm font-medium text-gray-700 capitalize">
                    {meal} (%)
                  </label>
                  <input
                    type="number"
                    value={percentage}
                    onChange={(e) => handleMealDistributionChange(
                      meal as keyof NutritionalGoalsType['mealDistribution'],
                      +e.target.value
                    )}
                    disabled={!isEditing}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    min="0"
                    max="100"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 