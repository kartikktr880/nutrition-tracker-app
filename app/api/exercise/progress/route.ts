import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import type { ExerciseProgress, ExerciseGoal } from '@/types/exercise';

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

    const progress = await prisma.exerciseProgress.findMany({
      where: {
        userId: session.user.id,
        exerciseId,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json(progress);
  } catch (error: unknown) {
    // logInfo('Error fetching exercise progress:', error); // Removed logInfo
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

    const data: ExerciseProgress = await request.json();
    const {
      exerciseId,
      date,
      sets,
      reps,
      weight,
      duration,
      intensity,
      notes,
    } = data;

    if (!exerciseId || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 500 }
      );
    }

    const newProgress = await prisma.exerciseProgress.create({
      data: {
        userId: session.user.id,
        exerciseId,
        date: new Date(date),
        sets,
        reps,
        weight,
        duration,
        intensity: Number(intensity),
        notes,
      },
    });

    // Update related goals
    await updateGoals(session.user.id, exerciseId, {
      ...newProgress,
      date: newProgress.date instanceof Date ? newProgress.date.toISOString() : newProgress.date,
      notes: newProgress.notes ?? undefined,
      createdAt: newProgress.createdAt instanceof Date ? newProgress.createdAt.toISOString() : newProgress.createdAt,
      updatedAt: newProgress.updatedAt instanceof Date ? newProgress.updatedAt.toISOString() : newProgress.updatedAt,
    });

    return NextResponse.json(newProgress);
  } catch (error: unknown) {
    // logInfo('Error creating exercise progress:', error); // Removed logInfo
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function updateGoals(
  userId: string,
  exerciseId: string,
  progress: ExerciseProgress
) {
  try {
    const goals = await prisma.exerciseGoal.findMany({
      where: {
        userId,
        exerciseId,
        status: 'in-progress',
      },
    });

    for (const goal of goals) {
      const progressPercentage = calculateGoalProgress(goal as unknown as ExerciseGoal, progress);
      const status = progressPercentage >= 100 ? 'completed' : 'in-progress';

      await prisma.exerciseGoal.update({
        where: { id: goal.id },
        data: {
          progress: progressPercentage,
          status,
        },
      });
    }
  } catch (error: unknown) {
    // logInfo('Error updating goals:', error); // Removed logInfo
  }
}

function calculateGoalProgress(goal: ExerciseGoal, progress: ExerciseProgress): number {
  const setsProgress = (progress.sets / goal.targetSets) * 100;
  const repsProgress = (progress.reps / goal.targetReps) * 100;
  const weightProgress = (progress.weight / goal.targetWeight) * 100;
  const durationProgress = (progress.duration / goal.targetDuration) * 100;

  return (setsProgress + repsProgress + weightProgress + durationProgress) / 4;
} 









