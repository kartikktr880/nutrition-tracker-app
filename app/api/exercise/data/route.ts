import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { logError } from '@/utils/logger';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Session {
  user: User;
}

export async function GET(request: Request) {
  try {
    const session: Session = { user: { id: 'mock-user-id', name: 'Test User', email: 'test@example.com' } };
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
        data = await prisma.exerciseSession.findMany({
          where: {
            userId: session.user.id,
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
            userId: session.user.id,
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
            userId: session.user.id,
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
    logError('Error fetching exercise data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
    const { type, ...payload } = data;

    let result;
    switch (type) {
      case 'session':
        result = await prisma.exerciseSession.create({
          data: {
            ...payload,
            userId: session.user.id,
          },
        });
        break;
      case 'progress':
        result = await prisma.exerciseProgress.create({
          data: {
            ...payload,
            userId: session.user.id,
          },
        });
        break;
      case 'goal':
        result = await prisma.exerciseGoal.create({
          data: {
            ...payload,
            userId: session.user.id,
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
    logError('Error creating exercise data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
        result = await prisma.exerciseSession.update({
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
    logError('Error updating exercise data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session: Session = { user: { id: 'mock-user-id', name: 'Test User', email: 'test@example.com' } };
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
        result = await prisma.exerciseSession.delete({
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

    return NextResponse.json(result);
  } catch (error: unknown) {
    logError('Error deleting exercise data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 










