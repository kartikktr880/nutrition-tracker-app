export interface MealPlanPreferences {
  dietaryRestrictions: string[];
  calorieGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
}

export interface MealPlanGoals {
  weightGoal: 'lose' | 'maintain' | 'gain';
  activityLevel: 'low' | 'moderate' | 'high';
  targetWeight?: number;
}

export interface MealPlanRestrictions {
  allergies: string[];
  intolerances: string[];
  preferences: string[];
}

export interface MealPlan {
  id: string;
  userId: string;
  meals: Meal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  createdAt: Date;
}

export interface Meal {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  instructions: string[];
}

export const generateMealPlan = async (params: {
  preferences: MealPlanPreferences;
  goals: MealPlanGoals;
  restrictions: MealPlanRestrictions;
}): Promise<MealPlan> => {
  // Mock implementation - replace with actual AI meal planning logic
  return {
    id: '1',
    userId: 'user1',
    meals: [
      {
        id: '1',
        name: 'Protein Oatmeal Bowl',
        type: 'breakfast',
        calories: 350,
        protein: 25,
        carbs: 45,
        fat: 12,
        ingredients: ['oats', 'protein powder', 'berries', 'nuts'],
        instructions: ['Mix oats with water', 'Add protein powder', 'Top with berries and nuts']
      },
      {
        id: '2',
        name: 'Grilled Chicken Salad',
        type: 'lunch',
        calories: 450,
        protein: 35,
        carbs: 15,
        fat: 25,
        ingredients: ['chicken breast', 'mixed greens', 'olive oil', 'vegetables'],
        instructions: ['Grill chicken', 'Mix salad', 'Add dressing']
      }
    ],
    totalCalories: 800,
    totalProtein: 60,
    totalCarbs: 60,
    totalFat: 37,
    createdAt: new Date()
  };
}; 