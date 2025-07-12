import { logError, logWarn, logInfo, logDebug } from '../../utils/logger';
import { prisma } from '../../lib/prisma';
import { getSession } from 'next-auth/react';
import { AIRecommendationEngine } from './aiEngine';
import { MealRecommendation, UserPreferences, NutritionalNeeds } from './types';

interface NutritionLog {
  id: string;
  userId: string;
  date: Date;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  satisfactionRating?: number;
}

class RecommendationService {
  private static instance: RecommendationService;
  private cache: Map<string, { recommendations: MealRecommendation[]; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private isDisposed = false;
  private requestQueue: Map<string, Promise<MealRecommendation[]>> = new Map();
  private readonly RATE_LIMIT = 10; // requests per minute
  private requestCounts: Map<string, { count: number; timestamp: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private aiEngine: AIRecommendationEngine;

  private constructor() {
    this.aiEngine = AIRecommendationEngine.getInstance();
    
    // Add cleanup on process exit
    process.on('beforeExit', () => {
      this.dispose();
    });

    // Cleanup old rate limit entries every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupRateLimits();
    }, 60 * 60 * 1000);
  }

  private cleanupRateLimits() {
    const now = Date.now();
    for (const [userId, data] of this.requestCounts.entries()) {
      if (now - data.timestamp > 60 * 60 * 1000) { // 1 hour
        this.requestCounts.delete(userId);
      }
    }
  }

  public static getInstance(): RecommendationService {
    if (!RecommendationService.instance) {
      RecommendationService.instance = new RecommendationService();
    }
    return RecommendationService.instance;
  }

  public dispose() {
    if (this.isDisposed) return;
    
    // Clear all data structures
    this.cache.clear();
    this.requestQueue.clear();
    this.requestCounts.clear();
    
    // Clear intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.isDisposed = true;
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userRequests = this.requestCounts.get(userId) || { count: 0, timestamp: now };
    
    // Reset count if a minute has passed
    if (now - userRequests.timestamp > 60000) {
      userRequests.count = 0;
      userRequests.timestamp = now;
    }

    // Check if rate limit exceeded
    if (userRequests.count >= this.RATE_LIMIT) {
      return false;
    }

    // Increment count
    userRequests.count++;
    this.requestCounts.set(userId, userRequests);
    return true;
  }

  public async getMealRecommendations(
    userId: string,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    count = 5
  ): Promise<MealRecommendation[]> {
    if (this.isDisposed) {
      throw new Error('Service has been disposed');
    }

    // Check rate limit
    if (!this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded. Please try again in a minute.');
    }

    const cacheKey = `${userId}-${mealType}`;

    // Check if there's already a request in progress
    const existingRequest = this.requestQueue.get(cacheKey);
    if (existingRequest) {
      return existingRequest;
    }

    // Create new request
    const request = (async () => {
      try {
        // Validate inputs
        if (!userId) {
          throw new Error('User ID is required');
        }

        if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
          throw new Error('Invalid meal type');
        }

        if (count < 1 || count > 20) {
          throw new Error('Count must be between 1 and 20');
        }

        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
          return cached.recommendations.slice(0, count);
        }

        // Get user's nutrition history and goals with timeout
        const timeout = 5000; // 5 seconds
        const [nutritionHistory, goals, preferences] = await Promise.race([
          Promise.all([
            this.getNutritionHistory(userId),
            this.getUserGoals(userId),
            this.getUserPreferences(userId)
          ]),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database query timeout')), timeout)
          )
        ]) as [any[], any, any];

        // Calculate nutritional needs
        const needs = this.calculateNutritionalNeeds(nutritionHistory, goals, mealType);

        // Generate recommendations using AI engine
        const recommendations = await this.aiEngine.generateRecommendations(
          userId,
          mealType,
          preferences,
          needs,
          count
        );

        // Cache the results
        this.cache.set(cacheKey, {
          recommendations,
          timestamp: Date.now()
        });

        return recommendations;
      } catch (error) {
        logError('Error getting meal recommendations:', error instanceof Error ? error : new Error(String(error)));
        if (error instanceof Error && error.message.includes('Database query timeout')) {
          // Return cached data if available, even if expired
          const cached = this.cache.get(cacheKey);
          if (cached) {
            logWarn('Using expired cache due to database timeout');
            return cached.recommendations.slice(0, count);
          }
        }
        throw error;
      } finally {
        // Clean up request queue
        this.requestQueue.delete(cacheKey);
      }
    })();

    // Store request in queue
    this.requestQueue.set(cacheKey, request);
    return request;
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    retries: number = this.MAX_RETRIES
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isDatabaseError(error)) {
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        return this.retryOperation(operation, retries - 1);
      }
      throw error;
    }
  }

  private isDatabaseError(error: any): boolean {
    return error instanceof Error && (
      error.message.includes('PrismaClientInitializationError') ||
      error.message.includes('P1001') || // Connection error
      error.message.includes('P1002') || // Connection timeout
      error.message.includes('P1008') || // Connection timeout
      error.message.includes('P1017')    // Server closed connection
    );
  }

  private async getNutritionHistory(userId: string): Promise<NutritionLog[]> {
    return this.retryOperation(async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const logs = await prisma.nutritionLog.findMany({
          where: { userId },
          orderBy: { date: 'desc' },
          take: 100
        });
        return logs.map(log => ({
          ...log,
          satisfactionRating: log.satisfactionRating === null ? undefined : log.satisfactionRating,
        }));
      } catch (error) {
        logError('Error fetching nutrition history:', error instanceof Error ? error : new Error(String(error)));
        if (this.isDatabaseError(error)) {
          throw error; // Let retry logic handle it
        }
        return [];
      }
    });
  }

  private async getUserGoals(userId: string) {
    return this.retryOperation(async () => {
      try {
        return await prisma.goals.findUnique({
          where: { userId }
        });
      } catch (error) {
        logError('Error fetching user goals:', error instanceof Error ? error : new Error(String(error)));
        if (this.isDatabaseError(error)) {
          throw error; // Let retry logic handle it
        }
        return null;
      }
    });
  }

  private async getUserPreferences(userId: string) {
    return this.retryOperation(async () => {
      try {
        return await prisma.userPreferences.findUnique({
          where: { userId }
        });
      } catch (error) {
        logError('Error fetching user preferences:', error);
        if (this.isDatabaseError(error)) {
          throw error; // Let retry logic handle it
        }
        return null;
      }
    });
  }

  private calculateNutritionalNeeds(
    history: any[],
    goals: any,
    mealType: string
  ): { calories: number; protein: number; carbs: number; fat: number } {
    const dailyGoal = goals?.calorieGoal || 2000;
    const mealTypeRatios = {
      breakfast: 0.25,
      lunch: 0.35,
      dinner: 0.35,
      snack: 0.05
    };

    const ratio = mealTypeRatios[mealType as keyof typeof mealTypeRatios];
    const targetCalories = dailyGoal * ratio;

    return {
      calories: targetCalories,
      protein: (targetCalories * 0.3) / 4, // 30% of calories from protein
      carbs: (targetCalories * 0.45) / 4, // 45% of calories from carbs
      fat: (targetCalories * 0.25) / 9 // 25% of calories from fat
    };
  }

  public clearCache(userId: string) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}-`)) {
        this.cache.delete(key);
      }
    }
  }
}

export default RecommendationService; 