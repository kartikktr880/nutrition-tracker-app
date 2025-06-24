import React, { useState, useEffect } from 'react';
import { MealPrepPlan as MealPrepPlanType, MealPrepStep } from '../types/nutrition';

interface MealPrepPlanProps {
  userId: string;
}

export const MealPrepPlan: React.FC<MealPrepPlanProps> = ({ userId }) => {
  const [mealPrepPlan, setMealPrepPlan] = useState<MealPrepPlanType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchMealPrepPlan = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/meal-prep');
        
        if (!response.ok) {
          throw new Error('Failed to fetch meal prep plan');
        }

        const data = await response.json();
        setMealPrepPlan(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchMealPrepPlan();
  }, [userId]);

  const toggleMealExpansion = (mealId: string) => {
    setExpandedMeals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mealId)) {
        newSet.delete(mealId);
      } else {
        newSet.add(mealId);
      }
      return newSet;
    });
  };

  const updateStepStatus = async (mealId: string, stepId: string, completed: boolean) => {
    if (!mealPrepPlan) return;

    try {
      const updatedMeals = mealPrepPlan.meals.map(meal => {
        if (meal.id === mealId) {
          return {
            ...meal,
            prepSteps: meal.prepSteps.map(step =>
              step.id === stepId ? { ...step, completed } : step
            ),
          };
        }
        return meal;
      });

      const response = await fetch('/api/meal-prep', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mealPrepPlan: {
            ...mealPrepPlan,
            meals: updatedMeals,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update meal prep plan');
      }

      setMealPrepPlan({
        ...mealPrepPlan,
        meals: updatedMeals,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update meal prep plan');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  if (!mealPrepPlan) {
    return <div className="text-center">No meal prep plan found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Meal Prep Plan</h2>
        <div className="text-gray-600">
          Total Prep Time: {mealPrepPlan.totalPrepTime} minutes
        </div>
      </div>

      <div className="space-y-4">
        {mealPrepPlan.meals.map((meal) => (
          <div key={meal.id} className="border rounded-lg p-4">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleMealExpansion(meal.id)}
            >
              <div>
                <h3 className="text-xl font-semibold">{meal.name}</h3>
                <p className="text-sm text-gray-500">
                  Prep Time: {meal.prepTime} minutes | Servings: {meal.servings}
                </p>
              </div>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMealExpansion(meal.id);
                }}
              >
                {expandedMeals.has(meal.id) ? '▼' : '▶'}
              </button>
            </div>

            {expandedMeals.has(meal.id) && (
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Ingredients:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {meal.ingredients.map((ingredient, index) => (
                      <li key={index} className="text-gray-700">
                        {ingredient.amount} {ingredient.unit} {ingredient.name}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Prep Steps:</h4>
                  <div className="space-y-2">
                    {meal.prepSteps.map((step) => (
                      <div
                        key={step.id}
                        className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={step.completed}
                          onChange={(e) => updateStepStatus(meal.id, step.id, e.target.checked)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div>
                          <p className={`${step.completed ? 'line-through text-gray-500' : ''}`}>
                            {step.description}
                          </p>
                          {step.tips && (
                            <p className="text-sm text-gray-500 mt-1">💡 {step.tips}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {meal.storageInstructions && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800">Storage Instructions:</h4>
                    <p className="text-blue-700 mt-1">{meal.storageInstructions}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}; 