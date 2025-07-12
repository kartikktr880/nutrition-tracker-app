import { logError, logWarn, logInfo, logDebug } from '../../utils/logger';
import { Chart } from 'chart.js';
import { registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

interface NutritionData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
}

interface AnalyticsData {
  nutrition: {
    daily: NutritionData[];
    weekly: {
      average: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        water: number;
      };
      trends: {
        calories: number[];
        protein: number[];
        carbs: number[];
        fat: number[];
        water: number[];
      };
    };
    monthly: {
      average: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        water: number;
      };
      trends: {
        calories: number[];
        protein: number[];
        carbs: number[];
        fat: number[];
        water: number[];
      };
    };
    calories: number[];
    protein: number[];
    carbs: number[];
    fat: number[];
    dates: string[];
  };
  goals: {
    achieved: number;
    inProgress: number;
    missed: number;
    progress: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      water: number;
    };
    current: number;
    target: number;
  };
  streaks: {
    current: number;
    longest: number;
    type: 'calories' | 'water' | 'protein';
    history: Array<{
      startDate: string;
      endDate: string;
      type: 'calories' | 'water' | 'protein';
      days: number;
    }>;
  };
  trends: {
    weekly: Record<string, number>;
    monthly: Record<string, number>;
  };
}

interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  data: any;
  options: any;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private data: AnalyticsData | null = null;
  private charts: Map<string, Chart> = new Map();
  private dataCache: Map<string, any> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.initializeService();
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private async initializeService(): Promise<void> {
    try {
      await this.loadData();
      this.setupDataRefresh();
    } catch (error) {
      logError('Failed to initialize analytics service:', error as Error | undefined);
      throw new Error('Analytics service initialization failed');
    }
  }

  private async loadData(): Promise<void> {
    try {
      const response = await fetch('/api/analytics/data');
      if (!response.ok) {
        throw new Error(`Failed to load analytics data: ${response.status}`);
      }
      this.data = await response.json();
      this.validateData(this.data);
    } catch (error) {
      logError('Error loading analytics data:', error as Error | undefined);
      throw new Error('Failed to load analytics data');
    }
  }

  private validateData(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid analytics data format');
    }

    const requiredFields = ['nutrition', 'goals', 'trends'];
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate nutrition data
    const nutritionFields = ['calories', 'protein', 'carbs', 'fat', 'dates'];
    for (const field of nutritionFields) {
      if (!Array.isArray(data.nutrition[field])) {
        throw new Error(`Invalid nutrition data format for ${field}`);
      }
    }
  }

  private setupDataRefresh(): void {
    // Refresh data every 5 minutes
    setInterval(async () => {
      try {
        await this.loadData();
        this.updateCharts();
      } catch (error) {
        logError('Failed to refresh analytics data:', error as Error | undefined);
      }
    }, this.cacheTimeout);
  }

  public async getNutritionData(): Promise<AnalyticsData['nutrition']> {
    if (!this.data) {
      await this.loadData();
    }
    return this.data!.nutrition;
  }

  public async getGoalsData(): Promise<AnalyticsData['goals']> {
    if (!this.data) {
      await this.loadData();
    }
    return this.data!.goals;
  }

  public async getTrendsData(): Promise<AnalyticsData['trends']> {
    if (!this.data) {
      await this.loadData();
    }
    return this.data!.trends;
  }

  public createChart(
    canvasId: string,
    config: ChartConfig,
    options: any = {}
  ): Chart {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element not found: ${canvasId}`);
    }

    // Destroy existing chart if it exists
    if (this.charts.has(canvasId)) {
      this.charts.get(canvasId)?.destroy();
    }

    const chart = new Chart(canvas, {
      type: config.type,
      data: config.data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...options
      }
    });

    this.charts.set(canvasId, chart);
    return chart;
  }

  private updateCharts(): void {
    this.charts.forEach(chart => {
      try {
        chart.update();
      } catch (error) {
        logError('Failed to update chart:', error as Error | undefined);
      }
    });
  }

  public async generateReport(
    startDate: Date,
    endDate: Date,
    format: 'pdf' | 'csv' = 'pdf'
  ): Promise<Blob> {
    try {
      const response = await fetch('/api/analytics/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          format
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate report: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      logError('Error generating report:', error as Error | undefined);
      throw new Error('Failed to generate report');
    }
  }

  public async exportData(format: 'json' | 'csv' = 'json'): Promise<Blob> {
    try {
      const response = await fetch(`/api/analytics/export?format=${format}`);
      if (!response.ok) {
        throw new Error(`Failed to export data: ${response.status}`);
      }
      return await response.blob();
    } catch (error) {
      logError('Error exporting data:', error as Error | undefined);
      throw new Error('Failed to export data');
    }
  }

  public destroy(): void {
    this.charts.forEach(chart => chart.destroy());
    this.charts.clear();
    this.dataCache.clear();
  }

  public async trackSearch(data: { query: string; resultCount?: number; success?: boolean; timestamp?: number }): Promise<void> {
    try {
      const searchData = {
        query: data.query,
        resultCount: data.resultCount || 0,
        success: data.success !== false,
        timestamp: data.timestamp || Date.now()
      };

      // In a real app, this would send to analytics service
      logInfo('Search tracked:', searchData);
      
      // Store locally for offline analytics
      const searches = this.dataCache.get('searches') || [];
      searches.push(searchData);
      this.dataCache.set('searches', searches.slice(-100)); // Keep last 100 searches
    } catch (error) {
      logError('Failed to track search:', error as Error | undefined);
    }
  }

  public async trackClick(data: { element: string; page: string; timestamp?: number }): Promise<void> {
    try {
      const clickData = {
        element: data.element,
        page: data.page,
        timestamp: data.timestamp || Date.now()
      };

      // In a real app, this would send to analytics service
      logInfo('Click tracked:', clickData);
      
      // Store locally for offline analytics
      const clicks = this.dataCache.get('clicks') || [];
      clicks.push(clickData);
      this.dataCache.set('clicks', clicks.slice(-100)); // Keep last 100 clicks
    } catch (error) {
      logError('Failed to track click:', error as Error | undefined);
    }
  }

  public async trackError(data: { errorType: string; errorMessage: string; timestamp?: number }): Promise<void> {
    try {
      const errorData = {
        errorType: data.errorType,
        errorMessage: data.errorMessage,
        timestamp: data.timestamp || Date.now()
      };

      // In a real app, this would send to analytics service
      logInfo('Error tracked:', errorData);
      
      // Store locally for offline analytics
      const errors = this.dataCache.get('errors') || [];
      errors.push(errorData);
      this.dataCache.set('errors', errors.slice(-50)); // Keep last 50 errors
    } catch (error) {
      logError('Failed to track error:', error as Error | undefined);
    }
  }
}

export default AnalyticsService; 