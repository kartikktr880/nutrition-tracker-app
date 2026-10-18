import { z } from 'zod';

// API endpoint definition
export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  summary: string;
  description?: string;
  tags: string[];
  parameters?: APIParameter[];
  requestBody?: APIRequestBody;
  responses: APIResponse[];
  security?: string[];
  deprecated?: boolean;
  examples?: APIExample[];
}

// API parameter definition
export interface APIParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  schema: z.ZodType<unknown>;
  description?: string;
  example?: unknown;
}

// API request body definition
export interface APIRequestBody {
  required: boolean;
  schema: z.ZodType<unknown>;
  description?: string;
  example?: unknown;
}

// API response definition
export interface APIResponse {
  code: number;
  description: string;
  schema?: z.ZodType<unknown>;
  example?: unknown;
  headers?: Record<string, string>;
}

// API example definition
export interface APIExample {
  name: string;
  summary: string;
  description?: string;
  value: unknown;
}

// OpenAPI specification
export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name: string;
      email: string;
      url: string;
    };
    license?: {
      name: string;
      url: string;
    };
  };
  servers: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, Record<string, unknown>>;
  components: {
    schemas: Record<string, unknown>;
    securitySchemes: Record<string, unknown>;
  };
  security: Array<Record<string, string[]>>;
  tags: Array<{
    name: string;
    description?: string;
  }>;
}

// API documentation class
export class APIDocumentation {
  private endpoints: APIEndpoint[] = [];
  private schemas: Record<string, z.ZodType<unknown>> = {};
  private securitySchemes: Record<string, unknown> = {};

  // Add endpoint to documentation
  addEndpoint(endpoint: APIEndpoint): void {
    this.endpoints.push(endpoint);
  }

  // Add schema to documentation
  addSchema(name: string, schema: z.ZodType<unknown>): void {
    this.schemas[name] = schema;
  }

  // Add security scheme
  addSecurityScheme(name: string, scheme: unknown): void {
    this.securitySchemes[name] = scheme;
  }

  // Generate OpenAPI specification
  generateOpenAPISpec(): OpenAPISpec {
    const paths: Record<string, Record<string, unknown>> = {};
    const components: { schemas: Record<string, unknown>; securitySchemes: Record<string, unknown> } = {
      schemas: {},
      securitySchemes: this.securitySchemes,
    };

    // Process endpoints
    this.endpoints.forEach(endpoint => {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }

      const method = endpoint.method.toLowerCase();
      paths[endpoint.path][method] = {
        summary: endpoint.summary,
        description: endpoint.description,
        tags: endpoint.tags,
        parameters: endpoint.parameters?.map(param => ({
          name: param.name,
          in: param.in,
          required: param.required,
          schema: this.zodToOpenAPI(param.schema),
          description: param.description,
          example: param.example,
        })),
        requestBody: endpoint.requestBody ? {
          required: endpoint.requestBody.required,
          content: {
            'application/json': {
              schema: this.zodToOpenAPI(endpoint.requestBody.schema),
              description: endpoint.requestBody.description,
              example: endpoint.requestBody.example,
            },
          },
        } : undefined,
        responses: endpoint.responses.reduce((acc, response) => {
          acc[response.code] = {
            description: response.description,
            content: response.schema ? {
              'application/json': {
                schema: this.zodToOpenAPI(response.schema),
                example: response.example,
              },
            } : undefined,
            headers: response.headers,
          };
          return acc;
        }, {} as Record<string, unknown>),
        security: endpoint.security?.map(security => ({ [security]: [] })),
        deprecated: endpoint.deprecated,
        examples: endpoint.examples?.reduce((acc, example) => {
          acc[example.name] = {
            summary: example.summary,
            description: example.description,
            value: example.value,
          };
          return acc;
        }, {} as Record<string, unknown>),
      };
    });

    // Process schemas
    Object.entries(this.schemas).forEach(([name, schema]) => {
      components.schemas[name] = this.zodToOpenAPI(schema);
    });

    return {
      openapi: '3.0.0',
      info: {
        title: 'Nutrition Tracker API',
        version: '1.0.0',
        description: 'Comprehensive API for nutrition tracking, meal planning, and health analytics.',
        contact: {
          name: 'API Support',
          email: 'support@nutritiontracker.com',
          url: 'https://nutritiontracker.com/support',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: 'https://api.nutritiontracker.com',
          description: 'Production server',
        },
        {
          url: 'https://staging-api.nutritiontracker.com',
          description: 'Staging server',
        },
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
      ],
      paths,
      components,
      security: [
        { bearerAuth: [] },
        { apiKey: [] },
      ],
      tags: [
        {
          name: 'Authentication',
          description: 'User authentication and authorization endpoints',
        },
        {
          name: 'Food Tracking',
          description: 'Food logging and nutrition tracking endpoints',
        },
        {
          name: 'Water Tracking',
          description: 'Water intake tracking endpoints',
        },
        {
          name: 'Goals',
          description: 'Nutrition and fitness goal management',
        },
        {
          name: 'Analytics',
          description: 'Data analytics and reporting endpoints',
        },
        {
          name: 'Meal Planning',
          description: 'Meal planning and recipe management',
        },
        {
          name: 'User Management',
          description: 'User profile and preferences management',
        },
        {
          name: 'Data Export/Import',
          description: 'Data portability and backup endpoints',
        },
      ],
    };
  }

  // Convert Zod schema to OpenAPI schema
  private zodToOpenAPI(schema: z.ZodType<unknown>): unknown {
    if (schema instanceof z.ZodString) {
      return { type: 'string' };
    }
    if (schema instanceof z.ZodNumber) {
      return { type: 'number' };
    }
    if (schema instanceof z.ZodBoolean) {
      return { type: 'boolean' };
    }
    if (schema instanceof z.ZodArray) {
      return {
        type: 'array',
        items: this.zodToOpenAPI(schema.element),
      };
    }
    if (schema instanceof z.ZodObject) {
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      Object.entries(schema.shape).forEach(([key, value]) => {
        properties[key] = this.zodToOpenAPI(value as z.ZodType<unknown, z.ZodTypeDef, unknown>);
        if (value instanceof z.ZodType && !value.isOptional()) {
          required.push(key);
        }
      });

      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }
    if (schema instanceof z.ZodEnum) {
      return {
        type: 'string',
        enum: schema._def.values,
      };
    }
    if (schema instanceof z.ZodUnion) {
      return {
        oneOf: schema._def.options.map((option: z.ZodType<unknown>) => this.zodToOpenAPI(option)),
      };
    }
    if (schema instanceof z.ZodOptional) {
      return this.zodToOpenAPI(schema.unwrap());
    }
    if (schema instanceof z.ZodNullable) {
      const openAPISchema = this.zodToOpenAPI(schema.unwrap()) as { type: string | string[] };
      return {
        type: ['null', ...(Array.isArray(openAPISchema.type) ? openAPISchema.type : [openAPISchema.type])],
      };
    }

    return { type: 'string' };
  }

  // Generate Markdown documentation
  generateMarkdownDocs(): string {
    let markdown = '# Nutrition Tracker API Documentation\n\n';
    markdown += '## Overview\n\n';
    markdown += 'This document provides comprehensive documentation for the Nutrition Tracker API.\n\n';

    // Group endpoints by tags
    const endpointsByTag = this.endpoints.reduce((acc, endpoint) => {
      endpoint.tags.forEach(tag => {
        if (!acc[tag]) {
          acc[tag] = [];
        }
        acc[tag].push(endpoint);
      });
      return acc;
    }, {} as Record<string, APIEndpoint[]>);

    // Generate documentation for each tag
    Object.entries(endpointsByTag).forEach(([tag, endpoints]) => {
      markdown += `## ${tag}\n\n`;

      endpoints.forEach(endpoint => {
        markdown += `### ${endpoint.method} ${endpoint.path}\n\n`;
        markdown += `${endpoint.summary}\n\n`;
        
        if (endpoint.description) {
          markdown += `${endpoint.description}\n\n`;
        }

        // Parameters
        if (endpoint.parameters && endpoint.parameters.length > 0) {
          markdown += '#### Parameters\n\n';
          markdown += '| Name | Type | Required | Description |\n';
          markdown += '|------|------|----------|-------------|\n';
          
          endpoint.parameters.forEach(param => {
            markdown += `| ${param.name} | ${this.getSchemaType(param.schema)} | ${param.required ? 'Yes' : 'No'} | ${param.description || ''} |\n`;
          });
          markdown += '\n';
        }

        // Request Body
        if (endpoint.requestBody) {
          markdown += '#### Request Body\n\n';
          markdown += '```json\n';
          markdown += JSON.stringify(endpoint.requestBody.example || {}, null, 2);
          markdown += '\n```\n\n';
        }

        // Responses
        markdown += '#### Responses\n\n';
        endpoint.responses.forEach(response => {
          markdown += `**${response.code}** - ${response.description}\n\n`;
          if (response.example) {
            markdown += '```json\n';
            markdown += JSON.stringify(response.example, null, 2);
            markdown += '\n```\n\n';
          }
        });

        if (endpoint.examples && endpoint.examples.length > 0) {
          markdown += '#### Examples\n\n';
          endpoint.examples.forEach(example => {
            markdown += `**${example.name}**\n\n`;
            markdown += `${example.summary}\n\n`;
            if (example.description) {
              markdown += `${example.description}\n\n`;
            }
            markdown += '```json\n';
            markdown += JSON.stringify(example.value, null, 2);
            markdown += '\n```\n\n';
          });
        }

        markdown += '---\n\n';
      });
    });

    return markdown;
  }

  // Get schema type for documentation
  private getSchemaType(schema: z.ZodType<unknown>): string {
    if (schema instanceof z.ZodString) return 'string';
    if (schema instanceof z.ZodNumber) return 'number';
    if (schema instanceof z.ZodBoolean) return 'boolean';
    if (schema instanceof z.ZodArray) return `array<${this.getSchemaType(schema.element)}>`;
    if (schema instanceof z.ZodObject) return 'object';
    if (schema instanceof z.ZodEnum) return `enum(${schema._def.values.join(', ')})`;
    if (schema instanceof z.ZodUnion) return 'union';
    if (schema instanceof z.ZodOptional) return `${this.getSchemaType(schema.unwrap())} (optional)`;
    if (schema instanceof z.ZodNullable) return `${this.getSchemaType(schema.unwrap())} (nullable)`;
    return 'string';
  }

  // Generate TypeScript types
  generateTypeScriptTypes(): string {
    let types = '// Generated TypeScript types for Nutrition Tracker API\n\n';

    // Generate types for schemas
    Object.entries(this.schemas).forEach(([name, schema]) => {
      types += `export interface ${name} {\n`;
      
      if (schema instanceof z.ZodObject) {
        Object.entries(schema.shape).forEach(([key, value]) => {
          const isOptional = value instanceof z.ZodOptional;
          const actualSchema = isOptional ? value.unwrap() : value;
          const type = this.getTypeScriptType(actualSchema);
          types += `  ${key}${isOptional ? '?' : ''}: ${type};\n`;
        });
      }
      
      types += '}\n\n';
    });

    // Generate types for API responses
    this.endpoints.forEach(endpoint => {
      endpoint.responses.forEach(response => {
        if (response.schema) {
          const responseType = `API${endpoint.method}${endpoint.path.replace(/[^a-zA-Z0-9]/g, '')}Response`;
          types += `export type ${responseType} = ${this.getTypeScriptType(response.schema)};\n`;
        }
      });
    });

    return types;
  }

  // Get TypeScript type for schema
  private getTypeScriptType(schema: z.ZodType<unknown>): string {
    if (schema instanceof z.ZodString) return 'string';
    if (schema instanceof z.ZodNumber) return 'number';
    if (schema instanceof z.ZodBoolean) return 'boolean';
    if (schema instanceof z.ZodArray) return `${this.getTypeScriptType(schema.element)}[]`;
    if (schema instanceof z.ZodObject) return 'object';
    if (schema instanceof z.ZodEnum) return schema._def.values.map((v: string) => `'${v}'`).join(' | ');
    if (schema instanceof z.ZodUnion) return schema._def.options.map((option: z.ZodType<unknown>) => this.getTypeScriptType(option)).join(' | ');
    if (schema instanceof z.ZodOptional) return `${this.getTypeScriptType(schema.unwrap())} | undefined`;
    if (schema instanceof z.ZodNullable) return `${this.getTypeScriptType(schema.unwrap())} | null`;
    return 'any';
  }
}

// Predefined API schemas
export const API_SCHEMAS = {
  // User schemas
  User: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),

  // Food entry schemas
  FoodEntry: z.object({
    id: z.string(),
    name: z.string(),
    nutrition: z.object({
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
      fiber: z.number(),
      sugar: z.number(),
      sodium: z.number(),
    }),
    servingSize: z.number(),
    servingUnit: z.string(),
    timestamp: z.string(),
    mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
    barcode: z.string().optional(),
    brand: z.string().optional(),
  }),

  // Water entry schemas
  WaterEntry: z.object({
    id: z.string(),
    amount: z.number(),
    timestamp: z.string(),
  }),

  // Goal schemas
  Goal: z.object({
    id: z.string(),
    type: z.enum(['calories', 'protein', 'carbs', 'fat', 'water', 'weight']),
    target: z.number(),
    current: z.number(),
    unit: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    isActive: z.boolean(),
  }),

  // Achievement schemas
  Achievement: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    icon: z.string(),
    unlockedAt: z.string(),
    category: z.enum(['nutrition', 'water', 'streak', 'goal', 'social']),
  }),

  // Error schemas
  Error: z.object({
    error: z.string(),
    message: z.string().optional(),
    code: z.string().optional(),
  }),

  // Pagination schemas
  PaginationParams: z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),

  PaginatedResponse: z.object({
    data: z.array(z.any()),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
  }),
};

// Global API documentation instance
export const apiDocs = new APIDocumentation();

// Add security schemes
apiDocs.addSecurityScheme('bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

apiDocs.addSecurityScheme('apiKey', {
  type: 'apiKey',
  in: 'header',
  name: 'X-API-Key',
});

// Add schemas
Object.entries(API_SCHEMAS).forEach(([name, schema]) => {
  apiDocs.addSchema(name, schema);
});

// Export utilities
export const apiDocumentationUtils = {
  APIDocumentation,
  API_SCHEMAS,
  apiDocs,
}; 