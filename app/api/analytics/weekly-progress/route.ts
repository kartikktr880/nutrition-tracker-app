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

    // Calculate date range for the last 7 days
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const weeklyProgress = [];

    // Generate data for each day of the week
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Get food entries for this day
      const foodEntries = await prisma.foodEntry.findMany({
        where: {
          userId: session.user.email,
          createdAt: {
            gte: dayStart,
            lte: dayEnd
          }
        },
        include: {
          food: true
        }
      });

      // Calculate total calories for the day
      const totalCalories = foodEntries.reduce((sum, entry) => {
        const quantity = entry.amount || 1;
        return sum + (entry.food.calories * quantity);
      }, 0);

      // Get water intake for this day
      const waterEntry = await prisma.waterEntry.findFirst({
        where: {
          userId: session.user.email,
          timestamp: dayStart
        }
      });

      // Get exercise minutes for this day (placeholder for future implementation)
      const exerciseMinutes = 0; // TODO: Implement exercise tracking

      weeklyProgress.push({
        date: currentDate.toISOString().split('T')[0],
        calories: Math.round(totalCalories),
        water: waterEntry?.amount || 0,
        exercise: exerciseMinutes
      });
    }

    return NextResponse.json(weeklyProgress);

  } catch (error) {
    // Error fetching weekly progress - handled by error boundary
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 