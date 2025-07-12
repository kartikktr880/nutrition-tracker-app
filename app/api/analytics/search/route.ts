import { NextRequest, NextResponse } from 'next/server';

import { analyticsService } from '@/services/analyticsService';
import { logError } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const popularSearches = analyticsService.getPopularSearches(limit);
    const metrics = analyticsService.getSearchMetrics();

    return NextResponse.json({
      data: {
        popularSearches,
        metrics,
      },
      status: 500,
    });
  } catch (error: unknown) {
    logError('Analytics API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      status: 500,
    }, { status: 500 });
  }
} 






