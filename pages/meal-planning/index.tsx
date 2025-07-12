import Head from 'next/head';
import React from 'react';

import SmartMealPlanner from '../../app/meal-plan/components/SmartMealPlanner';

const MealPlanningPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Meal Planning - Nutrition Tracker</title>
        <meta name="description" content="Plan your meals with AI assistance" />
      </Head>
      <div className="meal-planning-page">
        <h1>Smart Meal Planner</h1>
        <SmartMealPlanner />
      </div>
    </>
  );
};

export default MealPlanningPage; 