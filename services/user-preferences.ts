export interface UserPreferences {
  id: string;
  userId: string;
  dietaryRestrictions: string[];
  allergies: string[];
  intolerances: string[];
  preferredCuisines: string[];
  calorieGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
  mealPrepTime: number; // in minutes
  cookingSkill: 'beginner' | 'intermediate' | 'advanced';
  budget: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

export const getUserPreferences = async (userId: string): Promise<UserPreferences> => {
  // Mock implementation - replace with actual API call
  return {
    id: '1',
    userId,
    dietaryRestrictions: ['vegetarian'],
    allergies: ['nuts'],
    intolerances: ['lactose'],
    preferredCuisines: ['mediterranean', 'asian'],
    calorieGoal: 2000,
    proteinGoal: 150,
    carbGoal: 250,
    fatGoal: 70,
    mealPrepTime: 30,
    cookingSkill: 'intermediate',
    budget: 'medium',
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

export const updateUserPreferences = async (userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> => {
  // Mock implementation - replace with actual API call
  const currentPreferences = await getUserPreferences(userId);
  return {
    ...currentPreferences,
    ...preferences,
    updatedAt: new Date()
  };
}; 