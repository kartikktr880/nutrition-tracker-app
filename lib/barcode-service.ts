import { logError } from '../utils/logger';
// Stub for foodDatabase until the actual file is created
const foodDatabase = {
    lookup: (_barcode: string) => null,
    add: (_barcode: string, _data: unknown) => { /* stub */ return; },
    remove: (_barcode: string) => { /* stub */ return; }
  };
  
  interface BarcodeResult {
    success: boolean;
    data?: {
      name: string;
      brand: string;
      nutrition: Record<string, number>;
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
        logError('Error loading dietary preferences:', error);
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
        logError('Error loading grocery list:', error);
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
        logError('Error loading meal prep templates:', error);
      }
    }
  
    private saveHistory() {
      try {
        localStorage.setItem('barcodeHistory', JSON.stringify(this.history));
      } catch (error) {
        logError('Failed to save barcode history:', error);
      }
    }
  
    private saveFavorites() {
      try {
        localStorage.setItem('barcodeFavorites', JSON.stringify(this.favorites));
      } catch (error) {
        logError('Failed to save barcode favorites:', error);
      }
    }
  
    private saveMealPlans() {
      try {
        localStorage.setItem('barcodeMealPlans', JSON.stringify(this.mealPlans));
      } catch (error) {
        logError('Failed to save meal plans:', error);
      }
    }
  
    private saveNutritionalGoals() {
      try {
        localStorage.setItem('nutritionalGoals', JSON.stringify(this.nutritionalGoals));
      } catch (error) {
        logError('Failed to save nutritional goals:', error);
      }
    }
  
    private saveGoalProgress() {
      try {
        localStorage.setItem('goalProgress', JSON.stringify(this.goalProgress));
      } catch (error) {
        logError('Failed to save goal progress:', error);
      }
    }
  
    private saveDietaryPreferences() {
      try {
        localStorage.setItem('dietaryPreferences', JSON.stringify(this.dietaryPreferences));
      } catch (error) {
        logError('Error saving dietary preferences:', error);
      }
    }
  
    private saveGroceryList() {
      try {
        localStorage.setItem('groceryList', JSON.stringify(this.groceryList));
      } catch (error) {
        logError('Error saving grocery list:', error);
      }
    }
  
    private saveMealPrepTemplates() {
      try {
        localStorage.setItem('mealPrepTemplates', JSON.stringify(this.mealPrepTemplates));
      } catch (error) {
        logError('Error saving meal prep templates:', error);
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
        if (localResult && localResult.success && localResult.data) {
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
        logError('Error looking up barcode:', error);
        return { success: false, error: 'Failed to lookup barcode' };
      }
    }
  
    private async lookupLocalDatabase(barcode: string): Promise<BarcodeResult | null> {
      try {
        const result = foodDatabase.lookup(barcode);
        return result ? { success: true, data: result } : null;
      } catch (error) {
        logError('Error looking up in local database:', error);
        return null;
      }
    }
  
    private async lookupExternalAPI(_barcode: string): Promise<BarcodeResult> {
      // Stub implementation
      return { success: false, error: 'External API not implemented' };
    }
  
    private async storeInLocalDatabase(barcode: string, data: unknown): Promise<void> {
      try {
        foodDatabase.add(barcode, data);
      } catch (error) {
        logError('Error storing in local database:', error);
      }
    }
  
    public getHistoryItem(barcode: string): BarcodeHistoryItem | undefined {
      return this.history.find(item => item.barcode === barcode);
    }
  
    public addToHistory(barcode: string, data: BarcodeResult['data']) {
      if (!data) return;
  
      const existingIndex = this.history.findIndex(item => item.barcode === barcode);
      const newItem: BarcodeHistoryItem = {
        barcode,
        timestamp: Date.now(),
        data
      };
  
      if (existingIndex >= 0) {
        this.history[existingIndex] = newItem;
      } else {
        this.history.unshift(newItem);
        if (this.history.length > this.MAX_HISTORY_ITEMS) {
          this.history = this.history.slice(0, this.MAX_HISTORY_ITEMS);
        }
      }
  
      this.saveHistory();
    }
  
    public getHistory(): BarcodeHistoryItem[] {
      return [...this.history];
    }
  
    public addToFavorites(barcode: string, data: BarcodeResult['data']) {
      if (!data) return;
  
      const existingIndex = this.favorites.findIndex(item => item.barcode === barcode);
      const newItem: BarcodeFavoriteItem = {
        barcode,
        addedAt: Date.now(),
        data
      };
  
      if (existingIndex >= 0) {
        this.favorites[existingIndex] = newItem;
      } else {
        this.favorites.unshift(newItem);
        if (this.favorites.length > this.MAX_FAVORITES) {
          this.favorites = this.favorites.slice(0, this.MAX_FAVORITES);
        }
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
        
        let itemUsage = usage.get(item.barcode);
        if (!itemUsage) {
          itemUsage = [];
          usage.set(item.barcode, itemUsage);
        }
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
      const hourUsage = usage.find(u => u.hour === currentHour);
      return hourUsage ? hourUsage.count * 2 : 0;
    }
  
    private calculateFrequencyScore(usage: TimeBasedUsage[]): number {
      return usage.reduce((total, u) => total + u.count, 0);
    }
  
    private getSmartSuggestions(): SmartSuggestion[] {
      const currentHour = new Date().getHours();
      const timeBasedUsage = this.getTimeBasedUsage();
      const suggestions: SmartSuggestion[] = [];
  
      this.history.forEach(item => {
        const usage = timeBasedUsage.get(item.barcode) || [];
        const timeScore = this.calculateTimeScore(currentHour, usage);
        const frequencyScore = this.calculateFrequencyScore(usage);
        const totalScore = timeScore + frequencyScore;
  
        if (totalScore > 0) {
          suggestions.push({
            item,
            score: totalScore,
            reason: `Used ${frequencyScore} times, ${timeScore > 0 ? 'often at this time' : ''}`
          });
        }
      });
  
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
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      let validItems = 0;
  
      items.forEach(item => {
        if (item.data && item.data.nutrition) {
          const nutrition = item.data.nutrition;
          totalCalories += nutrition.calories || 0;
          totalProtein += nutrition.protein || 0;
          totalCarbs += nutrition.carbs || 0;
          totalFat += nutrition.fat || 0;
          validItems++;
        }
      });
  
      return {
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        averageCalories: validItems > 0 ? totalCalories / validItems : 0
      };
    }
  
    public getPortionRecommendation(item: BarcodeHistoryItem, targetCalories = 2000): number {
      if (!item.data || !item.data.nutrition || !item.data.nutrition.calories) {
        return 1;
      }
  
      const itemCalories = item.data.nutrition.calories;
      return Math.max(0.5, Math.min(3, targetCalories / itemCalories));
    }
  
    public addToMealPlan(barcode: string, data: BarcodeResult['data'], mealType: MealPlanItem['mealType'], plannedDate: number) {
      if (!data) return;
  
      const existingIndex = this.mealPlans.findIndex(
        item => item.barcode === barcode && item.plannedDate === plannedDate && item.mealType === mealType
      );
  
      const newItem: MealPlanItem = {
        barcode,
        timestamp: Date.now(),
        data,
        mealType,
        plannedDate
      };
  
      if (existingIndex >= 0) {
        this.mealPlans[existingIndex] = newItem;
      } else {
        this.mealPlans.push(newItem);
        if (this.mealPlans.length > this.MAX_MEAL_PLANS) {
          this.mealPlans = this.mealPlans.slice(-this.MAX_MEAL_PLANS);
        }
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
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
  
      return this.mealPlans.filter(item => {
        const itemDate = new Date(item.plannedDate);
        return itemDate >= startOfDay && itemDate <= endOfDay;
      });
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
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
  
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
  
      mealPlans.forEach(item => {
        if (item.data && item.data.nutrition) {
          const nutrition = item.data.nutrition;
          const calories = nutrition.calories || 0;
          const protein = nutrition.protein || 0;
          const carbs = nutrition.carbs || 0;
          const fat = nutrition.fat || 0;
  
          totalCalories += calories;
          totalProtein += protein;
          totalCarbs += carbs;
          totalFat += fat;
  
          byMealType[item.mealType].calories += calories;
          byMealType[item.mealType].protein += protein;
          byMealType[item.mealType].carbs += carbs;
          byMealType[item.mealType].fat += fat;
        }
      });
  
      return {
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        byMealType
      };
    }
  
    private calculateMealTypeScore(item: BarcodeHistoryItem, mealType: string): number {
      let score = 0;
      const nutrition = item.data?.nutrition;
  
      if (!nutrition) return 0;
  
      switch (mealType) {
        case 'breakfast':
          // Breakfast items typically have carbs and moderate protein
          if (nutrition.carbs && nutrition.carbs > 20) score += 2;
          if (nutrition.protein && nutrition.protein > 5) score += 1;
          if (nutrition.fat && nutrition.fat < 15) score += 1;
          break;
        case 'lunch':
          // Lunch items should be balanced
          if (nutrition.protein && nutrition.protein > 10) score += 2;
          if (nutrition.carbs && nutrition.carbs > 15) score += 1;
          if (nutrition.fat && nutrition.fat > 5) score += 1;
          break;
        case 'dinner':
          // Dinner items should have good protein
          if (nutrition.protein && nutrition.protein > 15) score += 3;
          if (nutrition.carbs && nutrition.carbs > 10) score += 1;
          break;
        case 'snack':
          // Snacks should be light
          if (nutrition.calories && nutrition.calories < 200) score += 2;
          if (nutrition.protein && nutrition.protein > 5) score += 1;
          break;
      }
  
      return score;
    }
  
    private getSuggestionReason(item: BarcodeHistoryItem, mealType: string): string {
      const nutrition = item.data?.nutrition;
      if (!nutrition) return 'No nutrition data available';
  
      switch (mealType) {
        case 'breakfast':
          if (nutrition.carbs && nutrition.carbs > 20) return 'Good source of energy for breakfast';
          if (nutrition.protein && nutrition.protein > 5) return 'Contains protein for sustained energy';
          break;
        case 'lunch':
          if (nutrition.protein && nutrition.protein > 10) return 'Good protein content for lunch';
          if (nutrition.calories && nutrition.calories > 300) return 'Substantial meal for lunch';
          break;
        case 'dinner':
          if (nutrition.protein && nutrition.protein > 15) return 'High protein content for dinner';
          if (nutrition.calories && nutrition.calories > 400) return 'Filling dinner option';
          break;
        case 'snack':
          if (nutrition.calories && nutrition.calories < 200) return 'Light snack option';
          if (nutrition.protein && nutrition.protein > 5) return 'Protein-rich snack';
          break;
      }
  
      return 'Good nutritional balance';
    }
  
    getMealPlanSuggestions(_date: string): MealPlanSuggestion[] {
      const suggestions: MealPlanSuggestion[] = [];
      const mealTypes: MealPlanItem['mealType'][] = ['breakfast', 'lunch', 'dinner', 'snack'];
  
      mealTypes.forEach(mealType => {
        this.history.forEach(item => {
          const score = this.calculateMealTypeScore(item, mealType);
          if (score > 0) {
            suggestions.push({
              item,
              mealType,
              reason: this.getSuggestionReason(item, mealType),
              score
            });
          }
        });
      });
  
      return suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, this.MAX_SUGGESTIONS);
    }
  
    getMealPlanBalance(date: string): { balanced: boolean; recommendations: string[] } {
      const nutrition = this.getMealPlanNutrition(new Date(date).getTime());
      const recommendations: string[] = [];
  
      // Check protein balance
      if (nutrition.totalProtein < 50) {
        recommendations.push('Consider adding more protein-rich foods');
      } else if (nutrition.totalProtein > 150) {
        recommendations.push('Protein intake is quite high, consider reducing');
      }
  
      // Check carb balance
      if (nutrition.totalCarbs < 100) {
        recommendations.push('Consider adding more carbohydrate sources');
      } else if (nutrition.totalCarbs > 300) {
        recommendations.push('Carbohydrate intake is high, consider reducing');
      }
  
      // Check fat balance
      if (nutrition.totalFat < 30) {
        recommendations.push('Consider adding healthy fats');
      } else if (nutrition.totalFat > 80) {
        recommendations.push('Fat intake is high, consider reducing');
      }
  
      // Check calorie distribution
      const breakfast = nutrition.byMealType.breakfast.calories;
      const lunch = nutrition.byMealType.lunch.calories;
      const dinner = nutrition.byMealType.dinner.calories;
  
      if (breakfast < 300) {
        recommendations.push('Breakfast seems light, consider adding more food');
      }
      if (lunch < 400) {
        recommendations.push('Lunch could be more substantial');
      }
      if (dinner > 600) {
        recommendations.push('Dinner is quite heavy, consider reducing portion');
      }
  
      const balanced = recommendations.length === 0;
      return { balanced, recommendations };
    }
  
    public setNutritionalGoals(goals: NutritionalGoal) {
      this.nutritionalGoals = goals;
      this.saveNutritionalGoals();
    }
  
    public getNutritionalGoals(): NutritionalGoal {
      return { ...this.nutritionalGoals };
    }
  
    public updateGoalProgress(date: number) {
      const mealPlans = this.getMealPlans(date);
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
  
      mealPlans.forEach(item => {
        if (item.data && item.data.nutrition) {
          const nutrition = item.data.nutrition;
          totalCalories += nutrition.calories || 0;
          totalProtein += nutrition.protein || 0;
          totalCarbs += nutrition.carbs || 0;
          totalFat += nutrition.fat || 0;
        }
      });
  
      const progress: GoalProgress = {
        date,
        actual: { calories: totalCalories, protein: totalProtein, carbs: totalCarbs, fat: totalFat },
        goal: this.nutritionalGoals,
        progress: {
          calories: (totalCalories / this.nutritionalGoals.calories.target) * 100,
          protein: (totalProtein / this.nutritionalGoals.protein.target) * 100,
          carbs: (totalCarbs / this.nutritionalGoals.carbs.target) * 100,
          fat: (totalFat / this.nutritionalGoals.fat.target) * 100
        },
        status: this.calculateGoalStatus({ calories: totalCalories, protein: totalProtein, carbs: totalCarbs, fat: totalFat })
      };
  
      const existingIndex = this.goalProgress.findIndex(p => p.date === date);
      if (existingIndex >= 0) {
        this.goalProgress[existingIndex] = progress;
      } else {
        this.goalProgress.push(progress);
      }
  
      this.saveGoalProgress();
    }
  
    private calculateGoalStatus(nutrition: unknown): 'under' | 'on-track' | 'over' {
      if (isNutrition(nutrition)) {
        const n = nutrition;
        const calorieProgress = (n.calories / this.nutritionalGoals.calories.target) * 100;
        const proteinProgress = (n.protein / this.nutritionalGoals.protein.target) * 100;
        const carbProgress = (n.carbs / this.nutritionalGoals.carbs.target) * 100;
        const fatProgress = (n.fat / this.nutritionalGoals.fat.target) * 100;

        const avgProgress = (calorieProgress + proteinProgress + carbProgress + fatProgress) / 4;

        if (avgProgress < 80) return 'under';
        if (avgProgress > 120) return 'over';
        return 'on-track';
      }
      // If nutrition is not valid, treat as 'under' by default
      return 'under';
    }
  
    public getGoalProgress(date: number): GoalProgress | null {
      return this.goalProgress.find(p => p.date === date) || null;
    }
  
    public getGoalProgressHistory(days = 7): GoalProgress[] {
      const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
      return this.goalProgress.filter(p => p.date >= cutoff);
    }
  
    public setDietaryPreferences(preferences: DietaryPreference) {
      this.dietaryPreferences = preferences;
      this.saveDietaryPreferences();
    }
  
    private calculateMealVarietyScore(item: BarcodeHistoryItem, recentMeals: MealPlanItem[]): MealVarietyScore {
      let score = 0;
      const reasons: string[] = [];
  
      // Check if item was recently used
      const recentUsage = recentMeals.filter(meal => meal.barcode === item.barcode).length;
      if (recentUsage === 0) {
        score += 3;
        reasons.push('Not recently used');
      } else if (recentUsage < 3) {
        score += 1;
        reasons.push('Used recently but not too often');
      } else {
        score -= 2;
        reasons.push('Used very recently');
      }
  
      // Check dietary restrictions
      if (this.checkDietaryRestrictions(item)) {
        score += 2;
        reasons.push('Meets dietary restrictions');
      } else {
        score -= 3;
        reasons.push('Does not meet dietary restrictions');
      }
  
      // Check seasonal preferences
      if (this.dietaryPreferences.seasonalPreferences && this.isSeasonalItem(item)) {
        score += 1;
        reasons.push('Seasonal item');
      }
  
      // Check cultural preferences
      if (this.matchesCulturalPreferences(item)) {
        score += 1;
        reasons.push('Matches cultural preferences');
      }
  
      // Check nutritional balance
      const nutritionScore = this.calculateNutritionalScore(item);
      score += nutritionScore;
      if (nutritionScore > 0) {
        reasons.push('Good nutritional value');
      }
  
      return {
        item,
        score: Math.max(0, score),
        reason: reasons.join(', ')
      };
    }
  
    private checkDietaryRestrictions(item: BarcodeHistoryItem): boolean {
      if (!item.data || !item.data.name) return true;
  
      const itemName = item.data.name.toLowerCase();
      const restrictions = this.dietaryPreferences.restrictions;
      const allergies = this.dietaryPreferences.allergies;
  
      // Check restrictions
      for (const restriction of restrictions) {
        const restrictionLower = restriction.toLowerCase();
        if (itemName.includes(restrictionLower)) {
          return false;
        }
      }
  
      // Check allergies
      for (const allergy of allergies) {
        const allergyLower = allergy.toLowerCase();
        if (itemName.includes(allergyLower)) {
          return false;
        }
      }
  
      return true;
    }
  
    private isSeasonalItem(item: BarcodeHistoryItem): boolean {
      if (!item.data || !item.data.name) return false;
  
      const currentMonth = new Date().getMonth();
      const seasonalMonths = this.getSeasonalMonths(item.data.name);
      return seasonalMonths.includes(currentMonth);
    }
  
    private getSeasonalMonths(itemName: string): number[] {
      const name = itemName.toLowerCase();
      
      // Spring items (March-May)
      if (name.includes('asparagus') || name.includes('strawberry') || name.includes('peas')) {
        return [2, 3, 4]; // March, April, May
      }
      
      // Summer items (June-August)
      if (name.includes('tomato') || name.includes('corn') || name.includes('watermelon')) {
        return [5, 6, 7]; // June, July, August
      }
      
      // Fall items (September-November)
      if (name.includes('pumpkin') || name.includes('apple') || name.includes('squash')) {
        return [8, 9, 10]; // September, October, November
      }
      
      // Winter items (December-February)
      if (name.includes('citrus') || name.includes('root vegetables')) {
        return [11, 0, 1]; // December, January, February
      }
      
      return []; // Not seasonal
    }
  
    private matchesCulturalPreferences(item: BarcodeHistoryItem): boolean {
      if (!item.data || !item.data.name) return false;
  
      const itemName = item.data.name.toLowerCase();
      const culturalPrefs = this.dietaryPreferences.culturalPreferences;
  
      for (const pref of culturalPrefs) {
        const prefLower = pref.toLowerCase();
        if (itemName.includes(prefLower)) {
          return true;
        }
      }
  
      return false;
    }
  
    private calculateNutritionalScore(item: BarcodeHistoryItem): number {
      if (!item.data || !item.data.nutrition) return 0;
  
      const nutrition = item.data.nutrition;
      let score = 0;
  
      // Protein score
      if (nutrition.protein && nutrition.protein > 10) score += 2;
      else if (nutrition.protein && nutrition.protein > 5) score += 1;
  
      // Fiber score (if available)
      if (nutrition.fiber && nutrition.fiber > 3) score += 2;
      else if (nutrition.fiber && nutrition.fiber > 1) score += 1;
  
      // Low sugar score
      if (nutrition.sugar && nutrition.sugar < 10) score += 1;
      else if (nutrition.sugar && nutrition.sugar > 20) score -= 1;
  
      // Balanced macronutrients
      if (nutrition.calories) {
        const proteinRatio = (nutrition.protein || 0) / nutrition.calories * 4;
        const carbRatio = (nutrition.carbs || 0) / nutrition.calories * 4;
        const fatRatio = (nutrition.fat || 0) / nutrition.calories * 9;
  
        if (proteinRatio > 0.1 && proteinRatio < 0.3) score += 1;
        if (carbRatio > 0.4 && carbRatio < 0.6) score += 1;
        if (fatRatio > 0.2 && fatRatio < 0.4) score += 1;
      }
  
      return score;
    }
  
    public getMealTypeSuggestions(mealType: string, date: string): MealPlanSuggestion[] {
      const suggestions: MealPlanSuggestion[] = [];
      const recentMeals = this.getMealPlans(new Date(date).getTime());
  
      this.history.forEach(item => {
        const varietyScore = this.calculateMealVarietyScore(item, recentMeals);
        const mealTypeScore = this.calculateMealTypeScore(item, mealType);
        const totalScore = varietyScore.score + mealTypeScore;
  
        if (totalScore > 0) {
          suggestions.push({
            item,
            mealType: mealType as MealPlanItem['mealType'],
            reason: varietyScore.reason,
            score: totalScore
          });
        }
      });
  
      return suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, this.MAX_SUGGESTIONS);
    }
  
    private categorizeItem(item: BarcodeResult['data']): string {
      if (!item || !item.name) return 'Other';
  
      const name = item.name.toLowerCase();
      
      if (name.includes('apple') || name.includes('banana') || name.includes('orange') || name.includes('vegetable')) {
        return 'Produce';
      }
      if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt') || name.includes('cream')) {
        return 'Dairy';
      }
      if (name.includes('chicken') || name.includes('beef') || name.includes('fish') || name.includes('pork')) {
        return 'Meat';
      }
      if (name.includes('bread') || name.includes('cake') || name.includes('cookie') || name.includes('pastry')) {
        return 'Bakery';
      }
      if (name.includes('frozen') || name.includes('ice cream')) {
        return 'Frozen';
      }
      if (name.includes('can') || name.includes('jar') || name.includes('preserved')) {
        return 'Canned';
      }
      if (name.includes('chip') || name.includes('candy') || name.includes('snack')) {
        return 'Snacks';
      }
      if (name.includes('juice') || name.includes('soda') || name.includes('water') || name.includes('drink')) {
        return 'Beverages';
      }
      if (name.includes('soap') || name.includes('paper') || name.includes('cleaner')) {
        return 'Household';
      }
      
      return 'Other';
    }
  
    private calculateItemPriority(item: GroceryItem): 'high' | 'medium' | 'low' {
      let score = 0;
  
      // Frequency score
      if (item.frequency > 5) score += 3;
      else if (item.frequency > 2) score += 2;
      else if (item.frequency > 0) score += 1;
  
      // Last purchased score
      if (item.lastPurchased) {
        const daysSincePurchase = (Date.now() - item.lastPurchased) / (1000 * 60 * 60 * 24);
        if (daysSincePurchase > 7) score += 2;
        else if (daysSincePurchase > 3) score += 1;
      }
  
      // Category priority
      if (item.category === 'Produce' || item.category === 'Dairy') score += 1;
  
      if (score >= 4) return 'high';
      if (score >= 2) return 'medium';
      return 'low';
    }
  
    public generateSmartGroceryList(days = 7): SmartGroceryList {
      const items: GroceryItem[] = [];
      const categories: { [key: string]: { items: GroceryItem[]; totalCost: number } } = {};
  
      // Initialize categories
      this.CATEGORIES.forEach(category => {
        categories[category] = { items: [], totalCost: 0 };
      });
  
      // Generate items based on history and meal plans
      const recentHistory = this.history.slice(0, 20);
      const futureMealPlans = this.mealPlans.filter(plan => {
        const planDate = new Date(plan.plannedDate);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        return planDate <= futureDate;
      });
  
      // Combine history and meal plans
      const allItems = [...recentHistory, ...futureMealPlans.map(plan => ({
        barcode: plan.barcode,
        timestamp: plan.timestamp,
        data: plan.data
      }))];
  
      // Count frequency and create grocery items
      const itemCounts = new Map<string, { count: number; data: BarcodeResult['data']; lastUsed: number }>();
      
      allItems.forEach(item => {
        const existing = itemCounts.get(item.barcode);
        if (existing) {
          existing.count++;
          existing.lastUsed = Math.max(existing.lastUsed, item.timestamp);
        } else {
          itemCounts.set(item.barcode, {
            count: 1,
            data: item.data,
            lastUsed: item.timestamp
          });
        }
      });
  
      // Convert to grocery items
      itemCounts.forEach((value, barcode) => {
        if (value.data) {
          const groceryItem: GroceryItem = {
            barcode,
            name: value.data.name || 'Unknown Item',
            quantity: Math.ceil(value.count / 2), // Adjust quantity based on frequency
            unit: 'units',
            category: this.categorizeItem(value.data),
            frequency: value.count,
            lastPurchased: value.lastUsed,
            priority: 'medium'
          };
  
          groceryItem.priority = this.calculateItemPriority(groceryItem);
          items.push(groceryItem);
  
          // Add to category
          const category = categories[groceryItem.category];
          if (category) {
            category.items.push(groceryItem);
            category.totalCost += groceryItem.estimatedPrice || 0;
          }
        }
      });
  
      // Sort items by priority and frequency
      items.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        return b.frequency - a.frequency;
      });
  
      // Limit total items
      const limitedItems = items.slice(0, this.MAX_GROCERY_ITEMS);
  
      // Recalculate total cost
      const totalEstimatedCost = limitedItems.reduce((total, item) => total + (item.estimatedPrice || 0), 0);
  
      return {
        items: limitedItems,
        totalEstimatedCost,
        categories,
        lastUpdated: Date.now()
      };
    }
  
    public updateGroceryItem(barcode: string, updates: Partial<GroceryItem>) {
      const index = this.groceryList.findIndex(item => item.barcode === barcode);
      if (index >= 0) {
        this.groceryList[index] = { ...this.groceryList[index], ...updates };
        
        // Recalculate priority
        this.groceryList[index].priority = this.calculateItemPriority(this.groceryList[index]);
        
        this.saveGroceryList();
      }
    }
  
    public addToGroceryList(barcode: string, data: BarcodeResult['data'], quantity = 1) {
      if (!data) return;
  
      const existingIndex = this.groceryList.findIndex(item => item.barcode === barcode);
      const groceryItem: GroceryItem = {
        barcode,
        name: data.name || 'Unknown Item',
        quantity,
        unit: 'units',
        category: this.categorizeItem(data),
        frequency: 1,
        priority: 'medium'
      };
  
      if (existingIndex >= 0) {
        this.groceryList[existingIndex].quantity += quantity;
        this.groceryList[existingIndex].frequency++;
        this.groceryList[existingIndex].priority = this.calculateItemPriority(this.groceryList[existingIndex]);
      } else {
        this.groceryList.push(groceryItem);
      }
      this.saveGroceryList();
    }
  
    public getDietaryPreferences(): DietaryPreference {
      return this.dietaryPreferences;
    }
  
    public getGroceryList(): GroceryItem[] {
      return this.groceryList;
    }
  
    public getMealPrepTemplates(): MealPrepTemplate[] {
      return Object.values(this.mealPrepTemplates);
    }
  
    public addMealPrepTemplate(template: MealPrepTemplate): void {
      this.mealPrepTemplates[template.id] = template;
      this.saveMealPrepTemplates();
    }
  
    public markItemPurchased(barcode: string) {
      const item = this.groceryList.find(item => item.barcode === barcode);
      if (item) {
        item.lastPurchased = Date.now();
        item.quantity = 0;
        this.saveGroceryList();
      }
    }
  
    public removeFromGroceryList(barcode: string) {
      this.groceryList = this.groceryList.filter(item => item.barcode !== barcode);
      this.saveGroceryList();
    }
  
    public getMealPrepInstructions(barcode: string): MealPrepInstructions | null {
      // Try to find a template for the barcode
      const template = Object.values(this.mealPrepTemplates).find(t => t.id === barcode || t.name === barcode);
      return template ? template.instructions : null;
    }
  }

export const barcodeService = BarcodeService.getInstance();

function isNutrition(obj: unknown): obj is { calories: number; protein: number; carbs: number; fat: number } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'calories' in obj && typeof (obj as { calories: unknown }).calories === 'number' &&
    'protein' in obj && typeof (obj as { protein: unknown }).protein === 'number' &&
    'carbs' in obj && typeof (obj as { carbs: unknown }).carbs === 'number' &&
    'fat' in obj && typeof (obj as { fat: unknown }).fat === 'number'
  );
}
