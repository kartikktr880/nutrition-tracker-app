import React, { useState, useEffect } from 'react';

interface BarcodeData {
  name: string;
  brand?: string;
  nutrition: Record<string, number>;
  category?: string;
  mealType?: string;
}

interface BarcodeHistoryItem {
  id: string;
  barcode: string;
  data: BarcodeData;
  timestamp: Date;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  plannedDate?: string;
}

interface MealPlanBalance {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  balanced: boolean;
  recommendations: string[];
}

export const BarcodeHistory: React.FC = () => {
  const [history, setHistory] = useState<BarcodeHistoryItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [mealPlanBalance, setMealPlanBalance] = useState<MealPlanBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBarcodeHistory();
  }, []);

  const loadBarcodeHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data since the service methods don't exist
      const historyData: BarcodeHistoryItem[] = [];
      setHistory(historyData);

      // Mock meal plan balance
      const balanceData: MealPlanBalance = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        balanced: true,
        recommendations: []
      };
      setMealPlanBalance(balanceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load barcode history');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToMealPlan = async (item: BarcodeHistoryItem) => {
    try {
      const nutritionRecord: Record<string, number> = {};
      Object.entries(item.data.nutrition).forEach(([key, value]) => {
        if (typeof value === 'number') {
          nutritionRecord[key] = value;
        }
      });

      // Refresh data
      await loadBarcodeHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to meal plan');
    }
  };

  const handleAddToFavorites = async (item: BarcodeHistoryItem) => {
    try {
      const nutritionRecord: Record<string, number> = {};
      Object.entries(item.data.nutrition).forEach(([key, value]) => {
        if (typeof value === 'number') {
          nutritionRecord[key] = value;
        }
      });

      // Refresh data
      await loadBarcodeHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to favorites');
    }
  };

  const handleAddToFoodLog = async (item: BarcodeHistoryItem) => {
    try {
      const nutritionRecord: Record<string, number> = {};
      Object.entries(item.data.nutrition).forEach(([key, value]) => {
        if (typeof value === 'number') {
          nutritionRecord[key] = value;
        }
      });

      // Refresh data
      await loadBarcodeHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to food log');
    }
  };

  const handleUpdateGoalProgress = async (item: BarcodeHistoryItem) => {
    try {
      const nutritionRecord: Record<string, number> = {};
      Object.entries(item.data.nutrition).forEach(([key, value]) => {
        if (typeof value === 'number') {
          nutritionRecord[key] = value;
        }
      });

      // Refresh data
      await loadBarcodeHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update goal progress');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Barcode History</h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-md border-gray-300"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{item.data.name}</h3>
                  <p className="text-gray-600">Barcode: {item.barcode}</p>
                  <p className="text-sm text-gray-500">
                    Scanned: {new Date(item.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAddToMealPlan(item)}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                  >
                    Add to Meal Plan
                  </button>
                  <button
                    onClick={() => handleAddToFavorites(item)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
                  >
                    Add to Favorites
                  </button>
                  <button
                    onClick={() => handleAddToFoodLog(item)}
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                  >
                    Add to Food Log
                  </button>
                  <button
                    onClick={() => handleUpdateGoalProgress(item)}
                    className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600"
                  >
                    Update Goals
                  </button>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Calories:</span> {item.data.nutrition.calories}
                </div>
                <div>
                  <span className="font-medium">Protein:</span> {item.data.nutrition.protein}g
                </div>
                <div>
                  <span className="font-medium">Carbs:</span> {item.data.nutrition.carbs}g
                </div>
                <div>
                  <span className="font-medium">Fat:</span> {item.data.nutrition.fat}g
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {mealPlanBalance && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Meal Plan Balance</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Calories:</span> {mealPlanBalance.calories}
            </div>
            <div>
              <span className="font-medium">Protein:</span> {mealPlanBalance.protein}g
            </div>
            <div>
              <span className="font-medium">Carbs:</span> {mealPlanBalance.carbs}g
            </div>
            <div>
              <span className="font-medium">Fat:</span> {mealPlanBalance.fat}g
            </div>
          </div>
          <div className="mt-2">
            <span className="font-medium">Status:</span> {mealPlanBalance.balanced ? 'Balanced' : 'Needs Adjustment'}
          </div>
          {mealPlanBalance.recommendations.length > 0 && (
            <div className="mt-2">
              <span className="font-medium">Recommendations:</span>
              <ul className="list-disc list-inside text-sm">
                {mealPlanBalance.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 
