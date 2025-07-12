import { ExerciseFormCheck, ExerciseFormTemplate } from '@/types/exercise';

class ExerciseFormService {
  private static instance: ExerciseFormService;
  private cache: Map<string, unknown>;

  private constructor() {
    this.cache = new Map();
  }

  public static getInstance(): ExerciseFormService {
    if (!ExerciseFormService.instance) {
      ExerciseFormService.instance = new ExerciseFormService();
    }
    return ExerciseFormService.instance;
  }

  // Form Template Management
  async getFormTemplates(exerciseId?: string): Promise<ExerciseFormTemplate[]> {
    const cacheKey = `templates_${exerciseId || 'all'}`;
    
    if (this.cache.has(cacheKey)) {
      const result = this.cache.get(cacheKey);
      if (Array.isArray(result)) {
        return result as ExerciseFormTemplate[];
      }
      return [];
    }

    const response = await fetch(
      `/api/exercise/form/templates${exerciseId ? `?exerciseId=${exerciseId}` : ''}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch form templates');
    }

    const data = await response.json();
    this.cache.set(cacheKey, data);
    return data;
  }

  async createFormTemplate(template: Partial<ExerciseFormTemplate>): Promise<ExerciseFormTemplate> {
    const response = await fetch('/api/exercise/form/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });

    if (!response.ok) {
      throw new Error('Failed to create form template');
    }

    const data = await response.json();
    this.invalidateCache('templates');
    return data;
  }

  // Form Check Management
  async getFormChecks(exerciseId?: string, startDate?: Date, endDate?: Date): Promise<ExerciseFormCheck[]> {
    const cacheKey = `checks_${exerciseId || 'all'}_${startDate?.toISOString()}_${endDate?.toISOString()}`;
    
    if (this.cache.has(cacheKey)) {
      const result = this.cache.get(cacheKey);
      if (Array.isArray(result)) {
        return result as ExerciseFormCheck[];
      }
      return [];
    }

    const response = await fetch(
      `/api/exercise/form/checks?${new URLSearchParams({
        ...(exerciseId && { exerciseId }),
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() }),
      })}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch form checks');
    }

    const data = await response.json();
    this.cache.set(cacheKey, data);
    return data;
  }

  async createFormCheck(check: Partial<ExerciseFormCheck>): Promise<ExerciseFormCheck> {
    const response = await fetch('/api/exercise/form/checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(check),
    });

    if (!response.ok) {
      throw new Error('Failed to create form check');
    }

    const data = await response.json();
    this.invalidateCache('checks');
    return data;
  }

  async updateFormCheck(id: string, check: Partial<ExerciseFormCheck>): Promise<ExerciseFormCheck> {
    const response = await fetch(`/api/exercise/form/checks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(check),
    });

    if (!response.ok) {
      throw new Error('Failed to update form check');
    }

    const data = await response.json();
    this.invalidateCache('checks');
    return data;
  }

  // Cache Management
  private invalidateCache(type: string) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(type)) {
        this.cache.delete(key);
      }
    }
  }

  // Helper Methods
  calculateFormScore(checklist: { completed: boolean; importance: string }[]): number {
    const totalItems = checklist.length;
    if (totalItems === 0) return 0;

    const weights = {
      critical: 3,
      important: 2,
      optional: 1,
    };

    const totalWeight = checklist.reduce(
      (sum, item) => sum + weights[item.importance as keyof typeof weights],
      0
    );

    const score = checklist.reduce((sum, item) => {
      if (item.completed) {
        return sum + weights[item.importance as keyof typeof weights];
      }
      return sum;
    }, 0);

    return Math.round((score / totalWeight) * 100);
  }
}

export const exerciseFormService = ExerciseFormService.getInstance(); 