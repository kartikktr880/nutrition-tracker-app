import { z } from 'zod';
import { SearchResultSchema, SearchResult } from './searchService';
import { databaseErrorHandler } from './databaseErrorHandler';
import { recordError } from '@/lib/monitoring';

// Database schemas
const FoodSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const MealSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  foods: z.array(FoodSchema),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

type Food = z.infer<typeof FoodSchema>;
type Meal = z.infer<typeof MealSchema>;

class DatabaseService {
  private static instance: DatabaseService;
  private foods: Map<string, Food>;
  private meals: Map<string, Meal>;

  private constructor() {
    this.foods = new Map();
    this.meals = new Map();
    this.initializeMockData();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private async initializeMockData() {
    try {
      await databaseErrorHandler.withRetry(async () => {
        // Initialize with mock data
        const mockFoods = [
          {
            id: '1',
            name: 'Apple',
            description: 'Fresh red apple',
            calories: 95,
            protein: 0.5,
            carbs: 25,
            fat: 0.3,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          // Add more mock foods as needed
        ];

        for (const food of mockFoods) {
          this.foods.set(food.id, food);
        }
      });
    } catch (error) {
      recordError('database_initialization_failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  public async getFoodById(id: string): Promise<Food | null> {
    try {
      return await databaseErrorHandler.withRetry(async () => {
        return this.foods.get(id) || null;
      });
    } catch (error) {
      recordError('get_food_by_id_failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  public async getAllFoods(): Promise<Food[]> {
    try {
      return await databaseErrorHandler.withRetry(async () => {
        return Array.from(this.foods.values());
      });
    } catch (error) {
      recordError('get_all_foods_failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  public async addFood(food: Omit<Food, 'id' | 'createdAt' | 'updatedAt'>): Promise<Food> {
    try {
      return await databaseErrorHandler.withRetry(async () => {
        const newFood: Food = {
          ...food,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.foods.set(newFood.id, newFood);
        return newFood;
      });
    } catch (error) {
      recordError('add_food_failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  public async updateFood(id: string, food: Partial<Food>): Promise<Food | null> {
    try {
      return await databaseErrorHandler.withRetry(async () => {
        const existingFood = this.foods.get(id);
        if (!existingFood) return null;

        const updatedFood: Food = {
          ...existingFood,
          ...food,
          updatedAt: new Date(),
        };
        this.foods.set(id, updatedFood);
        return updatedFood;
      });
    } catch (error) {
      recordError('update_food_failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  public async deleteFood(id: string): Promise<boolean> {
    try {
      return await databaseErrorHandler.withRetry(async () => {
        return this.foods.delete(id);
      });
    } catch (error) {
      recordError('delete_food_failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  public async searchFoods(query: string): Promise<SearchResult[]> {
    try {
      return await databaseErrorHandler.withRetry(async () => {
        const foods = Array.from(this.foods.values());
        return foods
          .filter(food => 
            food.name.toLowerCase().includes(query.toLowerCase()) ||
            food.description.toLowerCase().includes(query.toLowerCase())
          )
          .map(food => ({
            id: food.id,
            name: food.name,
            description: food.description,
            type: 'food'
          }));
      });
    } catch (error) {
      recordError('search_foods_failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  public async searchMeals(query: string, limit = 10, offset = 0): Promise<SearchResult[]> {
    const meals = Array.from(this.meals.values());
    const filteredMeals = meals.filter(meal => 
      meal.name.toLowerCase().includes(query.toLowerCase()) ||
      meal.description.toLowerCase().includes(query.toLowerCase())
    );

    const paginatedMeals = filteredMeals.slice(offset, offset + limit);
    
    return paginatedMeals.map(meal => ({
      id: meal.id,
      type: 'meal',
      name: meal.name,
      description: meal.description,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
    }));
  }

  public async searchAll(query: string, limit = 10, offset = 0): Promise<SearchResult[]> {
    const [foods, meals] = await Promise.all([
      this.searchFoods(query),
      this.searchMeals(query, limit, offset),
    ]);

    return [...foods, ...meals].slice(0, limit);
  }

  public async getMealById(id: string): Promise<Meal | null> {
    return this.meals.get(id) || null;
  }
}

export const databaseService = DatabaseService.getInstance(); 