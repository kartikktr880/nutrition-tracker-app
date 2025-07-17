import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { userGoalsSchema } from '@/lib/validations';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's nutrition goals
    const userGoals = await prisma.goals.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    // Return default goals if none exist
    if (!userGoals) {
      return NextResponse.json({
        calories: 2000,
        protein: 150,
        carbs: 250,
        fat: 65,
        water: 2000 // Only in default, not from DB
      });
    }

    return NextResponse.json({
      calories: userGoals.calories,
      protein: userGoals.protein,
      carbs: userGoals.carbs,
      fat: userGoals.fat
      // No water property from DB
    });
  } catch (error) {
    // Error fetching user goals - handled by error boundary
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate input using Zod
    const validationResult = userGoalsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const { calories, protein, carbs, fat } = validationResult.data;

    // Update or create user goals
    const userGoals = await prisma.goals.upsert({
      where: {
        userId: session.user.id,
      },
      update: {
        calories,
        protein,
        carbs,
        fat
        // No water property
      },
      create: {
        userId: session.user.id,
        calories,
        protein,
        carbs,
        fat
        // No water property
      },
    });

    return NextResponse.json({
      message: 'Goals updated successfully',
      goals: userGoals,
    });
  } catch (error) {
    // Error updating user goals - handled by error boundary
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
} 