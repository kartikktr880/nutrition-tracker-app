import React, { useState, useEffect, useCallback } from 'react';

import { useComponentLifecycle } from '../lib/hooks/useComponentLifecycle';
import { analytics } from '../services/analytics';
import { monitoring } from '../services/monitoring';
import { storage } from '../services/storage';
import type { MealPlanV2 as MealPlan, Recipe, Meal } from '../types/nutrition';
import { logWarn } from '../utils/logger';

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
    meals: [],
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
      logWarn(`Memory usage warning in MealPlanner: ${usage}MB/${limit}MB`);
      analytics.trackEvent({
        category: 'Performance',
        action: 'memory_warning',
        label: 'MealPlanner'
      });
    },
    onPerformanceWarning: (metrics) => {
      logWarn('Performance warning in MealPlanner:', metrics);
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

  const loadMealPlans = useCallback(async () => {
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
  }, [userId]);

  const loadRecipes = useCallback(async () => {
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
  }, [userId]);

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
  }, [userId, loadMealPlans, loadRecipes]);

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
        meals: newPlan.meals || [],
        restrictions: newPlan.restrictions as Required<MealPlan>['restrictions']
      };

      const updatedPlans = [...mealPlans, plan];
      await storage.setItem(`meal_plans_${userId}`, updatedPlans);
      setMealPlans(updatedPlans);
      setIsCreatingPlan(false);
      setNewPlan({
        meals: [],
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

  const handleAddRecipeToPlan = async (recipe: Recipe, mealType: string) => {
    try {
      if (!selectedPlan) return;

      // Convert recipe to meal format
      const newMeal: Meal = {
        id: recipe.id,
        name: recipe.name,
        calories: recipe.totalNutrition.calories,
        protein: recipe.totalNutrition.macros.protein,
        carbs: recipe.totalNutrition.macros.carbs,
        fat: recipe.totalNutrition.macros.fat,
        ingredients: recipe.ingredients.map(ing => ({
          name: ing.foodItem.name,
          amount: ing.quantity,
          unit: ing.unit,
          category: 'main'
        })),
        instructions: recipe.instructions,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        tags: recipe.tags,
        nutritionalScore: 85 // Default score
      };

      const updatedPlan = {
        ...selectedPlan,
        meals: [...selectedPlan.meals, newMeal]
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

  const handleRemoveRecipeFromPlan = async (recipeId: string, mealType: string) => {
    try {
      if (!selectedPlan) return;

      const updatedPlan = {
        ...selectedPlan,
        meals: selectedPlan.meals.filter(meal => meal.id !== recipeId)
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

  const _getRecipeById = (id: string): Recipe | undefined => {
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
                value={newPlan.startDate ? newPlan.startDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setNewPlan({ ...newPlan, startDate: new Date(e.target.value) })}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                value={newPlan.endDate ? newPlan.endDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setNewPlan({ ...newPlan, endDate: new Date(e.target.value) })}
                className="w-full p-2 border border-gray-300 rounded"
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
                      macroRatios: { 
                        protein: +e.target.value,
                        carbs: newPlan.macroRatios?.carbs || 40,
                        fat: newPlan.macroRatios?.fat || 30
                      }
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
                      macroRatios: { 
                        protein: newPlan.macroRatios?.protein || 30,
                        carbs: +e.target.value,
                        fat: newPlan.macroRatios?.fat || 30
                      }
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
                      macroRatios: { 
                        protein: newPlan.macroRatios?.protein || 30,
                        carbs: newPlan.macroRatios?.carbs || 40,
                        fat: +e.target.value
                      }
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
                    Allergies
                  </label>
                  <input
                    type="text"
                    value={newPlan.restrictions?.allergies?.join(', ') || ''}
                    onChange={(e) => setNewPlan({
                      ...newPlan,
                      restrictions: {
                        allergies: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                        intolerances: newPlan.restrictions?.intolerances || [],
                        preferences: newPlan.restrictions?.preferences || [],
                        excludedFoods: newPlan.restrictions?.excludedFoods || []
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300"
                    placeholder="e.g., nuts, shellfish"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Intolerances
                  </label>
                  <input
                    type="text"
                    value={newPlan.restrictions?.intolerances?.join(', ') || ''}
                    onChange={(e) => setNewPlan({
                      ...newPlan,
                      restrictions: {
                        allergies: newPlan.restrictions?.allergies || [],
                        intolerances: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                        preferences: newPlan.restrictions?.preferences || [],
                        excludedFoods: newPlan.restrictions?.excludedFoods || []
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300"
                    placeholder="e.g., lactose, gluten"
                  />
                </div>
              </div>
            </div>

            <div className="col-span-2 flex gap-2">
              <button
                onClick={handleCreatePlan}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Create Plan
              </button>
              <button
                onClick={() => setIsCreatingPlan(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xl font-semibold mb-4">Meal Plans</h3>
          <div className="space-y-2">
            {mealPlans.map(plan => (
              <div
                key={plan.id}
                className={`p-4 border rounded cursor-pointer ${
                  selectedPlan?.id === plan.id ? 'border-green-500 bg-green-50' : 'border-gray-300'
                }`}
                onClick={() => setSelectedPlan(plan)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{plan.name}</h4>
                    <p className="text-sm text-gray-600">
                      {plan.startDate.toLocaleDateString()} - {plan.endDate.toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">{plan.dailyCalories} calories/day</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlan(plan.id);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedPlan && (
          <div>
            <h3 className="text-xl font-semibold mb-4">{selectedPlan.name}</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Meals</h4>
                {selectedPlan.meals.length === 0 ? (
                  <p className="text-gray-500">No meals added yet</p>
                ) : (
                  <div className="space-y-2">
                    {selectedPlan.meals.map((meal) => (
                      <div key={meal.id} className="p-3 border rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium">{meal.name}</h5>
                            <p className="text-sm text-gray-600">{meal.calories} calories</p>
                          </div>
                          <button
                            onClick={() => handleRemoveRecipeFromPlan(meal.id, 'meal')}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Available Recipes</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {recipes.map(recipe => (
                    <div key={recipe.id} className="p-3 border rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-medium">{recipe.name}</h5>
                          <p className="text-sm text-gray-600">{recipe.totalNutrition.calories} calories</p>
                        </div>
                        <button
                          onClick={() => handleAddRecipeToPlan(recipe, 'meal')}
                          className="bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 