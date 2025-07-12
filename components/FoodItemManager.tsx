import React, { useEffect, useState } from 'react';

import { useComponentLifecycle } from '../lib/hooks/useComponentLifecycle';
import { analytics } from '../services/analytics';
import { monitoring } from '../services/monitoring';
import { storage } from '../services/storage';
import type { FoodItem } from '../types/nutrition';
import { logWarn } from '../utils/logger';

interface FoodItemManagerProps {
  userId: string;
  onFoodItemCreated?: (foodItem: FoodItem) => void;
}

export const FoodItemManager: React.FC<FoodItemManagerProps> = ({ userId, onFoodItemCreated }) => {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [newItem, setNewItem] = useState<Partial<FoodItem>>({
    macros: {
      protein: 0,
      carbs: 0,
      fat: 0
    },
    nutrients: {},
    tags: [],
    allergens: [],
    ingredients: []
  });
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Use component lifecycle hook
  useComponentLifecycle({
    onMemoryWarning: (usage, limit) => {
      logWarn(`Memory usage warning in FoodItemManager: ${usage}MB/${limit}MB`);
      analytics.trackEvent({
        category: 'Performance',
        action: 'memory_warning',
        label: 'FoodItemManager'
      });
    },
    onPerformanceWarning: (metrics) => {
      logWarn('Performance warning in FoodItemManager:', metrics);
      analytics.trackEvent({
        category: 'Performance',
        action: 'performance_warning',
        label: 'FoodItemManager',
        metadata: metrics
      });
    },
    performanceWarningThreshold: {
      fps: 30,
      memoryUsage: 0.8,
      renderTime: 16.67
    },
    cacheKey: `food_item_manager_${userId}`,
    cacheTTL: 20 * 60 * 1000, // 20 minutes since food items change less frequently
    rateLimitKey: `food_item_operations_${userId}`,
    rateLimit: 40,
    rateLimitWindow: 60 * 1000 // 1 minute
  });

  useEffect(() => {
    const loadFoodItems = async () => {
      try {
        const savedItems = await storage.getItem<FoodItem[]>(`food_items_${userId}`);
        if (savedItems) {
          setFoodItems(savedItems);
          analytics.trackEvent({
            category: 'FoodItem',
            action: 'load_items'
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
    };

    const initializeComponent = async () => {
      try {
        await loadFoodItems();
        // Register monitoring metrics
        monitoring.registerMetric({
          name: 'food_item_creation_rate',
          type: 'counter',
          description: 'Number of food items created',
          alertThresholds: {
            warning: 100,
            critical: 500
          }
        });
        analytics.trackEvent({
          category: 'FoodItemManager',
          action: 'component_initialized',
          label: userId
        });
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to initialize FoodItemManager';
        setError(error);
        analytics.trackError({
          errorType: 'food_item_manager_init_error',
          errorMessage: error,
          context: { userId }
        });
      }
    };
    initializeComponent();
  }, [userId]);

  const handleCreateFoodItem = async () => {
    try {
      if (!newItem.name || !newItem.servingSize || !newItem.servingUnit || !newItem.calories) {
        throw new Error('Name, serving size, serving unit, and calories are required');
      }

      const foodItem: FoodItem = {
        id: Date.now().toString(),
        name: newItem.name,
        brand: newItem.brand,
        servingSize: newItem.servingSize,
        servingUnit: newItem.servingUnit,
        calories: newItem.calories,
        macros: newItem.macros as Required<FoodItem>['macros'],
        nutrients: newItem.nutrients || {},
        tags: newItem.tags || [],
        allergens: newItem.allergens || [],
        ingredients: newItem.ingredients || []
      };

      const updatedItems = [...foodItems, foodItem];
      await storage.setItem(`food_items_${userId}`, updatedItems);
      setFoodItems(updatedItems);
      setIsCreatingItem(false);
      setNewItem({
        macros: {
          protein: 0,
          carbs: 0,
          fat: 0
        },
        nutrients: {},
        tags: [],
        allergens: [],
        ingredients: []
      });

      analytics.trackEvent({
        category: 'FoodItem',
        action: 'create_item',
        label: foodItem.name,
        metadata: foodItem
      });

      monitoring.track('food_item_creation_rate', 1);
      onFoodItemCreated?.(foodItem);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create food item';
      setError(error);
      analytics.trackError({
        errorType: 'create_food_item_error',
        errorMessage: error,
        context: { userId, foodItem: newItem }
      });
    }
  };

  const handleDeleteFoodItem = async (id: string) => {
    try {
      const updatedItems = foodItems.filter(item => item.id !== id);
      await storage.setItem(`food_items_${userId}`, updatedItems);
      setFoodItems(updatedItems);

      analytics.trackEvent({
        category: 'FoodItem',
        action: 'delete_item',
        label: id
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete food item';
      setError(error);
      analytics.trackError({
        errorType: 'delete_food_item_error',
        errorMessage: error,
        context: { userId, itemId: id }
      });
    }
  };

  const filteredItems = foodItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => item.tags.includes(tag));
    return matchesSearch && matchesTags;
  });

  const allTags = Array.from(new Set(foodItems.flatMap(item => item.tags)));

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
        <h2 className="text-2xl font-bold">Food Items</h2>
        <button
          onClick={() => setIsCreatingItem(true)}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Add New Item
        </button>
      </div>

      <div className="flex space-x-4 mb-4">
        <input
          type="text"
          placeholder="Search food items..."
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

      {isCreatingItem && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Add Food Item</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  value={newItem.name || ''}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Brand (optional)
                </label>
                <input
                  type="text"
                  value={newItem.brand || ''}
                  onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Serving Size
                </label>
                <input
                  type="number"
                  value={newItem.servingSize || ''}
                  onChange={(e) => setNewItem({ ...newItem, servingSize: +e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300"
                  min="0.1"
                  step="0.1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Serving Unit
                </label>
                <input
                  type="text"
                  value={newItem.servingUnit || ''}
                  onChange={(e) => setNewItem({ ...newItem, servingUnit: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300"
                  required
                />
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Nutrition Facts (per serving)</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Calories
                  </label>
                  <input
                    type="number"
                    value={newItem.calories || ''}
                    onChange={(e) => setNewItem({ ...newItem, calories: +e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    value={newItem.macros?.protein || ''}
                    onChange={(e) => setNewItem({
                      ...newItem,
                      macros: { 
                        ...newItem.macros, 
                        protein: +e.target.value,
                        carbs: newItem.macros?.carbs || 0,
                        fat: newItem.macros?.fat || 0
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300"
                    min="0"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    value={newItem.macros?.carbs || ''}
                    onChange={(e) => setNewItem({
                      ...newItem,
                      macros: { 
                        ...newItem.macros, 
                        carbs: +e.target.value,
                        protein: newItem.macros?.protein || 0,
                        fat: newItem.macros?.fat || 0
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300"
                    min="0"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Fat (g)
                  </label>
                  <input
                    type="number"
                    value={newItem.macros?.fat || ''}
                    onChange={(e) => setNewItem({
                      ...newItem,
                      macros: { 
                        ...newItem.macros, 
                        fat: +e.target.value,
                        protein: newItem.macros?.protein || 0,
                        carbs: newItem.macros?.carbs || 0
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={newItem.tags?.join(', ') || ''}
                onChange={(e) => setNewItem({
                  ...newItem,
                  tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Allergens (comma-separated)
              </label>
              <input
                type="text"
                value={newItem.allergens?.join(', ') || ''}
                onChange={(e) => setNewItem({
                  ...newItem,
                  allergens: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Ingredients (comma-separated)
              </label>
              <input
                type="text"
                value={newItem.ingredients?.join(', ') || ''}
                onChange={(e) => setNewItem({
                  ...newItem,
                  ingredients: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>

            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setIsCreatingItem(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFoodItem}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium">{item.name}</h3>
                {item.brand && (
                  <p className="text-sm text-gray-500">{item.brand}</p>
                )}
              </div>
              <button
                onClick={() => handleDeleteFoodItem(item.id)}
                className="text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </div>

            <div className="mt-4">
              <p className="text-sm text-gray-500">
                Serving size: {item.servingSize} {item.servingUnit}
              </p>
              <div className="mt-2 grid grid-cols-4 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">Calories</p>
                  <p className="font-medium">{item.calories}</p>
                </div>
                <div>
                  <p className="text-gray-500">Protein</p>
                  <p className="font-medium">{item.macros.protein}g</p>
                </div>
                <div>
                  <p className="text-gray-500">Carbs</p>
                  <p className="font-medium">{item.macros.carbs}g</p>
                </div>
                <div>
                  <p className="text-gray-500">Fat</p>
                  <p className="font-medium">{item.macros.fat}g</p>
                </div>
              </div>
            </div>

            {item.allergens && item.allergens.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-red-600">
                  Allergens: {item.allergens.join(', ')}
                </p>
              </div>
            )}

            {item.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
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
        ))}
      </div>
    </div>
  );
}; 