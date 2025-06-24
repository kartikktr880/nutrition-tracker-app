import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { MealPlan, NutritionalGoals, UserPreferences } from '@/types/meal-plan';

interface SmartMealPlannerProps {
  onPlanGenerated: (plan: MealPlan) => void;
}

export const SmartMealPlanner: React.FC<SmartMealPlannerProps> = ({ onPlanGenerated }) => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    dietaryRestrictions: [],
    allergies: [],
    cuisinePreferences: [],
    mealTiming: {},
    calorieGoals: 2000,
  });
  const [nutritionalGoals, setNutritionalGoals] = useState<NutritionalGoals>({
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0,
  });

  const generateMealPlan = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/meal-plan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences,
          nutritionalGoals,
          userId: session?.user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate meal plan');
      }

      const plan = await response.json();
      onPlanGenerated(plan);
    } catch (error) {
      console.error('Error generating meal plan:', error);
      // Handle error appropriately
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-white rounded-lg shadow-lg"
    >
      <h2 className="text-2xl font-bold mb-6">Smart Meal Planner</h2>
      
      {/* Preferences Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Your Preferences</h3>
        {/* Add preference inputs here */}
      </div>

      {/* Nutritional Goals Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Nutritional Goals</h3>
        {/* Add nutritional goal inputs here */}
      </div>

      <button
        onClick={generateMealPlan}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
      >
        {loading ? 'Generating Plan...' : 'Generate Smart Meal Plan'}
      </button>
    </motion.div>
  );
}; 