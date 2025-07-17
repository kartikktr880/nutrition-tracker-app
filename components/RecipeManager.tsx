import Image from 'next/image';
import React, { useState, useEffect, useCallback } from 'react';

import { useComponentLifecycle } from '../lib/hooks/useComponentLifecycle';
import { analytics } from '../services/analytics';
import { monitoring } from '../services/monitoring';
import { storage } from '../services/storage';
import type { Recipe, FoodItem } from '../types/nutrition';
import { logWarn } from '../utils/logger';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface RecipeManagerProps {
  userId: string;
  onRecipeCreated?: (recipe: Recipe) => void;
  initialRecipe?: Recipe;
  onSave: (recipe: Recipe) => void;
}

export const RecipeManager: React.FC<RecipeManagerProps> = ({ userId, onRecipeCreated: _onRecipeCreated, initialRecipe, onSave }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isCreatingRecipe, setIsCreatingRecipe] = useState(false);
  const [newRecipe, setNewRecipe] = useState<Recipe>(
    initialRecipe || {
      id: '',
      name: '',
      ingredients: [],
      instructions: [],
      prepTime: 0,
      cookTime: 0,
      servings: 1,
      tags: [],
      totalNutrition: { calories: 0, macros: { protein: 0, carbs: 0, fat: 0 } },
      createdAt: new Date().toISOString(),
    }
  );
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Use component lifecycle hook
  useComponentLifecycle({
    onMemoryWarning: (usage, limit) => {
      logWarn(`Memory usage warning in RecipeManager: ${usage}MB/${limit}MB`);
      analytics.trackEvent({
        category: 'Performance',
        action: 'memory_warning',
        label: 'RecipeManager'
      });
    },
    onPerformanceWarning: (metrics) => {
      logWarn('Performance warning in RecipeManager:', metrics);
      analytics.trackEvent({
        category: 'Performance',
        action: 'performance_warning',
        label: 'RecipeManager',
        metadata: metrics
      });
    },
    performanceWarningThreshold: {
      fps: 30,
      memoryUsage: 0.8,
      renderTime: 16.67
    },
    cacheKey: `recipe_manager_${userId}`,
    cacheTTL: 10 * 60 * 1000, // 10 minutes
    rateLimitKey: `recipe_operations_${userId}`,
    rateLimit: 50,
    rateLimitWindow: 60 * 1000 // 1 minute
  });

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

  const loadFoodItems = useCallback(async () => {
    try {
      const savedFoodItems = await storage.getItem<FoodItem[]>(`food_items_${userId}`);
      if (savedFoodItems) {
        setFoodItems(savedFoodItems);
        analytics.trackEvent({
          category: 'FoodItem',
          action: 'load_food_items'
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load food items';
      setError(error);
      analytics.trackError({
        errorType: 'food_items_load_error',
        errorMessage: error,
        context: { userId }
      });
    }
  }, [userId]);

  useEffect(() => {
    const initializeComponent = async () => {
      try {
        await Promise.all([loadRecipes(), loadFoodItems()]);

        // Register monitoring metrics
        monitoring.registerMetric({
          name: 'recipe_creation_rate',
          type: 'counter',
          description: 'Number of recipes created',
          alertThresholds: {
            warning: 100,
            critical: 500
          }
        });

        analytics.trackEvent({
          category: 'RecipeManager',
          action: 'component_initialized',
          label: userId
        });
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to initialize RecipeManager';
        setError(error);
        analytics.trackError({
          errorType: 'recipe_manager_init_error',
          errorMessage: error,
          context: { userId }
        });
      }
    };

    initializeComponent();
  }, [userId, loadRecipes, loadFoodItems]);

  const calculateTotalNutrition = (ingredients: Recipe['ingredients']): Recipe['totalNutrition'] => {
    const total: Recipe['totalNutrition'] = {
      calories: 0,
      macros: {
        protein: 0,
        carbs: 0,
        fat: 0,
      },
    };

    ingredients.forEach(({ foodItem, quantity }) => {
      const nutrition = foodItem.nutrition;
      // Assuming quantity is in grams, and nutrition is per 100g.
      const scale = quantity / 100;
      total.calories += nutrition.calories * scale;
      total.macros.protein += nutrition.macros.protein * scale;
      total.macros.carbs += nutrition.macros.carbs * scale;
      total.macros.fat += nutrition.macros.fat * scale;
    });

    return total;
  };

  const handleDeleteRecipe = async (id: string) => {
    try {
      const updatedRecipes = recipes.filter(recipe => recipe.id !== id);
      await storage.setItem(`recipes_${userId}`, updatedRecipes);
      setRecipes(updatedRecipes);
      if (selectedRecipe?.id === id) {
        setSelectedRecipe(null);
      }

      analytics.trackEvent({
        category: 'Recipe',
        action: 'delete_recipe',
        label: id
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete recipe';
      setError(error);
      analytics.trackError({
        errorType: 'delete_recipe_error',
        errorMessage: error,
        context: { userId, recipeId: id }
      });
    }
  };

  const handleAddIngredient = (foodItem: FoodItem) => {
    if (!newRecipe.ingredients) return;

    const updatedIngredients = [
      ...newRecipe.ingredients,
      {
        foodItem,
        quantity: 1,
        unit: foodItem.servingUnit
      }
    ];

    setNewRecipe({
      ...newRecipe,
      ingredients: updatedIngredients,
      totalNutrition: calculateTotalNutrition(updatedIngredients)
    });
  };

  const handleUpdateIngredientQuantity = (index: number, quantity: number) => {
    if (!newRecipe.ingredients) return;

    const updatedIngredients = [...newRecipe.ingredients];
    updatedIngredients[index] = {
      ...updatedIngredients[index],
      quantity
    };

    setNewRecipe({
      ...newRecipe,
      ingredients: updatedIngredients,
      totalNutrition: calculateTotalNutrition(updatedIngredients)
    });
  };

  const handleRemoveIngredient = (index: number) => {
    if (!newRecipe.ingredients) return;

    const updatedIngredients = newRecipe.ingredients.filter((_, i) => i !== index);
    setNewRecipe({
      ...newRecipe,
      ingredients: updatedIngredients,
      totalNutrition: calculateTotalNutrition(updatedIngredients)
    });
  };

  const handleInstructionChange = (index: number, value: string) => {
    const updatedInstructions = [...newRecipe.instructions];
    updatedInstructions[index] = value;
    setNewRecipe({ ...newRecipe, instructions: updatedInstructions });
  };

  const addInstruction = () => {
    setNewRecipe({
      ...newRecipe,
      instructions: [...newRecipe.instructions, '']
    });
  };

  const removeInstruction = (index: number) => {
    const updatedInstructions = newRecipe.instructions.filter((_: string, i: number) => i !== index);
    setNewRecipe({ ...newRecipe, instructions: updatedInstructions });
  };

  const handleSave = () => {
    onSave({
      id: newRecipe.id,
      name: newRecipe.name,
      ingredients: newRecipe.ingredients,
      instructions: newRecipe.instructions,
      prepTime: newRecipe.prepTime,
      cookTime: newRecipe.cookTime,
      servings: newRecipe.servings,
      tags: newRecipe.tags,
      totalNutrition: newRecipe.totalNutrition,
      image: newRecipe.image,
      createdAt: newRecipe.createdAt,
    });
  };

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => recipe.tags.includes(tag));
    return matchesSearch && matchesTags;
  });

  const allTags = Array.from(new Set(recipes.flatMap(recipe => recipe.tags)));

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
        <h2 className="text-2xl font-bold">Recipe Manager</h2>
        <button
          onClick={() => setIsCreatingRecipe(true)}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Create New Recipe
        </button>
      </div>

      <div className="flex space-x-4 mb-4">
        <input
          type="text"
          placeholder="Search recipes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 rounded-md border-gray-300"
        />
        <div className="flex-1">
          <select
            multiple
            value={selectedTags}
            onChange={(e) => setSelectedTags(Array.from(e.target.selectedOptions, option => option.value))}
            className="w-full rounded-md border-gray-300"
          >
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
      </div>

      {isCreatingRecipe && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Create Recipe</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Recipe Name
              </label>
              <input
                type="text"
                value={newRecipe.name || ''}
                onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300"
                required
              />
            </div>

            <div>
              <h4 className="font-medium mb-2">Ingredients</h4>
              <div className="space-y-2">
                {newRecipe.ingredients?.map((ingredient, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={ingredient.quantity}
                      onChange={(e) => handleUpdateIngredientQuantity(index, +e.target.value)}
                      className="w-20 rounded-md border-gray-300"
                      min="0.1"
                      step="0.1"
                    />
                    <span className="text-gray-500">{ingredient.unit}</span>
                    <span>{ingredient.foodItem.name}</span>
                    <button
                      onClick={() => handleRemoveIngredient(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <select
                  className="block w-full rounded-md border-gray-300"
                  onChange={(e) => {
                    const foodItem = foodItems.find(item => item.id === e.target.value);
                    if (foodItem) {
                      handleAddIngredient(foodItem);
                      e.target.value = '';
                    }
                  }}
                  value=""
                >
                  <option value="">Add an ingredient...</option>
                  {foodItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.nutrition.calories} kcal/{item.servingUnit})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Instructions</h4>
              <div className="space-y-2">
                {newRecipe.instructions?.map((instruction: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={instruction}
                      onChange={(e) => handleInstructionChange(index, e.target.value)}
                      placeholder={`Step ${index + 1}`}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeInstruction(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button onClick={addInstruction}>Add Instruction</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Prep Time (minutes)
                </label>
                <input
                  type="number"
                  value={newRecipe.prepTime || ''}
                  onChange={(e) => setNewRecipe({ ...newRecipe, prepTime: +e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cook Time (minutes)
                </label>
                <input
                  type="number"
                  value={newRecipe.cookTime || ''}
                  onChange={(e) => setNewRecipe({ ...newRecipe, cookTime: +e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Servings
                </label>
                <input
                  type="number"
                  value={newRecipe.servings || ''}
                  onChange={(e) => setNewRecipe({ ...newRecipe, servings: +e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300"
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={newRecipe.tags?.join(', ') || ''}
                onChange={(e) => setNewRecipe({
                  ...newRecipe,
                  tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Image URL (optional)
              </label>
              <input
                type="url"
                value={newRecipe.image || ''}
                onChange={(e) => setNewRecipe({ ...newRecipe, image: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>

            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setIsCreatingRecipe(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Create Recipe
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.map((recipe) => (
          <div key={recipe.id} className="bg-white rounded-lg shadow">
            {recipe.image && (
              <Image
                src={recipe.image}
                alt={recipe.name}
                width={600}
                height={300}
                className="w-full h-48 object-cover rounded-t-lg"
              />
            )}
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium">{recipe.name}</h3>
                  <p className="text-sm text-gray-500">
                    {recipe.prepTime + recipe.cookTime} min • {recipe.servings} servings
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteRecipe(recipe.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>

              <div className="mt-4">
                <h4 className="font-medium text-sm text-gray-700">Nutrition per serving</h4>
                <div className="mt-1 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Calories</p>
                    <p className="font-medium">
                      {Math.round(recipe.totalNutrition.calories / recipe.servings)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Protein</p>
                    <p className="font-medium">
                      {Math.round(recipe.totalNutrition.macros.protein / recipe.servings)}g
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Carbs</p>
                    <p className="font-medium">
                      {Math.round(recipe.totalNutrition.macros.carbs / recipe.servings)}g
                    </p>
                  </div>
                </div>
              </div>

              {recipe.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {recipe.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 