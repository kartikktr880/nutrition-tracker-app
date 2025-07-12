import { z } from 'zod';

export const exerciseFormTemplateSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters'),
  exerciseId: z.string()
    .min(1, 'Exercise ID is required')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Invalid exercise ID format'),
  checklist: z.array(z.object({
    item: z.string()
      .min(1, 'Item is required')
      .max(200, 'Item must be less than 200 characters'),
    description: z.string()
      .min(1, 'Description is required')
      .max(300, 'Description must be less than 300 characters'),
    importance: z.enum(['critical', 'important', 'optional'], {
      errorMap: () => ({ message: 'Importance must be critical, important, or optional' })
    })
  }))
    .min(1, 'At least one checklist item is required')
    .max(20, 'Maximum 20 checklist items allowed'),
  tips: z.array(z.string()
    .min(1, 'Tip cannot be empty')
    .max(200, 'Tip must be less than 200 characters'))
    .max(10, 'Maximum 10 tips allowed'),
  commonMistakes: z.array(z.string()
    .min(1, 'Mistake cannot be empty')
    .max(200, 'Mistake must be less than 200 characters'))
    .max(10, 'Maximum 10 common mistakes allowed')
});

export const exerciseFormCheckSchema = z.object({
  exerciseId: z.string()
    .min(1, 'Exercise ID is required')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Invalid exercise ID format'),
  date: z.date(),
  checklist: z.array(z.object({
    item: z.string()
      .min(1, 'Item is required')
      .max(200, 'Item must be less than 200 characters'),
    description: z.string()
      .min(1, 'Description is required')
      .max(300, 'Description must be less than 300 characters'),
    importance: z.enum(['critical', 'important', 'optional'], {
      errorMap: () => ({ message: 'Importance must be critical, important, or optional' })
    }),
    completed: z.boolean()
  }))
    .min(1, 'At least one checklist item is required')
    .max(20, 'Maximum 20 checklist items allowed'),
  score: z.number()
    .min(0, 'Score must be at least 0')
    .max(100, 'Score must be at most 100'),
  feedback: z.string()
    .max(1000, 'Feedback must be less than 1000 characters')
    .optional(),
  videoUrl: z.string()
    .url('Invalid video URL format')
    .max(500, 'Video URL must be less than 500 characters')
    .optional()
});

export type ExerciseFormTemplate = z.infer<typeof exerciseFormTemplateSchema>;
export type ExerciseFormCheck = z.infer<typeof exerciseFormCheckSchema>;

export function validateExerciseFormTemplate(data: unknown): ExerciseFormTemplate {
  return exerciseFormTemplateSchema.parse(data);
}

export function validateExerciseFormCheck(data: unknown): ExerciseFormCheck {
  return exerciseFormCheckSchema.parse(data);
}

export function validateDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return false;
  }
  
  return start <= end;
} 