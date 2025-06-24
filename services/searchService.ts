import { z } from 'zod';
import { apiClient } from './apiClient';

// Define search result types
export const SearchResultSchema = z.object({
  id: z.string(),
  type: z.enum(['food', 'meal', 'recipe']),
  name: z.string(),
  description: z.string().optional(),
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
  highlights: z.array(z.string()).optional(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SearchOptionsSchema = z.object({
  type: z.enum(['food', 'meal', 'recipe', 'all']).optional(),
  limit: z.number().min(1).max(50).optional(),
  offset: z.number().min(0).optional(),
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

export type SearchOptions = z.infer<typeof SearchOptionsSchema>;

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  total: z.number(),
  page: z.number(),
  hasMore: z.boolean(),
  suggestions: z.array(z.string()).optional(),
});

interface CacheEntry {
  results: SearchResult[];
  timestamp: number;
}

interface RecentSearch {
  query: string;
  timestamp: number;
  type?: string;
  category?: string;
  tags?: string[];
}

type SortOption = 'newest' | 'oldest' | 'alphabetical' | 'category';

interface ExportData {
  version: string;
  timestamp: number;
  searches: RecentSearch[];
  categories: string[];
  tags: string[];
}

interface SearchAnalytics {
  totalSearches: number;
  searchesByType: Record<string, number>;
  searchesByCategory: Record<string, number>;
  popularTags: Array<{ tag: string; count: number }>;
  recentActivity: Array<{ date: string; count: number }>;
  averageSearchesPerDay: number;
}

interface SearchTrends {
  weeklyTrends: {
    day: string;
    count: number;
    types: Record<string, number>;
  }[];
  monthlyTrends: {
    week: string;
    count: number;
    categories: Record<string, number>;
  }[];
  peakHours: {
    hour: number;
    count: number;
  }[];
  searchPatterns: {
    pattern: string;
    frequency: number;
    examples: string[];
  }[];
}

interface SearchInsight {
  type: 'recommendation' | 'pattern' | 'trend' | 'suggestion';
  title: string;
  description: string;
  confidence: number;
  data?: Record<string, any>;
  action?: {
    label: string;
    type: string;
    value: string;
  };
}

interface SearchHistoryExport {
  version: string;
  timestamp: number;
  searches: RecentSearch[];
  analytics: SearchAnalytics;
  insights: SearchInsight[];
  metadata: {
    totalSearches: number;
    dateRange: {
      start: number;
      end: number;
    };
    categories: string[];
    tags: string[];
  };
}

export class SearchService {
  private static instance: SearchService;
  private searchCache: Map<string, CacheEntry>;
  private recentSearches: RecentSearch[];
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CACHE_EXPIRATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RECENT_SEARCHES = 10;
  private readonly RECENT_SEARCHES_KEY = 'recent_searches';
  private readonly DEFAULT_CATEGORIES = ['Favorites', 'Work', 'Personal'];

  private constructor() {
    this.searchCache = new Map();
    this.recentSearches = this.loadRecentSearches();
  }

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  private loadRecentSearches(): RecentSearch[] {
    try {
      const stored = localStorage.getItem(this.RECENT_SEARCHES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading recent searches:', error);
      return [];
    }
  }

  private saveRecentSearches(): void {
    try {
      localStorage.setItem(this.RECENT_SEARCHES_KEY, JSON.stringify(this.recentSearches));
    } catch (error) {
      console.error('Error saving recent searches:', error);
    }
  }

  private addRecentSearch(query: string, type?: string, category?: string, tags?: string[]): void {
    const search: RecentSearch = {
      query,
      timestamp: Date.now(),
      type,
      category,
      tags: tags || [],
    };

    // Remove existing entry if query already exists
    this.recentSearches = this.recentSearches.filter(s => s.query !== query);
    
    // Add new search at the beginning
    this.recentSearches.unshift(search);
    
    // Keep only the most recent searches
    if (this.recentSearches.length > this.MAX_RECENT_SEARCHES) {
      this.recentSearches = this.recentSearches.slice(0, this.MAX_RECENT_SEARCHES);
    }

    this.saveRecentSearches();
  }

  public getRecentSearches(
    category?: string,
    tags?: string[],
    searchTerm?: string,
    sortBy: SortOption = 'newest'
  ): RecentSearch[] {
    let searches = [...this.recentSearches];

    // Apply category filter
    if (category) {
      searches = searches.filter(search => search.category === category);
    }

    // Apply tags filter
    if (tags && tags.length > 0) {
      searches = searches.filter(search => 
        search.tags?.some(tag => tags.includes(tag))
      );
    }

    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      searches = searches.filter(search => 
        search.query.toLowerCase().includes(term) ||
        search.type?.toLowerCase().includes(term) ||
        search.category?.toLowerCase().includes(term) ||
        search.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        searches.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'oldest':
        searches.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'alphabetical':
        searches.sort((a, b) => a.query.localeCompare(b.query));
        break;
      case 'category':
        searches.sort((a, b) => {
          if (!a.category && !b.category) return 0;
          if (!a.category) return 1;
          if (!b.category) return -1;
          return a.category.localeCompare(b.category);
        });
        break;
    }

    return searches;
  }

  public getCategories(): string[] {
    const categories = new Set<string>(this.DEFAULT_CATEGORIES);
    this.recentSearches.forEach(search => {
      if (search.category) {
        categories.add(search.category);
      }
    });
    return Array.from(categories);
  }

  public getTags(): string[] {
    const tags = new Set<string>();
    this.recentSearches.forEach(search => {
      search.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }

  public updateSearchCategory(query: string, category: string): void {
    const search = this.recentSearches.find(s => s.query === query);
    if (search) {
      search.category = category;
      this.saveRecentSearches();
    }
  }

  public updateSearchTags(query: string, tags: string[]): void {
    const search = this.recentSearches.find(s => s.query === query);
    if (search) {
      search.tags = tags;
      this.saveRecentSearches();
    }
  }

  public clearRecentSearches(): void {
    this.recentSearches = [];
    this.saveRecentSearches();
  }

  private validateQuery(query: string): void {
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid search query');
    }
    if (query.length < 2) {
      throw new Error('Search query must be at least 2 characters long');
    }
  }

  private validateOptions(options: SearchOptions): void {
    try {
      SearchOptionsSchema.parse(options);
    } catch (error) {
      throw new Error('Invalid search options');
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    Array.from(this.searchCache.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > this.CACHE_EXPIRATION) {
        this.searchCache.delete(key);
      }
    });
  }

  private enforceCacheLimit(): void {
    if (this.searchCache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.searchCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const entriesToRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
      entriesToRemove.forEach(([key]) => this.searchCache.delete(key));
    }
  }

  private generateHighlights(text: string, query: string): string[] {
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

  private generateSuggestions(query: string, results: SearchResult[]): string[] {
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

  public async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    try {
      this.validateQuery(query);
      this.validateOptions(options);
      this.cleanupCache();

      const cacheKey = `${query}-${options.type || 'all'}-${JSON.stringify(options.filters || {})}`;
      const cachedEntry = this.searchCache.get(cacheKey);

      if (cachedEntry && Date.now() - cachedEntry.timestamp <= this.CACHE_EXPIRATION) {
        return cachedEntry.results;
      }

      // Make API request
      const response = await apiClient.post(
        '/search',
        { query, ...options },
        SearchResponseSchema
      );

      // Add highlights and suggestions
      const resultsWithHighlights = response.results.map(result => ({
        ...result,
        highlights: [
          ...this.generateHighlights(result.name, query),
          ...(result.description ? this.generateHighlights(result.description, query) : []),
        ],
      }));

      const suggestions = this.generateSuggestions(query, resultsWithHighlights);

      // Cache results
      this.searchCache.set(cacheKey, {
        results: resultsWithHighlights,
        timestamp: Date.now(),
      });
      this.enforceCacheLimit();

      // Add to recent searches
      this.addRecentSearch(query, options.type);

      return resultsWithHighlights;
    } catch (error) {
      console.error('Search error:', error);
      throw error instanceof Error ? error : new Error('Failed to perform search');
    }
  }

  public clearCache(): void {
    this.searchCache.clear();
  }

  public exportRecentSearches(): string {
    try {
      const exportData: ExportData = {
        version: '1.0',
        timestamp: Date.now(),
        searches: this.recentSearches,
        categories: this.getCategories(),
        tags: this.getTags(),
      };
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting recent searches:', error);
      throw new Error('Failed to export recent searches');
    }
  }

  public importRecentSearches(data: string): void {
    try {
      const importData = JSON.parse(data) as ExportData;
      
      // Validate import data
      if (!importData.version || !importData.searches || !Array.isArray(importData.searches)) {
        throw new Error('Invalid import data format');
      }

      // Merge with existing data
      const existingQueries = new Set(this.recentSearches.map(s => s.query));
      const newSearches = importData.searches.filter(s => !existingQueries.has(s.query));
      
      this.recentSearches = [...this.recentSearches, ...newSearches];
      
      // Keep only the most recent searches
      if (this.recentSearches.length > this.MAX_RECENT_SEARCHES) {
        this.recentSearches = this.recentSearches
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, this.MAX_RECENT_SEARCHES);
      }

      this.saveRecentSearches();
    } catch (error) {
      console.error('Error importing recent searches:', error);
      throw new Error('Failed to import recent searches');
    }
  }

  public getSearchAnalytics(): SearchAnalytics {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    // Filter searches from last 30 days
    const recentSearches = this.recentSearches.filter(s => s.timestamp >= thirtyDaysAgo);
    
    // Calculate searches by type
    const searchesByType: Record<string, number> = {};
    recentSearches.forEach(search => {
      if (search.type) {
        searchesByType[search.type] = (searchesByType[search.type] || 0) + 1;
      }
    });

    // Calculate searches by category
    const searchesByCategory: Record<string, number> = {};
    recentSearches.forEach(search => {
      if (search.category) {
        searchesByCategory[search.category] = (searchesByCategory[search.category] || 0) + 1;
      }
    });

    // Calculate popular tags
    const tagCounts: Record<string, number> = {};
    recentSearches.forEach(search => {
      search.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    const popularTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate recent activity (last 7 days)
    const recentActivity: Array<{ date: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      const count = recentSearches.filter(s => 
        new Date(s.timestamp).toISOString().split('T')[0] === dateStr
      ).length;
      recentActivity.push({ date: dateStr, count });
    }

    // Calculate average searches per day
    const averageSearchesPerDay = recentSearches.length / 30;

    return {
      totalSearches: recentSearches.length,
      searchesByType,
      searchesByCategory,
      popularTags,
      recentActivity,
      averageSearchesPerDay,
    };
  }

  public getSearchTrends(): SearchTrends {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const recentSearches = this.recentSearches.filter(s => s.timestamp >= thirtyDaysAgo);

    // Weekly trends (last 7 days)
    const weeklyTrends = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      const daySearches = recentSearches.filter(s => 
        new Date(s.timestamp).toISOString().split('T')[0] === dateStr
      );

      const types: Record<string, number> = {};
      daySearches.forEach(search => {
        if (search.type) {
          types[search.type] = (types[search.type] || 0) + 1;
        }
      });

      return {
        day: date.toLocaleDateString(undefined, { weekday: 'short' }),
        count: daySearches.length,
        types,
      };
    }).reverse();

    // Monthly trends (last 4 weeks)
    const monthlyTrends = Array.from({ length: 4 }, (_, i) => {
      const weekStart = new Date(now - ((i + 1) * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = new Date(now - (i * 7 * 24 * 60 * 60 * 1000));
      const weekSearches = recentSearches.filter(s => {
        const searchDate = new Date(s.timestamp);
        return searchDate >= weekStart && searchDate < weekEnd;
      });

      const categories: Record<string, number> = {};
      weekSearches.forEach(search => {
        if (search.category) {
          categories[search.category] = (categories[search.category] || 0) + 1;
        }
      });

      return {
        week: `Week ${4 - i}`,
        count: weekSearches.length,
        categories,
      };
    }).reverse();

    // Peak hours analysis
    const hourlyCounts = new Array(24).fill(0);
    recentSearches.forEach(search => {
      const hour = new Date(search.timestamp).getHours();
      hourlyCounts[hour]++;
    });

    const peakHours = hourlyCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Search patterns analysis
    const patterns: Record<string, { frequency: number; examples: string[] }> = {};
    recentSearches.forEach(search => {
      const words = search.query.toLowerCase().split(/\s+/);
      if (words.length >= 2) {
        const pattern = words.slice(0, 2).join(' ');
        if (!patterns[pattern]) {
          patterns[pattern] = { frequency: 0, examples: [] };
        }
        patterns[pattern].frequency++;
        if (patterns[pattern].examples.length < 3) {
          patterns[pattern].examples.push(search.query);
        }
      }
    });

    const searchPatterns = Object.entries(patterns)
      .map(([pattern, data]) => ({
        pattern,
        frequency: data.frequency,
        examples: data.examples,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    return {
      weeklyTrends,
      monthlyTrends,
      peakHours,
      searchPatterns,
    };
  }

  public getSearchInsights(): SearchInsight[] {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const recentSearches = this.recentSearches.filter(s => s.timestamp >= thirtyDaysAgo);
    
    const insights: SearchInsight[] = [];

    // Time-based patterns
    const timeBasedPatterns = this.analyzeTimePatterns(recentSearches);
    if (timeBasedPatterns) {
      insights.push(timeBasedPatterns);
    }

    // Category preferences
    const categoryPreferences = this.analyzeCategoryPreferences(recentSearches);
    if (categoryPreferences) {
      insights.push(categoryPreferences);
    }

    // Search behavior changes
    const behaviorChanges = this.analyzeBehaviorChanges(recentSearches);
    if (behaviorChanges) {
      insights.push(behaviorChanges);
    }

    // Personalized recommendations
    const recommendations = this.generateRecommendations(recentSearches);
    insights.push(...recommendations);

    return insights.sort((a, b) => b.confidence - a.confidence);
  }

  private analyzeTimePatterns(searches: RecentSearch[]): SearchInsight | null {
    const hourlyCounts = new Array(24).fill(0);
    searches.forEach(search => {
      const hour = new Date(search.timestamp).getHours();
      hourlyCounts[hour]++;
    });

    const peakHour = hourlyCounts.indexOf(Math.max(...hourlyCounts));
    const peakCount = hourlyCounts[peakHour];
    const totalSearches = searches.length;

    if (peakCount / totalSearches > 0.2) { // If more than 20% of searches are at peak hour
      return {
        type: 'pattern',
        title: 'Peak Search Time Detected',
        description: `You tend to search most actively around ${peakHour.toString().padStart(2, '0')}:00. Consider setting up quick-access shortcuts for this time.`,
        confidence: 0.8,
        data: { peakHour, peakCount, totalSearches },
        action: {
          label: 'Set Quick Access',
          type: 'shortcut',
          value: `quick-access-${peakHour}`,
        },
      };
    }

    return null;
  }

  private analyzeCategoryPreferences(searches: RecentSearch[]): SearchInsight | null {
    const categoryCounts: Record<string, number> = {};
    searches.forEach(search => {
      if (search.category) {
        categoryCounts[search.category] = (categoryCounts[search.category] || 0) + 1;
      }
    });

    const totalCategories = Object.keys(categoryCounts).length;
    if (totalCategories === 0) return null;

    const sortedCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a);

    const [topCategory, topCount] = sortedCategories[0];
    const totalSearches = searches.length;

    if (topCount / totalSearches > 0.4) { // If more than 40% of searches are in one category
      return {
        type: 'pattern',
        title: 'Category Preference Detected',
        description: `You frequently search in the "${topCategory}" category. Would you like to explore similar categories?`,
        confidence: 0.7,
        data: { category: topCategory, count: topCount, total: totalSearches },
        action: {
          label: 'Explore Similar',
          type: 'category',
          value: topCategory,
        },
      };
    }

    return null;
  }

  private analyzeBehaviorChanges(searches: RecentSearch[]): SearchInsight | null {
    if (searches.length < 10) return null;

    const recentWeek = searches.slice(0, Math.floor(searches.length / 2));
    const previousWeek = searches.slice(Math.floor(searches.length / 2));

    const recentTypes = new Set(recentWeek.map(s => s.type));
    const previousTypes = new Set(previousWeek.map(s => s.type));

    const newTypes = [...recentTypes].filter(type => !previousTypes.has(type));
    if (newTypes.length > 0) {
      return {
        type: 'trend',
        title: 'Search Behavior Change Detected',
        description: `You've started searching for new types: ${newTypes.join(', ')}. Would you like to see related suggestions?`,
        confidence: 0.6,
        data: { newTypes },
        action: {
          label: 'View Suggestions',
          type: 'suggestions',
          value: newTypes.join(','),
        },
      };
    }

    return null;
  }

  private generateRecommendations(searches: RecentSearch[]): SearchInsight[] {
    const recommendations: SearchInsight[] = [];

    // Popular tags recommendation
    const tagCounts: Record<string, number> = {};
    searches.forEach(search => {
      search.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const popularTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    if (popularTags.length > 0) {
      recommendations.push({
        type: 'recommendation',
        title: 'Popular Tags',
        description: `Based on your search history, you might be interested in: ${popularTags.map(([tag]) => tag).join(', ')}`,
        confidence: 0.9,
        data: { tags: popularTags },
        action: {
          label: 'Explore Tags',
          type: 'tags',
          value: popularTags.map(([tag]) => tag).join(','),
        },
      });
    }

    // Time-based recommendation
    const currentHour = new Date().getHours();
    const hourSearches = searches.filter(s => new Date(s.timestamp).getHours() === currentHour);
    if (hourSearches.length > 0) {
      const commonTypes = new Set(hourSearches.map(s => s.type));
      if (commonTypes.size > 0) {
        recommendations.push({
          type: 'recommendation',
          title: 'Time-Based Suggestion',
          description: `Around this time, you usually search for: ${[...commonTypes].join(', ')}`,
          confidence: 0.8,
          data: { types: [...commonTypes] },
          action: {
            label: 'Quick Search',
            type: 'quick-search',
            value: [...commonTypes].join(','),
          },
        });
      }
    }

    return recommendations;
  }

  public exportSearchHistory(): SearchHistoryExport {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const recentSearches = this.recentSearches.filter(s => s.timestamp >= thirtyDaysAgo);

    return {
      version: '1.0',
      timestamp: now,
      searches: recentSearches,
      analytics: this.getSearchAnalytics(),
      insights: this.getSearchInsights(),
      metadata: {
        totalSearches: recentSearches.length,
        dateRange: {
          start: thirtyDaysAgo,
          end: now,
        },
        categories: this.getCategories(),
        tags: this.getTags(),
      },
    };
  }

  public importSearchHistory(data: string): void {
    try {
      const importData = JSON.parse(data) as SearchHistoryExport;
      
      // Validate import data
      if (!importData.version || !importData.searches || !Array.isArray(importData.searches)) {
        throw new Error('Invalid import data format');
      }

      // Merge with existing data
      const existingQueries = new Set(this.recentSearches.map(s => s.query));
      const newSearches = importData.searches.filter(s => !existingQueries.has(s.query));
      
      this.recentSearches = [...this.recentSearches, ...newSearches];
      
      // Keep only the most recent searches
      if (this.recentSearches.length > this.MAX_RECENT_SEARCHES) {
        this.recentSearches = this.recentSearches
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, this.MAX_RECENT_SEARCHES);
      }

      this.saveRecentSearches();
    } catch (error) {
      console.error('Error importing search history:', error);
      throw new Error('Failed to import search history');
    }
  }

  public backupSearchHistory(): void {
    try {
      const exportData = this.exportSearchHistory();
      const backupKey = `search_history_backup_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(exportData));
      
      // Keep only the last 5 backups
      const backupKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('search_history_backup_'))
        .sort()
        .reverse();
      
      if (backupKeys.length > 5) {
        backupKeys.slice(5).forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.error('Error backing up search history:', error);
      throw new Error('Failed to backup search history');
    }
  }

  public restoreFromBackup(backupKey: string): void {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        throw new Error('Backup not found');
      }
      this.importSearchHistory(backupData);
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw new Error('Failed to restore from backup');
    }
  }

  public getAvailableBackups(): Array<{ key: string; timestamp: number }> {
    return Object.keys(localStorage)
      .filter(key => key.startsWith('search_history_backup_'))
      .map(key => ({
        key,
        timestamp: parseInt(key.split('_').pop() || '0'),
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }
} 