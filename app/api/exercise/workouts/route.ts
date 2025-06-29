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

    if (!exerciseId) {
      return NextResponse.json(
        { error: 'Exercise ID is required' },
        { status: 500 }
      );
    }

    const workouts = await prisma.exerciseWorkout.findMany({
      where: {
        userId: (session.user as any).id,
        exerciseId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(workouts);
  } catch (error: unknown) {
    console.error('Error fetching exercise workouts:', error);
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
      duration,
      difficulty,
      category,
    } = data;

    if (!exerciseId || !name || !description || !exercises?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 500 }
      );
    }

    const newWorkout = await prisma.exerciseWorkout.create({
      data: {
        userId: (session.user as any).id,
        exerciseId,
        name,
        description,
        exercises,
        duration,
        difficulty,
        category,
      },
    });

    return NextResponse.json(newWorkout);
  } catch (error: unknown) {
    console.error('Error creating exercise workout:', error);
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
      duration,
      difficulty,
      category,
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
        userId: (session.user as any).id,
      },
      data: {
        name,
        description,
        exercises,
        duration,
        difficulty,
        category,
      },
    });

    return NextResponse.json(updatedWorkout);
  } catch (error: unknown) {
    console.error('Error updating exercise workout:', error);
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
        userId: (session.user as any).id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting exercise workout:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 









