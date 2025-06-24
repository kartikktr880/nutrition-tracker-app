export interface MealRecommendation {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  reason: string;
}

export interface UserPreferences {
  dietaryRestrictions: string[];
  favoriteFoods: string[];
  dislikedFoods: string[];
  allergies: string[];
}

export interface NutritionalNeeds {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealPattern {
  mealType: string;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  timeOfDay: number;
}

export interface RecommendationRule {
  pattern: MealPattern;
  weight: number;
}

export interface AIModel {
  type: string;
  rules: RecommendationRule[];
} 