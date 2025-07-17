import { NextRequest, NextResponse } from 'next/server';
import { csrfProtection } from '@/lib/csrf-protection';

export async function GET(_request: NextRequest) {
  try {
    // Generate new CSRF token
    const token = csrfProtection.generateToken();

    // Create response
    const response = NextResponse.json({
      token,
      expiresAt: Date.now() + csrfProtection['config'].tokenExpiry,
    });

    // Set token in cookie
    return csrfProtection.setTokenInResponse(response, token);
  } catch (error) {
    // CSRF token generation error - handled by error boundary
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
} 