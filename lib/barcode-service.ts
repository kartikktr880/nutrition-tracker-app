import { foodDatabase } from './foodDatabase';

interface BarcodeResult {
  success: boolean;
  data?: {
    name: string;
    brand: string;
    nutrition: any;
  };
  error?: string;
}

interface BarcodeHistoryItem {
  barcode: string;
  timestamp: number;
  data: BarcodeResult['data'];
}

interface BarcodeFavoriteItem {
  barcode: string;
  addedAt: number;
  data: BarcodeResult['data'];
}

interface TimeBasedUsage {
  hour: number;
  count: number;
}

interface SmartSuggestion {
  item: BarcodeHistoryItem;
  score: number;
  reason: string;
}

interface MealPlanItem {
  barcode: string;
  timestamp: number;
  data: BarcodeResult['data'];
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  plannedDate: number;
}

interface MealPlanSuggestion {
  item: BarcodeHistoryItem;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  reason: string;
  score: number;
}

interface NutritionalGoal {
  calories: { target: number; min: number; max: number };
  protein: { target: number; min: number; max: number };
  carbs: { target: number; min: number; max: number };
  fat: { target: number; min: number; max: number };
}

interface GoalProgress {
  date: number;
  actual: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  goal: NutritionalGoal;
  progress: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  status: 'under' | 'on-track' | 'over';
}

interface DietaryPreference {
  restrictions: string[];
  allergies: string[];
  culturalPreferences: string[];
  seasonalPreferences: boolean;
}

interface MealVarietyScore {
  item: BarcodeHistoryItem;
  score: number;
  reason: string;
}

interface GroceryItem {
  barcode: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  estimatedPrice?: number;
  lastPurchased?: number;
  frequency: number;
  priority: 'high' | 'medium' | 'low';
}

interface SmartGroceryList {
  items: GroceryItem[];
  totalEstimatedCost: number;
  categories: {
    [key: string]: {
      items: GroceryItem[];
      totalCost: number;
    };
  };
  lastUpdated: number;
}

interface MealPrepStep {
  order: number;
  description: string;
  duration: number; // in minutes
  equipment?: string[];
  tips?: string[];
}

interface MealPrepInstructions {
  totalTime: number; // in minutes
  prepTime: number; // in minutes
  cookTime: number; // in minutes
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  steps: MealPrepStep[];
  equipment: string[];
  storage: {
    refrigerator: number; // days
    freezer: number; // days
  };
  reheating: string[];
}

interface MealPrepTemplate {
  id: string;
  name: string;
  instructions: MealPrepInstructions;
  ingredients: {
    name: string;
    amount: number;
    unit: string;
  }[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

class BarcodeService {
  private static instance: BarcodeService;
  private cache: Map<string, { data: BarcodeResult['data']; timestamp: number }>;
  private history: BarcodeHistoryItem[];
  private favorites: BarcodeFavoriteItem[];
  private mealPlans: MealPlanItem[];
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_HISTORY_ITEMS = 50;
  private readonly MAX_FAVORITES = 100;
  private readonly MAX_SUGGESTIONS = 5;
  private readonly MAX_MEAL_PLANS = 100;
  private nutritionalGoals: NutritionalGoal;
  private goalProgress: GoalProgress[];
  private dietaryPreferences: DietaryPreference;
  private groceryList: GroceryItem[];
  private readonly MAX_GROCERY_ITEMS = 100;
  private readonly CATEGORIES = [
    'Produce',
    'Dairy',
    'Meat',
    'Bakery',
    'Frozen',
    'Canned',
    'Snacks',
    'Beverages',
    'Household',
    'Other'
  ];
  private mealPrepTemplates: { [key: string]: MealPrepTemplate } = {};

  private constructor() {
    this.cache = new Map();
    this.history = this.loadHistory();
    this.favorites = this.loadFavorites();
    this.mealPlans = this.loadMealPlans();
    this.nutritionalGoals = this.loadNutritionalGoals();
    this.goalProgress = this.loadGoalProgress();
    this.dietaryPreferences = this.loadDietaryPreferences();
    this.groceryList = this.loadGroceryList();
    this.loadMealPrepTemplates();
  }

  public static getInstance(): BarcodeService {
    if (!BarcodeService.instance) {
      BarcodeService.instance = new BarcodeService();
    }
    return BarcodeService.instance;
  }

  private loadHistory(): BarcodeHistoryItem[] {
    try {
      const stored = localStorage.getItem('barcodeHistory');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private loadFavorites(): BarcodeFavoriteItem[] {
    try {
      const stored = localStorage.getItem('barcodeFavorites');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private loadMealPlans(): MealPlanItem[] {
    try {
      const stored = localStorage.getItem('barcodeMealPlans');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private loadNutritionalGoals(): NutritionalGoal {
    try {
      const stored = localStorage.getItem('nutritionalGoals');
      return stored ? JSON.parse(stored) : {
        calories: { target: 2000, min: 1500, max: 2500 },
        protein: { target: 100, min: 50, max: 150 },
        carbs: { target: 250, min: 150, max: 300 },
        fat: { target: 65, min: 40, max: 80 }
      };
    } catch {
      return {
        calories: { target: 2000, min: 1500, max: 2500 },
        protein: { target: 100, min: 50, max: 150 },
        carbs: { target: 250, min: 150, max: 300 },
        fat: { target: 65, min: 40, max: 80 }
      };
    }
  }

  private loadGoalProgress(): GoalProgress[] {
    try {
      const stored = localStorage.getItem('goalProgress');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private loadDietaryPreferences(): DietaryPreference {
    try {
      const stored = localStorage.getItem('dietaryPreferences');
      return stored ? JSON.parse(stored) : {
        restrictions: [],
        allergies: [],
        culturalPreferences: [],
        seasonalPreferences: true
      };
    } catch (error) {
      console.error('Error loading dietary preferences:', error);
      return {
        restrictions: [],
        allergies: [],
        culturalPreferences: [],
        seasonalPreferences: true
      };
    }
  }

  private loadGroceryList(): GroceryItem[] {
    try {
      const stored = localStorage.getItem('groceryList');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading grocery list:', error);
      return [];
    }
  }

  private loadMealPrepTemplates() {
    try {
      const templates = localStorage.getItem('mealPrepTemplates');
      if (templates) {
        this.mealPrepTemplates = JSON.parse(templates);
      }
    } catch (error) {
      console.error('Error loading meal prep templates:', error);
    }
  }

  private saveHistory() {
    try {
      localStorage.setItem('barcodeHistory', JSON.stringify(this.history));
    } catch (error) {
      console.error('Failed to save barcode history:', error);
    }
  }

  private saveFavorites() {
    try {
      localStorage.setItem('barcodeFavorites', JSON.stringify(this.favorites));
    } catch (error) {
      console.error('Failed to save barcode favorites:', error);
    }
  }

  private saveMealPlans() {
    try {
      localStorage.setItem('barcodeMealPlans', JSON.stringify(this.mealPlans));
    } catch (error) {
      console.error('Failed to save meal plans:', error);
    }
  }

  private saveNutritionalGoals() {
    try {
      localStorage.setItem('nutritionalGoals', JSON.stringify(this.nutritionalGoals));
    } catch (error) {
      console.error('Failed to save nutritional goals:', error);
    }
  }

  private saveGoalProgress() {
    try {
      localStorage.setItem('goalProgress', JSON.stringify(this.goalProgress));
    } catch (error) {
      console.error('Failed to save goal progress:', error);
    }
  }

  private saveDietaryPreferences() {
    try {
      localStorage.setItem('dietaryPreferences', JSON.stringify(this.dietaryPreferences));
    } catch (error) {
      console.error('Error saving dietary preferences:', error);
    }
  }

  private saveGroceryList() {
    try {
      localStorage.setItem('groceryList', JSON.stringify(this.groceryList));
    } catch (error) {
      console.error('Error saving grocery list:', error);
    }
  }

  private saveMealPrepTemplates() {
    try {
      localStorage.setItem('mealPrepTemplates', JSON.stringify(this.mealPrepTemplates));
    } catch (error) {
      console.error('Error saving meal prep templates:', error);
    }
  }

  private cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }

  public async lookupBarcode(barcode: string): Promise<BarcodeResult> {
    // Cleanup cache before lookup
    this.cleanupCache();

    // Check cache first
    const cached = this.cache.get(barcode);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return { success: true, data: cached.data };
    }

    try {
      // Try local database
      const localResult = await this.lookupLocalDatabase(barcode);
      if (localResult.success && localResult.data) {
        this.cache.set(barcode, { data: localResult.data, timestamp: Date.now() });
        this.addToHistory(barcode, localResult.data);
        return localResult;
      }

      // Try external API
      const apiResult = await this.lookupExternalAPI(barcode);
      if (apiResult.success && apiResult.data) {
        this.cache.set(barcode, { data: apiResult.data, timestamp: Date.now() });
        this.addToHistory(barcode, apiResult.data);
        await this.storeInLocalDatabase(barcode, apiResult.data);
        return apiResult;
      }

      return { success: false, error: 'Barcode not found' };
    } catch (error) {
      console.error('Error in lookupBarcode:', error);
      return { success: false, error: 'Failed to lookup barcode' };
    }
  }

  private addToHistory(barcode: string, data: BarcodeResult['data']) {
    const historyItem: BarcodeHistoryItem = {
      barcode,
      timestamp: Date.now(),
      data
    };

    // Remove existing entry if present
    this.history = this.history.filter(item => item.barcode !== barcode);
    
    // Add new entry at the beginning
    this.history.unshift(historyItem);
    
    // Keep only the most recent items
    if (this.history.length > this.MAX_HISTORY_ITEMS) {
      this.history = this.history.slice(0, this.MAX_HISTORY_ITEMS);
    }

    this.saveHistory();
  }

  public getHistory(): BarcodeHistoryItem[] {
    return [...this.history];
  }

  public addToFavorites(barcode: string, data: BarcodeResult['data']) {
    const favoriteItem: BarcodeFavoriteItem = {
      barcode,
      addedAt: Date.now(),
      data
    };

    // Remove existing entry if present
    this.favorites = this.favorites.filter(item => item.barcode !== barcode);
    
    // Add new entry
    this.favorites.push(favoriteItem);
    
    // Keep only the maximum allowed favorites
    if (this.favorites.length > this.MAX_FAVORITES) {
      this.favorites = this.favorites.slice(0, this.MAX_FAVORITES);
    }

    this.saveFavorites();
  }

  public removeFromFavorites(barcode: string) {
    this.favorites = this.favorites.filter(item => item.barcode !== barcode);
    this.saveFavorites();
  }

  public getFavorites(): BarcodeFavoriteItem[] {
    return [...this.favorites];
  }

  public isFavorite(barcode: string): boolean {
    return this.favorites.some(item => item.barcode === barcode);
  }

  public clearHistory() {
    this.history = [];
    this.saveHistory();
  }

  public clearFavorites() {
    this.favorites = [];
    this.saveFavorites();
  }

  private getTimeBasedUsage(): Map<string, TimeBasedUsage[]> {
    const usage = new Map<string, TimeBasedUsage[]>();
    
    this.history.forEach(item => {
      const date = new Date(item.timestamp);
      const hour = date.getHours();
      const key = item.barcode;
      
      if (!usage.has(key)) {
        usage.set(key, []);
      }
      
      const itemUsage = usage.get(key)!;
      const existingHour = itemUsage.find(u => u.hour === hour);
      
      if (existingHour) {
        existingHour.count++;
      } else {
        itemUsage.push({ hour, count: 1 });
      }
    });
    
    return usage;
  }

  private calculateTimeScore(currentHour: number, usage: TimeBasedUsage[]): number {
    const relevantUsage = usage.find(u => Math.abs(u.hour - currentHour) <= 2);
    return relevantUsage ? relevantUsage.count : 0;
  }

  private calculateFrequencyScore(usage: TimeBasedUsage[]): number {
    return usage.reduce((sum, u) => sum + u.count, 0);
  }

  private getSmartSuggestions(): SmartSuggestion[] {
    const currentHour = new Date().getHours();
    const timeBasedUsage = this.getTimeBasedUsage();
    const suggestions: SmartSuggestion[] = [];

    // Process history items
    this.history.forEach(item => {
      const usage = timeBasedUsage.get(item.barcode) || [];
      const timeScore = this.calculateTimeScore(currentHour, usage);
      const frequencyScore = this.calculateFrequencyScore(usage);
      const isFavorite = this.isFavorite(item.barcode);
      
      const score = (timeScore * 2) + (frequencyScore * 1.5) + (isFavorite ? 1 : 0);
      
      let reason = '';
      if (timeScore > 0) {
        reason = 'Frequently used at this time';
      } else if (frequencyScore > 2) {
        reason = 'Frequently used';
      } else if (isFavorite) {
        reason = 'In your favorites';
      }

      if (score > 0) {
        suggestions.push({ item, score, reason });
      }
    });

    // Sort by score and limit to MAX_SUGGESTIONS
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, this.MAX_SUGGESTIONS);
  }

  public getSuggestions(): SmartSuggestion[] {
    return this.getSmartSuggestions();
  }

  public getNutritionalInsights(items: BarcodeHistoryItem[]): {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    averageCalories: number;
  } {
    if (items.length === 0) {
      return {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        averageCalories: 0
      };
    }

    const totals = items.reduce((acc, item) => {
      const nutrition = item.data.nutrition;
      return {
        calories: acc.calories + nutrition.calories,
        protein: acc.protein + nutrition.protein,
        carbs: acc.carbs + nutrition.carbs,
        fat: acc.fat + nutrition.fat
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    return {
      ...totals,
      averageCalories: totals.calories / items.length
    };
  }

  public getPortionRecommendation(item: BarcodeHistoryItem, targetCalories: number = 2000): number {
    const nutrition = item.data.nutrition;
    const currentCalories = nutrition.calories;
    
    // Calculate portion size to reach target calories
    const recommendedPortion = targetCalories / currentCalories;
    
    // Limit portion size between 0.5 and 3
    return Math.min(Math.max(recommendedPortion, 0.5), 3);
  }

  public addToMealPlan(barcode: string, data: BarcodeResult['data'], mealType: MealPlanItem['mealType'], plannedDate: number) {
    const mealPlanItem: MealPlanItem = {
      barcode,
      timestamp: Date.now(),
      data,
      mealType,
      plannedDate
    };

    this.mealPlans.push(mealPlanItem);
    
    if (this.mealPlans.length > this.MAX_MEAL_PLANS) {
      this.mealPlans = this.mealPlans.slice(-this.MAX_MEAL_PLANS);
    }

    this.saveMealPlans();
  }

  public removeFromMealPlan(barcode: string, plannedDate: number) {
    this.mealPlans = this.mealPlans.filter(
      item => !(item.barcode === barcode && item.plannedDate === plannedDate)
    );
    this.saveMealPlans();
  }

  public getMealPlans(date: number): MealPlanItem[] {
    try {
      if (!date || isNaN(date)) {
        console.error('Invalid date provided to getMealPlans');
        return [];
      }

      const startOfDay = new Date(date);
      if (isNaN(startOfDay.getTime())) {
        console.error('Invalid date conversion in getMealPlans');
        return [];
      }

      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      return this.mealPlans.filter(
        item => item.plannedDate >= startOfDay.getTime() && item.plannedDate <= endOfDay.getTime()
      );
    } catch (error) {
      console.error('Error in getMealPlans:', error);
      return [];
    }
  }

  public getMealPlanNutrition(date: number): {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    byMealType: Record<MealPlanItem['mealType'], {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }>;
  } {
    const mealPlans = this.getMealPlans(date);
    const byMealType: Record<MealPlanItem['mealType'], {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }> = {
      breakfast: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      lunch: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      dinner: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      snack: { calories: 0, protein: 0, carbs: 0, fat: 0 }
    };

    const totals = mealPlans.reduce((acc, item) => {
      const nutrition = item.data.nutrition;
      const mealType = item.mealType;

      byMealType[mealType].calories += nutrition.calories;
      byMealType[mealType].protein += nutrition.protein;
      byMealType[mealType].carbs += nutrition.carbs;
      byMealType[mealType].fat += nutrition.fat;

      return {
        calories: acc.calories + nutrition.calories,
        protein: acc.protein + nutrition.protein,
        carbs: acc.carbs + nutrition.carbs,
        fat: acc.fat + nutrition.fat
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    return {
      ...totals,
      byMealType
    };
  }

  private calculateMealTypeScore(item: BarcodeHistoryItem, mealType: string): number {
    const hour = new Date(item.timestamp).getHours();
    let timeScore = 0;
    
    // Enhanced time-based scoring
    switch (mealType) {
      case 'breakfast':
        timeScore = hour >= 5 && hour <= 10 ? 1 : 
                   (hour >= 4 && hour <= 11) ? 0.7 : 0.3;
        break;
      case 'lunch':
        timeScore = hour >= 11 && hour <= 14 ? 1 :
                   (hour >= 10 && hour <= 15) ? 0.7 : 0.3;
        break;
      case 'dinner':
        timeScore = hour >= 17 && hour <= 20 ? 1 :
                   (hour >= 16 && hour <= 21) ? 0.7 : 0.3;
        break;
      case 'snack':
        timeScore = (hour >= 10 && hour <= 11) || (hour >= 15 && hour <= 16) ? 1 :
                   (hour >= 9 && hour <= 12) || (hour >= 14 && hour <= 17) ? 0.7 : 0.3;
        break;
    }

    // Enhanced frequency scoring with recency bias
    const frequency = this.history.filter(h => h.barcode === item.barcode).length;
    const recency = this.history.findIndex(h => h.barcode === item.barcode);
    const recencyScore = recency >= 0 ? Math.max(0.5, 1 - (recency / this.history.length)) : 0.5;
    const frequencyScore = Math.min(frequency / 5, 1) * recencyScore;

    // Enhanced favorite scoring
    const isFavorite = this.favorites.some(f => f.barcode === item.barcode);
    const favoriteScore = isFavorite ? 1 : 0.5;

    // Nutritional balance scoring
    const nutrition = item.data.nutrition;
    const goals = this.getNutritionalGoals();
    let nutritionScore = 0.5;
    
    if (nutrition.calories >= goals.calories.min && nutrition.calories <= goals.calories.max) {
      nutritionScore += 0.1;
    }
    if (nutrition.protein >= goals.protein.min && nutrition.protein <= goals.protein.max) {
      nutritionScore += 0.1;
    }
    if (nutrition.carbs >= goals.carbs.min && nutrition.carbs <= goals.carbs.max) {
      nutritionScore += 0.1;
    }
    if (nutrition.fat >= goals.fat.min && nutrition.fat <= goals.fat.max) {
      nutritionScore += 0.1;
    }

    // Combine scores with weights
    return (timeScore * 0.3) + (frequencyScore * 0.25) + (favoriteScore * 0.2) + (nutritionScore * 0.25);
  }

  private getSuggestionReason(item: BarcodeHistoryItem, mealType: string): string {
    const reasons = [];
    const hour = new Date(item.timestamp).getHours();
    
    // Time-based reasons
    if ((mealType === 'breakfast' && hour >= 5 && hour <= 10) ||
        (mealType === 'lunch' && hour >= 11 && hour <= 14) ||
        (mealType === 'dinner' && hour >= 17 && hour <= 20) ||
        (mealType === 'snack' && ((hour >= 10 && hour <= 11) || (hour >= 15 && hour <= 16)))) {
      reasons.push('Based on your typical meal times');
    }

    // Frequency-based reasons
    const frequency = this.history.filter(h => h.barcode === item.barcode).length;
    if (frequency > 3) {
      reasons.push('Frequently consumed');
    } else if (frequency > 1) {
      reasons.push('Occasionally consumed');
    }

    // Favorite-based reasons
    if (this.favorites.some(f => f.barcode === item.barcode)) {
      reasons.push('One of your favorites');
    }

    // Nutritional reasons
    const nutrition = item.data.nutrition;
    const goals = this.getNutritionalGoals();
    if (nutrition.calories >= goals.calories.min && nutrition.calories <= goals.calories.max) {
      reasons.push('Good calorie balance');
    }
    if (nutrition.protein >= goals.protein.min && nutrition.protein <= goals.protein.max) {
      reasons.push('Good protein content');
    }

    return reasons.join(' • ');
  }

  getMealPlanSuggestions(date: string): MealPlanSuggestion[] {
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    return mealTypes.flatMap(mealType => this.getMealTypeSuggestions(mealType, date));
  }

  getMealPlanBalance(date: string): { balanced: boolean; recommendations: string[] } {
    const nutrition = this.getMealPlanNutrition(date);
    const goals = this.getNutritionalGoals();
    const recommendations: string[] = [];

    // Enhanced nutritional balance checks
    const caloriePercentage = (nutrition.totalCalories / goals.calories.target) * 100;
    const proteinPercentage = (nutrition.totalProtein / goals.protein.target) * 100;
    const carbsPercentage = (nutrition.totalCarbs / goals.carbs.target) * 100;
    const fatPercentage = (nutrition.totalFat / goals.fat.target) * 100;

    // Calorie recommendations
    if (caloriePercentage < 80) {
      recommendations.push('Add more calories to meet your minimum target');
    } else if (caloriePercentage > 120) {
      recommendations.push('Consider reducing calories to stay within your target range');
    }

    // Protein recommendations
    if (proteinPercentage < 80) {
      recommendations.push('Add more protein-rich foods');
    } else if (proteinPercentage > 120) {
      recommendations.push('Consider reducing protein intake');
    }

    // Carbs recommendations
    if (carbsPercentage < 80) {
      recommendations.push('Add more carbohydrate-rich foods');
    } else if (carbsPercentage > 120) {
      recommendations.push('Consider reducing carbohydrate intake');
    }

    // Fat recommendations
    if (fatPercentage < 80) {
      recommendations.push('Add more healthy fats');
    } else if (fatPercentage > 120) {
      recommendations.push('Consider reducing fat intake');
    }

    // Macro balance recommendations
    const totalMacros = nutrition.totalProtein + nutrition.totalCarbs + nutrition.totalFat;
    const proteinRatio = (nutrition.totalProtein / totalMacros) * 100;
    const carbsRatio = (nutrition.totalCarbs / totalMacros) * 100;
    const fatRatio = (nutrition.totalFat / totalMacros) * 100;

    if (proteinRatio < 15) {
      recommendations.push('Increase protein ratio for better muscle maintenance');
    } else if (proteinRatio > 40) {
      recommendations.push('Consider reducing protein ratio for better balance');
    }

    if (carbsRatio < 30) {
      recommendations.push('Increase carbohydrate ratio for better energy levels');
    } else if (carbsRatio > 60) {
      recommendations.push('Consider reducing carbohydrate ratio for better balance');
    }

    if (fatRatio < 20) {
      recommendations.push('Increase healthy fat ratio for better hormone function');
    } else if (fatRatio > 40) {
      recommendations.push('Consider reducing fat ratio for better balance');
    }

    return {
      balanced: recommendations.length === 0,
      recommendations
    };
  }

  public setNutritionalGoals(goals: NutritionalGoal) {
    this.nutritionalGoals = goals;
    this.saveNutritionalGoals();
  }

  public getNutritionalGoals(): NutritionalGoal {
    return { ...this.nutritionalGoals };
  }

  public updateGoalProgress(date: number) {
    const nutrition = this.getMealPlanNutrition(date);
    const progress: GoalProgress = {
      date,
      actual: {
        calories: nutrition.totalCalories,
        protein: nutrition.totalProtein,
        carbs: nutrition.totalCarbs,
        fat: nutrition.totalFat
      },
      goal: this.nutritionalGoals,
      progress: {
        calories: (nutrition.totalCalories / this.nutritionalGoals.calories.target) * 100,
        protein: (nutrition.totalProtein / this.nutritionalGoals.protein.target) * 100,
        carbs: (nutrition.totalCarbs / this.nutritionalGoals.carbs.target) * 100,
        fat: (nutrition.totalFat / this.nutritionalGoals.fat.target) * 100
      },
      status: this.calculateGoalStatus(nutrition)
    };

    // Update or add progress
    const existingIndex = this.goalProgress.findIndex(p => p.date === date);
    if (existingIndex >= 0) {
      this.goalProgress[existingIndex] = progress;
    } else {
      this.goalProgress.push(progress);
    }

    this.saveGoalProgress();
    return progress;
  }

  private calculateGoalStatus(nutrition: any): 'under' | 'on-track' | 'over' {
    const { calories, protein, carbs, fat } = nutrition;
    const goals = this.nutritionalGoals;

    const isOver = 
      calories > goals.calories.max ||
      protein > goals.protein.max ||
      carbs > goals.carbs.max ||
      fat > goals.fat.max;

    const isUnder = 
      calories < goals.calories.min ||
      protein < goals.protein.min ||
      carbs < goals.carbs.min ||
      fat < goals.fat.min;

    if (isOver) return 'over';
    if (isUnder) return 'under';
    return 'on-track';
  }

  public getGoalProgress(date: number): GoalProgress | null {
    return this.goalProgress.find(p => p.date === date) || null;
  }

  public getGoalProgressHistory(days: number = 7): GoalProgress[] {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return this.goalProgress
      .filter(p => p.date >= cutoff)
      .sort((a, b) => b.date - a.date);
  }

  public setDietaryPreferences(preferences: DietaryPreference) {
    this.dietaryPreferences = preferences;
    this.saveDietaryPreferences();
  }

  private calculateMealVarietyScore(item: BarcodeHistoryItem, recentMeals: MealPlanItem[]): MealVarietyScore {
    try {
      let score = 0;
      const reasons: string[] = [];

      // Check if item was recently consumed
      const recentConsumption = recentMeals.some(meal => 
        meal.barcode === item.barcode && 
        Date.now() - meal.timestamp < 7 * 24 * 60 * 60 * 1000 // Within last 7 days
      );

      if (!recentConsumption) {
        score += 0.3;
        reasons.push('Not recently consumed');
      }

      // Check dietary restrictions
      const meetsRestrictions = this.checkDietaryRestrictions(item);
      if (meetsRestrictions) {
        score += 0.2;
        reasons.push('Meets dietary restrictions');
      }

      // Check seasonal availability
      if (this.dietaryPreferences.seasonalPreferences && this.isSeasonalItem(item)) {
        score += 0.2;
        reasons.push('Seasonally appropriate');
      }

      // Check cultural preferences
      if (this.matchesCulturalPreferences(item)) {
        score += 0.2;
        reasons.push('Matches cultural preferences');
      }

      // Check nutritional balance
      const nutritionScore = this.calculateNutritionalScore(item);
      score += nutritionScore * 0.1;

      return {
        item,
        score,
        reason: reasons.join(' • ')
      };
    } catch (error) {
      console.error('Error calculating meal variety score:', error);
      return {
        item,
        score: 0,
        reason: 'Error calculating score'
      };
    }
  }

  private checkDietaryRestrictions(item: BarcodeHistoryItem): boolean {
    try {
      if (this.dietaryPreferences.restrictions.length === 0) {
        return true;
      }

      const nutrition = item.data.nutrition;
      const ingredients = item.data.ingredients || [];

      return this.dietaryPreferences.restrictions.every(restriction => {
        switch (restriction.toLowerCase()) {
          case 'vegetarian':
            return !ingredients.some(i => i.toLowerCase().includes('meat'));
          case 'vegan':
            return !ingredients.some(i => 
              i.toLowerCase().includes('meat') || 
              i.toLowerCase().includes('dairy') ||
              i.toLowerCase().includes('egg')
            );
          case 'gluten-free':
            return !ingredients.some(i => 
              i.toLowerCase().includes('wheat') ||
              i.toLowerCase().includes('barley') ||
              i.toLowerCase().includes('rye')
            );
          case 'low-carb':
            return nutrition.carbs < 20;
          case 'low-fat':
            return nutrition.fat < 10;
          default:
            return true;
        }
      });
    } catch (error) {
      console.error('Error checking dietary restrictions:', error);
      return false;
    }
  }

  private isSeasonalItem(item: BarcodeHistoryItem): boolean {
    try {
      const currentMonth = new Date().getMonth();
      const seasonalMonths = this.getSeasonalMonths(item.data.name);
      return seasonalMonths.includes(currentMonth);
    } catch (error) {
      console.error('Error checking seasonal availability:', error);
      return false;
    }
  }

  private getSeasonalMonths(itemName: string): number[] {
    // This is a simplified version - in a real implementation, 
    // this would be a comprehensive database of seasonal foods
    const seasonalMap: Record<string, number[]> = {
      'apple': [8, 9, 10, 11], // Fall
      'strawberry': [4, 5, 6], // Spring
      'tomato': [6, 7, 8, 9], // Summer
      // Add more seasonal items as needed
    };

    return seasonalMap[itemName.toLowerCase()] || [];
  }

  private matchesCulturalPreferences(item: BarcodeHistoryItem): boolean {
    try {
      if (this.dietaryPreferences.culturalPreferences.length === 0) {
        return true;
      }

      const itemName = item.data.name.toLowerCase();
      const itemBrand = item.data.brand.toLowerCase();

      return this.dietaryPreferences.culturalPreferences.some(preference => {
        const preferenceLower = preference.toLowerCase();
        return itemName.includes(preferenceLower) || itemBrand.includes(preferenceLower);
      });
    } catch (error) {
      console.error('Error checking cultural preferences:', error);
      return false;
    }
  }

  private calculateNutritionalScore(item: BarcodeHistoryItem): number {
    try {
      const nutrition = item.data.nutrition;
      const goals = this.getNutritionalGoals();
      let score = 0;

      // Check if calories are within target range
      if (nutrition.calories >= goals.calories.min && nutrition.calories <= goals.calories.max) {
        score += 0.25;
      }

      // Check if protein is within target range
      if (nutrition.protein >= goals.protein.min && nutrition.protein <= goals.protein.max) {
        score += 0.25;
      }

      // Check if carbs are within target range
      if (nutrition.carbs >= goals.carbs.min && nutrition.carbs <= goals.carbs.max) {
        score += 0.25;
      }

      // Check if fat is within target range
      if (nutrition.fat >= goals.fat.min && nutrition.fat <= goals.fat.max) {
        score += 0.25;
      }

      return score;
    } catch (error) {
      console.error('Error calculating nutritional score:', error);
      return 0;
    }
  }

  public getMealTypeSuggestions(mealType: string, date: string): MealPlanSuggestion[] {
    try {
      const existingMealPlans = this.getMealPlans(new Date(date).getTime());
      const existingBarcodes = new Set(existingMealPlans.map(plan => plan.barcode));

      // Get recent meals for variety calculation
      const recentMeals = this.mealPlans
        .filter(plan => plan.plannedDate < new Date(date).getTime())
        .slice(-10); // Last 10 meals

      return this.history
        .filter(item => !existingBarcodes.has(item.barcode))
        .map(item => {
          const mealTypeScore = this.calculateMealTypeScore(item, mealType);
          const varietyScore = this.calculateMealVarietyScore(item, recentMeals);
          const finalScore = (mealTypeScore * 0.6) + (varietyScore.score * 0.4);

          return {
            item,
            mealType: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
            reason: `${this.getSuggestionReason(item, mealType)} • ${varietyScore.reason}`,
            score: finalScore
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, this.MAX_SUGGESTIONS);
    } catch (error) {
      console.error('Error getting meal type suggestions:', error);
      return [];
    }
  }

  private categorizeItem(item: BarcodeResult['data']): string {
    try {
      const name = item.name.toLowerCase();
      const brand = item.brand.toLowerCase();

      // Simple categorization logic - can be enhanced with ML in the future
      if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt')) {
        return 'Dairy';
      }
      if (name.includes('apple') || name.includes('banana') || name.includes('vegetable')) {
        return 'Produce';
      }
      if (name.includes('bread') || name.includes('cake') || name.includes('pastry')) {
        return 'Bakery';
      }
      if (name.includes('meat') || name.includes('chicken') || name.includes('beef')) {
        return 'Meat';
      }
      if (name.includes('frozen') || name.includes('ice cream')) {
        return 'Frozen';
      }
      if (name.includes('can') || name.includes('preserved')) {
        return 'Canned';
      }
      if (name.includes('snack') || name.includes('chips') || name.includes('candy')) {
        return 'Snacks';
      }
      if (name.includes('drink') || name.includes('water') || name.includes('juice')) {
        return 'Beverages';
      }
      if (name.includes('cleaner') || name.includes('paper') || name.includes('soap')) {
        return 'Household';
      }
      return 'Other';
    } catch (error) {
      console.error('Error categorizing item:', error);
      return 'Other';
    }
  }

  private calculateItemPriority(item: GroceryItem): 'high' | 'medium' | 'low' {
    try {
      const daysSinceLastPurchase = item.lastPurchased 
        ? (Date.now() - item.lastPurchased) / (24 * 60 * 60 * 1000)
        : 30;

      if (item.frequency > 3 && daysSinceLastPurchase > 7) {
        return 'high';
      } else if (item.frequency > 1 && daysSinceLastPurchase > 14) {
        return 'medium';
      }
      return 'low';
    } catch (error) {
      console.error('Error calculating item priority:', error);
      return 'low';
    }
  }

  public generateSmartGroceryList(days: number = 7): SmartGroceryList {
    try {
      const mealPlans = this.mealPlans.filter(plan => 
        plan.plannedDate >= Date.now() && 
        plan.plannedDate <= Date.now() + (days * 24 * 60 * 60 * 1000)
      );

      const groceryItems = new Map<string, GroceryItem>();

      // Process meal plans
      mealPlans.forEach(plan => {
        const existingItem = groceryItems.get(plan.barcode);
        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          const category = this.categorizeItem(plan.data);
          groceryItems.set(plan.barcode, {
            barcode: plan.barcode,
            name: plan.data.name,
            quantity: 1,
            unit: 'item',
            category,
            frequency: this.history.filter(h => h.barcode === plan.barcode).length,
            priority: 'medium'
          });
        }
      });

      // Add frequently used items
      this.history
        .filter(item => {
          const lastPurchased = this.groceryList.find(g => g.barcode === item.barcode)?.lastPurchased;
          return !lastPurchased || (Date.now() - lastPurchased) > (14 * 24 * 60 * 60 * 1000);
        })
        .forEach(item => {
          if (!groceryItems.has(item.barcode)) {
            const category = this.categorizeItem(item.data);
            groceryItems.set(item.barcode, {
              barcode: item.barcode,
              name: item.data.name,
              quantity: 1,
              unit: 'item',
              category,
              frequency: this.history.filter(h => h.barcode === item.barcode).length,
              priority: 'low'
            });
          }
        });

      // Convert to array and calculate priorities
      const items = Array.from(groceryItems.values()).map(item => ({
        ...item,
        priority: this.calculateItemPriority(item)
      }));

      // Group by category
      const categories = this.CATEGORIES.reduce((acc, category) => {
        const categoryItems = items.filter(item => item.category === category);
        acc[category] = {
          items: categoryItems,
          totalCost: categoryItems.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0)
        };
        return acc;
      }, {} as SmartGroceryList['categories']);

      return {
        items,
        totalEstimatedCost: items.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0),
        categories,
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('Error generating smart grocery list:', error);
      return {
        items: [],
        totalEstimatedCost: 0,
        categories: {},
        lastUpdated: Date.now()
      };
    }
  }

  public updateGroceryItem(barcode: string, updates: Partial<GroceryItem>) {
    try {
      const index = this.groceryList.findIndex(item => item.barcode === barcode);
      if (index >= 0) {
        this.groceryList[index] = {
          ...this.groceryList[index],
          ...updates,
          lastUpdated: Date.now()
        };
      } else {
        const item = this.history.find(h => h.barcode === barcode);
        if (item) {
          this.groceryList.push({
            barcode,
            name: item.data.name,
            quantity: 1,
            unit: 'item',
            category: this.categorizeItem(item.data),
            frequency: this.history.filter(h => h.barcode === barcode).length,
            priority: 'medium',
            ...updates,
            lastUpdated: Date.now()
          });
        }
      }

      // Maintain list size limit
      if (this.groceryList.length > this.MAX_GROCERY_ITEMS) {
        this.groceryList = this.groceryList
          .sort((a, b) => b.lastUpdated - a.lastUpdated)
          .slice(0, this.MAX_GROCERY_ITEMS);
      }

      this.saveGroceryList();
    } catch (error) {
      console.error('Error updating grocery item:', error);
    }
  }

  public removeFromGroceryList(barcode: string) {
    try {
      this.groceryList = this.groceryList.filter(item => item.barcode !== barcode);
      this.saveGroceryList();
    } catch (error) {
      console.error('Error removing from grocery list:', error);
    }
  }

  public getGroceryList(): GroceryItem[] {
    return [...this.groceryList];
  }

  public markItemPurchased(barcode: string) {
    try {
      const item = this.groceryList.find(item => item.barcode === barcode);
      if (item) {
        item.lastPurchased = Date.now();
        this.saveGroceryList();
      }
    } catch (error) {
      console.error('Error marking item as purchased:', error);
    }
  }

  getMealPrepInstructions(barcode: string): MealPrepInstructions | null {
    const item = this.getHistoryItem(barcode);
    if (!item) return null;

    // Check if we have a template for this item
    const template = this.mealPrepTemplates[barcode];
    if (template) {
      return template.instructions;
    }

    // Generate basic instructions if no template exists
    return {
      totalTime: 30,
      prepTime: 15,
      cookTime: 15,
      servings: 1,
      difficulty: 'easy',
      steps: [
        {
          order: 1,
          description: `Prepare ${item.data.name}`,
          duration: 15,
          tips: ['Follow package instructions if available']
        }
      ],
      equipment: ['Basic kitchen utensils'],
      storage: {
        refrigerator: 3,
        freezer: 30
      },
      reheating: ['Microwave for 1-2 minutes or until heated through']
    };
  }

  addMealPrepTemplate(template: MealPrepTemplate) {
    this.mealPrepTemplates[template.id] = template;
    this.saveMealPrepTemplates();
  }

  updateMealPrepTemplate(template: MealPrepTemplate) {
    if (this.mealPrepTemplates[template.id]) {
      this.mealPrepTemplates[template.id] = template;
      this.saveMealPrepTemplates();
    }
  }

  deleteMealPrepTemplate(id: string) {
    if (this.mealPrepTemplates[id]) {
      delete this.mealPrepTemplates[id];
      this.saveMealPrepTemplates();
    }
  }

  getMealPrepTemplates(): MealPrepTemplate[] {
    return Object.values(this.mealPrepTemplates);
  }
}

export const barcodeService = BarcodeService.getInstance(); 