import { useState, useEffect } from 'react';

import { useAnalytics } from '../../hooks/useAnalytics';
import { useComponentLifecycle } from '../../hooks/useComponentLifecycle';
import { storage } from '../../services/storage';
import { logError, logInfo } from '../../utils/logger';

interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  date: string;
  quantity: number;
  unit: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

interface NutritionTrackerProps {
  userId: string;
}

export const NutritionTracker: React.FC<NutritionTrackerProps> = ({ userId }) => {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAddingFood, setIsAddingFood] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newFood, setNewFood] = useState<Partial<FoodEntry>>({
    mealType: 'breakfast',
    date: selectedDate,
    quantity: 1,
    unit: 'serving'
  });
  const [error, setError] = useState<string | null>(null);

  const analytics = useAnalytics({
    userId,
    period: 'daily',
    autoRefresh: true,
    refreshInterval: 5 * 60 * 1000 // 5 minutes
  });

  // Use component lifecycle hook
  useComponentLifecycle({
    componentId: 'NutritionTracker',
    lifecycle: {
      onMount: () => {
        // Any mount logic here, or leave empty
      }
    }
  });

  // Load food entries when date or user changes
  useEffect(() => {
    const loadEntries = async () => {
      setLoading(true);
      setError(null); // Clear previous errors
      
      // Announce loading to screen readers
      const loadingAnnouncement = document.createElement('div');
      loadingAnnouncement.setAttribute('role', 'status');
      loadingAnnouncement.setAttribute('aria-live', 'polite');
      loadingAnnouncement.className = 'sr-only';
      loadingAnnouncement.textContent = `Loading nutrition data for ${selectedDate}`;
      document.body.appendChild(loadingAnnouncement);
      
      try {
        // Try to load entries with retry mechanism
        let storedEntries: FoodEntry[] | null = null;
        let retries = 0;
        const maxRetries = 3;
        
        while (retries < maxRetries) {
          try {
            storedEntries = await storage.getItem<FoodEntry[]>(`entries_${userId}_${selectedDate}`, 'foodEntries');
            break; // Success, exit the retry loop
          } catch (storageErr) {
            retries++;
            if (retries >= maxRetries) {
              throw storageErr; // Rethrow if max retries reached
            }
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retries)));
          }
        }
        
        // Update state with loaded entries
        setEntries(storedEntries || []);
        
        // Log success
        logInfo(`Loaded ${storedEntries?.length || 0} entries for ${selectedDate}`, { userId });
        
        // Update loading announcement for screen readers
        loadingAnnouncement.textContent = `Loaded ${storedEntries?.length || 0} food entries for ${selectedDate}`;
        
        // Track analytics
        analytics.trackEvent({
          category: 'Nutrition',
          action: 'load_entries',
          label: selectedDate,
          value: storedEntries?.length || 0
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load food entries';
        setError(errorMessage);
        logError('Error loading food entries:', err);
        
        // Update loading announcement for screen readers
        loadingAnnouncement.textContent = `Error loading food entries: ${errorMessage}`;
        
        analytics.trackError({
          errorType: 'load_entries_error',
          errorMessage: errorMessage,
          context: { userId, date: selectedDate }
        });
      } finally {
        setLoading(false);
        
        // Remove the announcement after a delay
        setTimeout(() => {
          if (document.body.contains(loadingAnnouncement)) {
            document.body.removeChild(loadingAnnouncement);
          }
        }, 1000);
      }
    };
    
    loadEntries();
  }, [userId, selectedDate, analytics]);

  const handleAddFood = async () => {
    try {
      // Set loading state for better UX
      setLoading(true);
      
      // Validate required fields
      if (!newFood.name || !newFood.calories) {
        throw new Error('Food name and calories are required');
      }

      // Validate numeric fields
      if (newFood.calories < 0 || 
          (newFood.protein && newFood.protein < 0) || 
          (newFood.carbs && newFood.carbs < 0) || 
          (newFood.fat && newFood.fat < 0)) {
        throw new Error('Nutritional values cannot be negative');
      }

      const timestamp = new Date().toISOString();
      const foodEntry: FoodEntry = {
        id: crypto.randomUUID(), // More reliable unique ID
        name: newFood.name,
        calories: newFood.calories * (newFood.quantity || 1),
        protein: (newFood.protein || 0) * (newFood.quantity || 1),
        carbs: (newFood.carbs || 0) * (newFood.quantity || 1),
        fat: (newFood.fat || 0) * (newFood.quantity || 1),
        fiber: (newFood.fiber || 0) * (newFood.quantity || 1),
        sugar: (newFood.sugar || 0) * (newFood.quantity || 1),
        sodium: (newFood.sodium || 0) * (newFood.quantity || 1),
        mealType: newFood.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snacks',
        date: selectedDate,
        quantity: newFood.quantity || 1,
        unit: newFood.unit || 'serving',
        createdAt: timestamp,
        updatedAt: timestamp
      };

      const updatedEntries = [...entries, foodEntry];
      
      // Persist to storage with retry mechanism
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          await storage.setItem(`entries_${userId}_${selectedDate}`, updatedEntries, 'foodEntries');
          break; // Success, exit the retry loop
        } catch (storageErr) {
          retries++;
          if (retries >= maxRetries) {
            throw storageErr; // Rethrow if max retries reached
          }
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retries)));
        }
      }
      
      // Update state after successful storage
      setEntries(updatedEntries);
      setIsAddingFood(false);
      setNewFood({
        mealType: 'breakfast',
        date: selectedDate,
        quantity: 1,
        unit: 'serving'
      });
      setError(null);

      // Track analytics
      analytics.trackEvent({
        category: 'Food',
        action: 'add_entry',
        label: foodEntry.name,
        metadata: foodEntry
      });

      logInfo(`Added food entry: ${foodEntry.name} (${foodEntry.calories} calories)`, { userId, date: selectedDate });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add food entry';
      setError(errorMessage);
      logError('Error adding food entry:', err);
      
      analytics.trackError({
        errorType: 'add_entry_error',
        errorMessage: errorMessage,
        context: { userId, food: newFood }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      // Set loading state for better UX
      setLoading(true);
      
      // Find the entry being deleted (for analytics and logging)
      const entryToDelete = entries.find(entry => entry.id === id);
      
      // Filter out the deleted entry
      const updatedEntries = entries.filter(entry => entry.id !== id);
      
      // Persist to storage with retry mechanism
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          await storage.setItem(`entries_${userId}_${selectedDate}`, updatedEntries, 'foodEntries');
          break; // Success, exit the retry loop
        } catch (storageErr) {
          retries++;
          if (retries >= maxRetries) {
            throw storageErr; // Rethrow if max retries reached
          }
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retries)));
        }
      }
      
      // Update state after successful storage
      setEntries(updatedEntries);
      setError(null);

      // Track analytics
      analytics.trackEvent({
        category: 'Food',
        action: 'delete_entry',
        label: entryToDelete?.name || id,
        metadata: { entryId: id, entryName: entryToDelete?.name }
      });
      
      logInfo(`Deleted food entry: ${entryToDelete?.name || id}`, { userId, date: selectedDate });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete food entry';
      setError(errorMessage);
      logError('Error deleting food entry:', err);
      
      analytics.trackError({
        errorType: 'delete_entry_error',
        errorMessage: errorMessage,
        context: { userId, entryId: id }
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDailyTotals = (foodEntries: FoodEntry[]): DailyTotals => {
    return foodEntries.reduce((totals, entry) => ({
      calories: totals.calories + entry.calories,
      protein: totals.protein + entry.protein,
      carbs: totals.carbs + entry.carbs,
      fat: totals.fat + entry.fat,
      fiber: totals.fiber + entry.fiber,
      sugar: totals.sugar + entry.sugar,
      sodium: totals.sodium + entry.sodium
    }), {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0
    });
  };

  const dailyTotals = calculateDailyTotals(entries);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" aria-live="polite" aria-busy="true">
        <div className="text-center">
          <div 
            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            role="progressbar"
            aria-label="Loading nutrition data"
          ></div>
          <p className="text-gray-600">Loading nutrition data for {selectedDate}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div 
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
          aria-live="assertive"
        >
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <div className="flex space-x-2 mt-2">
            <button
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
              onClick={() => {
                setError(null);
                // Retry loading data
                const loadData = async () => {
                  setLoading(true);
                  try {
                    const storedEntries = await storage.getItem<FoodEntry[]>(`entries_${userId}_${selectedDate}`, 'foodEntries');
                    setEntries(storedEntries || []);
                    setError(null);
                  } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Failed to load food entries';
                    setError(errorMessage);
                  } finally {
                    setLoading(false);
                  }
                };
                loadData();
              }}
            >
              Retry
            </button>
            <button
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded text-sm"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
          <button
            className="absolute top-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            <svg className="h-6 w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Nutrition Tracker</h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Food Log</h3>
          <button
            onClick={() => setIsAddingFood(true)}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Add Food
          </button>
        </div>

        {isAddingFood && (
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-medium mb-4">Add Food Entry</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Food Name
                </label>
                <input
                  type="text"
                  value={newFood.name || ''}
                  onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Meal Type
                </label>
                <select
                  value={newFood.mealType}
                  onChange={(e) => setNewFood({ ...newFood, mealType: e.target.value as 'breakfast' | 'lunch' | 'dinner' | 'snacks' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snacks">Snacks</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Calories
                </label>
                <input
                  type="number"
                  value={newFood.calories || ''}
                  onChange={(e) => setNewFood({ ...newFood, calories: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Protein (g)
                </label>
                <input
                  type="number"
                  value={newFood.protein || ''}
                  onChange={(e) => setNewFood({ ...newFood, protein: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Carbs (g)
                </label>
                <input
                  type="number"
                  value={newFood.carbs || ''}
                  onChange={(e) => setNewFood({ ...newFood, carbs: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fat (g)
                </label>
                <input
                  type="number"
                  value={newFood.fat || ''}
                  onChange={(e) => setNewFood({ ...newFood, fat: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quantity
                </label>
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={newFood.quantity}
                  onChange={(e) => setNewFood({ ...newFood, quantity: parseFloat(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Unit
                </label>
                <select
                  value={newFood.unit}
                  onChange={(e) => setNewFood({ ...newFood, unit: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                  <option value="serving">Serving</option>
                  <option value="g">Grams</option>
                  <option value="oz">Ounces</option>
                  <option value="cup">Cup</option>
                  <option value="tbsp">Tablespoon</option>
                  <option value="tsp">Teaspoon</option>
                  <option value="ml">Milliliter</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setIsAddingFood(false)}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFood}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
              >
                Add Food
              </button>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-lg font-medium text-blue-800 mb-2">Daily Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Calories</p>
                <p className="text-xl font-semibold">{dailyTotals.calories}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Protein</p>
                <p className="text-xl font-semibold">{dailyTotals.protein}g</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Carbs</p>
                <p className="text-xl font-semibold">{dailyTotals.carbs}g</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fat</p>
                <p className="text-xl font-semibold">{dailyTotals.fat}g</p>
              </div>
            </div>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No food entries recorded for this date.</p>
            <p>Add a food item to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Food
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Meal
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Calories
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Protein
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Carbs
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fat
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{entry.name}</div>
                      <div className="text-sm text-gray-500">{entry.quantity} {entry.unit}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{entry.mealType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{entry.calories}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{entry.protein}g</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{entry.carbs}g</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{entry.fat}g</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}; 