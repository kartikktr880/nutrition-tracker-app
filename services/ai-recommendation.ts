import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { withRetry, RetryError } from '@/lib/retry';
import recommendationLimiter from '@/lib/rate-limiter';
import { recordOperationLatency, recordError } from '@/lib/monitoring';
import { NutritionalGoals, MealPlanV2 as MealPlan, GroceryList, MealPrepPlan } from '../types/nutrition';

interface SeasonalInfo {
  season: string;
  month: number;
  seasonalFoods: string[];
}

interface RegionalSeasonalInfo {
  region: 'north' | 'south' | 'coastal';
  climateZone: 'continental' | 'mediterranean' | 'coastal';
  seasonalFoods: string[];
}

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  type: string;
  tags: string[];
}

interface UserPreferences {
  dietaryRestrictions: string[];
  favoriteFoods: string[];
  dislikedFoods: string[];
  allergies: string[];
}

interface UserNutritionHistory {
  recentMeals: Meal[];
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFat: number;
}

interface UserLocation {
  region: string;
  climateZone: string;
}

interface MealRecommendation {
  meal: Meal;
  score: number;
  reason: string;
}

interface RecommendationParams {
  userId: string;
  dietaryRestrictions?: string[];
  mealType?: string;
  calorieTarget?: number;
  proteinTarget?: number;
  carbsTarget?: number;
  fatTarget?: number;
}

interface BatchRecommendationParams {
  userId: string;
  mealTypes: string[];
  dietaryRestrictions?: string[];
}

// Cache configuration
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const MAX_CACHE_SIZE = 100;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
}

// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  shouldRetry: (error: any) => {
    // Retry on network errors or database connection issues
    return error.code === 'P1001' || // Prisma connection error
           error.code === 'P1002' || // Prisma connection timeout
           error.code === 'P1008' || // Prisma operations timeout
           error.code === 'P1017' || // Prisma server closed connection
           error.code === 'P2024' || // Prisma connection timeout
           error.code === 'P2034' || // Prisma transaction failed
           error.code === 'P2037' || // Prisma too many connections
           error.code === 'P2038'    // Prisma connection limit exceeded
  }
};

const REGIONAL_SEASONS: Record<string, RegionalSeasonalInfo> = {
  north: {
    region: 'north',
    climateZone: 'continental',
    seasonalFoods: ['root vegetables', 'winter squash', 'apples', 'cabbage', 'kale']
  },
  south: {
    region: 'south',
    climateZone: 'mediterranean',
    seasonalFoods: ['citrus fruits', 'olives', 'tomatoes', 'eggplant', 'bell peppers']
  },
  coastal: {
    region: 'coastal',
    climateZone: 'coastal',
    seasonalFoods: ['seafood', 'shellfish', 'seaweed', 'coastal herbs', 'salt-tolerant vegetables']
  }
};

interface AIRecommendationConfig {
  modelEndpoint: string;
  apiKey: string;
}

export class AIRecommendationService {
  private config: AIRecommendationConfig;
  private cache: Map<string, CacheEntry<MealRecommendation[]>> = new Map();
  private preferencesCache: Map<string, CacheEntry<UserPreferences>> = new Map();
  private locationCache: Map<string, CacheEntry<RegionalSeasonalInfo>> = new Map();
  private cacheMetrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    evictions: 0
  };
  private isWarming = false;

  constructor(config: AIRecommendationConfig) {
    this.config = config;
  }

  private getCurrentSeason(userId: string): RegionalSeasonalInfo {
    const cacheKey = `location:${userId}`;
    const cached = this.locationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp <= CACHE_TTL) {
      return cached.data;
    }
    return REGIONAL_SEASONS.north; // Default to north region if location not cached
  }

  private getCacheKey(params: RecommendationParams): string {
    const userId = params.userId as string;
    return `${userId}-${JSON.stringify(params.dietaryRestrictions || [])}`;
  }

  private getFromCache(key: string): MealRecommendation[] | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.cacheMetrics.misses++;
      return null;
    }

    // Check if cache entry is expired
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      this.cacheMetrics.evictions++;
      this.cacheMetrics.misses++;
      return null;
    }

    this.cacheMetrics.hits++;
    return entry.data;
  }

  private setCache(key: string, data: MealRecommendation[]): void {
    // Implement LRU cache eviction if needed
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (typeof oldestKey === 'string') {
        this.cache.delete(oldestKey);
        this.cacheMetrics.evictions++;
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private async getUserPreferences(userId: string): Promise<UserPreferences> {
    // Check cache first
    const cachedPreferences = this.preferencesCache.get(userId);
    if (cachedPreferences && Date.now() - cachedPreferences.timestamp <= CACHE_TTL) {
      this.cacheMetrics.hits++;
      return cachedPreferences.data;
    }

    this.cacheMetrics.misses++;
    return withRetry(async () => {
      const preferences = await prisma.preferences.findUnique({
        where: { userId }
      });

      const userPreferences = preferences ? {
        dietaryRestrictions: preferences.dietaryRestrictions.split(','),
        favoriteFoods: preferences.favoriteFoods.split(','),
        dislikedFoods: preferences.dislikedFoods.split(','),
        allergies: preferences.allergies.split(',')
      } : {
        dietaryRestrictions: [],
        favoriteFoods: [],
        dislikedFoods: [],
        allergies: []
      };

      // Cache the preferences
      this.preferencesCache.set(userId, {
        data: userPreferences,
        timestamp: Date.now()
      });

      return userPreferences;
    }, RETRY_CONFIG);
  }

  private async getUserNutritionHistory(userId: string): Promise<UserNutritionHistory> {
    return withRetry(async () => {
      const recentMeals = await prisma.meal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      const meals = recentMeals.map((meal: any) => ({
        id: meal.id,
        name: meal.name,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        type: meal.type,
        tags: meal.tags.split(',')
      }));

      const totalMeals = meals.length || 1;
      const averageCalories = meals.reduce((sum: any, meal: any) => sum + meal.calories, 0) / totalMeals;
      const averageProtein = meals.reduce((sum: any, meal: any) => sum + meal.protein, 0) / totalMeals;
      const averageCarbs = meals.reduce((sum: any, meal: any) => sum + meal.carbs, 0) / totalMeals;
      const averageFat = meals.reduce((sum: any, meal: any) => sum + meal.fat, 0) / totalMeals;

      return {
        recentMeals: meals,
        averageCalories,
        averageProtein,
        averageCarbs,
        averageFat
      };
    }, RETRY_CONFIG);
  }

  private async getAvailableMeals(): Promise<Meal[]> {
    return withRetry(async () => {
      const meals = await prisma.meal.findMany();
      return meals.map(meal => ({
        id: meal.id,
        name: meal.name,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        type: meal.type,
        tags: meal.tags.split(',')
      }));
    }, RETRY_CONFIG);
  }

  private async getUserLocation(userId: string): Promise<RegionalSeasonalInfo> {
    const cacheKey = `location:${userId}`;
    const cached = this.locationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp <= CACHE_TTL) {
      this.cacheMetrics.hits++;
      return cached.data;
    }

    // TypeScript workaround: Prisma type inference issue, so use 'any' for this lookup
    const user = await prisma.user.findUnique({
      where: { id: userId }
    }) as any;

    if (!user || typeof user.region !== 'string' || typeof user.climateZone !== 'string') {
      throw new Error('User not found or missing region/climateZone');
    }

    const locationInfo = REGIONAL_SEASONS[user.region as keyof typeof REGIONAL_SEASONS] || REGIONAL_SEASONS.north;
    this.locationCache.set(cacheKey, {
      data: locationInfo,
      timestamp: Date.now()
    });
    this.cacheMetrics.misses++;
    return locationInfo;
  }

  private calculateMealScore(
    meal: Meal,
    preferences: UserPreferences,
    nutritionHistory: UserNutritionHistory,
    location: RegionalSeasonalInfo
  ): number {
    let score = 0;

    // Check dietary restrictions
    if (preferences.dietaryRestrictions.some(restriction => 
      meal.tags.includes(restriction.toLowerCase())
    )) {
      score += 2;
    }

    // Check favorite foods
    if (preferences.favoriteFoods.some(food => 
      meal.name.toLowerCase().includes(food.toLowerCase())
    )) {
      score += 1.5;
    }

    // Check disliked foods
    if (preferences.dislikedFoods.some(food => 
      meal.name.toLowerCase().includes(food.toLowerCase())
    )) {
      score -= 2;
    }

    // Check allergies
    if (preferences.allergies.some(allergy => 
      meal.tags.includes(allergy.toLowerCase())
    )) {
      return -Infinity; // Exclude meals with allergens
    }

    // Check nutritional balance with more granular scoring
    const calorieDiff = Math.abs(meal.calories - nutritionHistory.averageCalories);
    const proteinDiff = Math.abs(meal.protein - nutritionHistory.averageProtein);
    const carbsDiff = Math.abs(meal.carbs - nutritionHistory.averageCarbs);
    const fatDiff = Math.abs(meal.fat - nutritionHistory.averageFat);

    // More sophisticated nutritional scoring
    const calorieScore = Math.max(0, 1 - (calorieDiff / nutritionHistory.averageCalories));
    const proteinScore = Math.max(0, 1 - (proteinDiff / nutritionHistory.averageProtein));
    const carbsScore = Math.max(0, 1 - (carbsDiff / nutritionHistory.averageCarbs));
    const fatScore = Math.max(0, 1 - (fatDiff / nutritionHistory.averageFat));

    score += calorieScore * 0.4; // Higher weight for calories
    score += proteinScore * 0.3; // Important for muscle maintenance
    score += carbsScore * 0.2;   // Energy source
    score += fatScore * 0.1;     // Essential but lower weight

    // Enhanced meal variety scoring
    const recentMealTypes = nutritionHistory.recentMeals.map(m => m.type);
    const recentMealTags = nutritionHistory.recentMeals.flatMap(m => m.tags);
    
    if (!recentMealTypes.includes(meal.type)) {
      score += 0.5; // Bonus for different meal type
    }

    // Bonus for new ingredients/tags
    const newTags = meal.tags.filter(tag => !recentMealTags.includes(tag));
    score += newTags.length * 0.1; // Small bonus for each new ingredient

    // Penalize repetitive meals
    const recentMealNames = nutritionHistory.recentMeals.map(m => m.name.toLowerCase());
    if (recentMealNames.includes(meal.name.toLowerCase())) {
      score -= 0.3; // Small penalty for exact meal repetition
    }

    // Add regional seasonal scoring
    const seasonalInfo = location;
    const mealTags = meal.tags.map(tag => tag.toLowerCase());
    const seasonalMatches = seasonalInfo.seasonalFoods.filter(food => 
      mealTags.includes(food.toLowerCase()) || 
      meal.name.toLowerCase().includes(food.toLowerCase())
    );

    if (seasonalMatches.length > 0) {
      score += 0.5; // Base bonus for seasonal ingredients
      score += seasonalMatches.length * 0.1; // Additional bonus for multiple seasonal ingredients
    }

    return score;
  }

  private generateRecommendationReason(
    meal: Meal,
    preferences: UserPreferences,
    nutritionHistory: UserNutritionHistory,
    location: RegionalSeasonalInfo
  ): string {
    const reasons: string[] = [];

    if (preferences.favoriteFoods.some(food => 
      meal.name.toLowerCase().includes(food.toLowerCase())
    )) {
      reasons.push('Contains your favorite foods');
    }

    if (preferences.dietaryRestrictions.some(restriction => 
      meal.tags.includes(restriction.toLowerCase())
    )) {
      reasons.push('Matches your dietary preferences');
    }

    const calorieDiff = meal.calories - nutritionHistory.averageCalories;
    if (Math.abs(calorieDiff) < 100) {
      reasons.push('Matches your typical calorie intake');
    }

    const recentMealTypes = nutritionHistory.recentMeals.map(m => m.type);
    if (!recentMealTypes.includes(meal.type)) {
      reasons.push('Adds variety to your meal plan');
    }

    // Add regional seasonal reason
    const seasonalInfo = location;
    const mealTags = meal.tags.map(tag => tag.toLowerCase());
    const seasonalMatches = seasonalInfo.seasonalFoods.filter(food => 
      mealTags.includes(food.toLowerCase()) || 
      meal.name.toLowerCase().includes(food.toLowerCase())
    );

    if (seasonalMatches.length > 0) {
      reasons.push(`Features ${seasonalMatches.join(', ')} which are in season in your region`);
    }

    return reasons.join('. ') || 'Balanced meal option';
  }

  async getMealRecommendations(params: RecommendationParams): Promise<MealRecommendation[]> {
    // Check cache first
    const cacheKey = this.getCacheKey(params);
    const cachedRecommendations = this.getFromCache(cacheKey);
    if (cachedRecommendations) {
      return cachedRecommendations;
    }

    const [preferences, nutritionHistory, availableMeals, location] = await Promise.all([
      this.getUserPreferences(params.userId),
      this.getUserNutritionHistory(params.userId),
      this.getAvailableMeals(),
      this.getUserLocation(params.userId)
    ]);

    const recommendations = availableMeals
      .map(meal => ({
        meal,
        score: this.calculateMealScore(meal, preferences, nutritionHistory, location),
        reason: this.generateRecommendationReason(meal, preferences, nutritionHistory, location)
      }))
      .filter(rec => rec.score !== -Infinity)
      .sort((a, b) => b.score - a.score);

    // Cache the results
    this.setCache(cacheKey, recommendations);

    return recommendations;
  }

  async getBatchRecommendations(params: BatchRecommendationParams): Promise<Record<string, MealRecommendation[]>> {
    const startTime = Date.now();
    const results: Record<string, MealRecommendation[]> = {};

    try {
      // Get common data once
      const [preferences, nutritionHistory, availableMeals, location] = await Promise.all([
        this.getUserPreferences(params.userId),
        this.getUserNutritionHistory(params.userId),
        this.getAvailableMeals(),
        this.getUserLocation(params.userId)
      ]);

      // Process each meal type in parallel with rate limiting
      await Promise.all(
        params.mealTypes.map(async (mealType) => {
          await recommendationLimiter.waitForSlot(params.userId);
          const recommendations = availableMeals
            .filter(meal => meal.type === mealType)
            .map(meal => ({
              meal,
              score: this.calculateMealScore(meal, preferences, nutritionHistory, location),
              reason: this.generateRecommendationReason(meal, preferences, nutritionHistory, location)
            }))
            .filter(rec => rec.score !== -Infinity)
            .sort((a, b) => b.score - a.score);
          results[mealType] = recommendations;
        })
      );

      const duration = Date.now() - startTime;
      recordOperationLatency('batch_recommendations', duration);

      return results;
    } catch (error) {
      recordError('batch_recommendations', error instanceof Error ? error.name : 'Unknown');
      throw error;
    }
  }

  public getCacheStats(): CacheMetrics {
    return { ...this.cacheMetrics };
  }

  public resetCacheStats(): void {
    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  public async warmCache(userId: string): Promise<void> {
    if (this.isWarming) {
      return; // Prevent concurrent warming
    }

    try {
      this.isWarming = true;
      const startTime = Date.now();

      // Warm preferences cache
      await this.getUserPreferences(userId);

      // Warm meal recommendations for each meal type
      const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
      await Promise.all(
        mealTypes.map(async (mealType) => {
          const params: RecommendationParams = {
            userId,
            mealType
          };
          await this.getMealRecommendations(params);
        })
      );

      const duration = Date.now() - startTime;
      recordOperationLatency('cache_warming', duration);
    } catch (error) {
      recordError('cache_warming', error instanceof Error ? error.name : 'Unknown');
      throw error;
    } finally {
      this.isWarming = false;
    }
  }

  public isCacheWarming(): boolean {
    return this.isWarming;
  }

  public invalidateUserCache(userId: string): void {
    const startTime = Date.now();
    try {
      // Invalidate preferences cache
      this.preferencesCache.delete(userId);

      // Invalidate all recommendation caches for this user
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${userId}-`)) {
          this.cache.delete(key);
          this.cacheMetrics.evictions++;
        }
      }

      // Invalidate location cache
      this.locationCache.delete(userId);

      const duration = Date.now() - startTime;
      recordOperationLatency('cache_invalidation', duration);
    } catch (error) {
      recordError('cache_invalidation', error instanceof Error ? error.name : 'Unknown');
      throw error;
    }
  }

  public async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    const startTime = Date.now();
    try {
      // Update preferences in database
      await withRetry(async () => {
        await prisma.preferences.upsert({
          where: { userId },
          update: {
            dietaryRestrictions: preferences.dietaryRestrictions?.join(',') || '',
            favoriteFoods: preferences.favoriteFoods?.join(',') || '',
            dislikedFoods: preferences.dislikedFoods?.join(',') || '',
            allergies: preferences.allergies?.join(',') || ''
          },
          create: {
            userId,
            dietaryRestrictions: preferences.dietaryRestrictions?.join(',') || '',
            favoriteFoods: preferences.favoriteFoods?.join(',') || '',
            dislikedFoods: preferences.dislikedFoods?.join(',') || '',
            allergies: preferences.allergies?.join(',') || ''
          }
        });
      }, RETRY_CONFIG);

      // Invalidate caches after successful update
      this.invalidateUserCache(userId);

      const duration = Date.now() - startTime;
      recordOperationLatency('update_preferences', duration);
    } catch (error) {
      recordError('update_preferences', error instanceof Error ? error.name : 'Unknown');
      throw error;
    }
  }

  async generateMealRecommendations(
    userPreferences: UserPreferences,
    nutritionalGoals: NutritionalGoals,
    dietaryRestrictions: string[],
    mealType: string
  ): Promise<Meal[]> {
    try {
      const response = await fetch(this.config.modelEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          userPreferences,
          nutritionalGoals,
          dietaryRestrictions,
          mealType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate meal recommendations');
      }

      const data = await response.json();
      return data.recommendations;
    } catch (error) {
      console.error('Error generating meal recommendations:', error);
      throw error;
    }
  }

  async analyzeNutritionalPatterns(userId: string): Promise<any> {
    try {
      const response = await fetch(`${this.config.modelEndpoint}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze nutritional patterns');
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing nutritional patterns:', error);
      throw error;
    }
  }

  async generateSmartGroceryList(
    mealPlan: Meal[],
    preferences: UserPreferences
  ): Promise<GroceryList> {
    try {
      const response = await fetch(`${this.config.modelEndpoint}/grocery-list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          mealPlan,
          preferences
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate grocery list');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating grocery list:', error);
      throw error;
    }
  }

  async getMealPrepInstructions(meal: Meal): Promise<MealPrepPlan> {
    try {
      const response = await fetch(`${this.config.modelEndpoint}/meal-prep`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({ meal })
      });

      if (!response.ok) {
        throw new Error('Failed to get meal prep instructions');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting meal prep instructions:', error);
      throw error;
    }
  }

  async generateCompleteMealPlan(
    userId: string,
    preferences: UserPreferences,
    goals: NutritionalGoals,
    startDate: Date,
    endDate: Date
  ): Promise<MealPlan> {
    try {
      const response = await fetch(`${this.config.modelEndpoint}/meal-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          userId,
          preferences,
          goals,
          startDate,
          endDate
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate meal plan');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating meal plan:', error);
      throw error;
    }
  }

  async optimizeMealPlan(mealPlan: MealPlan): Promise<MealPlan> {
    try {
      const response = await fetch(`${this.config.modelEndpoint}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({ mealPlan })
      });

      if (!response.ok) {
        throw new Error('Failed to optimize meal plan');
      }

      return await response.json();
    } catch (error) {
      console.error('Error optimizing meal plan:', error);
      throw error;
    }
  }

  async generateMealPlan(params: {
    userId: string;
    preferences: UserPreferences;
    goals: NutritionalGoals;
    startDate: Date;
    endDate: Date;
  }): Promise<MealPlan> {
    return this.generateCompleteMealPlan(
      params.userId,
      params.preferences,
      params.goals,
      params.startDate,
      params.endDate
    );
  }

  async generateGroceryList(meals: Meal[]): Promise<GroceryList> {
    return this.generateSmartGroceryList(meals, {
      dietaryRestrictions: [],
      favoriteFoods: [],
      dislikedFoods: [],
      allergies: []
    });
  }

  async generateMealPrepPlan(meals: Meal[]): Promise<MealPrepPlan[]> {
    const prepPlans: MealPrepPlan[] = [];
    for (const meal of meals) {
      const prepPlan = await this.getMealPrepInstructions(meal);
      prepPlans.push(prepPlan);
    }
    return prepPlans;
  }
}

export default AIRecommendationService; 