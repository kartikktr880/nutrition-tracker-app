import React, { useState } from 'react';

import { MealPrepPlan as MealPrepPlanType, MealPrepDay } from '../types/nutrition';

interface MealPrepPlanProps {
  plan: MealPrepPlanType;
  onUpdate?: (plan: MealPrepPlanType) => void;
  onDelete?: (planId: string) => void;
}

export const MealPrepPlan: React.FC<MealPrepPlanProps> = ({
  plan,
  onUpdate,
  onDelete,
}) => {
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [selectedMeals, setSelectedMeals] = useState<Set<string>>(new Set());

  const toggleMealExpansion = (mealId: string) => {
    const newExpanded = new Set(expandedMeals);
    if (newExpanded.has(mealId)) {
      newExpanded.delete(mealId);
    } else {
      newExpanded.add(mealId);
    }
    setExpandedMeals(newExpanded);
  };

  const toggleMealSelection = (mealId: string) => {
    const newSelected = new Set(selectedMeals);
    if (newSelected.has(mealId)) {
      newSelected.delete(mealId);
    } else {
      newSelected.add(mealId);
    }
    setSelectedMeals(newSelected);
  };

  const totalPrepTime = plan.meals.reduce(
    (total: number, meal) => total + meal.prepTime + meal.cookTime,
    0,
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Meal Prep Plan</h2>
          <p className="text-gray-600">Total Prep Time: {totalPrepTime} minutes</p>
        </div>
        <div className="flex space-x-2">
          {onUpdate && (
            <button
              onClick={() => onUpdate(plan)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Edit Plan
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(plan.id)}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete Plan
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {plan.meals.map(
          (meal: {
            id: string;
            name: string;
            prepTime: number;
            cookTime: number;
            servings: number;
            calories: number;
            protein: number;
            carbs: number;
            fat: number;
            ingredients: { name: string; amount: number; unit: string }[];
            instructions: string[];
          }) => (
            <div
              key={meal.id}
              className={`border rounded-lg p-4 ${
                selectedMeals.has(meal.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedMeals.has(meal.id)}
                    onChange={() => toggleMealSelection(meal.id)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{meal.name}</h3>
                    <p className="text-sm text-gray-600">
                      Prep: {meal.prepTime}min | Cook: {meal.cookTime}min | Servings: {meal.servings}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleMealExpansion(meal.id)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  {expandedMeals.has(meal.id) ? '▼' : '▶'}
                </button>
              </div>

              {expandedMeals.has(meal.id) && (
                <div className="mt-4 space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Ingredients:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {meal.ingredients.map(
                        (ingredient: { name: string; amount: number; unit: string }, index: number) => (
                          <li key={index} className="text-sm text-gray-600">
                            {ingredient.amount} {ingredient.unit} {ingredient.name}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Instructions:</h4>
                    <ol className="list-decimal list-inside space-y-1">
                      {meal.instructions.map((instruction: string, index: number) => (
                        <li key={index} className="text-sm text-gray-600">
                          {instruction}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Calories:</span> {meal.calories}
                    </div>
                    <div>
                      <span className="font-medium">Protein:</span> {meal.protein}g
                    </div>
                    <div>
                      <span className="font-medium">Carbs:</span> {meal.carbs}g
                    </div>
                    <div>
                      <span className="font-medium">Fat:</span> {meal.fat}g
                    </div>
                  </div>
                </div>
              )}
            </div>
          ),
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Prep Schedule</h3>
        <div className="space-y-3">
          {plan.prepSchedule.map((day: MealPrepDay, index: number) => (
            <div key={index} className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium text-gray-700">{day.day}</h4>
              <ul className="mt-2 space-y-1">
                {day.tasks.map(
                  (
                    task: { task: string; estimatedTime: number },
                    taskIndex: number,
                  ) => (
                    <li key={taskIndex} className="text-sm text-gray-600">
                      • {task.task} ({task.estimatedTime}min)
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 