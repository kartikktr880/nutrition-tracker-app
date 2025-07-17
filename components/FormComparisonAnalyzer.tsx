import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useMemo, useState } from 'react';

import { ValidationResult } from '@/services/stateValidation';
import { logError } from '@/utils/logger';

interface FormComparisonAnalyzerProps {
  exerciseKey: string;
  currentForm: Record<string, unknown>;
  validationResult: ValidationResult;
  idealFormPattern?: Record<string, unknown>;
  historicalData?: FormHistoryEntry[];
  onComparisonComplete?: (comparison: FormComparison) => void;
  className?: string;
}

interface FormHistoryEntry {
  timestamp: number;
  metrics: FormMetrics;
  formData: Record<string, unknown>;
  validationResult: ValidationResult;
}

interface FormComparison {
  similarity: number;
  improvements: string[];
  regressions: string[];
  recommendations: string[];
  trendAnalysis: TrendAnalysis;
}

interface TrendAnalysis {
  accuracy: TrendMetric;
  alignment: TrendMetric;
  stability: TrendMetric;
  timing: TrendMetric;
  overall: TrendMetric;
}

interface TrendMetric {
  current: number;
  average: number;
  trend: 'improving' | 'stable' | 'declining';
  change: number;
}

interface FormMetrics {
  accuracy: number;
  alignment: number;
  stability: number;
  timing: number;
  overall: number;
}

export const FormComparisonAnalyzer: React.FC<FormComparisonAnalyzerProps> = ({
  exerciseKey,
  currentForm,
  validationResult,
  idealFormPattern,
  historicalData = [],
  onComparisonComplete,
  className = ''
}) => {
  const [comparison, setComparison] = useState<FormComparison | null>(null);
  const [_isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    const analyzeForm = async () => {
      setIsAnalyzing(true);
      try {
        // const visualizationData = await validationVisualization.generateVisualizationData(exerciseKey);
        const newComparison = await generateComparison(
          currentForm,
          validationResult,
          idealFormPattern,
          historicalData
        );
        setComparison(newComparison);
        onComparisonComplete?.(newComparison);
      } catch (error) {
        logError('Form comparison failed:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyzeForm();
  }, [exerciseKey, currentForm, validationResult, idealFormPattern, historicalData, onComparisonComplete]);

  const filteredHistoricalData = useMemo(() => {
    const now = Date.now();
    const timeframes = {
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      all: Infinity
    };
    return historicalData.filter(entry => 
      now - entry.timestamp <= timeframes[selectedTimeframe]
    );
  }, [historicalData, selectedTimeframe]);

  const trendAnalysis = useMemo(() => {
    if (!filteredHistoricalData.length) return null;

    const calculateTrend = (metric: keyof FormMetrics): TrendMetric => {
      const values = filteredHistoricalData.map(entry => entry.metrics[metric]);
      const current = values[values.length - 1];
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      const change = current - values[0];
      
      let trend: 'improving' | 'stable' | 'declining';
      if (change > 0.1) trend = 'improving';
      else if (change < -0.1) trend = 'declining';
      else trend = 'stable';

      return { current, average, trend, change };
    };

    return {
      accuracy: calculateTrend('accuracy'),
      alignment: calculateTrend('alignment'),
      stability: calculateTrend('stability'),
      timing: calculateTrend('timing'),
      overall: calculateTrend('overall')
    };
  }, [filteredHistoricalData]);

  if (!comparison || !trendAnalysis) {
    return (
      <div className={`form-comparison-analyzer loading ${className}`}>
        <div className="loading-indicator">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="spinner"
          />
          <span>Analyzing form...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`form-comparison-analyzer ${className}`}>
      <div className="timeframe-selector">
        <button
          className={selectedTimeframe === 'week' ? 'active' : ''}
          onClick={() => setSelectedTimeframe('week')}
        >
          Week
        </button>
        <button
          className={selectedTimeframe === 'month' ? 'active' : ''}
          onClick={() => setSelectedTimeframe('month')}
        >
          Month
        </button>
        <button
          className={selectedTimeframe === 'all' ? 'active' : ''}
          onClick={() => setSelectedTimeframe('all')}
        >
          All Time
        </button>
      </div>

      <div className="comparison-summary">
        <div className="similarity-score">
          <span className="label">Form Similarity</span>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="score"
            style={{
              color: getSimilarityColor(comparison.similarity)
            }}
          >
            {Math.round(comparison.similarity * 100)}%
          </motion.div>
        </div>

        <div className="trend-analysis">
          {Object.entries(trendAnalysis).map(([metric, data]) => (
            <div key={metric} className="trend-metric">
              <span className="metric-label">{capitalizeFirst(metric)}</span>
              <div className="trend-indicator">
                <span className="current">{Math.round(data.current * 100)}%</span>
                <span className={`trend ${data.trend}`}>
                  {data.trend === 'improving' ? '↑' : data.trend === 'declining' ? '↓' : '→'}
                </span>
                <span className="change">
                  {data.change > 0 ? '+' : ''}{Math.round(data.change * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="analysis-details">
        <div className="improvements">
          <h3>Improvements</h3>
          <AnimatePresence>
            {comparison.improvements.map((improvement, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="improvement-item"
              >
                <span className="icon">✨</span>
                <span className="text">{improvement}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="recommendations">
          <h3>Recommendations</h3>
          <AnimatePresence>
            {comparison.recommendations.map((recommendation, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="recommendation-item"
              >
                <span className="icon">💡</span>
                <span className="text">{recommendation}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// Helper functions
const generateComparison = async (
  currentForm: Record<string, unknown>,
  validationResult: ValidationResult,
  idealFormPattern: Record<string, unknown> | undefined,
  historicalData: FormHistoryEntry[]
): Promise<FormComparison> => {
  // Calculate form similarity
  const similarity = calculateFormSimilarity(currentForm, idealFormPattern);

  // Analyze improvements and regressions
  const improvements = analyzeImprovements(currentForm, historicalData);
  const regressions = analyzeRegressions(currentForm, historicalData);
  const recommendations = generateRecommendations(
    currentForm,
    validationResult,
    historicalData
  );

  // Calculate trend analysis
  const trendAnalysis = calculateTrendAnalysis(historicalData);

  return {
    similarity,
    improvements,
    regressions,
    recommendations,
    trendAnalysis
  };
};

const calculateFormSimilarity = (current: Record<string, unknown>, ideal: Record<string, unknown> | undefined): number => {
  if (!ideal) return 1; // If no ideal pattern, assume perfect
  // Implement form similarity calculation
  return 0.85; // Placeholder
};

const analyzeImprovements = (current: Record<string, unknown>, history: FormHistoryEntry[]): string[] => {
  if (!history.length) return ['No historical data available'];
  // Implement improvement analysis
  return ['Improved form stability', 'Better alignment'];
};

const analyzeRegressions = (current: Record<string, unknown>, history: FormHistoryEntry[]): string[] => {
  if (!history.length) return [];
  // Implement regression analysis
  return ['Timing needs attention'];
};

const generateRecommendations = (
  current: Record<string, unknown>,
  validation: ValidationResult,
  history: FormHistoryEntry[]
): string[] => {
  const recommendations: string[] = [];

  if (validation.errors.length > 0) {
    recommendations.push('Focus on correcting form errors first');
  }

  if (history.length > 0) {
    const lastEntry = history[history.length - 1];
    const lastMetrics = lastEntry.metrics as FormMetrics;
    const currentMetrics = current.metrics as FormMetrics | undefined;
    if (lastMetrics && currentMetrics && lastMetrics.overall > currentMetrics.overall) {
      recommendations.push('Try to maintain previous form quality');
    }
  }

  return recommendations;
};

const calculateTrendAnalysis = (_history: FormHistoryEntry[]): TrendAnalysis => {
  // Implement trend analysis calculation
  return {
    accuracy: { current: 0.8, average: 0.75, trend: 'improving', change: 0.05 },
    alignment: { current: 0.7, average: 0.65, trend: 'stable', change: 0.02 },
    stability: { current: 0.9, average: 0.85, trend: 'improving', change: 0.08 },
    timing: { current: 0.6, average: 0.7, trend: 'declining', change: -0.1 },
    overall: { current: 0.75, average: 0.74, trend: 'stable', change: 0.01 }
  };
};

const getSimilarityColor = (similarity: number): string => {
  if (similarity > 0.8) return '#28a745'; // green
  if (similarity > 0.6) return '#ff9800'; // orange
  return '#dc3545'; // red
};

const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export default FormComparisonAnalyzer; 