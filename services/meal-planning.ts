import AIRecommendationService from './ai-recommendation';
import { prisma } from '@/lib/prisma';
import { withRetry } from '@/lib/retry';
import mealPlanLimiter from '@/lib/rate-limiter';
import { recordOperationLatency, recordError } from '@/lib/monitoring';
import type { Goals } from '@prisma/client';

// Cache configuration
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes
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

interface MealPlanParams {
  userId: string;
  startDate: Date;
  endDate: Date;
  dietaryRestrictions?: string[];
  calorieTarget?: number;
  proteinTarget?: number;
  carbsTarget?: number;
  fatTarget?: number;
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

interface MealPlan {
  date: Date;
  meals: {
    type: string;
    meal: Meal;
    score: number;
    reason: string;
  }[];
}

export class MealPlanningService {
  private aiRecommendation: AIRecommendationService;
  private readonly VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
  private readonly MAX_DAYS = 30;
  private readonly BATCH_SIZE = 7; // Process a week at a time
  private goalsCache: Map<string, CacheEntry<any>> = new Map();
  private cacheMetrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    evictions: 0
  };
  private isWarming = false;

  constructor() {
    this.aiRecommendation = new AIRecommendationService({
      modelEndpoint: process.env.AI_MODEL_ENDPOINT || 'https://api.openai.com/v1/chat/completions',
      apiKey: process.env.AI_API_KEY || ''
    });
  }

  private getFromCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
    const entry = cache.get(key);
    if (!entry) {
      this.cacheMetrics.misses++;
      return null;
    }

    if (Date.now() - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
      this.cacheMetrics.evictions++;
      this.cacheMetrics.misses++;
      return null;
    }

    this.cacheMetrics.hits++;
    return entry.data;
  }

  private setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
    if (cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value;
      if (typeof oldestKey === 'string') {
        cache.delete(oldestKey);
        this.cacheMetrics.evictions++;
      }
    }

    cache.set(key, {
      data,
      timestamp: Date.now()
    });
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

  private async getUserGoals(userId: string) {
    // Check cache first
    const cachedGoals = this.getFromCache(this.goalsCache, userId);
    if (cachedGoals) {
      return cachedGoals;
    }

    const goals = await prisma.goals.findUnique({
      where: { userId }
    });

    if (!goals) {
      throw new Error('User goals not found');
    }

    // Cache the goals
    this.setCache(this.goalsCache, userId, goals);

    return goals;
  }

  private getMealTypes(): string[] {
    return [...this.VALID_MEAL_TYPES];
  }

  private validateDateRange(startDate: Date, endDate: Date): void {
    if (endDate < startDate) {
      throw new Error('End date must be after start date');
    }

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > this.MAX_DAYS) {
      throw new Error(`Date range cannot exceed ${this.MAX_DAYS} days`);
    }
  }

  private calculateDailyTargets(goals: any, mealType: string) {
    const mealTypeRatios = {
      breakfast: 0.25,
      lunch: 0.35,
      dinner: 0.35,
      snack: 0.05
    } as const;

    const ratio = mealTypeRatios[mealType as keyof typeof mealTypeRatios];
    if (!ratio) {
      throw new Error(`Invalid meal type: ${mealType}`);
    }

    return {
      calories: Math.round(goals.calories * ratio),
      protein: Math.round(goals.protein * ratio),
      carbs: Math.round(goals.carbs * ratio),
      fat: Math.round(goals.fat * ratio)
    };
  }

  public async generateMealPlan(params: MealPlanParams): Promise<MealPlan[]> {
    const startTime = Date.now();
    this.validateDateRange(params.startDate, params.endDate);
    const goals = await this.getUserGoals(params.userId);

    try {
      await mealPlanLimiter.waitForSlot(params.userId);
      const mealPlan: MealPlan[] = [];
      const currentDate = new Date(params.startDate);

      // Process in batches of BATCH_SIZE days
      while (currentDate <= params.endDate) {
        const batchEndDate = new Date(currentDate);
        batchEndDate.setDate(batchEndDate.getDate() + this.BATCH_SIZE - 1);
        if (batchEndDate > params.endDate) {
          batchEndDate.setTime(params.endDate.getTime());
        }

        const batchMealPlan = await this.generateBatchMealPlan(
          currentDate,
          batchEndDate,
          params.userId,
          goals
        );

        mealPlan.push(...batchMealPlan);
        currentDate.setDate(batchEndDate.getDate() + 1);
      }

      const duration = Date.now() - startTime;
      recordOperationLatency('generate_meal_plan', duration);

      return mealPlan;
    } catch (error) {
      recordError('generate_meal_plan', error instanceof Error ? error.name : 'Unknown');
      throw error;
    }
  }

  private async generateBatchMealPlan(
    startDate: Date,
    endDate: Date,
    userId: string,
    goals: any
  ): Promise<MealPlan[]> {
    const batchMealPlan: MealPlan[] = [];
    const currentDate = new Date(startDate);
    const usedMeals = new Set<string>(); // Track used meals for variety

    while (currentDate <= endDate) {
      const dayMeals = [];
      let dailyCalories = 0;
      let dailyProtein = 0;
      let dailyCarbs = 0;
      let dailyFat = 0;

      // Get recommendations for all meal types in one batch
      const recommendations = await this.aiRecommendation.getBatchRecommendations({
        userId,
        mealTypes: this.getMealTypes()
      });

      for (const mealType of this.getMealTypes()) {
        const targets = this.calculateDailyTargets(goals, mealType);
        const mealRecommendations = recommendations[mealType] || [];

        // Find the best meal that hasn't been used recently and fits nutritional targets
        const bestMeal = mealRecommendations.find(rec => {
          const meal = rec.meal;
          const isNewMeal = !usedMeals.has(meal.id);
          const fitsCalories = dailyCalories + meal.calories <= goals.calories;
          const fitsProtein = dailyProtein + meal.protein <= goals.protein;
          const fitsCarbs = dailyCarbs + meal.carbs <= goals.carbs;
          const fitsFat = dailyFat + meal.fat <= goals.fat;

          return isNewMeal && fitsCalories && fitsProtein && fitsCarbs && fitsFat;
        });

        if (bestMeal) {
          const meal = bestMeal.meal;
          usedMeals.add(meal.id);
          dailyCalories += meal.calories;
          dailyProtein += meal.protein;
          dailyCarbs += meal.carbs;
          dailyFat += meal.fat;

          dayMeals.push({
            type: mealType,
            meal,
            score: bestMeal.score,
            reason: bestMeal.reason
          });
        }
      }

      batchMealPlan.push({
        date: new Date(currentDate),
        meals: dayMeals
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return batchMealPlan;
  }

  public async saveMealPlan(userId: string, mealPlan: MealPlan[]) {
    const nutritionLogs = mealPlan.flatMap(day => 
      day.meals.map(meal => ({
        userId,
        date: day.date,
        mealType: meal.type,
        calories: meal.meal.calories,
        protein: meal.meal.protein,
        carbs: meal.meal.carbs,
        fat: meal.meal.fat
      }))
    );

    try {
      await prisma.nutritionLog.createMany({
        data: nutritionLogs
      });
    } catch (error) {
      console.error('Error saving meal plan:', error);
      throw new Error('Failed to save meal plan');
    }
  }

  public async warmCache(userId: string): Promise<void> {
    if (this.isWarming) {
      return; // Prevent concurrent warming
    }

    try {
      this.isWarming = true;
      const startTime = Date.now();

      // Warm user goals cache
      await this.getUserGoals(userId);

      // Warm AI recommendation cache
      await this.aiRecommendation.warmCache(userId);

      const duration = Date.now() - startTime;
      recordOperationLatency('meal_plan_cache_warming', duration);
    } catch (error) {
      recordError('meal_plan_cache_warming', error instanceof Error ? error.name : 'Unknown');
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
      // Invalidate goals cache
      this.goalsCache.delete(userId);
      this.cacheMetrics.evictions++;

      // Invalidate AI recommendation cache
      this.aiRecommendation.invalidateUserCache(userId);

      const duration = Date.now() - startTime;
      recordOperationLatency('meal_plan_cache_invalidation', duration);
    } catch (error) {
      recordError('meal_plan_cache_invalidation', error instanceof Error ? error.name : 'Unknown');
      throw error;
    }
  }

  public async updateUserGoals(userId: string, goals: Partial<Goals>): Promise<void> {
    const startTime = Date.now();
    try {
      // Update goals in database
      await withRetry(async () => {
        await prisma.goals.upsert({
          where: { userId },
          update: goals,
          create: {
            userId,
            calories: goals.calories ?? 2000,
            protein: goals.protein ?? 150,
            carbs: goals.carbs ?? 250,
            fat: goals.fat ?? 70,
            ...goals
          }
        });
      }, {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 5000,
        backoffFactor: 2
      });

      // Invalidate caches after successful update
      this.invalidateUserCache(userId);

      const duration = Date.now() - startTime;
      recordOperationLatency('update_goals', duration);
    } catch (error) {
      recordError('update_goals', error instanceof Error ? error.name : 'Unknown');
      throw error;
    }
  }
} 