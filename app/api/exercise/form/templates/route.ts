import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { validateExerciseFormTemplate } from '@/lib/validations/exerciseForm';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get('exerciseId');

    if (exerciseId && !exerciseId.match(/^[a-zA-Z0-9-_]+$/)) {
      return NextResponse.json(
        { error: 'Invalid exercise ID format' },
        { status: 400 }
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
  } catch (error) {
    console.error('Error fetching form templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form templates' },
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
    const validatedData = validateExerciseFormTemplate(data);

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

    const template = await prisma.exerciseFormTemplate.create({
      data: {
        ...validatedData,
        userId: session.user.id,
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
  } catch (error) {
    console.error('Error creating form template:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create form template' },
      { status: 500 }
    );
  }
} 