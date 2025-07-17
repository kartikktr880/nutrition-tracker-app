import React, { useState } from 'react';
import { formatDateLong, formatDateRange } from '../../utils/dateUtils';
import type { MealPlanV2 as MealPlan, Meal } from '../../types/nutrition';

interface MealPlanViewerProps {
  plan: MealPlan;
  onDelete: () => void;
  onAddMeal: () => void;
}

export const MealPlanViewer: React.FC<MealPlanViewerProps> = ({ plan, onDelete, onAddMeal }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  
  // Calculate the number of days in the plan
  const startDate = new Date(plan.startDate);
  const endDate = new Date(plan.endDate);
  const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Generate an array of dates for the plan
  const planDates = Array.from({ length: daysDiff }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0];
  });
  
  // Set the first day as active if none is selected
  if (!activeDay && planDates.length > 0) {
    setActiveDay(planDates[0]);
  }
  
  // Filter meals for the active day
  const mealsForActiveDay = activeDay 
    ? plan.meals.filter(meal => meal.date === activeDay)
    : [];
  
  // Calculate total nutrition for the active day
  const dailyTotals = mealsForActiveDay.reduce(
    (totals, meal) => {
      return {
        calories: totals.calories + (meal.calories || 0),
        protein: totals.protein + (meal.protein || 0),
        carbs: totals.carbs + (meal.carbs || 0),
        fat: totals.fat + (meal.fat || 0)
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  
  // Calculate percentage of daily targets
  const caloriePercentage = Math.round((dailyTotals.calories / plan.dailyCalories) * 100);
  
  // Group meals by meal type
  const mealsByType: Record<string, Meal[]> = {};
  mealsForActiveDay.forEach(meal => {
    if (!mealsByType[meal.mealType]) {
      mealsByType[meal.mealType] = [];
    }
    mealsByType[meal.mealType].push(meal);
  });
  
  // Order meal types
  const mealTypeOrder = ['breakfast', 'lunch', 'dinner', 'snacks'];
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 px-6 py-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-white">{plan.name}</h2>
            <p className="text-blue-100 mt-1">
              {formatDateRange(plan.startDate, plan.endDate)}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onAddMeal}
              className="bg-white text-blue-600 px-4 py-2 rounded shadow hover:bg-blue-50 transition"
            >
              Add Meal
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-500 text-white px-4 py-2 rounded shadow hover:bg-red-600 transition"
            >
              Delete Plan
            </button>
          </div>
        </div>
        
        {plan.description && (
          <p className="text-blue-100 mt-2 text-sm">{plan.description}</p>
        )}
      </div>
      
      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="bg-red-50 border-t border-b border-red-200 px-6 py-4">
          <p className="text-red-700 font-medium">Are you sure you want to delete this meal plan?</p>
          <p className="text-red-600 text-sm mt-1">This action cannot be undone.</p>
          <div className="mt-3 flex space-x-3">
            <button
              onClick={onDelete}
              className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition"
            >
              Yes, Delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Plan details */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column - Plan info */}
          <div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900">Nutritional Targets</h3>
              
              <dl className="mt-2 text-sm">
                <div className="flex justify-between py-1">
                  <dt className="text-gray-600">Daily Calories:</dt>
                  <dd className="font-medium">{plan.dailyCalories}</dd>
                </div>
                
                <div className="flex justify-between py-1">
                  <dt className="text-gray-600">Macros:</dt>
                  <dd className="font-medium">
                    P: {plan.macroRatios.protein}% / 
                    C: {plan.macroRatios.carbs}% / 
                    F: {plan.macroRatios.fat}%
                  </dd>
                </div>
                
                {plan.dietaryRestrictions.length > 0 && (
                  <div className="pt-1">
                    <dt className="text-gray-600 mb-1">Dietary Restrictions:</dt>
                    <dd className="flex flex-wrap gap-1 mt-1">
                      {plan.dietaryRestrictions.map(restriction => (
                        <span 
                          key={restriction}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {restriction}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            
            {/* Day selector */}
            <div className="mt-6">
              <h3 className="font-medium text-gray-900 mb-2">Select Day</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {planDates.map(date => (
                  <button
                    key={date}
                    onClick={() => setActiveDay(date)}
                    className={`px-3 py-2 text-sm rounded-md ${
                      activeDay === date 
                        ? 'bg-blue-100 text-blue-700 font-medium' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {formatDateLong(date)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Right column - Daily meals */}
          <div className="md:col-span-2">
            {activeDay ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-lg text-gray-900">
                    {formatDateLong(activeDay)}
                  </h3>
                  
                  <button
                    onClick={onAddMeal}
                    className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200 transition"
                  >
                    Add Meal
                  </button>
                </div>
                
                {/* Daily nutrition summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium text-gray-700">Daily Summary</h4>
                    <span className={`text-sm font-medium ${
                      caloriePercentage > 110 ? 'text-red-600' : 
                      caloriePercentage < 90 ? 'text-yellow-600' : 
                      'text-green-600'
                    }`}>
                      {dailyTotals.calories} / {plan.dailyCalories} cal ({caloriePercentage}%)
                    </span>
                  </div>
                  
                  {/* Calorie progress bar */}
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        caloriePercentage > 110 ? 'bg-red-500' : 
                        caloriePercentage < 90 ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(caloriePercentage, 100)}%` }}
                    />
                  </div>
                  
                  {/* Macro breakdown */}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-blue-50 p-2 rounded">
                      <div className="text-blue-700 font-medium">Protein</div>
                      <div className="mt-1 text-gray-700">{dailyTotals.protein}g</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded">
                      <div className="text-green-700 font-medium">Carbs</div>
                      <div className="mt-1 text-gray-700">{dailyTotals.carbs}g</div>
                    </div>
                    <div className="bg-yellow-50 p-2 rounded">
                      <div className="text-yellow-700 font-medium">Fat</div>
                      <div className="mt-1 text-gray-700">{dailyTotals.fat}g</div>
                    </div>
                  </div>
                </div>
                
                {/* Meals for the day */}
                {mealTypeOrder.map(mealType => {
                  const meals = mealsByType[mealType] || [];
                  if (meals.length === 0) return null;
                  
                  return (
                    <div key={mealType} className="mb-6">
                      <h4 className="font-medium text-gray-900 capitalize mb-2">{mealType}</h4>
                      
                      <div className="space-y-3">
                        {meals.map(meal => (
                          <div key={meal.id} className="bg-white border rounded-lg p-3 shadow-sm">
                            <div className="flex justify-between">
                              <h5 className="font-medium">{meal.name}</h5>
                              <span className="text-gray-600">{meal.calories} cal</span>
                            </div>
                            
                            <div className="mt-2 text-sm text-gray-600">
                              <div className="flex space-x-4">
                                <span>Protein: {meal.protein}g</span>
                                <span>Carbs: {meal.carbs}g</span>
                                <span>Fat: {meal.fat}g</span>
                              </div>
                            </div>
                            
                            {meal.notes && (
                              <div className="mt-2 text-sm text-gray-500">
                                {meal.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                {/* Empty state */}
                {mealsForActiveDay.length === 0 && (
                  <div className="text-center py-8">
                    <svg 
                      className="mx-auto h-12 w-12 text-gray-400" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={1.5} 
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No meals added yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Start by adding a meal to your plan for this day.
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={onAddMeal}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <svg 
                          className="-ml-1 mr-2 h-5 w-5" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24" 
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
                          />
                        </svg>
                        Add Meal
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Select a day to view meals
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 