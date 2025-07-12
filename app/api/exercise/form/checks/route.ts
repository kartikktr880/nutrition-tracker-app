import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { validateExerciseFormCheck, validateDateRange } from '@/lib/validations/exerciseForm';
import { logError } from '@/utils/logger';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Session {
  user: User;
}

interface ZodError {
  name: string;
  errors: unknown[];
}

export async function GET(request: Request) {
  try {
    const session: Session = { user: { id: 'mock-user-id', name: 'Test User', email: 'test@example.com' } };
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get('exerciseId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (exerciseId && !exerciseId.match(/^[a-zA-Z0-9-_]+$/)) {
      return NextResponse.json(
        { error: 'Invalid exercise ID format' },
        { status: 400 }
      );
    }

    if (startDate && endDate && !validateDateRange(startDate, endDate)) {
      return NextResponse.json(
        { error: 'Invalid date range' },
        { status: 400 }
      );
    }

    const checks = await prisma.exerciseFormCheck.findMany({
      where: {
        userId: session.user.id,
        ...(exerciseId && { exerciseId }),
        ...(startDate && endDate && {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      },
      orderBy: {
        date: 'desc',
      },
      include: {
        exercise: {
          select: {
            name: true,
            category: true,
          },
        },
      },
    });

    return NextResponse.json(checks);
  } catch (error: unknown) {
    logError('Error fetching form checks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form checks' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session: Session = { user: { id: 'mock-user-id', name: 'Test User', email: 'test@example.com' } };
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const validatedData = validateExerciseFormCheck(data);

    // Check if exercise exists
    const exercise = await prisma.exercise.findUnique({
      where: { id: validatedData.exerciseId },
    });

    if (!exercise) {
      return NextResponse.json(
        { error: 'Exercise not found' },
        { status: 404 }
      );
    }

    const check = await prisma.exerciseFormCheck.create({
      data: {
        ...validatedData,
        userId: session.user.id,
        date: new Date(),
      },
      include: {
        exercise: {
          select: {
            name: true,
            category: true,
          },
        },
      },
    });

    return NextResponse.json(check);
  } catch (error: unknown) {
    logError('Error creating form check:', error);
    if (typeof error === 'object' && error && 'name' in error && (error as ZodError).name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: (error as ZodError).errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create form check' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session: Session = { user: { id: 'mock-user-id', name: 'Test User', email: 'test@example.com' } };
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Check ID is required' },
        { status: 400 }
      );
    }

    const data = await request.json();
    const validatedData = validateExerciseFormCheck(data);

    // Check if the form check exists and belongs to the user
    const existingCheck = await prisma.exerciseFormCheck.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingCheck) {
      return NextResponse.json(
        { error: 'Form check not found' },
        { status: 404 }
      );
    }

    const check = await prisma.exerciseFormCheck.update({
      where: { id },
      data: validatedData,
      include: {
        exercise: {
          select: {
            name: true,
            category: true,
          },
        },
      },
    });

    return NextResponse.json(check);
  } catch (error: unknown) {
    logError('Error updating form check:', error);
    if (typeof error === 'object' && error && 'name' in error && (error as ZodError).name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: (error as ZodError).errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update form check' },
      { status: 500 }
    );
  }
} 









