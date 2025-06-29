import { z } from 'zod';
import { recordError, recordOperationLatency } from '@/lib/monitoring';
import { auditLogger } from '@/lib/audit-logger';
import { validationAnalytics } from './validationAnalytics';

interface ValidationRule<T> {
  validate: (value: T) => boolean | Promise<boolean>;
  message: string;
  priority?: number;
}

interface ValidationMiddleware<T> {
  before?: (value: T) => Promise<T> | T;
  after?: (value: T, result: ValidationResult) => Promise<ValidationResult> | ValidationResult;
  priority?: number;
}

interface CrossFieldValidation<T> {
  fields: string[];
  validate: (value: T) => boolean | Promise<boolean>;
  message: string;
  priority?: number;
}

interface ValidationConfig {
  schema?: z.ZodType<any>;
  rules?: ValidationRule<any>[];
  typeGuard?: (value: any) => boolean;
  validateOnSet?: boolean;
  validateOnGet?: boolean;
  validateOnSync?: boolean;
  customValidators?: Array<(value: any) => boolean | Promise<boolean>>;
  middleware?: ValidationMiddleware<any>[];
  crossFieldValidations?: CrossFieldValidation<any>[];
  cacheConfig?: {
    enabled?: boolean;
    ttl?: number;
    maxSize?: number;
  };
  performanceConfig?: {
    batchValidation?: boolean;
    parallelValidation?: boolean;
    validationTimeout?: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    validationTime: number;
    validationType: 'schema' | 'rule' | 'type' | 'custom' | 'cross-field';
    timestamp: Date;
    performanceMetrics: {
      cacheHit: boolean;
      middlewareTime: number;
      validationTime: number;
      totalTime: number;
    };
  };
}

class StateValidation {
  private static instance: StateValidation;
  private validators: Map<string, ValidationConfig> = new Map();
  private validationCache: Map<string, { result: ValidationResult; timestamp: number }> = new Map();
  private readonly DEFAULT_CACHE_TTL = 60000; // 1 minute
  private readonly DEFAULT_CACHE_MAX_SIZE = 1000;
  private readonly DEFAULT_VALIDATION_TIMEOUT = 5000; // 5 seconds

  private constructor() {
    this.startCacheCleanup();
  }

  public static getInstance(): StateValidation {
    if (!StateValidation.instance) {
      StateValidation.instance = new StateValidation();
    }
    return StateValidation.instance;
  }

  private startCacheCleanup() {
    setInterval(() => {
      this.cleanupCache();
    }, 300000); // Every 5 minutes
  }

  private cleanupCache() {
    const now = Date.now();
    const configs = Array.from(this.validators.entries());
    
    for (const [key, config] of configs) {
      const ttl = config.cacheConfig?.ttl ?? this.DEFAULT_CACHE_TTL;
      const maxSize = config.cacheConfig?.maxSize ?? this.DEFAULT_CACHE_MAX_SIZE;
      
      // Remove expired entries
      for (const [cacheKey, entry] of this.validationCache) {
        if (cacheKey.startsWith(key) && now - entry.timestamp > ttl) {
          this.validationCache.delete(cacheKey);
        }
      }
      
      // Enforce max size
      const entries = Array.from(this.validationCache.entries())
        .filter(([cacheKey]) => cacheKey.startsWith(key))
        .sort((a, b) => b[1].timestamp - a[1].timestamp);
      
      if (entries.length > maxSize) {
        entries.slice(maxSize).forEach(([cacheKey]) => {
          this.validationCache.delete(cacheKey);
        });
      }
    }
  }

  public configure(key: string, config: ValidationConfig): void {
    this.validators.set(key, {
      validateOnSet: true,
      validateOnGet: false,
      validateOnSync: true,
      cacheConfig: {
        enabled: true,
        ttl: this.DEFAULT_CACHE_TTL,
        maxSize: this.DEFAULT_CACHE_MAX_SIZE
      },
      performanceConfig: {
        batchValidation: true,
        parallelValidation: true,
        validationTimeout: this.DEFAULT_VALIDATION_TIMEOUT
      },
      ...config
    });
  }

  private async runMiddleware<T>(
    value: T,
    middleware: ValidationMiddleware<T>[],
    phase: 'before' | 'after',
    result?: ValidationResult
  ): Promise<{ value: T; result?: ValidationResult }> {
    const startTime = performance.now();
    const sortedMiddleware = [...middleware].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    
    try {
      if (phase === 'before') {
        let processedValue = value;
        for (const m of sortedMiddleware) {
          if (m.before) {
            processedValue = await m.before(processedValue);
          }
        }
        return { value: processedValue };
      } else {
        let processedResult = result!;
        for (const m of sortedMiddleware) {
          if (m.after) {
            processedResult = await m.after(value, processedResult);
          }
        }
        return { value, result: processedResult };
      }
    } finally {
      const middlewareTime = performance.now() - startTime;
      if (result) {
        result.metadata.performanceMetrics.middlewareTime = middlewareTime;
      }
    }
  }

  private async validateCrossFields<T>(
    value: T,
    validations: CrossFieldValidation<T>[]
  ): Promise<{ errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sortedValidations = [...validations].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    for (const validation of sortedValidations) {
      try {
        const isValid = await validation.validate(value);
        if (!isValid) {
          errors.push(validation.message);
        }
      } catch (error) {
        errors.push(`Cross-field validation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return { errors, warnings };
  }

  public async validate<T>(key: string, value: T): Promise<ValidationResult> {
    const startTime = performance.now();
    const config = this.validators.get(key);
    const errors: string[] = [];
    const warnings: string[] = [];
    const performanceMetrics = {
      cacheHit: false,
      middlewareTime: 0,
      validationTime: 0,
      totalTime: 0
    };

    // Create debug info for analytics
    const debugInfo = {
      validationChain: [] as Array<{
        type: string;
        startTime: number;
        endTime: number;
        duration: number;
        success: boolean;
        details?: any;
      }>,
      stateSnapshot: {
        before: value,
        after: null as any,
        changes: [] as Array<{ path: string; before: any; after: any }>
      },
      performanceBreakdown: {
        middleware: 0,
        schema: 0,
        rules: 0,
        crossField: 0,
        custom: 0,
        total: 0
      },
      validationContext: {
        key,
        timestamp: new Date(),
        config,
        environment: {
          browser: navigator.userAgent,
          device: navigator.platform,
          network: navigator.connection?.type ?? 'unknown'
        }
      }
    };

    try {
      // Check cache if enabled
      if (config?.cacheConfig?.enabled) {
        const cacheKey = `${key}:${JSON.stringify(value)}`;
        const cached = this.validationCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < (config.cacheConfig.ttl ?? this.DEFAULT_CACHE_TTL)) {
          performanceMetrics.cacheHit = true;
          return {
            ...cached.result,
            metadata: {
              ...cached.result.metadata,
              performanceMetrics: {
                ...cached.result.metadata.performanceMetrics,
                totalTime: performance.now() - startTime
              }
            }
          };
        }
      }

      if (!config) {
        const result = {
          isValid: true,
          errors: [],
          warnings: [],
          metadata: {
            validationTime: performance.now() - startTime,
            validationType: 'schema',
            timestamp: new Date(),
            performanceMetrics
          }
        };
        validationAnalytics.recordValidation(key, result, debugInfo);
        return result;
      }

      // Run before middleware
      const middlewareStartTime = performance.now();
      const { value: processedValue } = await this.runMiddleware(
        value,
        config.middleware ?? [],
        'before'
      );
      const middlewareTime = performance.now() - middlewareStartTime;
      debugInfo.performanceBreakdown.middleware = middlewareTime;
      debugInfo.validationChain.push({
        type: 'middleware',
        startTime: middlewareStartTime,
        endTime: performance.now(),
        duration: middlewareTime,
        success: true
      });

      const validationStartTime = performance.now();

      // Schema validation
      if (config.schema) {
        const schemaStartTime = performance.now();
        try {
          await config.schema.parseAsync(processedValue);
          debugInfo.validationChain.push({
            type: 'schema',
            startTime: schemaStartTime,
            endTime: performance.now(),
            duration: performance.now() - schemaStartTime,
            success: true
          });
        } catch (error) {
          const schemaTime = performance.now() - schemaStartTime;
          debugInfo.performanceBreakdown.schema = schemaTime;
          debugInfo.validationChain.push({
            type: 'schema',
            startTime: schemaStartTime,
            endTime: performance.now(),
            duration: schemaTime,
            success: false,
            details: error
          });
          if (error instanceof z.ZodError) {
            errors.push(...error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
          } else {
            errors.push('Schema validation failed');
          }
        }
      }

      // Type guard validation
      if (config.typeGuard && !config.typeGuard(processedValue)) {
        errors.push('Type validation failed');
      }

      // Custom rules validation
      if (config.rules) {
        const sortedRules = [...config.rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
        const validationPromises = config.performanceConfig?.parallelValidation
          ? sortedRules.map(rule => rule.validate(processedValue))
          : sortedRules.map(rule => rule.validate(processedValue));

        const results = await Promise.all(validationPromises);
        results.forEach((isValid, index) => {
          if (!isValid) {
            errors.push(sortedRules[index].message);
          }
        });
      }

      // Cross-field validation
      if (config.crossFieldValidations) {
        const { errors: crossFieldErrors, warnings: crossFieldWarnings } = 
          await this.validateCrossFields(processedValue, config.crossFieldValidations);
        errors.push(...crossFieldErrors);
        warnings.push(...crossFieldWarnings);
      }

      // Custom validators
      if (config.customValidators) {
        const validationPromises = config.performanceConfig?.parallelValidation
          ? config.customValidators.map(validator => validator(processedValue))
          : config.customValidators.map(validator => validator(processedValue));

        const results = await Promise.all(validationPromises);
        results.forEach((isValid, index) => {
          if (!isValid) {
            errors.push(`Custom validation ${index + 1} failed`);
          }
        });
      }

      // Size validation
      const size = new Blob([JSON.stringify(processedValue)]).size;
      if (size > 10 * 1024 * 1024) { // 10MB
        warnings.push('State size exceeds recommended limit');
      }

      const validationTime = performance.now() - validationStartTime;
      performanceMetrics.validationTime = validationTime;

      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: {
          validationTime,
          validationType: config.schema ? 'schema' : config.rules ? 'rule' : config.typeGuard ? 'type' : 'custom',
          timestamp: new Date(),
          performanceMetrics
        }
      };

      // Update debug info
      debugInfo.stateSnapshot.after = processedValue;
      debugInfo.performanceBreakdown.total = performance.now() - startTime;

      // Run after middleware
      const { result: processedResult } = await this.runMiddleware(
        processedValue,
        config.middleware ?? [],
        'after',
        result
      );

      // Record analytics
      validationAnalytics.recordValidation(key, processedResult, debugInfo);

      // Cache result if enabled
      if (config.cacheConfig?.enabled) {
        const cacheKey = `${key}:${JSON.stringify(value)}`;
        this.validationCache.set(cacheKey, {
          result: processedResult,
          timestamp: Date.now()
        });
      }

      // Log validation result
      auditLogger.log({
        category: 'state_validation',
        severity: processedResult.isValid ? 'info' : 'warning',
        message: `State validation ${processedResult.isValid ? 'passed' : 'failed'}`,
        context: {
          key,
          errors: processedResult.errors,
          warnings: processedResult.warnings,
          validationTime: processedResult.metadata.validationTime,
          performanceMetrics: processedResult.metadata.performanceMetrics
        }
      });

      recordOperationLatency('state_validation', processedResult.metadata.validationTime, {
        key,
        isValid: processedResult.isValid,
        validationType: processedResult.metadata.validationType,
        cacheHit: performanceMetrics.cacheHit
      });

      return processedResult;
    } catch (error) {
      const errorResult = {
        isValid: false,
        errors: ['Validation process failed'],
        warnings: [],
        metadata: {
          validationTime: performance.now() - startTime,
          validationType: 'schema',
          timestamp: new Date(),
          performanceMetrics
        }
      };
      
      // Record analytics for failed validation
      validationAnalytics.recordValidation(key, errorResult, {
        ...debugInfo,
        validationChain: [
          ...debugInfo.validationChain,
          {
            type: 'error',
            startTime: performance.now(),
            endTime: performance.now(),
            duration: 0,
            success: false,
            details: error
          }
        ]
      });

      recordError('State validation failed', error instanceof Error ? error.message : String(error));
      return errorResult;
    }
  }

  public clearCache(key?: string): void {
    if (key) {
      for (const cacheKey of this.validationCache.keys()) {
        if (cacheKey.startsWith(key)) {
          this.validationCache.delete(cacheKey);
        }
      }
    } else {
      this.validationCache.clear();
    }
  }

  public getValidationConfig(key: string): ValidationConfig | undefined {
    return this.validators.get(key);
  }

  public async cleanup(): Promise<void> {
    this.cleanupCache();
  }
}

export const stateValidation = StateValidation.getInstance(); 