import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SearchOptionsSchema, SearchResultSchema, SearchResult } from '@/services/searchService';
import { databaseService } from '@/services/databaseService';
import { analyticsService } from '@/services/analyticsService';

// Request validation schema
const SearchRequestSchema = z.object({
  query: z.string().min(2),
  ...SearchOptionsSchema.shape,
  filters: z.object({
    minCalories: z.number().optional(),
    maxCalories: z.number().optional(),
    minProtein: z.number().optional(),
    maxProtein: z.number().optional(),
    minCarbs: z.number().optional(),
    maxCarbs: z.number().optional(),
    minFat: z.number().optional(),
    maxFat: z.number().optional(),
    sortBy: z.enum(['name', 'calories', 'protein', 'carbs', 'fat']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = SearchRequestSchema.parse(body);

    // Get search results based on type
    let results: SearchResult[];
    if (validatedData.type === 'food') {
      results = await databaseService.searchFoods(validatedData.query);
    } else if (validatedData.type === 'meal') {
      results = await databaseService.searchMeals(
        validatedData.query,
        validatedData.limit,
        validatedData.offset
      );
    } else {
      results = await databaseService.searchAll(
        validatedData.query,
        validatedData.limit,
        validatedData.offset
      );
    }

    // Generate highlights and suggestions
    const resultsWithHighlights = results.map(result => ({
      ...result,
      highlights: [
        ...generateHighlights(result.name, validatedData.query),
        ...(result.description ? generateHighlights(result.description, validatedData.query) : []),
      ],
    }));

    const suggestions = generateSuggestions(validatedData.query, resultsWithHighlights);

    // Validate results before sending
    const validatedResults = z.array(SearchResultSchema).parse(resultsWithHighlights);

    // Track search analytics
    analyticsService.trackSearch({
      query: validatedData.query,
      type: validatedData.type || 'all',
      resultCount: validatedResults.length,
    });

    return NextResponse.json({
      data: {
        results: validatedResults,
        total: validatedResults.length,
        page: Math.floor((validatedData.offset || 0) / (validatedData.limit || 10)) + 1,
        hasMore: validatedResults.length === (validatedData.limit || 10),
        suggestions,
      },
      status: 500,
    });
  } catch (error: unknown) {
    console.error('Search API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        status: 500,
      }, { status: 500 });
    }

    return NextResponse.json({
      error: 'Internal server error',
      status: 500,
    }, { status: 500 });
  }
}

function generateHighlights(text: string, query: string): string[] {
  const highlights: string[] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let startIndex = 0;

  while (startIndex < lowerText.length) {
    const index = lowerText.indexOf(lowerQuery, startIndex);
    if (index === -1) break;

    const endIndex = index + lowerQuery.length;
    const highlight = text.slice(index, endIndex);
    highlights.push(highlight);
    startIndex = endIndex;
  }

  return highlights;
}

function generateSuggestions(query: string, results: SearchResult[]): string[] {
  const suggestions = new Set<string>();
  const words = query.toLowerCase().split(/\s+/);

  results.forEach(result => {
    const nameWords = result.name.toLowerCase().split(/\s+/);
    const descriptionWords = result.description?.toLowerCase().split(/\s+/) || [];

    [...nameWords, ...descriptionWords].forEach(word => {
      if (word.length > 2 && !words.includes(word)) {
        suggestions.add(word);
      }
    });
  });

  return Array.from(suggestions).slice(0, 5);
} 






