import { z } from 'zod';

// Analytics schemas
const SearchEventSchema = z.object({
  query: z.string(),
  type: z.enum(['food', 'meal', 'recipe', 'all']),
  timestamp: z.date(),
  resultCount: z.number(),
  selectedResultId: z.string().optional(),
  timeToSelect: z.number().optional(), // Time in milliseconds from search to selection
});

type SearchEvent = z.infer<typeof SearchEventSchema>;

class AnalyticsService {
  private static instance: AnalyticsService;
  private searchEvents: SearchEvent[];
  private readonly MAX_EVENTS = 1000;

  private constructor() {
    this.searchEvents = [];
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  public trackSearch(event: Omit<SearchEvent, 'timestamp'>): void {
    const validatedEvent = SearchEventSchema.parse({
      ...event,
      timestamp: new Date(),
    });

    this.searchEvents.push(validatedEvent);
    this.cleanupOldEvents();
  }

  public getPopularSearches(limit = 10): { query: string; count: number }[] {
    const queryCounts = new Map<string, number>();
    
    this.searchEvents.forEach(event => {
      const count = queryCounts.get(event.query) || 0;
      queryCounts.set(event.query, count + 1);
    });

    return Array.from(queryCounts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  public getSearchMetrics(): {
    totalSearches: number;
    averageResultsPerSearch: number;
    averageTimeToSelect: number;
    mostCommonType: string;
  } {
    if (this.searchEvents.length === 0) {
      return {
        totalSearches: 0,
        averageResultsPerSearch: 0,
        averageTimeToSelect: 0,
        mostCommonType: 'all',
      };
    }

    const typeCounts = new Map<string, number>();
    let totalResults = 0;
    let totalTimeToSelect = 0;
    let timeToSelectCount = 0;

    this.searchEvents.forEach(event => {
      // Count search types
      const typeCount = typeCounts.get(event.type) || 0;
      typeCounts.set(event.type, typeCount + 1);

      // Sum results
      totalResults += event.resultCount;

      // Calculate average time to select
      if (event.timeToSelect) {
        totalTimeToSelect += event.timeToSelect;
        timeToSelectCount++;
      }
    });

    // Find most common type
    const mostCommonType = Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1])[0][0];

    return {
      totalSearches: this.searchEvents.length,
      averageResultsPerSearch: totalResults / this.searchEvents.length,
      averageTimeToSelect: timeToSelectCount > 0 ? totalTimeToSelect / timeToSelectCount : 0,
      mostCommonType,
    };
  }

  private cleanupOldEvents(): void {
    if (this.searchEvents.length > this.MAX_EVENTS) {
      // Keep only the most recent events
      this.searchEvents = this.searchEvents
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, this.MAX_EVENTS);
    }
  }
}

export const analyticsService = AnalyticsService.getInstance(); 