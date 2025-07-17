import { randomBytes, createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// CSRF token interface
export interface CSRFToken {
  token: string;
  expiresAt: number;
  createdAt: number;
}

// CSRF configuration
export interface CSRFConfig {
  secret: string;
  tokenLength: number;
  tokenExpiry: number; // milliseconds
  cookieName: string;
  headerName: string;
  paramName: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  domain?: string;
  path: string;
}

// Default configuration
export const DEFAULT_CSRF_CONFIG: CSRFConfig = {
  secret: process.env.CSRF_SECRET || 'your-csrf-secret-key-change-in-production',
  tokenLength: 32,
  tokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
  cookieName: 'csrf-token',
  headerName: 'X-CSRF-Token',
  paramName: '_csrf',
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'strict',
  path: '/',
};

// CSRF protection class
export class CSRFProtection {
  private config: CSRFConfig;
  private tokenStore: Map<string, CSRFToken> = new Map();

  constructor(config: Partial<CSRFConfig> = {}) {
    this.config = { ...DEFAULT_CSRF_CONFIG, ...config };
  }

  // Generate a new CSRF token
  generateToken(): string {
    const token = randomBytes(this.config.tokenLength).toString('hex');
    const expiresAt = Date.now() + this.config.tokenExpiry;
    const createdAt = Date.now();

    // Store token with metadata
    this.tokenStore.set(token, {
      token,
      expiresAt,
      createdAt,
    });

    // Clean up expired tokens
    this.cleanupExpiredTokens();

    return token;
  }

  // Validate a CSRF token
  validateToken(token: string): boolean {
    if (!token) return false;

    const storedToken = this.tokenStore.get(token);
    if (!storedToken) return false;

    // Check if token has expired
    if (Date.now() > storedToken.expiresAt) {
      this.tokenStore.delete(token);
      return false;
    }

    return true;
  }

  // Verify token from request
  async verifyRequestToken(request: NextRequest): Promise<boolean> {
    const token = await this.extractTokenFromRequest(request);
    return this.validateToken(token);
  }

  // Extract token from request
  async extractTokenFromRequest(request: NextRequest): Promise<string> {
    // Try header first
    let token = request.headers.get(this.config.headerName) || '';
    
    // Try form data
    if (!token && request.formData) {
      const formData = await request.formData();
      token = formData.get(this.config.paramName)?.toString() || '';
    }

    // Try query parameters
    if (!token) {
      token = request.nextUrl.searchParams.get(this.config.paramName) || '';
    }

    // Try JSON body
    if (!token && request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = request.json?.();
        if (body && typeof body === 'object') {
          token = (body as any)[this.config.paramName] || '';
        }
      } catch {
        // Ignore JSON parsing errors
      }
    }

    return token;
  }

  // Create CSRF middleware
  createMiddleware() {
    return async (request: NextRequest) => {
      // Skip CSRF check for GET requests and safe methods
      if (this.isSafeMethod(request.method)) {
        return NextResponse.next();
      }

      // Skip CSRF check for API routes that don't need it
      if (this.shouldSkipCSRF(request)) {
        return NextResponse.next();
      }

      // Verify CSRF token
      const valid = await this.verifyRequestToken(request);
      if (!valid) {
        return new NextResponse(
          JSON.stringify({ error: 'CSRF token validation failed' }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
            },
          }
    );
      }

      return NextResponse.next();
    };
  }

  // Check if method is safe (doesn't require CSRF protection)
  private isSafeMethod(method: string): boolean {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    return safeMethods.includes(method.toUpperCase());
  }

  // Check if request should skip CSRF validation
  private shouldSkipCSRF(request: NextRequest): boolean {
    const url = request.nextUrl.pathname;
    
    // Skip for static assets
    if (url.startsWith('/_next/') || url.startsWith('/static/')) {
      return true;
    }

    // Skip for health checks
    if (url === '/api/health' || url === '/health') {
      return true;
    }

    // Skip for webhook endpoints (they should use other authentication)
    if (url.includes('/webhook')) {
      return true;
    }

    return false;
  }

  // Set CSRF token in response
  setTokenInResponse(response: NextResponse, token: string): NextResponse {
    response.cookies.set(this.config.cookieName, token, {
      httpOnly: this.config.httpOnly,
      secure: this.config.secure,
      sameSite: this.config.sameSite,
      domain: this.config.domain,
      path: this.config.path,
      maxAge: Math.floor(this.config.tokenExpiry / 1000),
    });

    return response;
  }

  // Get CSRF token from cookie
  getTokenFromCookie(request: NextRequest): string {
    return request.cookies.get(this.config.cookieName)?.value || '';
  }

  // Refresh CSRF token
  refreshToken(oldToken: string): string | null {
    if (!this.validateToken(oldToken)) {
      return null;
    }

    // Remove old token
    this.tokenStore.delete(oldToken);

    // Generate new token
    return this.generateToken();
  }

  // Clean up expired tokens
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, tokenData] of this.tokenStore.entries()) {
      if (now > tokenData.expiresAt) {
        this.tokenStore.delete(token);
      }
    }
  }

  // Get token statistics
  getTokenStats(): {
    totalTokens: number;
    activeTokens: number;
    expiredTokens: number;
  } {
    const now = Date.now();
    let activeTokens = 0;
    let expiredTokens = 0;

    for (const tokenData of this.tokenStore.values()) {
      if (now > tokenData.expiresAt) {
        expiredTokens++;
      } else {
        activeTokens++;
      }
    }

    return {
      totalTokens: this.tokenStore.size,
      activeTokens,
      expiredTokens,
    };
  }

  // Clear all tokens (useful for testing)
  clearAllTokens(): void {
    this.tokenStore.clear();
  }
}

// Global CSRF protection instance
export const csrfProtection = new CSRFProtection();

// CSRF middleware for Next.js API routes
export function withCSRF(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    // Skip CSRF check for safe methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(request.method.toUpperCase())) {
      return handler(request, ...args);
    }

    // Verify CSRF token
    const valid = await csrfProtection.verifyRequestToken(request);
    if (!valid) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'CSRF token validation failed',
          message: 'Invalid or missing CSRF token'
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return handler(request, ...args);
  };
}

// Utility function to add CSRF token to fetch requests
export function withCSRFToken(fetchFn: typeof fetch) {
  return async (url: string, options: RequestInit = {}) => {
    // Get CSRF token from cookie
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrf-token='))
      ?.split('=')[1];

    if (token) {
      // Add CSRF token to headers
      const headers = new Headers(options.headers);
      headers.set('X-CSRF-Token', token);
      options.headers = headers;
    }

    return fetchFn(url, options);
  };
}

// Export utilities
export const csrfUtils = {
  CSRFProtection,
  withCSRF,
  withCSRFToken,
}; 