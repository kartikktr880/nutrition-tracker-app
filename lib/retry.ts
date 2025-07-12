// Retry functionality implementation

export function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  return fn();
}

export class RetryError extends Error {}
