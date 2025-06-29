import React, { useState, useEffect } from 'react';
import { analytics } from '../services/analytics';
import { storage } from '../services/storage';
import { monitoring } from '../services/monitoring';
import type { MealPlan, Recipe, FoodItem, DietaryRestrictions } from '../types/nutrition';
import { useComponentLifecycle } from '../lib/hooks/useComponentLifecycle';

interface MealPlannerProps {
  userId: string;
  onPlanCreated?: (plan: MealPlan) => void;
}

export const MealPlanner: React.FC<MealPlannerProps> = ({ userId, onPlanCreated }) => {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [newPlan, setNewPlan] = useState<Partial<MealPlan>>({
    meals: {
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: []
    },
    restrictions: {
      allergies: [],
      intolerances: [],
      preferences: [],
      excludedFoods: []
    }
  });
  const [error, setError] = useState<string | null>(null);

  // Use component lifecycle hook
  useComponentLifecycle({
    onMemoryWarning: (usage, limit) => {
      console.warn(`Memory usage warning in MealPlanner: ${usage}MB/${limit}MB`);
      analytics.trackEvent({
        category: 'Performance',
        action: 'memory_warning',
        label: 'MealPlanner'
      });
    },
    onPerformanceWarning: (metrics) => {
      console.warn('Performance warning in MealPlanner:', metrics);
      analytics.trackEvent({
        category: 'Performance',
        action: 'performance_warning',
        label: 'MealPlanner',
        metadata: metrics
      });
    },
    performanceWarningThreshold: {
      fps: 30,
      memoryUsage: 0.8,
      renderTime: 16.67
    },
    cacheKey: `meal_planner_${userId}`,
    cacheTTL: 15 * 60 * 1000, // 15 minutes
    rateLimitKey: `meal_plan_operations_${userId}`,
    rateLimit: 30,
    rateLimitWindow: 60 * 1000 // 1 minute
  });

  useEffect(() => {
    const initializeComponent = async () => {
      try {
        await Promise.all([loadMealPlans(), loadRecipes()]);

        // Register monitoring metrics
        monitoring.registerMetric({
          name: 'meal_plan_compliance',
          type: 'gauge',
          unit: 'percent',
          description: 'Meal plan adherence rate',
          alertThresholds: {
            warning: 70,
            critical: 50
          }
        });

        analytics.trackEvent({
          category: 'MealPlanner',
          action: 'component_initialized',
          label: userId
        });
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to initialize MealPlanner';
        setError(error);
        analytics.trackError({
          errorType: 'meal_planner_init_error',
          errorMessage: error,
          context: { userId }
        });
      }
    };

    initializeComponent();
  }, [userId]);

  const loadMealPlans = async () => {
    try {
      const savedPlans = await storage.getItem<MealPlan[]>(`meal_plans_${userId}`);
      if (savedPlans) {
        setMealPlans(savedPlans);
        analytics.trackEvent({
          category: 'MealPlan',
          action: 'load_plans'
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load meal plans';
      setError(error);
      analytics.trackError({
        errorType: 'meal_plans_load_error',
        errorMessage: error,
        context: { userId }
      });
    }
  };

  const loadRecipes = async () => {
    try {
      const savedRecipes = await storage.getItem<Recipe[]>(`recipes_${userId}`);
      if (savedRecipes) {
        setRecipes(savedRecipes);
        analytics.trackEvent({
          category: 'Recipe',
          action: 'load_recipes'
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load recipes';
      setError(error);
      analytics.trackError({
        errorType: 'recipes_load_error',
        errorMessage: error,
        context: { userId }
      });
    }
  };

  const handleCreatePlan = async () => {
    try {
      if (!newPlan.name || !newPlan.startDate || !newPlan.endDate || !newPlan.dailyCalories) {
        throw new Error('Please fill in all required fields');
      }

      const plan: MealPlan = {
        id: Date.now().toString(),
        name: newPlan.name,
        startDate: newPlan.startDate,
        endDate: newPlan.endDate,
        dailyCalories: newPlan.dailyCalories,
        macroRatios: newPlan.macroRatios || {
          protein: 30,
          carbs: 40,
          fat: 30
        },
        meals: newPlan.meals as Required<MealPlan>['meals'],
        restrictions: newPlan.restrictions as Required<MealPlan>['restrictions']
      };

      const updatedPlans = [...mealPlans, plan];
      await storage.setItem(`meal_plans_${userId}`, updatedPlans);
      setMealPlans(updatedPlans);
      setIsCreatingPlan(false);
      setNewPlan({
        meals: {
          breakfast: [],
          lunch: [],
          dinner: [],
          snacks: []
        },
        restrictions: {
          allergies: [],
          intolerances: [],
          preferences: [],
          excludedFoods: []
        }
      });

      analytics.trackEvent({
        category: 'MealPlan',
        action: 'create_plan',
        label: plan.name,
        metadata: plan
      });

      onPlanCreated?.(plan);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create meal plan';
      setError(error);
      analytics.trackError({
        errorType: 'create_plan_error',
        errorMessage: error,
        context: { userId, plan: newPlan }
      });
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      const updatedPlans = mealPlans.filter(plan => plan.id !== id);
      await storage.setItem(`meal_plans_${userId}`, updatedPlans);
      setMealPlans(updatedPlans);
      if (selectedPlan?.id === id) {
        setSelectedPlan(null);
      }

      analytics.trackEvent({
        category: 'MealPlan',
        action: 'delete_plan',
        label: id
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete meal plan';
      setError(error);
      analytics.trackError({
        errorType: 'delete_plan_error',
        errorMessage: error,
        context: { userId, planId: id }
      });
    }
  };

  const handleAddRecipeToPlan = async (recipe: Recipe, mealType: keyof MealPlan['meals']) => {
    try {
      if (!selectedPlan) return;

      const updatedPlan = {
        ...selectedPlan,
        meals: {
          ...selectedPlan.meals,
          [mealType]: [...selectedPlan.meals[mealType], recipe.id]
        }
      };

      const updatedPlans = mealPlans.map(plan =>
        plan.id === selectedPlan.id ? updatedPlan : plan
      );

      await storage.setItem(`meal_plans_${userId}`, updatedPlans);
      setMealPlans(updatedPlans);
      setSelectedPlan(updatedPlan);

      analytics.trackEvent({
        category: 'MealPlan',
        action: 'add_recipe',
        label: recipe.id,
        metadata: { planId: selectedPlan.id, mealType }
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to add recipe to meal plan';
      setError(error);
      analytics.trackError({
        errorType: 'add_recipe_error',
        errorMessage: error,
        context: { userId, planId: selectedPlan?.id, recipeId: recipe.id }
      });
    }
  };

  const handleRemoveRecipeFromPlan = async (recipeId: string, mealType: keyof MealPlan['meals']) => {
    try {
      if (!selectedPlan) return;

      const updatedPlan = {
        ...selectedPlan,
        meals: {
          ...selectedPlan.meals,
          [mealType]: selectedPlan.meals[mealType].filter(id => id !== recipeId)
        }
      };

      const updatedPlans = mealPlans.map(plan =>
        plan.id === selectedPlan.id ? updatedPlan : plan
      );

      await storage.setItem(`meal_plans_${userId}`, updatedPlans);
      setMealPlans(updatedPlans);
      setSelectedPlan(updatedPlan);

      analytics.trackEvent({
        category: 'MealPlan',
        action: 'remove_recipe',
        label: recipeId,
        metadata: { planId: selectedPlan.id, mealType }
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to remove recipe from meal plan';
      setError(error);
      analytics.trackError({
        errorType: 'remove_recipe_error',
        errorMessage: error,
        context: { userId, planId: selectedPlan?.id, recipeId }
      });
    }
  };

  const getRecipeById = (id: string): Recipe | undefined => {
    return recipes.find(recipe => recipe.id === id);
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

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Meal Planner</h2>
        <button
          onClick={() => setIsCreatingPlan(true)}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Create New Plan
        </button>
      </div>

      {isCreatingPlan && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Create Meal Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Plan Name
              </label>
              <input
                type="text"
                value={newPlan.name || ''}
                onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Daily Calories
              </label>
              <input
                type="number"
                value={newPlan.dailyCalories || ''}
                onChange={(e) => setNewPlan({ ...newPlan, dailyCalories: +e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300"
                min="1000"
                max="5000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                value={newPlan.startDate || ''}
                onChange={(e) => setNewPlan({ ...newPlan, startDate: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                value={newPlan.endDate || ''}
                onChange={(e) => setNewPlan({ ...newPlan, endDate: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300"
                required
              />
            </div>

            <div className="col-span-2">
              <h4 className="font-medium mb-2">Macro Ratios (%)</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Protein
                  </label>
                  <input
                    type="number"
                    value={newPlan.macroRatios?.protein || 30}
                    onChange={(e) => setNewPlan({
                      ...newPlan,
                      macroRatios: { ...(newPlan.macroRatios || {}), protein: +e.target.value }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Carbs
                  </label>
                  <input
                    type="number"
                    value={newPlan.macroRatios?.carbs || 40}
                    onChange={(e) => setNewPlan({
                      ...newPlan,
                      macroRatios: { ...(newPlan.macroRatios || {}), carbs: +e.target.value }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Fat
                  </label>
                  <input
                    type="number"
                    value={newPlan.macroRatios?.fat || 30}
                    onChange={(e) => setNewPlan({
                      ...newPlan,
                      macroRatios: { ...(newPlan.macroRatios || {}), fat: +e.target.value }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <h4 className="font-medium mb-2">Dietary Restrictions</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Allergies (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newPlan.restrictions?.allergies.join(', ') || ''}
                    onChange={(e) => setNewPlan({
                      ...newPlan,
                      restrictions: {
                        ...(newPlan.restrictions || {}),
                        allergies: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Intolerances (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newPlan.restrictions?.intolerances.join(', ') || ''}
                    onChange={(e) => setNewPlan({
                      ...newPlan,
                      restrictions: {
                        ...(newPlan.restrictions || {}),
                        intolerances: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={() => setIsCreatingPlan(false)}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleCreatePlan}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Create Plan
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium mb-4">Meal Plans</h3>
            {mealPlans.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No meal plans created yet.</p>
            ) : (
              <div className="space-y-2">
                {mealPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-3 rounded-lg cursor-pointer ${
                      selectedPlan?.id === plan.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{plan.name}</h4>
                        <p className="text-sm text-gray-500">
                          {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePlan(plan.id);
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedPlan && (
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-semibold">{selectedPlan.name}</h3>
                  <p className="text-gray-500">
                    {selectedPlan.dailyCalories} calories/day • {selectedPlan.macroRatios.protein}% protein,{' '}
                    {selectedPlan.macroRatios.carbs}% carbs, {selectedPlan.macroRatios.fat}% fat
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {(['breakfast', 'lunch', 'dinner', 'snacks'] as const).map((mealType) => (
                  <div key={mealType} className="space-y-2">
                    <h4 className="text-lg font-medium capitalize">{mealType}</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {selectedPlan.meals[mealType].length === 0 ? (
                        <p className="text-gray-500 text-center py-2">No recipes added yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {selectedPlan.meals[mealType].map((recipeId) => {
                            const recipe = getRecipeById(recipeId);
                            if (!recipe) return null;

                            return (
                              <div key={recipe.id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm">
                                <div>
                                  <p className="font-medium">{recipe.name}</p>
                                  <p className="text-sm text-gray-500">
                                    {recipe.totalNutrition.calories} kcal • {recipe.prepTime + recipe.cookTime} min
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleRemoveRecipeFromPlan(recipe.id, mealType)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-4">
                        <select
                          className="block w-full rounded-md border-gray-300"
                          onChange={(e) => {
                            const recipe = recipes.find(r => r.id === e.target.value);
                            if (recipe) {
                              handleAddRecipeToPlan(recipe, mealType);
                              e.target.value = '';
                            }
                          }}
                          value=""
                        >
                          <option value="">Add a recipe...</option>
                          {recipes.map((recipe) => (
                            <option key={recipe.id} value={recipe.id}>
                              {recipe.name} ({recipe.totalNutrition.calories} kcal)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 