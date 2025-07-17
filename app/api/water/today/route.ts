import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const waterEntrySchema = z.object({
  amount: z.number().min(1).max(5000),
});

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        waterEntries: {
          where: {
            timestamp: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
          orderBy: { timestamp: 'desc' },
        },
        goals: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const todayTotal = user.waterEntries.reduce(
      (sum: number, entry: { amount: number }) => sum + entry.amount,
      0,
    );
    // The Goals model does not have a 'water' property. Use default.
    const waterGoal = 2000;

    return NextResponse.json({
      amount: todayTotal,
      goal: waterGoal,
      entries: user.waterEntries.map(
        (entry: { id: string; amount: number; timestamp: Date }) => ({
          id: entry.id,
          amount: entry.amount,
          timestamp: entry.timestamp,
        }),
      ),
      progress: Math.min((todayTotal / waterGoal) * 100, 100),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = waterEntrySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 },
      );
    }

    const { amount } = validation.data;

    const waterEntry = await prisma.waterEntry.create({
      data: {
        userId: session.user.id,
        amount,
        timestamp: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      entry: {
        id: waterEntry.id,
        amount: waterEntry.amount,
        timestamp: waterEntry.timestamp,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
} 