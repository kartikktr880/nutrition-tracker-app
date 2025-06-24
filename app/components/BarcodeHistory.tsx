import { useState, useEffect } from 'react';
import { barcodeService } from '@/lib/barcode-service';
import { useToast } from '@/hooks/useToast';
import { useFoodLog } from '@/hooks/useFoodLog';
import GroceryList from './GroceryList';
import MealPrepInstructions from './MealPrepInstructions';

interface BarcodeHistoryProps {
  onSelect: (barcode: string) => void;
}

interface QuickAddItem {
  data: any;
  portion: number;
}

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const BarcodeHistory: React.FC<BarcodeHistoryProps> = ({ onSelect }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'favorites' | 'suggestions' | 'mealplan'>('history');
  const [selectedItems, setSelectedItems] = useState<QuickAddItem[]>([]);
  const [showNutritionInfo, setShowNutritionInfo] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<number>(Date.now());
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  const { showToast } = useToast();
  const { addFoodEntry } = useFoodLog();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mealPlanBalance, setMealPlanBalance] = useState<any>(null);
  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [goalProgress, setGoalProgress] = useState<any>(null);
  const [showGroceryList, setShowGroceryList] = useState(false);
  const [showMealPrep, setShowMealPrep] = useState<string | null>(null);

  const history = barcodeService.getHistory();
  const favorites = barcodeService.getFavorites();
  const mealPlans = barcodeService.getMealPlans(selectedDate);
  const mealPlanNutrition = barcodeService.getMealPlanNutrition(selectedDate);

  useEffect(() => {
    if (activeTab === 'suggestions') {
      setSuggestions(barcodeService.getSuggestions());
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'mealplan') {
      setMealPlanBalance(barcodeService.getMealPlanBalance(selectedDate));
      const progress = barcodeService.updateGoalProgress(selectedDate);
      setGoalProgress(progress);
    }
  }, [activeTab, selectedDate, mealPlans]);

  const handleAddToFavorites = (barcode: string, data: any) => {
    barcodeService.addToFavorites(barcode, data);
    showToast('Added to favorites', 'success');
  };

  const handleRemoveFromFavorites = (barcode: string) => {
    barcodeService.removeFromFavorites(barcode);
    showToast('Removed from favorites', 'success');
  };

  const handleQuickAdd = async (data: any, portion: number = 1) => {
    try {
      await addFoodEntry({
        name: data.name,
        brand: data.brand,
        nutrition: {
          ...data.nutrition,
          calories: data.nutrition.calories * portion,
          protein: data.nutrition.protein * portion,
          carbs: data.nutrition.carbs * portion,
          fat: data.nutrition.fat * portion
        },
        timestamp: Date.now()
      });
      showToast('Food added successfully', 'success');
    } catch (error) {
      showToast('Failed to add food', 'error');
    }
  };

  const handleAddToSelection = (data: any) => {
    const recommendedPortion = barcodeService.getPortionRecommendation({ barcode: '', timestamp: Date.now(), data });
    setSelectedItems(prev => [...prev, { data, portion: recommendedPortion }]);
  };

  const handleRemoveFromSelection = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handlePortionChange = (index: number, portion: number) => {
    setSelectedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, portion } : item
    ));
  };

  const handleAddSelected = async () => {
    for (const item of selectedItems) {
      await handleQuickAdd(item.data, item.portion);
    }
    setSelectedItems([]);
    showToast('All items added successfully', 'success');
  };

  const handleAddToMealPlan = (data: any) => {
    barcodeService.addToMealPlan('', data, selectedMealType, selectedDate);
    showToast('Added to meal plan', 'success');
  };

  const handleRemoveFromMealPlan = (barcode: string, plannedDate: number) => {
    barcodeService.removeFromMealPlan(barcode, plannedDate);
    showToast('Removed from meal plan', 'success');
  };

  const renderNutritionInfo = (data: any) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Nutrition Information</h3>
        <div className="space-y-2">
          <p><span className="font-medium">Calories:</span> {data.nutrition.calories} kcal</p>
          <p><span className="font-medium">Protein:</span> {data.nutrition.protein}g</p>
          <p><span className="font-medium">Carbs:</span> {data.nutrition.carbs}g</p>
          <p><span className="font-medium">Fat:</span> {data.nutrition.fat}g</p>
        </div>
        <button
          onClick={() => setShowNutritionInfo(null)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    </div>
  );

  const renderItem = (item: any, isFavorite: boolean = false, reason?: string, isMealPlan: boolean = false) => (
    <div key={item.barcode} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm mb-2">
      <div className="flex-1">
        <h3 className="font-medium">{item.data.name}</h3>
        {item.data.brand && <p className="text-sm text-gray-600">{item.data.brand}</p>}
        <p className="text-xs text-gray-500">
          {new Date(item.timestamp || item.addedAt).toLocaleDateString()}
        </p>
        {reason && (
          <p className="text-xs text-blue-600 mt-1">{reason}</p>
        )}
        {isMealPlan && (
          <p className="text-xs text-green-600 mt-1 capitalize">
            {item.mealType}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setShowNutritionInfo(item.barcode)}
          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
        >
          Info
        </button>
        {isMealPlan && (
          <button
            onClick={() => setShowMealPrep(item.barcode)}
            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
          >
            Prep
          </button>
        )}
        {isMealPlan ? (
          <button
            onClick={() => handleRemoveFromMealPlan(item.barcode, item.plannedDate)}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Remove
          </button>
        ) : (
          <>
            <button
              onClick={() => handleAddToSelection(item.data)}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Add to List
            </button>
            <button
              onClick={() => handleAddToMealPlan(item.data)}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              Plan Meal
            </button>
            {isFavorite ? (
              <button
                onClick={() => handleRemoveFromFavorites(item.barcode)}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Remove
              </button>
            ) : (
              <button
                onClick={() => handleAddToFavorites(item.barcode, item.data)}
                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
              >
                Favorite
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  const renderNutritionalInsights = () => {
    if (selectedItems.length === 0) return null;

    const insights = barcodeService.getNutritionalInsights(
      selectedItems.map(item => ({
        barcode: '',
        timestamp: Date.now(),
        data: item.data
      }))
    );

    return (
      <div className="bg-blue-50 p-4 rounded-lg mt-4">
        <h3 className="font-semibold mb-2">Nutritional Insights</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p><span className="font-medium">Total Calories:</span> {insights.totalCalories.toFixed(0)} kcal</p>
          <p><span className="font-medium">Total Protein:</span> {insights.totalProtein.toFixed(1)}g</p>
          <p><span className="font-medium">Total Carbs:</span> {insights.totalCarbs.toFixed(1)}g</p>
          <p><span className="font-medium">Total Fat:</span> {insights.totalFat.toFixed(1)}g</p>
          <p><span className="font-medium">Average Calories:</span> {insights.averageCalories.toFixed(0)} kcal</p>
        </div>
      </div>
    );
  };

  const renderMealPlanNutrition = () => (
    <div className="bg-green-50 p-4 rounded-lg mt-4">
      <h3 className="font-semibold mb-2">Daily Nutrition Summary</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <p><span className="font-medium">Total Calories:</span> {mealPlanNutrition.totalCalories.toFixed(0)} kcal</p>
        <p><span className="font-medium">Total Protein:</span> {mealPlanNutrition.totalProtein.toFixed(1)}g</p>
        <p><span className="font-medium">Total Carbs:</span> {mealPlanNutrition.totalCarbs.toFixed(1)}g</p>
        <p><span className="font-medium">Total Fat:</span> {mealPlanNutrition.totalFat.toFixed(1)}g</p>
      </div>
      <div className="mt-4">
        <h4 className="font-medium mb-2">By Meal Type</h4>
        {Object.entries(mealPlanNutrition.byMealType).map(([type, nutrition]) => (
          <div key={type} className="mb-2">
            <h5 className="font-medium capitalize">{type}</h5>
            <div className="grid grid-cols-2 gap-1 text-sm">
              <p>Calories: {nutrition.calories.toFixed(0)} kcal</p>
              <p>Protein: {nutrition.protein.toFixed(1)}g</p>
              <p>Carbs: {nutrition.carbs.toFixed(1)}g</p>
              <p>Fat: {nutrition.fat.toFixed(1)}g</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMealPlanControls = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        onClick={() => setShowGroceryList(true)}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
        </svg>
        View Grocery List
      </button>
      <input
        type="date"
        value={new Date(selectedDate).toISOString().split('T')[0]}
        onChange={(e) => setSelectedDate(new Date(e.target.value).getTime())}
        className="px-3 py-2 border rounded"
      />
      <select
        value={selectedMealType}
        onChange={(e) => setSelectedMealType(e.target.value as MealType)}
        className="px-3 py-2 border rounded"
      >
        <option value="breakfast">Breakfast</option>
        <option value="lunch">Lunch</option>
        <option value="dinner">Dinner</option>
        <option value="snack">Snack</option>
      </select>
    </div>
  );

  const renderMealPlanBalance = () => (
    <div className="bg-yellow-50 p-4 rounded-lg mt-4">
      <h3 className="font-semibold mb-2">Meal Plan Balance</h3>
      {mealPlanBalance?.balanced ? (
        <p className="text-green-600">Your meal plan is well balanced!</p>
      ) : (
        <div>
          <p className="text-yellow-600 mb-2">Consider adding:</p>
          <ul className="list-disc list-inside space-y-1">
            {mealPlanBalance?.recommendations.map((rec: string, index: number) => (
              <li key={index} className="text-sm">{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderMealPlanSuggestions = () => {
    const suggestions = barcodeService.getMealPlanSuggestions(selectedDate);
    
    return (
      <div className="bg-blue-50 p-4 rounded-lg mt-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">Smart Suggestions</h3>
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="text-blue-600 hover:text-blue-800"
          >
            {showSuggestions ? 'Hide' : 'Show'} Suggestions
          </button>
        </div>
        {showSuggestions && (
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="bg-white p-3 rounded-lg shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{suggestion.item.data.name}</h4>
                    <p className="text-sm text-gray-600 capitalize">{suggestion.mealType}</p>
                    <p className="text-xs text-blue-600 mt-1">{suggestion.reason}</p>
                  </div>
                  <button
                    onClick={() => handleAddToMealPlan(suggestion.item.data)}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderGoalProgress = () => {
    if (!goalProgress) return null;

    return (
      <div className="bg-purple-50 p-4 rounded-lg mt-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">Goal Progress</h3>
          <button
            onClick={() => setShowGoalSettings(true)}
            className="text-purple-600 hover:text-purple-800"
          >
            Edit Goals
          </button>
        </div>
        <div className="space-y-2">
          {Object.entries(goalProgress.progress).map(([nutrient, percentage]) => (
            <div key={nutrient} className="bg-white p-2 rounded">
              <div className="flex justify-between mb-1">
                <span className="capitalize">{nutrient}</span>
                <span>{Math.round(Number(percentage))}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${Math.min(Math.round(Number(percentage)), 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderGoalSettings = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Set Nutritional Goals</h3>
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          barcodeService.setNutritionalGoals({
            calories: {
              target: Number(formData.get('calories-target')),
              min: Number(formData.get('calories-min')),
              max: Number(formData.get('calories-max'))
            },
            protein: {
              target: Number(formData.get('protein-target')),
              min: Number(formData.get('protein-min')),
              max: Number(formData.get('protein-max'))
            },
            carbs: {
              target: Number(formData.get('carbs-target')),
              min: Number(formData.get('carbs-min')),
              max: Number(formData.get('carbs-max'))
            },
            fat: {
              target: Number(formData.get('fat-target')),
              min: Number(formData.get('fat-min')),
              max: Number(formData.get('fat-max'))
            }
          });
          setShowGoalSettings(false);
          const progress = barcodeService.updateGoalProgress(selectedDate);
          setGoalProgress(progress);
        }}>
          {['calories', 'protein', 'carbs', 'fat'].map(nutrient => (
            <div key={nutrient} className="mb-4">
              <h4 className="font-medium capitalize mb-2">{nutrient}</h4>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  name={`${nutrient}-target`}
                  placeholder="Target"
                  className="px-3 py-2 border rounded"
                  defaultValue={barcodeService.getNutritionalGoals()[nutrient].target}
                />
                <input
                  type="number"
                  name={`${nutrient}-min`}
                  placeholder="Min"
                  className="px-3 py-2 border rounded"
                  defaultValue={barcodeService.getNutritionalGoals()[nutrient].min}
                />
                <input
                  type="number"
                  name={`${nutrient}-max`}
                  placeholder="Max"
                  className="px-3 py-2 border rounded"
                  defaultValue={barcodeService.getNutritionalGoals()[nutrient].max}
                />
              </div>
            </div>
          ))}
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setShowGoalSettings(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Goals
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex border-b">
        <button
          className={`px-4 py-2 ${activeTab === 'history' ? 'border-b-2 border-blue-500' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'favorites' ? 'border-b-2 border-blue-500' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          Favorites
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'suggestions' ? 'border-b-2 border-blue-500' : ''}`}
          onClick={() => setActiveTab('suggestions')}
        >
          Suggestions
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'mealplan' ? 'border-b-2 border-blue-500' : ''}`}
          onClick={() => setActiveTab('mealplan')}
        >
          Meal Plan
        </button>
      </div>

      {activeTab === 'mealplan' && (
        <>
          {renderMealPlanControls()}
          {renderGoalProgress()}
          {renderMealPlanBalance()}
          {renderMealPlanSuggestions()}
        </>
      )}

      {selectedItems.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Selected Items</h3>
          <div className="space-y-2">
            {selectedItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span>{item.data.name}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={item.portion}
                    onChange={(e) => handlePortionChange(index, parseFloat(e.target.value))}
                    className="w-20 px-2 py-1 border rounded"
                  />
                  <button
                    onClick={() => handleRemoveFromSelection(index)}
                    className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          {renderNutritionalInsights()}
          <button
            onClick={handleAddSelected}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Add All Items
          </button>
        </div>
      )}

      <div className="space-y-2">
        {activeTab === 'history' ? (
          history.length > 0 ? (
            history.map(item => renderItem(item))
          ) : (
            <p className="text-gray-500 text-center py-4">No scan history yet</p>
          )
        ) : activeTab === 'favorites' ? (
          favorites.length > 0 ? (
            favorites.map(item => renderItem(item, true))
          ) : (
            <p className="text-gray-500 text-center py-4">No favorites yet</p>
          )
        ) : activeTab === 'suggestions' ? (
          suggestions.length > 0 ? (
            suggestions.map(suggestion => renderItem(suggestion.item, false, suggestion.reason))
          ) : (
            <p className="text-gray-500 text-center py-4">No suggestions available</p>
          )
        ) : (
          <>
            {mealPlans.length > 0 ? (
              <>
                {mealPlans.map(item => renderItem(item, false, undefined, true))}
                {renderMealPlanNutrition()}
              </>
            ) : (
              <p className="text-gray-500 text-center py-4">No meals planned for this date</p>
            )}
          </>
        )}
      </div>

      {showNutritionInfo && (
        renderNutritionInfo(
          [...history, ...favorites, ...mealPlans].find(item => item.barcode === showNutritionInfo)?.data
        )
      )}

      {showGoalSettings && renderGoalSettings()}

      {showGroceryList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <GroceryList onClose={() => setShowGroceryList(false)} />
          </div>
        </div>
      )}

      {showMealPrep && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <MealPrepInstructions
              barcode={showMealPrep}
              onClose={() => setShowMealPrep(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}; 