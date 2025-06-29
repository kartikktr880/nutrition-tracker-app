import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
// import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = { user: { id: 'mock-user-id', name: 'Test User', email: 'test@example.com' } };
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get('exerciseId');
    const timeRange = searchParams.get('timeRange') || 'week';

    if (!exerciseId) {
      return NextResponse.json(
        { error: 'Exercise ID is required' },
        { status: 500 }
      );
    }

    const startDate = getStartDate(timeRange);

    const [sessions, progress] = await Promise.all([
      prisma.any.findMany({
        where: {
          userId: (session.user as any).id,
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
          userId: (session.user as any).id,
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
  } catch (error: unknown) {
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

  const intensityMap: { [key: string]: number } = {
    low: 1,
    medium: 2,
    high: 3,
  };
  const averageIntensity =
    sessions.reduce(
      (sum, session) => sum + (intensityMap[session.intensity as string] || 0),
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










