import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Security configuration
const SECURITY_CONFIG = {
  // Content Security Policy
  csp: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for Next.js
      "'unsafe-eval'", // Required for Next.js
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
      'https://js.sentry-cdn.com',
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for styled-components/Tailwind
      'https://fonts.googleapis.com',
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
      'data:',
    ],
    'img-src': [
      "'self'",
      'data:',
      'https:',
      'blob:',
    ],
    'connect-src': [
      "'self'",
      'https://api.nutrition-tracker.com',
      'https://www.google-analytics.com',
      'https://sentry.io',
      'wss://sentry.io',
    ],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': [],
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // Limit each IP to 100 requests per windowMs
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  
  // CSRF protection
  csrf: {
    tokenLength: 32,
    cookieName: 'csrf-token',
    headerName: 'x-csrf-token',
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  },
} as const;

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Generate CSRF token
function generateCSRFToken(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(SECURITY_CONFIG.csrf.tokenLength).toString('hex');
}

// Validate CSRF token
function validateCSRFToken(token: string, storedToken: string): boolean {
  return token === storedToken;
}

// Rate limiting function
function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowMs = SECURITY_CONFIG.rateLimit.windowMs;
  const maxRequests = SECURITY_CONFIG.rateLimit.maxRequests;
  
  const record = rateLimitStore.get(ip);
  
  if (!record || now > record.resetTime) {
    // First request or window expired
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }
  
  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}

// Build CSP header
function buildCSPHeader(): string {
  const directives = Object.entries(SECURITY_CONFIG.csp)
    .map(([directive, sources]) => {
      if (Array.isArray(sources)) {
        return `${directive} ${sources.join(' ')}`;
      }
      return directive;
    })
    .join('; ');
  
  return directives;
}

// Security headers
const securityHeaders = {
  // Content Security Policy
  'Content-Security-Policy': buildCSPHeader(),
  
  // XSS Protection
  'X-XSS-Protection': '1; mode=block',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions Policy
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
  ].join(', '),
  
  // Strict Transport Security
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Cache Control for sensitive pages
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  
  // Feature Policy (deprecated but still useful)
  'Feature-Policy': [
    'camera none',
    'microphone none',
    'geolocation none',
    'payment none',
    'usb none',
  ].join('; '),
};

// Apply security headers to response
function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([header, value]) => {
    response.headers.set(header, value);
  });
  
  return response;
}

// CSRF protection middleware
function applyCSRFProtection(request: NextRequest, response: NextResponse): NextResponse {
  const method = request.method.toUpperCase();
  
  // Skip CSRF check for safe methods
  if (SECURITY_CONFIG.csrf.ignoreMethods.includes(method as any)) {
    return response;
  }
  
  // Get CSRF token from cookie
  const csrfCookie = request.cookies.get(SECURITY_CONFIG.csrf.cookieName);
  const csrfHeader = request.headers.get(SECURITY_CONFIG.csrf.headerName);
  
  if (!csrfCookie?.value || !csrfHeader) {
    return NextResponse.json(
      { error: 'CSRF token missing' },
      { status: 403 }
    );
  }
  
  if (!validateCSRFToken(csrfHeader, csrfCookie.value)) {
    return NextResponse.json(
      { error: 'CSRF token invalid' },
      { status: 403 }
    );
  }
  
  return response;
}

// Rate limiting middleware
function applyRateLimit(request: NextRequest): { allowed: boolean; response?: NextResponse } {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(ip);
  
  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
    
    response.headers.set('X-RateLimit-Limit', SECURITY_CONFIG.rateLimit.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());
    response.headers.set('Retry-After', Math.ceil(SECURITY_CONFIG.rateLimit.windowMs / 1000).toString());
    
    return { allowed: false, response };
  }
  
  return { allowed: true };
}

// Main security middleware
export function securityMiddleware(request: NextRequest): NextResponse | null {
  const url = request.nextUrl;
  
  // Skip security checks for static assets
  if (url.pathname.startsWith('/_next/') || 
      url.pathname.startsWith('/api/health') ||
      url.pathname.includes('.')) {
    return null;
  }
  
  // Apply rate limiting
  const rateLimitResult = applyRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!;
  }
  
  // Create response
  let response = NextResponse.next();
  
  // Apply security headers
  response = applySecurityHeaders(response);
  
  // Apply CSRF protection for API routes
  if (url.pathname.startsWith('/api/')) {
    response = applyCSRFProtection(request, response);
  }
  
  // Add rate limit headers
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(ip);
  response.headers.set('X-RateLimit-Limit', SECURITY_CONFIG.rateLimit.maxRequests.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());
  
  return response;
}

// CSRF token generation endpoint
export async function generateCSRFTokenHandler(): Promise<NextResponse> {
  const token = generateCSRFToken();
  
  const response = NextResponse.json({ token });
  
  // Set CSRF token as HTTP-only cookie
  response.cookies.set(SECURITY_CONFIG.csrf.cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
  
  return response;
}

// Health check endpoint
export async function healthCheckHandler(): Promise<NextResponse> {
  const response = NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
  
  // Don't apply security headers to health check
  return response;
}

// Export configuration for use in other parts of the app
export { SECURITY_CONFIG }; 