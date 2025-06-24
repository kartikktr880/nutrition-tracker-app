export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: Ingredient[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  tags: string[];
  imageUrl?: string;
  nutritionalScore: number;
}

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  category: string;
}

export interface UserPreferences {
  dietaryRestrictions: string[];
  allergies: string[];
  favoriteFoods: string[];
  dislikedFoods: string[];
  mealTiming: {
    breakfast: string;
    lunch: string;
    dinner: string;
    snacks: string[];
  };
  cookingSkillLevel: 'beginner' | 'intermediate' | 'advanced';
  availableEquipment: string[];
  preferredCuisines: string[];
  spicePreference: 'mild' | 'medium' | 'spicy';
}

export interface NutritionalGoals {
  dailyCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  water: number;
  mealDistribution: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snacks: number;
  };
}

export interface MealPlan {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  meals: Meal[];
  nutritionalSummary: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    averageNutritionalScore: number;
  };
  preferences: UserPreferences;
  goals: NutritionalGoals;
}

export interface GroceryList {
  id: string;
  userId: string;
  items: GroceryItem[];
  totalEstimatedCost: number;
  storeCategories: {
    [category: string]: GroceryItem[];
  };
}

export interface GroceryItem {
  name: string;
  amount: number;
  unit: string;
  category: string;
  estimatedCost: number;
  storeSection: string;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

export interface MealPrepPlan {
  id: string;
  userId: string;
  meals: Meal[];
  prepSchedule: {
    day: string;
    tasks: PrepTask[];
  }[];
  totalPrepTime: number;
  storageInstructions: {
    [mealId: string]: string;
  };
}

export interface PrepTask {
  mealId: string;
  task: string;
  estimatedTime: number;
  priority: 'high' | 'medium' | 'low';
  dependencies?: string[];
} 