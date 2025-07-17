import { z } from 'zod';

// Base schemas
export const emailSchema = z.string().email('Invalid email address');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const nameSchema = z.string().min(1, 'Name is required').max(100, 'Name too long');

// User schemas
export const userSchema = z.object({
  id: z.string().uuid(),
  email: emailSchema,
  name: nameSchema,
  image: z.string().url().optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']),
    language: z.string(),
    units: z.enum(['metric', 'imperial']),
    notifications: z.boolean(),
    privacySettings: z.object({
      shareData: z.boolean(),
      publicProfile: z.boolean(),
    }),
  }),
});

export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().optional(),
  units: z.enum(['metric', 'imperial']).optional(),
  notifications: z.boolean().optional(),
  privacySettings: z.object({
    shareData: z.boolean(),
    publicProfile: z.boolean(),
  }).optional(),
});

// Nutrition schemas
export const nutritionSchema = z.object({
  calories: z.number().min(0, 'Calories must be positive').max(10000, 'Calories too high'),
  protein: z.number().min(0, 'Protein must be positive').max(1000, 'Protein too high'),
  carbs: z.number().min(0, 'Carbs must be positive').max(2000, 'Carbs too high'),
  fat: z.number().min(0, 'Fat must be positive').max(500, 'Fat too high'),
  fiber: z.number().min(0, 'Fiber must be positive').max(200, 'Fiber too high'),
  sugar: z.number().min(0, 'Sugar must be positive').max(1000, 'Sugar too high'),
  sodium: z.number().min(0, 'Sodium must be positive').max(10000, 'Sodium too high'),
});

// Food entry schemas
export const foodEntrySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Food name is required').max(200, 'Food name too long'),
  nutrition: nutritionSchema,
  servingSize: z.number().positive('Serving size must be positive').max(10000, 'Serving size too large'),
  servingUnit: z.string().min(1, 'Serving unit is required').max(20, 'Serving unit too long'),
  timestamp: z.date(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
});

export const createFoodEntrySchema = foodEntrySchema.omit({ id: true });

// Water entry schemas
export const waterEntrySchema = z.object({
  id: z.string().uuid().optional(),
  amount: z.number().positive('Amount must be positive').max(5000, 'Amount too large'),
  timestamp: z.date(),
});

export const createWaterEntrySchema = waterEntrySchema.omit({ id: true });

// Goal schemas
export const goalSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(['calories', 'protein', 'carbs', 'fat', 'water', 'weight']),
  target: z.number().positive('Target must be positive'),
  current: z.number().min(0, 'Current must be non-negative'),
  unit: z.string().min(1, 'Unit is required').max(20, 'Unit too long'),
  startDate: z.date(),
  endDate: z.date().optional(),
  isActive: z.boolean(),
});

export const createGoalSchema = goalSchema.omit({ id: true });

// User goals schema
export const userGoalsSchema = z.object({
  calories: z.number().min(0, 'Calories must be positive').max(10000, 'Calories too high'),
  protein: z.number().min(0, 'Protein must be positive').max(1000, 'Protein too high'),
  carbs: z.number().min(0, 'Carbs must be positive').max(2000, 'Carbs too high'),
  fat: z.number().min(0, 'Fat must be positive').max(500, 'Fat too high'),
  water: z.number().min(0, 'Water must be positive').max(10000, 'Water too high'),
});

// Search schemas
export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200, 'Search query too long'),
  category: z.enum(['all', 'fruits', 'protein', 'grains', 'dairy', 'seafood']).optional(),
  limit: z.number().min(1).max(100).optional().default(20),
});

// API request schemas
export const apiRequestSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  path: z.string(),
  query: z.record(z.string()).optional(),
  body: z.any().optional(),
  headers: z.record(z.string()).optional(),
});

// Pagination schemas
export const paginationSchema = z.object({
  page: z.number().min(1, 'Page must be at least 1').optional().default(1),
  limit: z.number().min(1, 'Limit must be at least 1').max(100, 'Limit too high').optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Date range schemas
export const dateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'End date must be after start date',
});

// Barcode schemas
export const barcodeSchema = z.object({
  code: z.string().min(8, 'Barcode too short').max(20, 'Barcode too long'),
  format: z.enum(['EAN-13', 'UPC-A', 'CODE-128', 'QR']).optional(),
});

// Notification schemas
export const notificationSchema = z.object({
  type: z.enum(['reminder', 'achievement', 'goal', 'system']),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  message: z.string().min(1, 'Message is required').max(500, 'Message too long'),
  data: z.record(z.any()).optional(),
  scheduledAt: z.date().optional(),
});

// Analytics schemas
export const analyticsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year']),
  metrics: z.array(z.enum(['calories', 'protein', 'carbs', 'fat', 'water', 'weight'])),
  groupBy: z.enum(['hour', 'day', 'week', 'month']).optional(),
  ...dateRangeSchema.innerType().shape,
});

// Export request schemas
export const exportRequestSchema = z.object({
  format: z.enum(['csv', 'json', 'pdf']),
  dataType: z.enum(['nutrition', 'water', 'goals', 'all']),
  dateRange: dateRangeSchema.optional(),
  includeCharts: z.boolean().optional().default(false),
});

// Validation helper functions
export function validateRequest<T extends z.ZodType>(
  data: unknown,
  schema: T
): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

export function validateRequestPartial<T extends z.ZodObject<any>>(
  data: unknown,
  schema: T
): Partial<z.infer<T>> {
  try {
    return schema.partial().parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

// Sanitization functions
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[&]/g, '&amp;') // Escape ampersands
    .replace(/["]/g, '&quot;') // Escape quotes
    .replace(/[']/g, '&#x27;') // Escape apostrophes
    .replace(/[/]/g, '&#x2F;'); // Escape forward slashes
}

export function sanitizeNumber(input: number): number {
  return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Number(input) || 0));
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function sanitizeDate(date: Date | string): Date {
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

// Rate limiting schemas
export const rateLimitSchema = z.object({
  windowMs: z.number().min(1000, 'Window must be at least 1 second'),
  maxRequests: z.number().min(1, 'Max requests must be at least 1'),
  message: z.string().optional(),
});

// Error response schema
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  code: z.string().optional(),
  details: z.record(z.any()).optional(),
  timestamp: z.date(),
});

// Success response schema
export const successResponseSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  message: z.string().optional(),
  timestamp: z.date(),
});

// Type exports for convenience
export type User = z.infer<typeof userSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type Nutrition = z.infer<typeof nutritionSchema>;
export type FoodEntry = z.infer<typeof foodEntrySchema>;
export type WaterEntry = z.infer<typeof waterEntrySchema>;
export type Goal = z.infer<typeof goalSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type Barcode = z.infer<typeof barcodeSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type ExportRequest = z.infer<typeof exportRequestSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type SuccessResponse = z.infer<typeof successResponseSchema>; 