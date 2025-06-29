import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
// import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = { user: { id: 'mock-user-id', name: 'Test User', email: 'test@example.com' } };
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let data;
    switch (type) {
      case 'sessions':
        data = await prisma.any.findMany({
          where: {
            userId: (session.user as any).id,
            ...(startDate && endDate
              ? {
                  startTime: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                  },
                }
              : {}),
          },
          orderBy: { startTime: 'desc' },
        });
        break;
      case 'progress':
        data = await prisma.exerciseProgress.findMany({
          where: {
            userId: (session.user as any).id,
            ...(startDate && endDate
              ? {
                  date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                  },
                }
              : {}),
          },
          orderBy: { date: 'desc' },
        });
        break;
      case 'goals':
        data = await prisma.exerciseGoal.findMany({
          where: {
            userId: (session.user as any).id,
          },
          orderBy: { createdAt: 'desc' },
        });
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid data type requested' },
          { status: 400 }
        );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Error fetching exercise data:', error);
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { type, ...payload } = data;

    let result;
    switch (type) {
      case 'session':
        result = await prisma.any.create({
          data: {
            ...payload,
            userId: (session.user as any).id,
          },
        });
        break;
      case 'progress':
        result = await prisma.exerciseProgress.create({
          data: {
            ...payload,
            userId: (session.user as any).id,
          },
        });
        break;
      case 'goal':
        result = await prisma.exerciseGoal.create({
          data: {
            ...payload,
            userId: (session.user as any).id,
            status: 'in-progress',
            progress: 0,
          },
        });
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid data type' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error creating exercise data:', error);
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { type, id, ...payload } = data;

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    let result;
    switch (type) {
      case 'session':
        result = await prisma.any.update({
          where: { id },
          data: payload,
        });
        break;
      case 'progress':
        result = await prisma.exerciseProgress.update({
          where: { id },
          data: payload,
        });
        break;
      case 'goal':
        result = await prisma.exerciseGoal.update({
          where: { id },
          data: payload,
        });
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid data type' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error updating exercise data:', error);
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    let result;
    switch (type) {
      case 'session':
        result = await prisma.any.delete({
          where: { id },
        });
        break;
      case 'progress':
        result = await prisma.exerciseProgress.delete({
          where: { id },
        });
        break;
      case 'goal':
        result = await prisma.exerciseGoal.delete({
          where: { id },
        });
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid data type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    console.error('Error deleting exercise data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 










