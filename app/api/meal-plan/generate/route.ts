import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
// import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { MealPlan, UserPreferences, NutritionalGoals } from '@/types/meal-plan';

export async function POST(req: Request) {
  try {
    const session = { user: { id: 'mock-user-id', name: 'Test User', email: 'test@example.com' } };
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 500 });
    }

    const { preferences, nutritionalGoals, userId } = await req.json();

    // Validate input
    if (!preferences || !nutritionalGoals || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 500 }
      );
    }

    // Generate meal plan using AI/ML model
    const mealPlan = await generateMealPlan(preferences, nutritionalGoals);

    // Save meal plan to database
    const savedPlan = await prisma.mealPlan.create({
      data: {
        userId,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        meals: mealPlan.meals,
        nutritionalGoals: mealPlan.nutritionalGoals,
        preferences: mealPlan.preferences,
        totalNutritionalInfo: mealPlan.totalNutritionalInfo,
      },
    });

    return NextResponse.json(savedPlan);
  } catch (error: unknown) {
    console.error('Error generating meal plan:', error);
    return NextResponse.json(
      { error: 'Failed to generate meal plan' },
      { status: 500 }
    );
  }
}

async function generateMealPlan(
  preferences: UserPreferences,
  nutritionalGoals: NutritionalGoals
): Promise<MealPlan> {
  // TODO: Implement AI/ML model for meal plan generation
  // For now, return a mock meal plan
  return {
    id: 'mock-id',
    userId: 'mock-user-id',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    meals: {},
    nutritionalGoals,
    preferences,
    totalNutritionalInfo: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
} 








