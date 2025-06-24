import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ValidationAnalytics } from '../services/validationAnalytics';

interface PerformanceMetricsVisualizerProps {
  exerciseKey: string;
  currentMetrics: {
    accuracy: number;
    stability: number;
    alignment: number;
    timing: number;
    consistency: number;
  };
  historicalData?: {
    timestamp: number;
    metrics: typeof currentMetrics;
  }[];
  onMetricSelect?: (metric: keyof typeof currentMetrics) => void;
}

interface MetricTrend {
  metric: keyof typeof currentMetrics;
  value: number;
  trend: 'improving' | 'stable' | 'declining';
  change: number;
}

const PerformanceMetricsVisualizer: React.FC<PerformanceMetricsVisualizerProps> = ({
  exerciseKey,
  currentMetrics,
  historicalData = [],
  onMetricSelect
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedMetric, setSelectedMetric] = useState<keyof typeof currentMetrics>('accuracy');
  const [trends, setTrends] = useState<MetricTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const calculateTrends = () => {
      const newTrends: MetricTrend[] = Object.entries(currentMetrics).map(([metric, value]) => {
        const historicalValues = historicalData
          .map(data => data.metrics[metric as keyof typeof currentMetrics])
          .filter(Boolean);

        const average = historicalValues.length > 0
          ? historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length
          : value;

        const change = ((value - average) / average) * 100;
        const trend: 'improving' | 'stable' | 'declining' = 
          change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable';

        return {
          metric: metric as keyof typeof currentMetrics,
          value,
          trend,
          change
        };
      });

      setTrends(newTrends);
      setIsLoading(false);
    };

    calculateTrends();
  }, [currentMetrics, historicalData]);

  useEffect(() => {
    const drawMetrics = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Set canvas dimensions
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      // Draw metric bars
      const barWidth = canvas.width * 0.8;
      const barHeight = 12;
      const spacing = 24;
      const startY = 40;

      trends.forEach((trend, index) => {
        const y = startY + (spacing * index);
        const isSelected = trend.metric === selectedMetric;

        // Draw background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(
          (canvas.width - barWidth) / 2,
          y,
          barWidth,
          barHeight
        );

        // Draw value
        const valueWidth = barWidth * trend.value;
        ctx.fillStyle = getMetricColor(trend.metric, trend.trend);
        ctx.fillRect(
          (canvas.width - barWidth) / 2,
          y,
          valueWidth,
          barHeight
        );

        // Draw label
        ctx.fillStyle = isSelected ? 'var(--primary-color)' : 'var(--text-color)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          formatMetricName(trend.metric),
          (canvas.width - barWidth) / 2 - 100,
          y + barHeight - 2
        );

        // Draw value
        ctx.textAlign = 'right';
        ctx.fillText(
          `${Math.round(trend.value * 100)}%`,
          (canvas.width + barWidth) / 2 + 50,
          y + barHeight - 2
        );

        // Draw trend indicator
        if (trend.change !== 0) {
          const trendSymbol = trend.trend === 'improving' ? '↑' : '↓';
          ctx.fillStyle = trend.trend === 'improving' ? 'var(--success-color)' : 'var(--error-color)';
          ctx.fillText(
            `${trendSymbol} ${Math.abs(Math.round(trend.change))}%`,
            (canvas.width + barWidth) / 2 + 100,
            y + barHeight - 2
          );
        }
      });
    };

    drawMetrics();
  }, [trends, selectedMetric]);

  const getMetricColor = (metric: keyof typeof currentMetrics, trend: MetricTrend['trend']) => {
    const colors = {
      accuracy: {
        improving: 'var(--success-color)',
        stable: 'var(--primary-color)',
        declining: 'var(--error-color)'
      },
      stability: {
        improving: 'var(--success-color)',
        stable: 'var(--primary-color)',
        declining: 'var(--error-color)'
      },
      alignment: {
        improving: 'var(--success-color)',
        stable: 'var(--primary-color)',
        declining: 'var(--error-color)'
      },
      timing: {
        improving: 'var(--success-color)',
        stable: 'var(--primary-color)',
        declining: 'var(--error-color)'
      },
      consistency: {
        improving: 'var(--success-color)',
        stable: 'var(--primary-color)',
        declining: 'var(--error-color)'
      }
    };

    return colors[metric][trend];
  };

  const formatMetricName = (metric: keyof typeof currentMetrics): string => {
    return metric.charAt(0).toUpperCase() + metric.slice(1);
  };

  const handleMetricClick = (metric: keyof typeof currentMetrics) => {
    setSelectedMetric(metric);
    onMetricSelect?.(metric);
  };

  if (isLoading) {
    return (
      <div className="performance-metrics-visualizer loading">
        <div className="loading-spinner" />
        <p>Calculating metrics...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="performance-metrics-visualizer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="metrics-header">
        <h3>Performance Metrics</h3>
        <div className="metric-selector">
          {trends.map(trend => (
            <button
              key={trend.metric}
              className={`metric-button ${selectedMetric === trend.metric ? 'active' : ''}`}
              onClick={() => handleMetricClick(trend.metric)}
            >
              {formatMetricName(trend.metric)}
            </button>
          ))}
        </div>
      </div>

      <div className="metrics-canvas-container">
        <canvas
          ref={canvasRef}
          className="metrics-canvas"
          onClick={(e) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const index = Math.floor((y - 40) / 24);
            
            if (index >= 0 && index < trends.length) {
              handleMetricClick(trends[index].metric);
            }
          }}
        />
      </div>

      <div className="metrics-legend">
        <div className="legend-item">
          <span className="legend-color improving" />
          <span>Improving</span>
        </div>
        <div className="legend-item">
          <span className="legend-color stable" />
          <span>Stable</span>
        </div>
        <div className="legend-item">
          <span className="legend-color declining" />
          <span>Declining</span>
        </div>
      </div>
    </motion.div>
  );
};

export default PerformanceMetricsVisualizer; 