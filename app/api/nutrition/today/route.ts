import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get user's food entries for today
    const foodEntries = await prisma.foodEntry.findMany({
      where: {
        userId: session.user.email,
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        food: true
      }
    });

    // Calculate totals
    const totals = foodEntries.reduce((acc, entry) => {
      const quantity = entry.amount || 1;
      return {
        calories: acc.calories + (entry.food.calories * quantity),
        protein: acc.protein + (entry.food.protein * quantity),
        carbs: acc.carbs + (entry.food.carbs * quantity),
        fat: acc.fat + (entry.food.fat * quantity),
        fiber: acc.fiber + (entry.food.fiber * quantity),
      };
    }, {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    });

    // Get water intake for today
    const waterEntry = await prisma.waterEntry.findFirst({
      where: {
        userId: session.user.email,
        timestamp: today
      }
    });

    const waterIntake = waterEntry?.amount || 0;

    return NextResponse.json({
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
      fiber: Math.round(totals.fiber * 10) / 10,
      water: waterIntake
    });

  } catch (error) {
    // Error fetching today's nutrition - handled by error boundary
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 