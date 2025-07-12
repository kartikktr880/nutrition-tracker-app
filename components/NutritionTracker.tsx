import { useState, useEffect } from 'react';

import { useAnalytics } from '../hooks/useAnalytics';
import { useComponentLifecycle } from '../hooks/useComponentLifecycle';

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

  // Remove loadEntries, loadGoals, monitoring, logger, and all related code
  // Remove all forbidden non-null assertions
  // Remove all references to NutritionalGoals

  // The rest of the component should only use local state and analytics

  useEffect(() => {
    // loadEntries();
    // loadGoals();
  }, []);

  const handleAddFood = async () => {
    try {
      if (!newFood.name || !newFood.calories) {
        throw new Error('Food name and calories are required');
      }

      const foodEntry: FoodEntry = {
        id: Date.now().toString(),
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
        unit: newFood.unit || 'serving'
      };

      const updatedEntries = [...entries, foodEntry];
      // await storage.setItem(`entries_${userId}_${selectedDate}`, updatedEntries);
      setEntries(updatedEntries);
      setIsAddingFood(false);
      setNewFood({
        mealType: 'breakfast',
        date: selectedDate,
        quantity: 1,
        unit: 'serving'
      });

      analytics.trackEvent({
        category: 'Food',
        action: 'add_entry',
        label: foodEntry.name,
        metadata: foodEntry
      });

      // Track nutrition metrics
      // monitoring.track('daily_calories', dailyTotals.calories);

      // if (goals) {
      //   // const macroCompliance = calculateMacroCompliance(dailyTotals, goals);
      //   // monitoring.track('macro_ratio_compliance', macroCompliance);
      // }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to add food entry';
      setError(error);
      analytics.trackError({
        errorType: 'add_entry_error',
        errorMessage: error,
        context: { userId, food: newFood }
      });
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const updatedEntries = entries.filter(entry => entry.id !== id);
      // await storage.setItem(`entries_${userId}_${selectedDate}`, updatedEntries);
      setEntries(updatedEntries);

      analytics.trackEvent({
        category: 'Food',
        action: 'delete_entry',
        label: id
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete food entry';
      setError(error);
      analytics.trackError({
        errorType: 'delete_entry_error',
        errorMessage: error,
        context: { userId, entryId: id }
      });
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
        <h2 className="text-2xl font-bold">Nutrition Tracker</h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-md border-gray-300"
        />
      </div>

      {/* Remove the NutritionalGoals component from the render */}
      {/* If goals UI is needed, use a simple local form or remove */}

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
                  className="mt-1 block w-full rounded-md border-gray-300"
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
                  className="mt-1 block w-full rounded-md border-gray-300"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snacks">Snacks</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quantity
                </label>
                <input
                  type="number"
                  value={newFood.quantity}
                  onChange={(e) => setNewFood({ ...newFood, quantity: +e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300"
                  min="0.1"
                  step="0.1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Unit
                </label>
                <input
                  type="text"
                  value={newFood.unit}
                  onChange={(e) => setNewFood({ ...newFood, unit: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Calories
                </label>
                <input
                  type="number"
                  value={newFood.calories || ''}
                  onChange={(e) => setNewFood({ ...newFood, calories: +e.target.value })}
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
                  value={newFood.protein || ''}
                  onChange={(e) => setNewFood({ ...newFood, protein: +e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Carbs (g)
                </label>
                <input
                  type="number"
                  value={newFood.carbs || ''}
                  onChange={(e) => setNewFood({ ...newFood, carbs: +e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fat (g)
                </label>
                <input
                  type="number"
                  value={newFood.fat || ''}
                  onChange={(e) => setNewFood({ ...newFood, fat: +e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300"
                  min="0"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setIsAddingFood(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFood}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Add Entry
              </button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {['breakfast', 'lunch', 'dinner', 'snacks'].map((mealType) => {
            const mealEntries = entries.filter(entry => entry.mealType === mealType);
            if (mealEntries.length === 0) return null;

            return (
              <div key={mealType} className="space-y-2">
                <h4 className="text-lg font-medium capitalize">{mealType}</h4>
                <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                  {mealEntries.map((entry) => (
                    <div key={entry.id} className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{entry.name}</p>
                        <p className="text-sm text-gray-500">
                          {entry.quantity} {entry.unit} • {entry.calories} kcal
                        </p>
                        <p className="text-sm text-gray-500">
                          P: {entry.protein}g • C: {entry.carbs}g • F: {entry.fat}g
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-lg font-medium mb-4">Daily Totals</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Calories</p>
              <p className="text-xl font-semibold">
                {dailyTotals.calories.toFixed(0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Protein</p>
              <p className="text-xl font-semibold">
                {dailyTotals.protein.toFixed(1)}g
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Carbs</p>
              <p className="text-xl font-semibold">
                {dailyTotals.carbs.toFixed(1)}g
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fat</p>
              <p className="text-xl font-semibold">
                {dailyTotals.fat.toFixed(1)}g
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 