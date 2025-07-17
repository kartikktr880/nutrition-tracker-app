import React, { useState, useEffect } from 'react';
import { storage } from '../../services/storage';
import { analytics } from '../../services/analytics';
import { logError, logInfo } from '../../utils/logger';
import { formatDateLong } from '../../utils/dateUtils';
import type { MealPlanV2 as MealPlan, Meal } from '../../types/nutrition';

interface MealAdderProps {
  userId: string;
  planId: string;
  onMealAdded: (updatedPlan: MealPlan) => void;
  onCancel: () => void;
}

interface Recipe {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  instructions: string;
}

export const MealAdder: React.FC<MealAdderProps> = ({ userId, planId, onMealAdded, onCancel }) => {
  // State for meal plan
  const [plan, setPlan] = useState<MealPlan | null>(null);
  
  // State for selected date
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  // State for available dates in the plan
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  
  // State for the meal form
  const [mealForm, setMealForm] = useState<Partial<Meal>>({
    id: crypto.randomUUID(),
    name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    mealType: 'breakfast',
    quantity: 1,
    unit: 'serving'
  });
  
  // State for search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // State for loading and errors
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load the meal plan
  useEffect(() => {
    const loadPlan = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load all meal plans
        const plans = await storage.getItem<MealPlan[]>(`meal_plans_${userId}`, 'mealPlans');
        
        if (!plans) {
          throw new Error('No meal plans found');
        }
        
        // Find the specific plan
        const foundPlan = plans.find(p => p.id === planId);
        
        if (!foundPlan) {
          throw new Error('Meal plan not found');
        }
        
        setPlan(foundPlan);
        
        // Generate available dates
        const startDate = new Date(foundPlan.startDate);
        const endDate = new Date(foundPlan.endDate);
        const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        const dates = Array.from({ length: daysDiff }, (_, i) => {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          return date.toISOString().split('T')[0];
        });
        
        setAvailableDates(dates);
        
        // Set default selected date to the first date in the plan
        if (dates.length > 0 && !selectedDate) {
          setSelectedDate(dates[0]);
          setMealForm(prev => ({ ...prev, date: dates[0] }));
        }
        
        // Load recent searches
        try {
          const storedSearches = localStorage.getItem(`meal_searches_${userId}`);
          if (storedSearches) {
            setRecentSearches(JSON.parse(storedSearches));
          }
        } catch (err) {
          // Ignore errors with recent searches - handled silently
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load meal plan';
        setError(errorMessage);
        logError('Error loading meal plan for meal adder:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPlan();
  }, [userId, planId, selectedDate]);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMealForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle number input changes
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numberValue = value === '' ? 0 : parseFloat(value);
    setMealForm(prev => ({ ...prev, [name]: numberValue }));
  };
  
  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    setMealForm(prev => ({ ...prev, date: newDate }));
  };
  
  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      setError(null);
      
      // In a real app, this would be an API call to a food database
      // For demo, we'll simulate a search with some mock data
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      
      // Mock search results
      const results: Recipe[] = [
        {
          id: '1',
          name: `${searchQuery} Salad`,
          calories: 350,
          protein: 15,
          carbs: 40,
          fat: 12,
          ingredients: ['Lettuce', 'Tomatoes', 'Cucumber', 'Dressing'],
          instructions: 'Mix all ingredients together and serve.'
        },
        {
          id: '2',
          name: `Grilled ${searchQuery}`,
          calories: 450,
          protein: 30,
          carbs: 20,
          fat: 25,
          ingredients: ['Protein', 'Olive oil', 'Spices'],
          instructions: 'Marinate and grill until cooked through.'
        },
        {
          id: '3',
          name: `${searchQuery} Stir Fry`,
          calories: 550,
          protein: 25,
          carbs: 60,
          fat: 18,
          ingredients: ['Vegetables', 'Protein', 'Sauce', 'Rice'],
          instructions: 'Cook protein, add vegetables, stir in sauce, serve over rice.'
        }
      ];
      
      setSearchResults(results);
      
      // Save search query to recent searches
      const updatedSearches = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
      setRecentSearches(updatedSearches);
      localStorage.setItem(`meal_searches_${userId}`, JSON.stringify(updatedSearches));
      
      // Track search
      analytics.trackEvent({
        category: 'MealPlanner',
        action: 'search_recipe',
        label: searchQuery
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search recipes';
      setError(errorMessage);
      logError('Error searching recipes:', err);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle recipe selection
  const handleSelectRecipe = (recipe: Recipe) => {
    setMealForm({
      ...mealForm,
      name: recipe.name,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      notes: `Ingredients: ${recipe.ingredients.join(', ')}\n\nInstructions: ${recipe.instructions}`
    });
    
    // Track recipe selection
    analytics.trackEvent({
      category: 'MealPlanner',
      action: 'select_recipe',
      label: recipe.name
    });
  };
  
  // Handle recent search click
  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    handleSearch();
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      setError(null);
      
      // Validate form
      if (!plan) {
        throw new Error('Meal plan not loaded');
      }
      
      if (!mealForm.name) {
        throw new Error('Meal name is required');
      }
      
      if (!mealForm.date) {
        throw new Error('Date is required');
      }
      
      if (!mealForm.mealType) {
        throw new Error('Meal type is required');
      }
      
      // Create meal object
      const newMeal: Meal = {
        id: mealForm.id || crypto.randomUUID(),
        name: mealForm.name,
        calories: mealForm.calories || 0,
        protein: mealForm.protein || 0,
        carbs: mealForm.carbs || 0,
        fat: mealForm.fat || 0,
        date: mealForm.date,
        mealType: mealForm.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snacks',
        quantity: mealForm.quantity || 1,
        unit: mealForm.unit || 'serving',
        notes: mealForm.notes,
        createdAt: new Date().toISOString()
      };
      
      // Update the plan with the new meal
      const updatedPlan: MealPlan = {
        ...plan,
        meals: [...plan.meals, newMeal],
        updatedAt: new Date().toISOString()
      };
      
      // Save the updated plan
      const plans = await storage.getItem<MealPlan[]>(`meal_plans_${userId}`, 'mealPlans') || [];
      const updatedPlans = plans.map(p => p.id === planId ? updatedPlan : p);
      await storage.setItem(`meal_plans_${userId}`, updatedPlans, 'mealPlans');
      
      // Track meal addition
      analytics.trackEvent({
        category: 'MealPlanner',
        action: 'add_meal',
        label: newMeal.name,
        metadata: {
          planId,
          mealId: newMeal.id,
          mealType: newMeal.mealType,
          date: newMeal.date
        }
      });
      
      logInfo(`Added meal "${newMeal.name}" to plan "${plan.name}"`, { userId, planId });
      
      // Call the onMealAdded callback
      onMealAdded(updatedPlan);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add meal';
      setError(errorMessage);
      logError('Error adding meal to plan:', err);
      
      analytics.trackError({
        errorType: 'add_meal_error',
        errorMessage,
        context: { userId, planId, meal: mealForm }
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading meal plan...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!plan) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{error || 'Failed to load meal plan'}</p>
          <button
            onClick={onCancel}
            className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 px-6 py-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Add Meal to {plan.name}</h2>
          <button
            onClick={onCancel}
            className="text-white hover:text-blue-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column - Search */}
          <div className="md:col-span-1">
            <div className="mb-4">
              <h3 className="font-medium text-gray-900 mb-2">Search Recipes</h3>
              <div className="flex">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for recipes..."
                  className="flex-grow rounded-l-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700"
                >
                  {isSearching ? (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            {/* Recent searches */}
            {recentSearches.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-1">Recent Searches</h4>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((query) => (
                    <button
                      key={query}
                      onClick={() => handleRecentSearchClick(query)}
                      className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded hover:bg-gray-200"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Search results */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {searchResults.length > 0 ? 'Search Results' : 'No results yet'}
              </h4>
              
              <div className="space-y-3">
                {searchResults.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="border rounded-md p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleSelectRecipe(recipe)}
                  >
                    <div className="flex justify-between">
                      <h5 className="font-medium">{recipe.name}</h5>
                      <span className="text-gray-600">{recipe.calories} cal</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      <span>P: {recipe.protein}g</span>
                      <span className="mx-2">C: {recipe.carbs}g</span>
                      <span>F: {recipe.fat}g</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Right column - Meal form */}
          <div className="md:col-span-2">
            <h3 className="font-medium text-gray-900 mb-4">Meal Details</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4">
                {/* Date and meal type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="date"
                      name="date"
                      value={selectedDate}
                      onChange={handleDateChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      required
                    >
                      {availableDates.map((date) => (
                        <option key={date} value={date}>
                          {formatDateLong(date)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="mealType" className="block text-sm font-medium text-gray-700">
                      Meal Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="mealType"
                      name="mealType"
                      value={mealForm.mealType}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      required
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snacks">Snacks</option>
                    </select>
                  </div>
                </div>
                
                {/* Meal name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Meal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={mealForm.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    placeholder="e.g., Grilled Chicken Salad"
                    required
                  />
                </div>
                
                {/* Nutrition info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label htmlFor="calories" className="block text-sm font-medium text-gray-700">
                      Calories
                    </label>
                    <input
                      type="number"
                      id="calories"
                      name="calories"
                      value={mealForm.calories}
                      onChange={handleNumberChange}
                      min="0"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="protein" className="block text-sm font-medium text-gray-700">
                      Protein (g)
                    </label>
                    <input
                      type="number"
                      id="protein"
                      name="protein"
                      value={mealForm.protein}
                      onChange={handleNumberChange}
                      min="0"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="carbs" className="block text-sm font-medium text-gray-700">
                      Carbs (g)
                    </label>
                    <input
                      type="number"
                      id="carbs"
                      name="carbs"
                      value={mealForm.carbs}
                      onChange={handleNumberChange}
                      min="0"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="fat" className="block text-sm font-medium text-gray-700">
                      Fat (g)
                    </label>
                    <input
                      type="number"
                      id="fat"
                      name="fat"
                      value={mealForm.fat}
                      onChange={handleNumberChange}
                      min="0"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </div>
                </div>
                
                {/* Quantity and unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                      Quantity
                    </label>
                    <input
                      type="number"
                      id="quantity"
                      name="quantity"
                      value={mealForm.quantity}
                      onChange={handleNumberChange}
                      min="0.25"
                      step="0.25"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                      Unit
                    </label>
                    <select
                      id="unit"
                      name="unit"
                      value={mealForm.unit}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    >
                      <option value="serving">Serving</option>
                      <option value="cup">Cup</option>
                      <option value="tbsp">Tablespoon</option>
                      <option value="tsp">Teaspoon</option>
                      <option value="oz">Ounce</option>
                      <option value="g">Gram</option>
                      <option value="ml">Milliliter</option>
                      <option value="piece">Piece</option>
                    </select>
                  </div>
                </div>
                
                {/* Notes */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={mealForm.notes}
                    onChange={handleInputChange}
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    placeholder="Recipe details, ingredients, instructions, etc."
                  />
                </div>
                
                {/* Buttons */}
                <div className="flex justify-end space-x-3 mt-2">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {isSaving ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    ) : 'Add Meal'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}; 