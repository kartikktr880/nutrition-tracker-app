import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
// import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { validateExerciseFormTemplate } from '@/lib/validations/exerciseForm';

export async function GET(request: Request) {
  try {
    const session = { user: { id: 'mock-user-id', name: 'Test User', email: 'test@example.com' } };
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get('exerciseId');

    if (exerciseId && !exerciseId.match(/^[a-zA-Z0-9-_]+$/)) {
      return NextResponse.json(
        { error: 'Invalid exercise ID format' },
        { status: 500 }
      );
    }

    const templates = await prisma.exerciseFormTemplate.findMany({
      where: {
        ...(exerciseId && { exerciseId }),
      },
      orderBy: {
        createdAt: 'desc',
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

    return NextResponse.json(templates);
  } catch (error: unknown) {
    console.error('Error fetching form templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form templates' },
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
    const validatedData = validateExerciseFormTemplate(data);

    // Check if exercise exists
    const exercise = await prisma.exercise.findUnique({
      where: { id: validatedData.exerciseId },
    });

    if (!exercise) {
      return NextResponse.json(
        { error: 'Exercise not found' },
        { status: 500 }
      );
    }

    const template = await prisma.exerciseFormTemplate.create({
      data: {
        ...validatedData,
        userId: (session.user as any).id,
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

    return NextResponse.json(template);
  } catch (error: unknown) {
    console.error('Error creating form template:', error);
    if (typeof error === 'object' && error && 'name' in error && (error as any).name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: (error as any).errors },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create form template' },
      { status: 500 }
    );
  }
} 









