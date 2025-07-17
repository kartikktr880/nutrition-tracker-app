import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WaterEntry } from '@prisma/client';

interface Totals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'week';

    // Calculate date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    
    switch (range) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }
    
    startDate.setHours(0, 0, 0, 0);

    // Get food entries for the date range
    const foodEntries = await prisma.foodEntry.findMany({
      where: {
        userId: session.user.id,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        food: true,
      },
    });

    // Get water entries for the date range
    const waterEntries = await prisma.waterEntry.findMany({
      where: {
        userId: session.user.id,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Calculate totals
    const totals = foodEntries.reduce(
      (
        acc: Totals,
        entry: {
          amount: number;
          food: {
            calories: number;
            protein: number;
            carbs: number;
            fat: number;
          };
        },
      ) => {
        const quantity = entry.amount || 1;
        return {
          calories: acc.calories + entry.food.calories * quantity,
          protein: acc.protein + entry.food.protein * quantity,
          carbs: acc.carbs + entry.food.carbs * quantity,
          fat: acc.fat + entry.food.fat * quantity,
        };
      },
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      },
    );

    const totalWater = waterEntries.reduce(
      (sum: number, entry: WaterEntry) => sum + entry.amount,
      0,
    );
    const daysInRange = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Calculate streak (simplified - just count days with entries)
    const uniqueDays = new Set(
      foodEntries.map((entry) => entry.timestamp.toISOString().split('T')[0]),
    );
    const streakDays = uniqueDays.size;

    // Generate weekly data
    const weeklyData = [];
    for (let i = 0; i < Math.min(7, daysInRange); i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dayEntries = foodEntries.filter(
        (entry) => entry.timestamp >= dayStart && entry.timestamp <= dayEnd,
      );

      const dayTotals = dayEntries.reduce(
        (
          acc: Totals,
          entry: {
            amount: number;
            food: {
              calories: number;
              protein: number;
              carbs: number;
              fat: number;
            };
          },
        ) => {
          const quantity = entry.amount || 1;
          return {
            calories: acc.calories + entry.food.calories * quantity,
            protein: acc.protein + entry.food.protein * quantity,
            carbs: acc.carbs + entry.food.carbs * quantity,
            fat: acc.fat + entry.food.fat * quantity,
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      );

      const dayWater =
        waterEntries.find(
          (entry) => entry.timestamp >= dayStart && entry.timestamp <= dayEnd,
        )?.amount || 0;

      weeklyData.push({
        date: currentDate.toISOString().split('T')[0],
        calories: Math.round(dayTotals.calories),
        protein: Math.round(dayTotals.protein * 10) / 10,
        carbs: Math.round(dayTotals.carbs * 10) / 10,
        fat: Math.round(dayTotals.fat * 10) / 10,
        water: dayWater
      });
    }

    const summary = {
      totalCalories: Math.round(totals.calories),
      averageCalories: Math.round(totals.calories / daysInRange),
      totalProtein: Math.round(totals.protein * 10) / 10,
      totalCarbs: Math.round(totals.carbs * 10) / 10,
      totalFat: Math.round(totals.fat * 10) / 10,
      totalWater: totalWater,
      streakDays: streakDays,
      goalAchievement: Math.round((streakDays / daysInRange) * 100)
    };

    return NextResponse.json({
      summary,
      weekly: weeklyData
    });

  } catch (error) {
    // Error fetching analytics data - handled by error boundary
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 