import { NextResponse } from 'next/server';
import { MealPlanningService } from '@/services/meal-planning';
import { z } from 'zod';

// Input validation schemas
const mealPlanRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date'),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid end date'),
  dietaryRestrictions: z.array(z.string()).optional()
});

const saveMealPlanSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  mealPlan: z.array(z.object({
    date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
    meals: z.array(z.object({
      type: z.string(),
      meal: z.object({
        name: z.string(),
        calories: z.number(),
        protein: z.number(),
        carbs: z.number(),
        fat: z.number()
      }),
      score: z.number(),
      reason: z.string()
    }))
  }))
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = mealPlanRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 500 }
      );
    }

    const { userId, startDate, endDate, dietaryRestrictions } = validationResult.data;

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 500 }
      );
    }

    // Check if date range is too long (e.g., max 30 days)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 30) {
      return NextResponse.json(
        { error: 'Date range cannot exceed 30 days' },
        { status: 500 }
      );
    }

    const mealPlanningService = new MealPlanningService();
    const mealPlan = await mealPlanningService.generateMealPlan({
      userId,
      startDate: start,
      endDate: end,
      dietaryRestrictions
    });

    return NextResponse.json({ mealPlan });
  } catch (error: unknown) {
    console.error('Error generating meal plan:', error);
    return NextResponse.json(
      { error: 'Failed to generate meal plan', details: error instanceof Error ? (error as Error).message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = saveMealPlanSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 500 }
      );
    }

    const { userId, mealPlan } = validationResult.data;

    const mealPlanningService = new MealPlanningService();
    await mealPlanningService.saveMealPlan(userId, mealPlan as any);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error saving meal plan:', error);
    return NextResponse.json(
      { error: 'Failed to save meal plan', details: error instanceof Error ? (error as Error).message : 'Unknown error' },
      { status: 500 }
    );
  }
} 







