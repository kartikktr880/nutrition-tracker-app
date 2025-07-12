import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MealPlanningService } from '@/services/meal-planning';

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

interface PlannedMeal {
  type: string;
  meal: Meal;
  score: number;
  reason: string;
}

const defaultMeal: Meal = {
  id: '',
  name: '',
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  type: '',
  tags: [],
};

const mealPlanningService = new MealPlanningService();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { startDate, endDate } = body;

    // Generate meal plan using the service
    const mealPlan = await mealPlanningService.generateMealPlan({
      userId: user.id,
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });

    // Save the meal plan
    await mealPlanningService.saveMealPlan(user.id, mealPlan.map(plan => ({
      date: plan.date || new Date(),
      meals: plan.meals ? plan.meals.map((meal: PlannedMeal) => {
        return {
          type: meal.type || '',
          meal: meal.meal || defaultMeal,
          score: meal.score || 0,
          reason: meal.reason || '',
        };
      }) : [],
    })));

    return NextResponse.json({ mealPlan });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 







