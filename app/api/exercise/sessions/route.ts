import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { logError } from '@/utils/logger';

export async function GET(request: Request) {
  try {
    const session = { user: { id: 'mock-user-id', name: 'Test User', email: 'test@example.com' } };
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get('exerciseId');

    if (!exerciseId) {
      return NextResponse.json(
        { error: 'Exercise ID is required' },
        { status: 500 }
      );
    }

    const sessions = await prisma.exerciseSession.findMany({
      where: {
        userId: session.user.id,
        // exerciseId removed because it does not exist in the model
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    return NextResponse.json(sessions);
  } catch (error: unknown) {
    logError('Error fetching exercise sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = { user: { id: 'mock-user-id', name: 'Test User', email: 'test@example.com' } };
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 500 });
    }

    const data = await request.json();
    const {
      exerciseId,
      startTime,
      endTime,
      sets,
      reps,
      weight,
      duration,
      intensity,
      notes,
    } = data;

    if (!exerciseId || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 500 }
      );
    }

    const newSession = await prisma.exerciseSession.create({
      data: {
        userId: session.user.id,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        notes,
        caloriesBurned: calculateCaloriesBurned(
          duration,
          intensity,
          weight,
          sets,
          reps
        ),
        exercises: [],
        totalDuration: duration,
      },
    });

    return NextResponse.json(newSession);
  } catch (error: unknown) {
    logError('Error creating exercise session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateCaloriesBurned(
  duration: number,
  intensity: 'low' | 'medium' | 'high',
  weight: number,
  sets: number,
  reps: number
): number {
  // Base MET values for different intensity levels
  const metValues = {
    low: 3.5,
    medium: 5.0,
    high: 7.0,
  };

  // Calculate total work (weight * reps * sets)
  const totalWork = weight * reps * sets;

  // Calculate calories burned using MET formula
  // Calories = MET * weight (kg) * duration (hours)
  const caloriesPerHour = metValues[intensity] * weight;
  const caloriesBurned = (caloriesPerHour * duration) / 60;

  // Add bonus calories for total work
  const workBonus = totalWork * 0.01;

  return Math.round(caloriesBurned + workBonus);
} 










