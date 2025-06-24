import { z } from 'zod';

// API Response Schema
const ApiResponseSchema = z.object({
  data: z.unknown(),
  error: z.string().optional(),
  status: z.number(),
});

type ApiResponse = z.infer<typeof ApiResponseSchema>;

// Rate Limiting Configuration
const RATE_LIMIT = {
  maxRequests: 100,
  timeWindow: 60000, // 1 minute
};

class ApiClient {
  private static instance: ApiClient;
  private requestQueue: { timestamp: number }[] = [];
  private baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    this.requestQueue = this.requestQueue.filter(
      request => now - request.timestamp < RATE_LIMIT.timeWindow
    );

    if (this.requestQueue.length >= RATE_LIMIT.maxRequests) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    this.requestQueue.push({ timestamp: now });
  }

  private async validateResponse(response: Response): Promise<ApiResponse> {
    const data = await response.json();
    return ApiResponseSchema.parse(data);
  }

  private async handleError(error: unknown): Promise<never> {
    if (error instanceof Error) {
      throw new Error(`API Error: ${error.message}`);
    }
    throw new Error('An unexpected error occurred');
  }

  public async get<T>(endpoint: string, schema: z.ZodType<T>): Promise<T> {
    try {
      await this.checkRateLimit();

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiResponse = await this.validateResponse(response);
      
      if (apiResponse.error) {
        throw new Error(apiResponse.error);
      }

      return schema.parse(apiResponse.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  public async post<T>(endpoint: string, data: unknown, schema: z.ZodType<T>): Promise<T> {
    try {
      await this.checkRateLimit();

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiResponse = await this.validateResponse(response);
      
      if (apiResponse.error) {
        throw new Error(apiResponse.error);
      }

      return schema.parse(apiResponse.data);
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export const apiClient = ApiClient.getInstance(); 