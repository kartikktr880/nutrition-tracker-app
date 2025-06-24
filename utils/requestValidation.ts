import { exerciseRateLimiter, userProfileRateLimiter, sessionRateLimiter } from './rateLimit';

interface ValidationConfig {
  requiredHeaders: string[];
  allowedMethods: string[];
  rateLimiter: typeof exerciseRateLimiter;
}

const defaultConfig: ValidationConfig = {
  requiredHeaders: [
    'Authorization',
    'Content-Type',
    'X-Request-ID',
    'X-Client-Version'
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  rateLimiter: exerciseRateLimiter
};

export async function validateRequest(
  request: Request,
  config: Partial<ValidationConfig> = {}
): Promise<{ isValid: boolean; error?: string }> {
  const finalConfig = { ...defaultConfig, ...config };

  // Validate request method
  if (!finalConfig.allowedMethods.includes(request.method)) {
    return {
      isValid: false,
      error: `Method ${request.method} not allowed. Allowed methods: ${finalConfig.allowedMethods.join(', ')}`
    };
  }

  // Validate required headers
  for (const header of finalConfig.requiredHeaders) {
    if (!request.headers.has(header)) {
      return {
        isValid: false,
        error: `Missing required header: ${header}`
      };
    }
  }

  // Validate Authorization header format
  const authHeader = request.headers.get('Authorization');
  if (authHeader && !authHeader.startsWith('Bearer ')) {
    return {
      isValid: false,
      error: 'Invalid Authorization header format. Must start with "Bearer "'
    };
  }

  // Validate X-Request-ID format (UUID)
  const requestId = request.headers.get('X-Request-ID');
  if (requestId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) {
    return {
      isValid: false,
      error: 'Invalid X-Request-ID format. Must be a valid UUID'
    };
  }

  // Validate X-Client-Version format (semantic versioning)
  const clientVersion = request.headers.get('X-Client-Version');
  if (clientVersion && !/^\d+\.\d+\.\d+$/.test(clientVersion)) {
    return {
      isValid: false,
      error: 'Invalid X-Client-Version format. Must follow semantic versioning (e.g., 1.0.0)'
    };
  }

  // Check rate limit
  const clientId = authHeader?.split(' ')[1] || 'anonymous';
  const rateLimitResult = finalConfig.rateLimiter.check(clientId);
  if (!rateLimitResult.allowed) {
    return {
      isValid: false,
      error: `Rate limit exceeded. Please try again after ${Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)} seconds`
    };
  }

  // Validate request body for POST and PUT requests
  if (['POST', 'PUT'].includes(request.method)) {
    try {
      const contentType = request.headers.get('Content-Type');
      if (contentType?.includes('application/json')) {
        const body = await request.clone().json();
        if (typeof body !== 'object' || body === null) {
          return {
            isValid: false,
            error: 'Invalid request body. Must be a valid JSON object'
          };
        }
      }
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid request body format'
      };
    }
  }

  return { isValid: true };
}

export function createValidationMiddleware(config: Partial<ValidationConfig> = {}) {
  return async (request: Request) => {
    const validationResult = await validateRequest(request, config);
    if (!validationResult.isValid) {
      return new Response(JSON.stringify({ error: validationResult.error }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    return null;
  };
} 