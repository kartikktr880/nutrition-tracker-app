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

    const workouts = await prisma.exerciseWorkout.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(workouts);
  } catch (error: unknown) {
    logError('Error fetching exercise workouts:', error);
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
      name,
      description,
      exercises,
      difficulty,
    } = data;

    if (!exerciseId || !name || !description || !exercises?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 500 }
      );
    }

    const newWorkout = await prisma.exerciseWorkout.create({
      data: {
        userId: session.user.id,
        name,
        description,
        exercises,
        difficulty,
        totalDuration: 0,
        targetMuscleGroups: [],
        equipment: [],
        caloriesBurned: 0,
      },
    });

    return NextResponse.json(newWorkout);
  } catch (error: unknown) {
    logError('Error creating exercise workout:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = { user: { id: 'mock-user-id', name: 'Test User', email: 'test@example.com' } };
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 500 });
    }

    const data = await request.json();
    const {
      id,
      name,
      description,
      exercises,
      difficulty,
    } = data;

    if (!id) {
      return NextResponse.json(
        { error: 'Workout ID is required' },
        { status: 500 }
      );
    }

    const updatedWorkout = await prisma.exerciseWorkout.update({
      where: {
        id,
        userId: session.user.id,
      },
      data: {
        name,
        description,
        exercises,
        difficulty,
      },
    });

    return NextResponse.json(updatedWorkout);
  } catch (error: unknown) {
    logError('Error updating exercise workout:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = { user: { id: 'mock-user-id', name: 'Test User', email: 'test@example.com' } };
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Workout ID is required' },
        { status: 500 }
      );
    }

    await prisma.exerciseWorkout.delete({
      where: {
        id,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logError('Error deleting exercise workout:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 









