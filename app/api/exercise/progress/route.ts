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

    if (!exerciseId) {
      return NextResponse.json(
        { error: 'Exercise ID is required' },
        { status: 400 }
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
  } catch (error) {
    console.error('Error fetching exercise progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
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
        { status: 400 }
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
        intensity,
        notes,
      },
    });

    // Update related goals
    await updateGoals(session.user.id, exerciseId, newProgress);

    return NextResponse.json(newProgress);
  } catch (error) {
    console.error('Error creating exercise progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function updateGoals(
  userId: string,
  exerciseId: string,
  progress: any
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
      const progressPercentage = calculateGoalProgress(goal, progress);
      const status = progressPercentage >= 100 ? 'completed' : 'in-progress';

      await prisma.exerciseGoal.update({
        where: { id: goal.id },
        data: {
          progress: progressPercentage,
          status,
        },
      });
    }
  } catch (error) {
    console.error('Error updating goals:', error);
  }
}

function calculateGoalProgress(goal: any, progress: any): number {
  const setsProgress = (progress.sets / goal.targetSets) * 100;
  const repsProgress = (progress.reps / goal.targetReps) * 100;
  const weightProgress = (progress.weight / goal.targetWeight) * 100;
  const durationProgress = (progress.duration / goal.targetDuration) * 100;

  return (setsProgress + repsProgress + weightProgress + durationProgress) / 4;
} 