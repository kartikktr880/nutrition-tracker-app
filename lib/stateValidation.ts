import { logError, logWarn as _logWarn, logInfo as _logInfo, logDebug as _logDebug } from '../utils/logger';
interface ValidationSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  validator?: (data: unknown) => { isValid: boolean; errors: string[] };
}

interface ValidationResult<T> {
  isValid: boolean;
  errors: string[];
  data: T | null;
}

class StateValidation {
  public validateState<T>(data: unknown, schema: ValidationSchema): ValidationResult<T> {
    try {
      const errors: string[] = [];
      
      // Basic type validation
      if (schema.required && (data === null || data === undefined)) {
        errors.push('Data is required but not provided');
        return { isValid: false, errors, data: null };
      }

      // Object validation
      if (schema.type === 'object' && typeof data !== 'object') {
        errors.push('Data must be an object');
        return { isValid: false, errors, data: null };
      }

      // Array validation
      if (schema.type === 'array' && !Array.isArray(data)) {
        errors.push('Data must be an array');
        return { isValid: false, errors, data: null };
      }

      // String validation
      if (schema.type === 'string' && typeof data !== 'string') {
        errors.push('Data must be a string');
        return { isValid: false, errors, data: null };
      }

      // Number validation
      if (schema.type === 'number' && typeof data !== 'number') {
        errors.push('Data must be a number');
        return { isValid: false, errors, data: null };
      }

      // Custom validation
      if (schema.validator) {
        const customResult = schema.validator(data);
        if (!customResult.isValid) {
          errors.push(...customResult.errors);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        data: errors.length === 0 ? data as T : null
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        data: null
      };
    }
  }

  public sanitizeState<T>(data: unknown, schema: ValidationSchema): T {
    try {
      // Basic sanitization based on type
      switch (schema.type) {
        case 'string':
          return String(data || '') as T;
        case 'number':
          return Number(data || 0) as T;
        case 'boolean':
          return Boolean(data) as T;
        case 'array':
          return (Array.isArray(data) ? data : []) as T;
        case 'object':
          return (typeof data === 'object' && data !== null ? data : undefined) as unknown as T;
        default:
          return data as T;
      }
    } catch (error) {
      logError('State sanitization failed:', error);
      return data as T;
    }
  }
}

export const stateValidation = new StateValidation(); 