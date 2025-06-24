'use client';

import { useState } from 'react';
import { MealPlan } from '@/components/MealPlan';
import { addDays } from 'date-fns';

export default function MealPlanPage() {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(addDays(new Date(), 6)); // Default to 7 days
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);

  // Mock user ID - in a real app, this would come from authentication
  const userId = 'user123';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Smart Meal Planning</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="date"
              value={startDate.toISOString().split('T')[0]}
              onChange={(e) => setStartDate(new Date(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="date"
              value={endDate.toISOString().split('T')[0]}
              onChange={(e) => setEndDate(new Date(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Dietary Restrictions</label>
          <div className="flex flex-wrap gap-2">
            {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free'].map((restriction) => (
              <label key={restriction} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={dietaryRestrictions.includes(restriction)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setDietaryRestrictions([...dietaryRestrictions, restriction]);
                    } else {
                      setDietaryRestrictions(dietaryRestrictions.filter(r => r !== restriction));
                    }
                  }}
                  className="mr-2"
                />
                {restriction}
              </label>
            ))}
          </div>
        </div>
      </div>

      <MealPlan
        userId={userId}
        startDate={startDate}
        endDate={endDate}
        dietaryRestrictions={dietaryRestrictions}
      />
    </div>
  );
} 