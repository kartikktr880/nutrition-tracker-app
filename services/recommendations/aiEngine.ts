import { prisma } from '@/lib/prisma';
import { MealRecommendation, UserPreferences } from './types';

interface AIModelConfig {
  learningRate: number;
  batchSize: number;
  epochs: number;
  minConfidence: number;
}

export class AIRecommendationEngine {
  private static instance: AIRecommendationEngine;
  private modelConfig: AIModelConfig = {
    learningRate: 0.001,
    batchSize: 32,
    epochs: 100,
    minConfidence: 0.7
  };
  private modelCache: Map<string, any> = new Map();
  private readonly MODEL_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  public static getInstance(): AIRecommendationEngine {
    if (!AIRecommendationEngine.instance) {
      AIRecommendationEngine.instance = new AIRecommendationEngine();
    }
    return AIRecommendationEngine.instance;
  }

  public async generateRecommendations(
    userId: string,
    mealType: string,
    preferences: UserPreferences,
    nutritionalNeeds: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    },
    count: number
  ): Promise<MealRecommendation[]> {
    try {
      // Get or create user's model
      const model = await this.getUserModel(userId);

      // Get historical data for training
      const historicalData = await this.getHistoricalData(userId);

      // Update model with new data
      await this.updateModel(model, historicalData);

      // Generate recommendations
      const recommendations = await this.predictRecommendations(
        model,
        mealType,
        preferences,
        nutritionalNeeds,
        count
      );

      // Filter and sort recommendations
      return this.filterAndSortRecommendations(recommendations, preferences);
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      throw new Error('Failed to generate AI recommendations');
    }
  }

  private async getUserModel(userId: string): Promise<any> {
    const cachedModel = this.modelCache.get(userId);
    if (cachedModel && Date.now() - cachedModel.timestamp < this.MODEL_CACHE_DURATION) {
      return cachedModel.model;
    }

    // Create new model or load from database
    const model = await this.createOrLoadModel(userId);
    this.modelCache.set(userId, {
      model,
      timestamp: Date.now()
    });

    return model;
  }

  private async createOrLoadModel(userId: string): Promise<any> {
    // In a real implementation, this would load or create a machine learning model
    // For now, we'll use a simple rule-based system that we can enhance later
    return {
      type: 'rule-based',
      rules: await this.generateRules(userId)
    };
  }

  private async generateRules(userId: string): Promise<any[]> {
    const userHistory = await prisma.nutritionLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 100
    });

    const rules = [];

    // Generate rules based on user's successful meal patterns
    for (const log of userHistory) {
      if (log.satisfactionRating && log.satisfactionRating >= 4) {
        rules.push({
          pattern: {
            mealType: log.mealType,
            macros: {
              protein: log.protein,
              carbs: log.carbs,
              fat: log.fat
            },
            timeOfDay: new Date(log.date).getHours()
          },
          weight: log.satisfactionRating
        });
      }
    }

    return rules;
  }

  private async getHistoricalData(userId: string): Promise<any[]> {
    return prisma.nutritionLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 1000
    });
  }

  private async updateModel(model: any, historicalData: any[]): Promise<void> {
    // In a real implementation, this would update the machine learning model
    // For now, we'll just update our rule-based system
    model.rules = await this.generateRules(historicalData[0]?.userId);
  }

  private async predictRecommendations(
    model: any,
    mealType: string,
    preferences: UserPreferences,
    nutritionalNeeds: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    },
    count: number
  ): Promise<MealRecommendation[]> {
    // Get potential meals from database
    const potentialMeals = await prisma.meal.findMany({
      where: {
        mealType,
        calories: {
          gte: nutritionalNeeds.calories * 0.8,
          lte: nutritionalNeeds.calories * 1.2
        }
      },
      take: 100
    });

    // Score meals based on model and preferences
    const scoredMeals = potentialMeals.map((meal: any) => ({
      ...meal,
      confidence: this.calculateConfidence(meal, model, preferences, nutritionalNeeds),
      reason: this.generateRecommendationReason(meal, model, preferences)
    }));

    // Return top N recommendations
    return scoredMeals
      .sort((a: any, b: any) => b.confidence - a.confidence)
      .slice(0, count);
  }

  private calculateConfidence(
    meal: any,
    model: any,
    preferences: UserPreferences,
    nutritionalNeeds: any
  ): number {
    let confidence = 0.5; // Base confidence

    // Check against user preferences
    if (preferences.favoriteFoods.includes(meal.name)) {
      confidence += 0.2;
    }
    if (preferences.dislikedFoods.includes(meal.name)) {
      confidence -= 0.3;
    }

    // Check nutritional balance
    const macroBalance = this.calculateMacroBalance(meal, nutritionalNeeds);
    confidence += macroBalance * 0.2;

    // Check against historical patterns
    const patternMatch = this.checkPatternMatch(meal, model);
    confidence += patternMatch * 0.1;

    return Math.min(Math.max(confidence, 0), 1);
  }

  private calculateMacroBalance(meal: any, needs: any): number {
    const proteinBalance = 1 - Math.abs(meal.protein - needs.protein) / needs.protein;
    const carbsBalance = 1 - Math.abs(meal.carbs - needs.carbs) / needs.carbs;
    const fatBalance = 1 - Math.abs(meal.fat - needs.fat) / needs.fat;

    return (proteinBalance + carbsBalance + fatBalance) / 3;
  }

  private checkPatternMatch(meal: any, model: any): number {
    if (model.type !== 'rule-based') return 0;

    let matchScore = 0;
    for (const rule of model.rules) {
      if (rule.pattern.mealType === meal.mealType) {
        const macroMatch = this.calculateMacroMatch(meal, rule.pattern.macros);
        matchScore += macroMatch * rule.weight;
      }
    }

    return Math.min(matchScore / model.rules.length, 1);
  }

  private calculateMacroMatch(meal: any, pattern: any): number {
    const proteinMatch = 1 - Math.abs(meal.protein - pattern.protein) / pattern.protein;
    const carbsMatch = 1 - Math.abs(meal.carbs - pattern.carbs) / pattern.carbs;
    const fatMatch = 1 - Math.abs(meal.fat - pattern.fat) / pattern.fat;

    return (proteinMatch + carbsMatch + fatMatch) / 3;
  }

  private generateRecommendationReason(meal: any, model: any, preferences: UserPreferences): string {
    const reasons = [];

    if (preferences.favoriteFoods.includes(meal.name)) {
      reasons.push('Based on your favorite foods');
    }

    const macroBalance = this.calculateMacroBalance(meal, {
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat
    });

    if (macroBalance > 0.8) {
      reasons.push('Excellent nutritional balance');
    } else if (macroBalance > 0.6) {
      reasons.push('Good nutritional balance');
    }

    const patternMatch = this.checkPatternMatch(meal, model);
    if (patternMatch > 0.8) {
      reasons.push('Matches your successful meal patterns');
    }

    return reasons.join('. ') || 'Recommended based on your preferences and goals';
  }

  private filterAndSortRecommendations(
    recommendations: MealRecommendation[],
    preferences: UserPreferences
  ): MealRecommendation[] {
    return recommendations
      .filter(rec => {
        // Filter out meals with allergens
        if (preferences.allergies.some(allergy => 
          rec.name.toLowerCase().includes(allergy.toLowerCase())
        )) {
          return false;
        }

        // Filter out meals that violate dietary restrictions
        if (preferences.dietaryRestrictions.some(restriction =>
          rec.name.toLowerCase().includes(restriction.toLowerCase())
        )) {
          return false;
        }

        return true;
      })
      .sort((a, b) => b.confidence - a.confidence);
  }
} 