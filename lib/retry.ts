interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  shouldRetry?: (error: any) => boolean;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly lastError: any,
    public readonly attempts: number
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxAttempts,
    initialDelay,
    maxDelay,
    backoffFactor,
    shouldRetry = () => true
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw new RetryError(
          `Operation failed after ${attempt} attempts`,
          lastError,
          attempt
        );
      }

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * backoffFactor, maxDelay);
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * delay;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }

  throw new RetryError(
    `Operation failed after ${maxAttempts} attempts`,
    lastError,
    maxAttempts
  );
} 