import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get('exerciseId');
    const timeRange = searchParams.get('timeRange') || 'week';

    if (!exerciseId) {
      return NextResponse.json(
        { error: 'Exercise ID is required' },
        { status: 400 }
      );
    }

    const startDate = getStartDate(timeRange);

    const [sessions, progress] = await Promise.all([
      prisma.exerciseSession.findMany({
        where: {
          userId: session.user.id,
          exerciseId,
          startTime: {
            gte: startDate,
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      }),
      prisma.exerciseProgress.findMany({
        where: {
          userId: session.user.id,
          exerciseId,
          date: {
            gte: startDate,
          },
        },
        orderBy: {
          date: 'asc',
        },
      }),
    ]);

    const stats = calculateStats(sessions, progress);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching exercise stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getStartDate(timeRange: string): Date {
  const now = new Date();
  switch (timeRange) {
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    case 'week':
    default:
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      return weekStart;
  }
}

function calculateStats(sessions: any[], progress: any[]) {
  const totalSessions = sessions.length;
  const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0);
  const totalCaloriesBurned = sessions.reduce(
    (sum, session) => sum + session.caloriesBurned,
    0
  );

  const intensityMap = {
    low: 1,
    medium: 2,
    high: 3,
  };
  const averageIntensity =
    sessions.reduce(
      (sum, session) => sum + intensityMap[session.intensity],
      0
    ) / totalSessions || 0;

  const progressData = progress.map(p => ({
    date: p.date,
    sets: p.sets,
    reps: p.reps,
    weight: p.weight,
    duration: p.duration,
  }));

  return {
    totalSessions,
    totalDuration,
    totalCaloriesBurned,
    averageIntensity,
    progress: progressData,
  };
} 