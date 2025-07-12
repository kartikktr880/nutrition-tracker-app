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
  mealSizePreference: 'small' | 'medium' | 'large';
  additionalNotes?: string;
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

export interface MealPlanV2 {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  dailyCalories: number;
  macroRatios: MacroRatios;
  meals: Meal[];
  restrictions: DietaryRestrictions;
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

export interface NutritionalGoalsType {
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

export interface MacroRatios {
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutrientLimits {
  min: number;
  max: number;
  unit: string;
}

export interface NutrientGoals {
  [nutrient: string]: NutrientLimits;
}

export interface DietaryRestrictions {
  allergies: string[];
  intolerances: string[];
  preferences: string[];
  excludedFoods: string[];
}

export interface NutritionProgress {
  date: string;
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  nutrients: {
    [nutrient: string]: number;
  };
  water: number;
  compliance: number;
  notes?: string;
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  nutrients: {
    [nutrient: string]: number;
  };
  tags: string[];
  allergens?: string[];
  ingredients?: string[];
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: Array<{
    foodItem: FoodItem;
    quantity: number;
    unit: string;
  }>;
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  totalNutrition: {
    calories: number;
    macros: MacroRatios;
    nutrients: {
      [nutrient: string]: number;
    };
  };
  tags: string[];
  image?: string;
}

export interface UserNutritionProfile {
  id: string;
  goals: NutritionalGoalsType;
  restrictions: DietaryRestrictions;
  favoriteRecipes: string[];
  customFoods: FoodItem[];
  mealPlans: MealPlanV2[];
  progress: NutritionProgress[];
  settings: {
    measurementSystem: 'metric' | 'imperial';
    notifications: {
      mealReminders: boolean;
      waterReminders: boolean;
      progressUpdates: boolean;
    };
    privacySettings: {
      shareProgress: boolean;
      shareRecipes: boolean;
      publicProfile: boolean;
    };
  };
} 