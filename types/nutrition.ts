// Basic nutrition types
export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionInfo {
  calories: number;
  macros: Macros;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

// Food entry types
export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  date: string;
  quantity: number;
  unit: string;
  createdAt?: string;
  updatedAt?: string;
}

// Redefined FoodItem to be the source of truth
export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  servingSize: number;
  servingUnit: string;
  nutrition: NutritionInfo;
  tags: string[];
  allergens?: string[];
  ingredients?: string[];
  isCustom?: boolean;
}

// Meal plan types
export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  quantity: number;
  unit: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Updated meal plan structure (V2)
export interface MealPlanV2 {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  dailyCalories: number;
  macroRatios: {
    protein: number;
    carbs: number;
    fat: number;
  };
  dietaryRestrictions: string[];
  meals: Meal[];
  createdAt?: string;
  updatedAt?: string;
}

// Legacy meal plan structure (V1) - kept for backward compatibility
export interface MealPlan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  dailyCalories: number;
  macroRatios: {
    protein: number;
    carbs: number;
    fat: number;
  };
  restrictions: {
    allergies: string[];
    intolerances: string[];
    preferences: string[];
    excludedFoods: string[];
  };
  meals: {
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    ingredients: {
      name: string;
      amount: number;
      unit: string;
      category: string;
    }[];
    instructions: string;
    prepTime: number;
    cookTime: number;
    servings: number;
    tags: string[];
    nutritionalScore: number;
  }[];
}

// Meal Prep Plan types
export interface MealPrepTask {
  task: string;
  estimatedTime: number; // in minutes
}

export interface MealPrepDay {
  day: string;
  tasks: MealPrepTask[];
}

export interface MealPrepPlan {
  id: string;
  meals: {
    id: string;
    name: string;
    prepTime: number;
    cookTime: number;
    servings: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    ingredients: { name: string; amount: number; unit: string }[];
    instructions: string[];
  }[];
  prepSchedule: MealPrepDay[];
}

// Recipe types
export interface Recipe {
  id: string;
  name: string;
  description?: string;
  ingredients: {
    foodItem: FoodItem; // Use the unified FoodItem type
    quantity: number;
    unit: string;
  }[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  tags: string[];
  totalNutrition: NutritionInfo;
  image?: string;
  source?: string;
  createdAt: string;
  updatedAt?: string;
}

// Nutrient tracking types
export interface DailyNutrition {
  date: string;
  totalCalories: number;
  macros: Macros;
  micronutrients?: {
    [key: string]: number;
  };
  entries: FoodEntry[];
}

// Goal types
export interface NutritionGoal {
  id: string;
  name: string;
  type: 'weight' | 'macros' | 'calories';
  target: number | Macros;
  startDate: string;
  endDate?: string;
  progress: {
    date: string;
    value: number | Macros;
  }[];
  status: 'active' | 'completed' | 'abandoned';
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

// Progress tracking types
export interface WeightEntry {
  date: string;
  weight: number;
  unit: 'kg' | 'lb';
  notes?: string;
}

export interface BodyMeasurement {
  date: string;
  measurements: {
    [key: string]: number; // e.g., chest, waist, hips, etc.
  };
  unit: 'cm' | 'in';
  notes?: string;
}

// User Preferences type for user settings/preferences UI
export interface UserPreferences {
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  dairyFree?: boolean;
  nutFree?: boolean;
  preferredCuisines?: string[];
  mealSizePreference?: 'small' | 'medium' | 'large';
  cookingSkillLevel?: 'beginner' | 'intermediate' | 'advanced';
  additionalNotes?: string;
}

// Grocery List types
export interface GroceryItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  category: string;
  estimatedCost: number;
  storeSection: string;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  checked?: boolean;
}

export interface GroceryList {
  id: string;
  items: GroceryItem[];
  totalEstimatedCost: number;
  storeCategories: Record<string, GroceryItem[]>;
  createdAt?: string;
  updatedAt?: string;
} 