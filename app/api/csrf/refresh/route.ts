import { NextRequest, NextResponse } from 'next/server';
import { csrfProtection } from '@/lib/csrf-protection';

export async function POST(request: NextRequest) {
  try {
    // Get old token from request body
    const { token: oldToken } = await request.json();

    if (!oldToken) {
      return NextResponse.json(
        { error: 'Old token is required' },
        { status: 400 }
      );
    }

    // Refresh token
    const newToken = csrfProtection.refreshToken(oldToken);

    if (!newToken) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Create response
    const response = NextResponse.json({
      token: newToken,
      expiresAt: Date.now() + csrfProtection['config'].tokenExpiry,
    });

    // Set new token in cookie
    return csrfProtection.setTokenInResponse(response, newToken);
  } catch (error) {
    // CSRF token refresh error - handled by error boundary
    return NextResponse.json(
      { error: 'Failed to refresh CSRF token' },
      { status: 500 }
    );
  }
} 