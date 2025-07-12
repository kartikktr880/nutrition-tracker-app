export interface UserData {
  userId: string;
  profile: Record<string, unknown>;
  nutritionData: Record<string, unknown>[];
  preferences: Record<string, unknown>;
  exportDate: Date;
}

export const exportUserData = async (userId: string): Promise<UserData> => {
  // Mock implementation - replace with actual data export logic
  return {
    userId,
    profile: {
      name: 'User',
      email: 'user@example.com',
      preferences: {}
    },
    nutritionData: [
      {
        date: new Date(),
        calories: 1850,
        protein: 120,
        carbs: 200,
        fat: 65
      }
    ],
    preferences: {
      dietaryRestrictions: [],
      calorieGoal: 2000,
      proteinGoal: 150
    },
    exportDate: new Date()
  };
}; 