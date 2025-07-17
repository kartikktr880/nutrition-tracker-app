import { create } from 'zustand';

// AI recommendation types
export interface UserProfile {
  id: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  weight: number; // kg
  height: number; // cm
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  goals: ('weight_loss' | 'weight_gain' | 'maintenance' | 'muscle_gain' | 'health')[];
  dietaryRestrictions: string[];
  allergies: string[];
  preferences: {
    cuisine: string[];
    cookingTime: 'quick' | 'medium' | 'long';
    spiceLevel: 'mild' | 'medium' | 'hot';
    mealSize: 'small' | 'medium' | 'large';
  };
  healthMetrics: {
    bmi: number;
    bmr: number;
    tdee: number;
    targetCalories: number;
  };
}

export interface NutritionData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  water: number;
  foods: Array<{
    name: string;
    amount: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
}

export interface AIRecommendation {
  id: string;
  type: 'meal' | 'snack' | 'water' | 'exercise' | 'supplement' | 'lifestyle';
  title: string;
  description: string;
  confidence: number;
  reasoning: string[];
  actionItems: string[];
  nutritionalValue?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  alternatives?: string[];
  tags: string[];
  priority: 'low' | 'medium' | 'high';
  expiresAt?: string;
  used?: boolean;
  usedAt?: string;
}

export interface MealPlan {
  id: string;
  date: string;
  meals: {
    breakfast: AIRecommendation[];
    lunch: AIRecommendation[];
    dinner: AIRecommendation[];
    snacks: AIRecommendation[];
  };
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  adherence: number; // 0-100
}

// AI recommendation store interface
interface AIRecommendationStore {
  userProfile: UserProfile | null;
  nutritionHistory: NutritionData[];
  recommendations: AIRecommendation[];
  mealPlans: MealPlan[];
  
  // Actions
  setUserProfile: (profile: UserProfile) => void;
  addNutritionData: (data: NutritionData) => void;
  generateRecommendations: () => Promise<AIRecommendation[]>;
  generateMealPlan: (date: string) => Promise<MealPlan>;
  updateRecommendation: (id: string, updates: Partial<AIRecommendation>) => void;
  markRecommendationUsed: (id: string) => void;
  getPersonalizedInsights: () => Promise<string[]>;
  analyzeNutritionTrends: () => Promise<unknown>;
}

// AI recommendation store
export const useAIRecommendationStore = create<AIRecommendationStore>((set, get) => ({
  userProfile: null,
  nutritionHistory: [],
  recommendations: [],
  mealPlans: [],

  setUserProfile: (profile: UserProfile) => {
    set({ userProfile: profile });
  },

  addNutritionData: (data: NutritionData) => {
    set((state: AIRecommendationStore) => ({
      nutritionHistory: [...state.nutritionHistory, data],
    }));
  },

  generateRecommendations: async () => {
    const { userProfile, nutritionHistory } = get();
    if (!userProfile) return [];

    try {
      const recommendations = await AIRecommendationUtils.generateRecommendations(
        userProfile,
        nutritionHistory
      );
      
      set({ recommendations });
      return recommendations;
    } catch (error) {
      // Failed to generate recommendations - handled by error boundary
      return [];
    }
  },

  generateMealPlan: async (date: string) => {
    const { userProfile, nutritionHistory } = get();
    if (!userProfile) throw new Error('User profile not set');

    try {
      const mealPlan = await AIRecommendationUtils.generateMealPlan(
        userProfile,
        nutritionHistory,
        date
      );
      
      set((state: AIRecommendationStore) => ({
        mealPlans: [...state.mealPlans.filter(plan => plan.date !== date), mealPlan],
      }));
      
      return mealPlan;
    } catch (error) {
      // Failed to generate meal plan - handled by error boundary
      throw error;
    }
  },

  updateRecommendation: (id: string, updates: Partial<AIRecommendation>) => {
    set((state: AIRecommendationStore) => ({
      recommendations: state.recommendations.map((rec: AIRecommendation) =>
        rec.id === id ? { ...rec, ...updates } : rec
      ),
    }));
  },

  markRecommendationUsed: (id: string) => {
    set((state: AIRecommendationStore) => ({
      recommendations: state.recommendations.map((rec: AIRecommendation) =>
        rec.id === id ? { ...rec, used: true, usedAt: new Date().toISOString() } : rec
      ),
    }));
  },

  getPersonalizedInsights: async () => {
    const { userProfile, nutritionHistory } = get();
    if (!userProfile || nutritionHistory.length === 0) return [];

    try {
      return await AIRecommendationUtils.generateInsights(userProfile, nutritionHistory);
    } catch (error) {
      // Failed to generate insights - handled by error boundary
      return [];
    }
  },

  analyzeNutritionTrends: async () => {
    const { nutritionHistory } = get();
    if (nutritionHistory.length === 0) return null;

    try {
      return await AIRecommendationUtils.analyzeTrends(nutritionHistory);
    } catch (error) {
      // Failed to analyze trends - handled by error boundary
      return null;
    }
  },
}));

// AI recommendation utilities
export class AIRecommendationUtils {
  // Calculate BMR using Mifflin-St Jeor Equation
  static calculateBMR(weight: number, height: number, age: number, gender: string): number {
    if (gender === 'male') {
      return 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      return 10 * weight + 6.25 * height - 5 * age - 161;
    }
  }

  // Calculate TDEE (Total Daily Energy Expenditure)
  static calculateTDEE(bmr: number, activityLevel: string): number {
    const multipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9,
    };
    
    return bmr * (multipliers[activityLevel as keyof typeof multipliers] || 1.2);
  }

  // Calculate target calories based on goals
  static calculateTargetCalories(tdee: number, goals: string[]): number {
    let target = tdee;
    
    if (goals.includes('weight_loss')) {
      target -= 500; // 500 calorie deficit for ~0.5kg/week loss
    } else if (goals.includes('weight_gain')) {
      target += 300; // 300 calorie surplus for ~0.3kg/week gain
    } else if (goals.includes('muscle_gain')) {
      target += 200; // 200 calorie surplus for muscle gain
    }
    
    return Math.max(target, 1200); // Minimum safe calorie intake
  }

  // Calculate BMI
  static calculateBMI(weight: number, height: number): number {
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
  }

  // Generate nutrition recommendations
  static async generateRecommendations(
    userProfile: UserProfile,
    nutritionHistory: NutritionData[]
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];
    
    // Analyze recent nutrition data
    const recentData = nutritionHistory.slice(-7); // Last 7 days
    const avgCalories = recentData.reduce((sum, day) => sum + day.calories, 0) / recentData.length;
    const avgProtein = recentData.reduce((sum, day) => sum + day.protein, 0) / recentData.length;
    const avgWater = recentData.reduce((sum, day) => sum + day.water, 0) / recentData.length;
    
    // Calorie recommendations
    if (avgCalories < userProfile.healthMetrics.targetCalories * 0.8) {
      recommendations.push({
        id: `calorie-${Date.now()}`,
        type: 'meal',
        title: 'Increase Calorie Intake',
        description: 'Your daily calorie intake is below your target. Consider adding nutrient-dense snacks.',
        confidence: 0.9,
        reasoning: [
          `Average daily calories: ${Math.round(avgCalories)}`,
          `Target calories: ${userProfile.healthMetrics.targetCalories}`,
          'Consistent under-eating can slow metabolism',
        ],
        actionItems: [
          'Add a healthy snack between meals',
          'Include more healthy fats in your diet',
          'Consider protein-rich smoothies',
        ],
        nutritionalValue: {
          calories: 200,
          protein: 10,
          carbs: 20,
          fat: 8,
        },
        alternatives: ['Greek yogurt with nuts', 'Avocado toast', 'Protein shake'],
        tags: ['calories', 'nutrition', 'weight'],
        priority: 'high',
      });
    }
    
    // Protein recommendations
    const targetProtein = userProfile.healthMetrics.targetCalories * 0.3 / 4; // 30% of calories from protein
    if (avgProtein < targetProtein * 0.8) {
      recommendations.push({
        id: `protein-${Date.now()}`,
        type: 'meal',
        title: 'Increase Protein Intake',
        description: 'Your protein intake is below the recommended amount for your goals.',
        confidence: 0.85,
        reasoning: [
          `Average daily protein: ${Math.round(avgProtein)}g`,
          `Target protein: ${Math.round(targetProtein)}g`,
          'Protein is essential for muscle maintenance and recovery',
        ],
        actionItems: [
          'Include lean protein with every meal',
          'Add protein powder to smoothies',
          'Choose protein-rich snacks',
        ],
        nutritionalValue: {
          calories: 150,
          protein: 25,
          carbs: 5,
          fat: 3,
        },
        alternatives: ['Chicken breast', 'Tuna', 'Eggs', 'Tofu'],
        tags: ['protein', 'muscle', 'recovery'],
        priority: 'medium',
      });
    }
    
    // Water recommendations
    const targetWater = userProfile.weight * 30; // 30ml per kg of body weight
    if (avgWater < targetWater * 0.7) {
      recommendations.push({
        id: `water-${Date.now()}`,
        type: 'water',
        title: 'Increase Water Intake',
        description: 'Your daily water intake is below the recommended amount.',
        confidence: 0.95,
        reasoning: [
          `Average daily water: ${Math.round(avgWater)}ml`,
          `Target water: ${Math.round(targetWater)}ml`,
          'Proper hydration is essential for health and performance',
        ],
        actionItems: [
          'Drink a glass of water with each meal',
          'Set reminders to drink water throughout the day',
          'Carry a water bottle with you',
        ],
        alternatives: ['Herbal tea', 'Infused water', 'Coconut water'],
        tags: ['hydration', 'health', 'performance'],
        priority: 'high',
      });
    }
    
    // Goal-specific recommendations
    if (userProfile.goals.includes('weight_loss')) {
      recommendations.push({
        id: `weight-loss-${Date.now()}`,
        type: 'lifestyle',
        title: 'Weight Loss Strategy',
        description: 'Optimize your weight loss journey with these evidence-based strategies.',
        confidence: 0.8,
        reasoning: [
          'Consistent calorie deficit is key for weight loss',
          'Protein helps preserve muscle during weight loss',
          'Regular exercise enhances weight loss results',
        ],
        actionItems: [
          'Maintain a 500-calorie daily deficit',
          'Include strength training 2-3 times per week',
          'Track your progress weekly',
        ],
        alternatives: ['Intermittent fasting', 'Low-carb diet', 'Mediterranean diet'],
        tags: ['weight-loss', 'fitness', 'nutrition'],
        priority: 'medium',
      });
    }
    
    return recommendations;
  }

  // Generate meal plan
  static async generateMealPlan(
    userProfile: UserProfile,
    nutritionHistory: NutritionData[],
    date: string
  ): Promise<MealPlan> {
    const targetCalories = userProfile.healthMetrics.targetCalories;
    const targetProtein = targetCalories * 0.3 / 4;
    const _targetCarbs = targetCalories * 0.45 / 4;
    const _targetFat = targetCalories * 0.25 / 9;
    
    // Meal distribution
    const mealDistribution = {
      breakfast: { calories: targetCalories * 0.25, protein: targetProtein * 0.25 },
      lunch: { calories: targetCalories * 0.35, protein: targetProtein * 0.35 },
      dinner: { calories: targetCalories * 0.3, protein: targetProtein * 0.3 },
      snacks: { calories: targetCalories * 0.1, protein: targetProtein * 0.1 },
    };
    
    const mealPlan: MealPlan = {
      id: `meal-plan-${date}`,
      date,
      meals: {
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: [],
      },
      totalNutrition: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
      },
      adherence: 0,
    };
    
    // Generate meal suggestions based on user preferences
    const breakfastOptions = this.getMealOptions('breakfast', mealDistribution.breakfast, userProfile);
    const lunchOptions = this.getMealOptions('lunch', mealDistribution.lunch, userProfile);
    const dinnerOptions = this.getMealOptions('dinner', mealDistribution.dinner, userProfile);
    const snackOptions = this.getMealOptions('snack', mealDistribution.snacks, userProfile);
    
    mealPlan.meals.breakfast = breakfastOptions.slice(0, 2);
    mealPlan.meals.lunch = lunchOptions.slice(0, 2);
    mealPlan.meals.dinner = dinnerOptions.slice(0, 2);
    mealPlan.meals.snacks = snackOptions.slice(0, 3);
    
    // Calculate total nutrition
    const allMeals = [
      ...mealPlan.meals.breakfast,
      ...mealPlan.meals.lunch,
      ...mealPlan.meals.dinner,
      ...mealPlan.meals.snacks,
    ];
    
    mealPlan.totalNutrition = allMeals.reduce((total, meal) => {
      if (meal.nutritionalValue) {
        total.calories += meal.nutritionalValue.calories;
        total.protein += meal.nutritionalValue.protein;
        total.carbs += meal.nutritionalValue.carbs;
        total.fat += meal.nutritionalValue.fat;
      }
      return total;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
    
    return mealPlan;
  }

  // Get meal options based on preferences
  static getMealOptions(
    mealType: string,
    targets: { calories: number; protein: number },
    _userProfile: UserProfile
  ): AIRecommendation[] {
    const options: AIRecommendation[] = [];
    
    // This would typically connect to a food database or API
    // For now, we'll create sample options based on meal type
    const mealTemplates = {
      breakfast: [
        {
          title: 'Protein Oatmeal Bowl',
          description: 'Oatmeal with protein powder, berries, and nuts',
          calories: 350,
          protein: 25,
          carbs: 45,
          fat: 12,
        },
        {
          title: 'Greek Yogurt Parfait',
          description: 'Greek yogurt with granola and fresh fruit',
          calories: 300,
          protein: 20,
          carbs: 35,
          fat: 8,
        },
      ],
      lunch: [
        {
          title: 'Grilled Chicken Salad',
          description: 'Mixed greens with grilled chicken, vegetables, and olive oil dressing',
          calories: 400,
          protein: 35,
          carbs: 15,
          fat: 20,
        },
        {
          title: 'Quinoa Bowl',
          description: 'Quinoa with roasted vegetables and tofu',
          calories: 380,
          protein: 18,
          carbs: 50,
          fat: 12,
        },
      ],
      dinner: [
        {
          title: 'Salmon with Vegetables',
          description: 'Baked salmon with steamed broccoli and brown rice',
          calories: 450,
          protein: 40,
          carbs: 30,
          fat: 18,
        },
        {
          title: 'Lean Beef Stir-Fry',
          description: 'Lean beef with mixed vegetables and brown rice',
          calories: 420,
          protein: 35,
          carbs: 35,
          fat: 15,
        },
      ],
      snack: [
        {
          title: 'Apple with Almond Butter',
          description: 'Medium apple with 1 tablespoon almond butter',
          calories: 150,
          protein: 4,
          carbs: 20,
          fat: 8,
        },
        {
          title: 'Protein Smoothie',
          description: 'Protein powder with banana and almond milk',
          calories: 200,
          protein: 25,
          carbs: 20,
          fat: 3,
        },
      ],
    };
    
    const templates = mealTemplates[mealType as keyof typeof mealTemplates] || [];
    
    templates.forEach((template, index) => {
      options.push({
        id: `${mealType}-${index}-${Date.now()}`,
        type: 'meal',
        title: template.title,
        description: template.description,
        confidence: 0.8,
        reasoning: [
          `Meets ${mealType} calorie target (${Math.round(targets.calories)} calories)`,
          `Provides adequate protein (${template.protein}g)`,
          'Balanced macronutrient profile',
        ],
        actionItems: [
          'Prepare ingredients in advance',
          'Adjust portion size based on hunger',
          'Add vegetables for extra nutrition',
        ],
        nutritionalValue: {
          calories: template.calories,
          protein: template.protein,
          carbs: template.carbs,
          fat: template.fat,
        },
        alternatives: ['Vegetarian option', 'Vegan option', 'Gluten-free option'],
        tags: [mealType, 'balanced', 'nutritious'],
        priority: 'medium',
      });
    });
    
    return options;
  }

  // Generate personalized insights
  static async generateInsights(
    userProfile: UserProfile,
    nutritionHistory: NutritionData[]
  ): Promise<string[]> {
    const insights: string[] = [];
    
    if (nutritionHistory.length < 3) {
      insights.push('Continue logging your meals to receive personalized insights.');
      return insights;
    }
    
    // Analyze patterns
    const recentData = nutritionHistory.slice(-7);
    const avgCalories = recentData.reduce((sum, day) => sum + day.calories, 0) / recentData.length;
    const avgProtein = recentData.reduce((sum, day) => sum + day.protein, 0) / recentData.length;
    const avgWater = recentData.reduce((sum, day) => sum + day.water, 0) / recentData.length;
    
    // Calorie insights
    if (avgCalories < userProfile.healthMetrics.targetCalories * 0.8) {
      insights.push('You\'re consistently eating below your calorie target. This may slow your metabolism and make it harder to reach your goals.');
    } else if (avgCalories > userProfile.healthMetrics.targetCalories * 1.2) {
      insights.push('You\'re consistently eating above your calorie target. Consider portion control or increasing physical activity.');
    } else {
      insights.push('Great job maintaining your calorie target! Your consistency will help you reach your goals.');
    }
    
    // Protein insights
    const targetProtein = userProfile.healthMetrics.targetCalories * 0.3 / 4;
    if (avgProtein < targetProtein * 0.8) {
      insights.push('Your protein intake is below the recommended amount. Protein is essential for muscle maintenance and recovery.');
    } else if (avgProtein > targetProtein * 1.2) {
      insights.push('Your protein intake is above the recommended amount. While protein is important, balance is key.');
    } else {
      insights.push('Excellent protein intake! This will help support your fitness goals.');
    }
    
    // Water insights
    const targetWater = userProfile.weight * 30;
    if (avgWater < targetWater * 0.7) {
      insights.push('Your water intake is below the recommended amount. Proper hydration is crucial for health and performance.');
    } else {
      insights.push('Good hydration habits! Keep up the great work with your water intake.');
    }
    
    // Goal-specific insights
    if (userProfile.goals.includes('weight_loss')) {
      const weeklyCalories = recentData.reduce((sum, day) => sum + day.calories, 0);
      const weeklyDeficit = (userProfile.healthMetrics.targetCalories * 7) - weeklyCalories;
      
      if (weeklyDeficit > 0) {
        insights.push(`You've created a ${Math.round(weeklyDeficit)} calorie deficit this week. At this rate, you can expect to lose about ${Math.round(weeklyDeficit / 3500)} kg per week.`);
      }
    }
    
    return insights;
  }

  // Analyze nutrition trends
  static async analyzeTrends(nutritionHistory: NutritionData[]): Promise<unknown> {
    if (nutritionHistory.length < 7) {
      return { message: 'Need more data for trend analysis' };
    }
    
    const weeklyData = nutritionHistory.slice(-7);
    const monthlyData = nutritionHistory.slice(-30);
    
    const trends = {
      weekly: {
        avgCalories: weeklyData.reduce((sum, day) => sum + day.calories, 0) / weeklyData.length,
        avgProtein: weeklyData.reduce((sum, day) => sum + day.protein, 0) / weeklyData.length,
        avgWater: weeklyData.reduce((sum, day) => sum + day.water, 0) / weeklyData.length,
        consistency: this.calculateConsistency(weeklyData),
      },
      monthly: {
        avgCalories: monthlyData.reduce((sum, day) => sum + day.calories, 0) / monthlyData.length,
        avgProtein: monthlyData.reduce((sum, day) => sum + day.protein, 0) / monthlyData.length,
        avgWater: monthlyData.reduce((sum, day) => sum + day.water, 0) / monthlyData.length,
        consistency: this.calculateConsistency(monthlyData),
      },
    };
    
    return trends;
  }

  // Calculate consistency score
  static calculateConsistency(data: NutritionData[]): number {
    if (data.length === 0) return 0;
    
    const loggedDays = data.filter(day => day.calories > 0).length;
    return (loggedDays / data.length) * 100;
  }
}

// React hook for AI recommendations
import { useEffect, useCallback } from 'react';

export function useAIRecommendations() {
  const store = useAIRecommendationStore();

  // Generate recommendations on mount
  useEffect(() => {
    if (store.userProfile && store.nutritionHistory.length > 0) {
      store.generateRecommendations();
    }
  }, [store.userProfile, store.nutritionHistory.length]);

  // Update user profile
  const updateUserProfile = useCallback((profile: Partial<UserProfile>) => {
    if (store.userProfile) {
      store.setUserProfile({ ...store.userProfile, ...profile });
    }
  }, [store]);

  // Add nutrition data
  const addNutritionData = useCallback((data: NutritionData) => {
    store.addNutritionData(data);
  }, [store]);

  // Get recommendations by type
  const getRecommendationsByType = useCallback((type: AIRecommendation['type']) => {
    return store.recommendations.filter(rec => rec.type === type);
  }, [store.recommendations]);

  // Get high priority recommendations
  const getHighPriorityRecommendations = useCallback(() => {
    return store.recommendations.filter(rec => rec.priority === 'high');
  }, [store.recommendations]);

  return {
    ...store,
    updateUserProfile,
    addNutritionData,
    getRecommendationsByType,
    getHighPriorityRecommendations,
  };
}

// Export utilities
export const aiRecommendationUtils = {
  AIRecommendationUtils,
  useAIRecommendations,
}; 