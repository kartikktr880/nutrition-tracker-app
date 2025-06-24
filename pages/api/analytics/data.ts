import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.user.id;

    // Get date range from query params or default to last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Fetch nutrition data
    const nutritionData = await prisma.nutritionLog.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Fetch goals
    const goals = await prisma.goals.findUnique({
      where: { userId }
    });

    // Process nutrition data
    const processedData = {
      nutrition: {
        calories: nutritionData.map(log => log.calories),
        protein: nutritionData.map(log => log.protein),
        carbs: nutritionData.map(log => log.carbs),
        fat: nutritionData.map(log => log.fat),
        dates: nutritionData.map(log => log.date.toISOString().split('T')[0])
      },
      goals: {
        current: nutritionData.reduce((sum, log) => sum + log.calories, 0) / nutritionData.length || 0,
        target: goals?.calorieGoal || 2000,
        progress: goals ? (nutritionData.reduce((sum, log) => sum + log.calories, 0) / nutritionData.length) / goals.calorieGoal * 100 : 0
      },
      trends: {
        weekly: calculateWeeklyTrends(nutritionData),
        monthly: calculateMonthlyTrends(nutritionData)
      }
    };

    // Cache the response
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(processedData);

  } catch (error) {
    console.error('Analytics data error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function calculateWeeklyTrends(data: any[]): Record<string, number> {
  const trends: Record<string, number> = {};
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  // Group data by day
  const dailyData = data.reduce((acc: Record<string, number[]>, log: any) => {
    const date = log.date.toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log.calories);
    return acc;
  }, {});

  // Calculate daily averages
  Object.entries(dailyData).forEach(([date, calories]) => {
    trends[date] = calories.reduce((sum, val) => sum + val, 0) / calories.length;
  });

  return trends;
}

function calculateMonthlyTrends(data: any[]): Record<string, number> {
  const trends: Record<string, number> = {};
  const now = new Date();
  const monthStart = new Date(now);
  monthStart.setDate(now.getDate() - 30);

  // Group data by week
  const weeklyData = data.reduce((acc: Record<string, number[]>, log: any) => {
    const date = new Date(log.date);
    const weekNumber = Math.floor((date.getTime() - monthStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const weekKey = `Week ${weekNumber + 1}`;
    
    if (!acc[weekKey]) {
      acc[weekKey] = [];
    }
    acc[weekKey].push(log.calories);
    return acc;
  }, {});

  // Calculate weekly averages
  Object.entries(weeklyData).forEach(([week, calories]) => {
    trends[week] = calories.reduce((sum, val) => sum + val, 0) / calories.length;
  });

  return trends;
} 