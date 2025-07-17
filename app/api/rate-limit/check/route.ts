import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters } from '@/lib/rate-limiting';

export async function GET(request: NextRequest) {
  try {
    const endpoint = request.nextUrl.searchParams.get('endpoint');
    
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint parameter is required' },
        { status: 400 }
      );
    }

    // Determine which rate limiter to use based on endpoint
    let rateLimiter;
    if (endpoint.includes('/auth') || endpoint.includes('/login') || endpoint.includes('/register')) {
      rateLimiter = rateLimiters.auth;
    } else if (endpoint.includes('/upload')) {
      rateLimiter = rateLimiters.upload;
    } else if (endpoint.startsWith('/api/')) {
      rateLimiter = rateLimiters.api;
    } else {
      rateLimiter = rateLimiters.general;
    }

    // Generate key for the endpoint
    const key = `rate-limit:${request.ip || 'unknown'}:${endpoint}`;
    
    // Get rate limit info
    const limitInfo = await rateLimiter.getLimitInfo(key);

    return NextResponse.json(limitInfo || {
      limit: rateLimiter['config'].maxRequests,
      remaining: rateLimiter['config'].maxRequests,
      reset: Date.now() + rateLimiter['config'].windowMs,
      isLimited: false,
    });

  } catch (error) {
    // Rate limit check error - handled by error boundary
    return NextResponse.json(
      { error: 'Failed to check rate limit' },
      { status: 500 }
    );
  }
} 