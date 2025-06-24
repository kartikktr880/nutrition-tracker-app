import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Meal {
  type: string;
  meal: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  score: number;
  reason: string;
}

interface MealPlanDay {
  date: Date;
  meals: Meal[];
}

interface MealPlanProps {
  userId: string;
  startDate: Date;
  endDate: Date;
  dietaryRestrictions?: string[];
}

export const MealPlan: React.FC<MealPlanProps> = ({
  userId,
  startDate,
  endDate,
  dietaryRestrictions
}) => {
  const [mealPlan, setMealPlan] = useState<MealPlanDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMealPlan = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/meal-plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            dietaryRestrictions
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch meal plan');
        }

        const data = await response.json();
        setMealPlan(data.mealPlan);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchMealPlan();
  }, [userId, startDate, endDate, dietaryRestrictions]);

  const saveMealPlan = async () => {
    try {
      const response = await fetch('/api/meal-plan', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          mealPlan
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save meal plan');
      }

      alert('Meal plan saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save meal plan');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Meal Plan</h2>
        <button
          onClick={saveMealPlan}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Save Meal Plan
        </button>
      </div>

      <div className="space-y-6">
        {mealPlan.map((day) => (
          <div key={day.date.toISOString()} className="border rounded-lg p-4">
            <h3 className="text-xl font-semibold mb-4">
              {format(day.date, 'EEEE, MMMM d, yyyy')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {day.meals.map((meal) => (
                <div key={meal.type} className="border rounded p-4">
                  <h4 className="font-medium capitalize mb-2">{meal.type}</h4>
                  <div className="space-y-2">
                    <p className="font-semibold">{meal.meal.name}</p>
                    <div className="text-sm text-gray-600">
                      <p>Calories: {meal.meal.calories}</p>
                      <p>Protein: {meal.meal.protein}g</p>
                      <p>Carbs: {meal.meal.carbs}g</p>
                      <p>Fat: {meal.meal.fat}g</p>
                    </div>
                    <p className="text-sm text-blue-600">{meal.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 