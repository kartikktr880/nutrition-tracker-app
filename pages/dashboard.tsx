import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import MealRecommendations from '@/components/MealRecommendations';

const Dashboard = () => {
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Recommended Meals
      </Typography>
      <Tabs
        value={selectedMealType}
        onChange={(_, newValue) => setSelectedMealType(newValue)}
        sx={{ mb: 2 }}
      >
        <Tab label="Breakfast" value="breakfast" />
        <Tab label="Lunch" value="lunch" />
        <Tab label="Dinner" value="dinner" />
        <Tab label="Snacks" value="snack" />
      </Tabs>
      <MealRecommendations 
        mealType={selectedMealType}
        onSelect={(meal) => {
          // Handle meal selection - you can add this to the user's meal plan
          console.log('Selected meal:', meal);
        }}
      />
    </Box>
  );
};

export default Dashboard; 