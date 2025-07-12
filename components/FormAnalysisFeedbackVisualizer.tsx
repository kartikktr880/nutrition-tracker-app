import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

import { logError } from '../utils/logger';

import '../styles/FormAnalysisFeedbackVisualizer.css';

// Add missing type/interface definitions
interface MetricVisualization {
  metric: string;
  value: number;
  threshold: number;
  trend: Array<{ x: number; y: number }>;
  feedbackHistory: Array<{
    timestamp: number;
    type: string;
    channel: string;
    effectiveness: number;
  }>;
  patternAnalysis: {
    successRate: number;
    frequency: number;
    priority: 'high' | 'medium' | 'low';
    improvement: number;
  };
}

interface FormCorrection {
  metric: string;
  suggestion: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: number;
  applied: boolean;
  effectiveness: number;
  visualOverlay?: {
    position: string;
    angle: number;
    distance: number;
    intensity: number;
    pattern: string;
  } | null;
}

interface AdaptiveThreshold {
  metric: string;
  baseThreshold: number;
  currentThreshold: number;
  adjustmentFactor: number;
  lastAdjusted: number;
  progressionImpact: number;
  exerciseSpecificFactor: number;
  historicalPerformance: {
    average: number;
    trend: number;
    consistency: number;
  };
}

interface TimeRangeData {
  label: string;
  value: string;
}

const TIME_RANGES: TimeRangeData[] = [
  { label: '1 Day', value: '1d' },
  { label: '1 Week', value: '1w' },
  { label: '1 Month', value: '1m' },
  { label: '3 Months', value: '3m' },
  { label: '1 Year', value: '1y' },
];

const generateVisualOverlay = (
  metric: string, 
  value: number, 
  threshold: number,
  historicalData?: { average: number; trend: number; consistency: number }
) => {
  const intensity = Math.min(Math.max((threshold - value) / threshold, 0), 1);
  const pattern = historicalData?.trend && historicalData.trend > 0 ? 'improving' : 'declining';
  
  const overlayData: Record<string, { position: string; angle: number; distance: number; intensity: number; pattern: string }> = {
    alignment: {
      position: 'center',
      angle: intensity * 45,
      distance: intensity * 100,
      intensity,
      pattern
    },
    stability: {
      position: 'base',
      angle: intensity * 90,
      distance: intensity * 50,
      intensity,
      pattern
    },
    timing: {
      position: 'rhythm',
      angle: intensity * 30,
      distance: intensity * 30,
      intensity,
      pattern
    }
  };

  return overlayData[metric] || null;
};

const generateCorrectionSuggestion = (
  metric: string, 
  value: number, 
  threshold: number,
  historicalData?: { average: number; trend: number; consistency: number }
): string => {
  const suggestions: Record<string, string[]> = {
    accuracy: [
      'Focus on maintaining proper form throughout the movement. Your recent performance shows room for improvement.',
      'Ensure full range of motion for each repetition. Your consistency has been improving, keep it up!',
      'Keep your core engaged during the exercise. Your form is getting better with practice.'
    ],
    stability: [
      'Maintain a stable base throughout the movement. This is crucial for proper form.',
      'Control your breathing during the exercise. Your stability has been improving.',
      'Keep your body aligned and balanced. Focus on maintaining this throughout the set.'
    ],
    alignment: [
      'Check your posture and alignment. Your recent form shows some improvement.',
      'Ensure proper joint positioning. Your consistency is getting better.',
      'Maintain neutral spine throughout the movement. Your form is progressing well.'
    ],
    timing: [
      'Control the tempo of your movement. Your timing has been more consistent lately.',
      'Maintain consistent timing between repetitions. Your rhythm is improving.',
      'Focus on the eccentric and concentric phases. Your control is getting better.'
    ],
    consistency: [
      'Maintain consistent form across all repetitions. Your consistency is improving.',
      'Keep the same range of motion throughout the set. Your form is getting more stable.',
      'Control the movement pattern consistently. Your recent performance shows good progress.'
    ]
  };

  const metricSuggestions = suggestions[metric] || ['Focus on improving your form'];
  const severity = value < threshold * 0.5 ? 0 : value < threshold * 0.8 ? 1 : 2;
  const historicalContext = historicalData?.trend && historicalData.trend > 0 ? ' Your recent performance shows improvement.' :
    historicalData?.trend && historicalData.trend < 0 ? ' Focus on maintaining your previous form.' : '';
  
  return metricSuggestions[severity] + historicalContext;
};

export const FormAnalysisFeedbackVisualizer: React.FC<{
  exerciseKey: string;
  currentMetrics: {
    accuracy: number;
    stability: number;
    alignment: number;
    timing: number;
    consistency: number;
  };
  feedbackPatterns: {
    metric: string;
    threshold: number;
    priority: 'high' | 'medium' | 'low';
    frequency: number;
    successRate: number;
    lastUsed: number;
  }[];
  userProgression?: {
    level: number;
    experience: number;
    exerciseHistory: {
      exerciseKey: string;
      attempts: number;
      successRate: number;
      lastAttempt: number;
    }[];
  };
}> = ({
  exerciseKey,
  currentMetrics,
  feedbackPatterns,
  userProgression
}) => {
  const [metricVisualizations, setMetricVisualizations] = useState<MetricVisualization[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRangeData>(TIME_RANGES[1]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const [formCorrections, setFormCorrections] = useState<FormCorrection[]>([]);
  const [adaptiveThresholds, setAdaptiveThresholds] = useState<AdaptiveThreshold[]>([]);
  const [feedbackEffectiveness, _setFeedbackEffectiveness] = useState<Record<string, number>>({});

  // Calculate improvement helper function
  const calculateImprovement = (data: number[]): number => {
    if (data.length < 2) return 0;
    const recent = data.slice(-5).reduce((a, b) => a + b, 0) / Math.min(data.length, 5);
    const older = data.slice(0, -5).reduce((a, b) => a + b, 0) / Math.max(data.length - 5, 1);
    return Math.max(0, (recent - older) / older);
  };

  // Load metric visualization data
  useEffect(() => {
    const loadVisualizationData = async () => {
      setIsLoading(true);
      try {
        const visualizationData = await Promise.all(
          Object.entries(currentMetrics).map(async ([metric, value]) => {
            const pattern = feedbackPatterns.find(p => p.metric === metric);
            // const [trend, feedbackHistory, patternAnalysis] = await Promise.all([
            //   analytics.getMetricTrend(exerciseKey, metric, timeRange.value),
            //   analytics.getFeedbackHistory(exerciseKey, metric, timeRange.value),
            //   analytics.getPatternAnalysis(exerciseKey, metric)
            // ]);

            return {
              metric,
              value,
              threshold: pattern?.threshold || 0.7,
              trend: [],
              feedbackHistory: [],
              patternAnalysis: {
                successRate: pattern?.successRate || 0,
                frequency: pattern?.frequency || 0,
                priority: pattern?.priority || 'medium',
                improvement: calculateImprovement([])
              }
            };
          })
        );

        setMetricVisualizations(visualizationData);
      } catch (error) {
        logError('Error loading visualization data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVisualizationData();
  }, [exerciseKey, currentMetrics, feedbackPatterns, timeRange]);

  // Calculate adaptive thresholds with enhanced progression impact
  useEffect(() => {
    const calculateAdaptiveThresholds = () => {
      const thresholds = Object.entries(currentMetrics).map(([metric, _value]) => {
        const pattern = feedbackPatterns.find(p => p.metric === metric);
        const baseThreshold = pattern?.threshold || 0.7;
        
        // Enhanced progression impact calculation with historical data
        let progressionImpact = 1.0;
        let exerciseSpecificFactor = 1.0;
        let historicalPerformance = {
          average: 0,
          trend: 0,
          consistency: 0
        };
        
        if (userProgression) {
          const exerciseHistory = userProgression.exerciseHistory.find(h => h.exerciseKey === exerciseKey);
          if (exerciseHistory) {
            // Calculate historical performance metrics
            const history = exerciseHistory.attempts > 0 ? exerciseHistory.successRate : 0;
            const recentHistory = exerciseHistory.attempts > 5 ? 
              (exerciseHistory.successRate * 1.2) : exerciseHistory.successRate;
            
            historicalPerformance = {
              average: history,
              trend: recentHistory - history,
              consistency: exerciseHistory.attempts > 10 ? 0.8 : 0.5
            };

            // Enhanced progression impact calculation
            const successRateImpact = 1 + (historicalPerformance.average - 0.5) * 0.2;
            const experienceImpact = 1 + (userProgression.level - 1) * 0.1;
            const consistencyImpact = 1 + (historicalPerformance.consistency * 0.2);
            const trendImpact = 1 + (historicalPerformance.trend * 0.3);
            
            progressionImpact = successRateImpact * experienceImpact * consistencyImpact * trendImpact;
            
            // Exercise-specific factor with historical context
            exerciseSpecificFactor = 1 + (historicalPerformance.average - 0.5) * 0.3;
          }
        }

        const adjustmentFactor = progressionImpact * exerciseSpecificFactor;
        const currentThreshold = Math.min(Math.max(baseThreshold * adjustmentFactor, 0.5), 0.95);

        return {
          metric,
          baseThreshold,
          currentThreshold,
          adjustmentFactor,
          lastAdjusted: Date.now(),
          progressionImpact,
          exerciseSpecificFactor,
          historicalPerformance
        };
      });

      setAdaptiveThresholds(thresholds);
    };

    calculateAdaptiveThresholds();
  }, [exerciseKey, currentMetrics, feedbackPatterns, userProgression]);

  // Enhanced form correction generation with visual overlays
  useEffect(() => {
    const generateFormCorrections = () => {
      const corrections: FormCorrection[] = [];
      
      Object.entries(currentMetrics).forEach(([metric, value]) => {
        const threshold = adaptiveThresholds.find(t => t.metric === metric)?.currentThreshold || 0.7;
        const _pattern = feedbackPatterns.find(p => p.metric === metric);
        const historicalData = adaptiveThresholds.find(t => t.metric === metric)?.historicalPerformance;
        
        if (value < threshold) {
          const severity = value < threshold * 0.5 ? 'high' : value < threshold * 0.8 ? 'medium' : 'low';
          const suggestion = generateCorrectionSuggestion(metric, value, threshold, historicalData);
          const visualOverlay = generateVisualOverlay(metric, value, threshold, historicalData);
          
          corrections.push({
            metric,
            suggestion,
            severity,
            timestamp: Date.now(),
            applied: false,
            effectiveness: calculateEffectiveness(value, threshold, historicalData),
            visualOverlay
          });
        }
      });

      setFormCorrections(corrections);
    };

    generateFormCorrections();
  }, [currentMetrics, adaptiveThresholds, feedbackPatterns]);

  // Calculate feedback effectiveness
  const calculateEffectiveness = (
    value: number,
    threshold: number,
    historicalData?: { average: number; trend: number; consistency: number }
  ): number => {
    const baseEffectiveness = 1 - (threshold - value) / threshold;
    const historicalImpact = historicalData ? 
      (historicalData.trend * 0.3 + historicalData.consistency * 0.2) : 0;
    
    return Math.min(Math.max(baseEffectiveness + historicalImpact, 0), 1);
  };

  const renderMetricVisualization = (visualization: MetricVisualization) => {
    const { metric, value, threshold, trend, feedbackHistory, patternAnalysis } = visualization;
    const isSelected = selectedMetric === metric;
    const isHovered = hoveredMetric === metric;
    const progress = (value / threshold) * 100;
    const trendData = trend.map((v, i) => ({ x: i, y: v }));

    return (
      <motion.div
        key={metric}
        className={`metric-visualization ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        onClick={() => setSelectedMetric(isSelected ? null : metric)}
        onHoverStart={() => setHoveredMetric(metric)}
        onHoverEnd={() => setHoveredMetric(null)}
      >
        <div className="metric-header">
          <h4>{metric.charAt(0).toUpperCase() + metric.slice(1)}</h4>
          <div className="metric-stats">
            <span className="metric-value">{Math.round(value * 100)}%</span>
            <span className={`improvement ${patternAnalysis.improvement >= 0 ? 'positive' : 'negative'}`}>
              {patternAnalysis.improvement >= 0 ? '↑' : '↓'} {Math.abs(Math.round(patternAnalysis.improvement * 100))}%
            </span>
          </div>
        </div>

        <div className="metric-progress">
          <motion.div
            className="progress-bar"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
          <div className="threshold-marker" style={{ left: `${threshold * 100}%` }} />
        </div>

        <AnimatePresence>
          {isSelected && (
            <motion.div
              className="metric-details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="pattern-analysis">
                <div className="pattern-stat">
                  <span className="stat-label">Success Rate</span>
                  <span className="stat-value">{Math.round(patternAnalysis.successRate * 100)}%</span>
                </div>
                <div className="pattern-stat">
                  <span className="stat-label">Frequency</span>
                  <span className="stat-value">{patternAnalysis.frequency}</span>
                </div>
                <div className="pattern-stat">
                  <span className="stat-label">Priority</span>
                  <span className={`stat-value priority-${patternAnalysis.priority}`}>
                    {patternAnalysis.priority}
                  </span>
                </div>
              </div>

              <div className="trend-chart">
                {trendData.map((point, index) => (
                  <motion.div
                    key={index}
                    className="trend-point"
                    style={{
                      left: `${(index / (trendData.length - 1)) * 100}%`,
                      bottom: `${(typeof point.y === 'number' ? point.y : 0) * 100}%`
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  />
                ))}
                <svg className="trend-line">
                  <path
                    d={trendData.reduce((path, point, index) => {
                      const x = (index / (trendData.length - 1)) * 100;
                      const y = 100 - ((typeof point.y === 'number' ? point.y : 0) * 100);
                      return path + (index === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
                    }, '')}
                    fill="none"
                    stroke="var(--primary-color)"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              <div className="feedback-history">
                {feedbackHistory.map((feedback, index) => (
                  <motion.div
                    key={index}
                    className={`feedback-item ${feedback.type} ${feedback.channel}`}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <span className="feedback-time">
                      {new Date(feedback.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="feedback-type">{feedback.type}</span>
                    <span className="feedback-channel">{feedback.channel}</span>
                    <span className="feedback-effectiveness">
                      {Math.round(feedback.effectiveness * 100)}%
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const renderFormCorrections = () => {
    if (formCorrections.length === 0) return null;

    return (
      <motion.div
        className="form-corrections"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h4>Form Corrections</h4>
        <div className="corrections-list">
          {formCorrections.map((correction, index) => (
            <motion.div
              key={`${correction.metric}-${correction.timestamp}`}
              className={`correction-item severity-${correction.severity}`}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="correction-header">
                <span className="correction-metric">{correction.metric}</span>
                <span className={`correction-severity ${correction.severity}`}>
                  {correction.severity}
                </span>
              </div>
              <p className="correction-suggestion">{correction.suggestion}</p>
              {correction.visualOverlay && (
                <div className="visual-overlay" style={{
                  '--overlay-position': correction.visualOverlay.position,
                  '--overlay-angle': `${correction.visualOverlay.angle}deg`,
                  '--overlay-distance': `${correction.visualOverlay.distance}px`
                } as React.CSSProperties}>
                  <div className="overlay-indicator" />
                </div>
              )}
              <div className="correction-footer">
                <span className="correction-time">
                  {new Date(correction.timestamp).toLocaleTimeString()}
                </span>
                <span className="correction-effectiveness">
                  Effectiveness: {Math.round(correction.effectiveness * 100)}%
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="form-analysis-feedback-visualizer loading">
        <div className="loading-spinner" />
        <p>Loading visualization data...</p>
      </div>
    );
  }

  return (
    <div className="form-analysis-feedback-visualizer">
      <div className="visualizer-header">
        <h3>Form Analysis Feedback</h3>
        <div className="time-range-selector">
          {TIME_RANGES.map(range => (
            <button
              key={range.value}
              className={timeRange.value === range.value ? 'active' : ''}
              onClick={() => setTimeRange(range)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="metrics-grid">
        {metricVisualizations.map(renderMetricVisualization)}
      </div>

      {renderFormCorrections()}

      {userProgression && (
        <motion.div
          className="progression-info"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h4>User Progression</h4>
          <div className="progression-metrics">
            <div className="progression-metric">
              <span className="metric-label">Level</span>
              <span className="metric-value">{userProgression.level}</span>
            </div>
            <div className="progression-metric">
              <span className="metric-label">Experience</span>
              <span className="metric-value">{Math.round(userProgression.experience)}</span>
            </div>
            <div className="progression-metric">
              <span className="metric-label">Success Rate</span>
              <span className="metric-value">
                {Math.round(
                  userProgression.exerciseHistory.find(h => h.exerciseKey === exerciseKey)?.successRate || 0
                )}%
              </span>
            </div>
          </div>
          <div className="feedback-effectiveness">
            <h4>Feedback Effectiveness</h4>
            <div className="effectiveness-metrics">
              {Object.entries(feedbackEffectiveness).map(([channel, effectiveness]) => (
                <div key={channel} className="effectiveness-metric">
                  <span className="channel-label">{channel}</span>
                  <div className="effectiveness-bar">
                    <motion.div
                      className="effectiveness-progress"
                      initial={{ width: 0 }}
                      animate={{ width: `${effectiveness * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="effectiveness-value">{Math.round(effectiveness * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}; 