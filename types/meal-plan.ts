export interface UserPreferences {
  dietaryRestrictions: string[];
  allergies: string[];
  cuisinePreferences: string[];
  mealTiming: {
    [key: string]: string; // meal type -> time
  };
  calorieGoals: number;
}

export interface NutritionalGoals {
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}

export interface Meal {
  id: string;
  name: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string[];
  nutritionalInfo: NutritionalInfo;
  prepTime: number;
  cookTime: number;
  servings: number;
  tags: string[];
  imageUrl?: string;
}

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  nutritionalInfo: NutritionalInfo;
}

export interface NutritionalInfo {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export interface MealPlan {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  meals: {
    [key: string]: Meal[]; // date -> meals
  };
  nutritionalGoals: NutritionalGoals;
  preferences: UserPreferences;
  totalNutritionalInfo: NutritionalInfo;
  createdAt: Date;
  updatedAt: Date;
} 