export {};
import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { MealPlan } from '../../components/MealPlan';
import { GroceryList } from '../../components/GroceryList';
import { MealPrepPlan } from '../../components/MealPrepPlan';
import { UserPreferences } from '../../components/UserPreferences';
import { NutritionalGoals } from '../../components/NutritionalGoals';

export default function MealPlanningPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('meal-plan');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  if (!session) {
    return <div>Please sign in to access meal planning features.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Meal Planning</h1>

      <div className="mb-8">
        <div className="flex space-x-4 border-b">
          <button
            className={`px-4 py-2 ${
              activeTab === 'meal-plan' ? 'border-b-2 border-blue-500' : ''
            }`}
            onClick={() => setActiveTab('meal-plan')}
          >
            Meal Plan
          </button>
          <button
            className={`px-4 py-2 ${
              activeTab === 'grocery-list' ? 'border-b-2 border-blue-500' : ''
            }`}
            onClick={() => setActiveTab('grocery-list')}
          >
            Grocery List
          </button>
          <button
            className={`px-4 py-2 ${
              activeTab === 'meal-prep' ? 'border-b-2 border-blue-500' : ''
            }`}
            onClick={() => setActiveTab('meal-prep')}
          >
            Meal Prep
          </button>
          <button
            className={`px-4 py-2 ${
              activeTab === 'preferences' ? 'border-b-2 border-blue-500' : ''
            }`}
            onClick={() => setActiveTab('preferences')}
          >
            Preferences
          </button>
          <button
            className={`px-4 py-2 ${
              activeTab === 'goals' ? 'border-b-2 border-blue-500' : ''
            }`}
            onClick={() => setActiveTab('goals')}
          >
            Goals
          </button>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={startDate.toISOString().split('T')[0]}
              onChange={(e) => setStartDate(new Date(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              value={endDate.toISOString().split('T')[0]}
              onChange={(e) => setEndDate(new Date(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div>
        {activeTab === 'meal-plan' && (
          <MealPlan
            userId={session.user?.id || 'unknown-user'}
            startDate={startDate}
            endDate={endDate}
          />
        )}
        {activeTab === 'grocery-list' && (
          <GroceryList userId={session.user?.id || 'unknown-user'} />
        )}
        {activeTab === 'meal-prep' && (
          <MealPrepPlan userId={session.user?.id || 'unknown-user'} />
        )}
        {activeTab === 'preferences' && (
          <UserPreferences userId={session.user?.id || 'unknown-user'} />
        )}
        {activeTab === 'goals' && (
          <NutritionalGoals userId={session.user?.id || 'unknown-user'} />
        )}
      </div>
    </div>
  );
} 