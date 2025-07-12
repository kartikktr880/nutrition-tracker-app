export interface ValidationVisualizationConfig {
  chartType: 'line' | 'bar' | 'radar' | 'doughnut';
  colorScheme: 'default' | 'accessible' | 'colorblind';
  animationDuration: number;
  showTrends: boolean;
  showThresholds: boolean;
}

export interface ValidationDataPoint {
  timestamp: number;
  value: number;
  category: string;
  threshold?: number;
}

export interface ValidationTrend {
  direction: 'improving' | 'declining' | 'stable';
  slope: number;
  confidence: number;
  period: number;
}

export class ValidationVisualization {
  private static instance: ValidationVisualization;
  private config: ValidationVisualizationConfig;

  private constructor() {
    this.config = {
      chartType: 'line',
      colorScheme: 'default',
      animationDuration: 300,
      showTrends: true,
      showThresholds: true,
    };
  }

  public static getInstance(): ValidationVisualization {
    if (!ValidationVisualization.instance) {
      ValidationVisualization.instance = new ValidationVisualization();
    }
    return ValidationVisualization.instance;
  }

  public updateConfig(newConfig: Partial<ValidationVisualizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): ValidationVisualizationConfig {
    return { ...this.config };
  }

  public analyzeTrend(data: ValidationDataPoint[]): ValidationTrend {
    if (data.length < 2) {
      return {
        direction: 'stable',
        slope: 0,
        confidence: 0,
        period: 0,
      };
    }

    // Simple linear regression
    const n = data.length;
    const sumX = data.reduce((sum, _, index) => sum + index, 0);
    const sumY = data.reduce((sum, point) => sum + point.value, 0);
    const sumXY = data.reduce((sum, point, index) => sum + index * point.value, 0);
    const sumX2 = data.reduce((sum, _, index) => sum + index * index, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const confidence = Math.abs(slope) / Math.max(...data.map(d => d.value)) * 100;

    return {
      direction: slope > 0.01 ? 'improving' : slope < -0.01 ? 'declining' : 'stable',
      slope,
      confidence: Math.min(confidence, 100),
      period: data[data.length - 1].timestamp - data[0].timestamp,
    };
  }

  public generateChartData(data: ValidationDataPoint[]): any {
    const labels = data.map(point => new Date(point.timestamp).toLocaleTimeString());
    const values = data.map(point => point.value);
    const thresholds = data.map(point => point.threshold || null);

    return {
      labels,
      datasets: [
        {
          label: 'Validation Score',
          data: values,
          borderColor: this.getColor('primary'),
          backgroundColor: this.getColor('primary', 0.1),
          tension: 0.4,
        },
        ...(this.config.showThresholds && thresholds.some(t => t !== null) ? [{
          label: 'Threshold',
          data: thresholds,
          borderColor: this.getColor('warning'),
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          pointRadius: 0,
        }] : []),
      ],
    };
  }

  private getColor(type: 'primary' | 'secondary' | 'success' | 'warning' | 'error', alpha = 1): string {
    const colors = {
      primary: '#3b82f6',
      secondary: '#6b7280',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
    };

    const color = colors[type];
    if (alpha === 1) return color;
    
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

export const validationVisualization = ValidationVisualization.getInstance();
