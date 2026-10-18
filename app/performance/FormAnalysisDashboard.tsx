import { motion } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';

import { ValidationResult } from '../../services/stateValidation';
import { validationAnalytics } from '../../services/validationAnalytics';
import { logError } from '../../utils/logger';

import { FormAnalysisFeedbackVisualizer } from './FormAnalysisFeedbackVisualizer';
import { FormAnalysisVisualizer } from './FormAnalysisVisualizer';
import PerformanceMetricsVisualizer from '../analytics/PerformanceMetricsVisualizer';
import { FormFeedbackSystem } from '../../components/FormFeedbackSystem';

import '../styles/FormAnalysisDashboard.css';
import '../styles/FormAnalysisFeedbackManager.css';
import '../styles/FormAnalysisFeedbackVisualizer.css';
import '../styles/FormFeedbackSystem.css';

// Type definitions
interface FormAnalysis {
  accuracy: number;
  stability: number;
  alignment: number;
  timing: number;
  consistency: number;
  patterns: FormPatterns;
  recommendations: string[];
}

interface AnalysisRecommendations {
  priority: 'high' | 'medium' | 'low';
  message: string;
  action: string;
  impact: string;
}

interface FormPatterns {
  commonErrors: string[];
  improvementAreas: string[];
  strengths: string[];
  trends: {
    accuracy: number[];
    stability: number[];
    alignment: number[];
    timing: number[];
  };
}

// Add FormHistoryEntry interface locally
interface FormHistoryEntry {
  timestamp: number;
  metrics: {
    accuracy: number;
    stability: number;
    alignment: number;
    timing: number;
    consistency: number;
    overall?: number;
  };
  formData?: Record<string, unknown>;
  validationResult?: Record<string, unknown>;
}

// Add a default ValidationResult
const defaultValidationResult: ValidationResult = {
  isValid: true,
  errors: [],
  warnings: [],
  metadata: {
    validationTime: 0,
    validationType: 'custom',
    timestamp: new Date(),
    performanceMetrics: {
      cacheHit: false,
      middlewareTime: 0,
      validationTime: 0,
      totalTime: 0
    }
  }
};

export const FormAnalysisDashboard: React.FC<{
  exerciseKey: string;
  currentForm: Record<string, unknown>;
  validationResult: ValidationResult;
  idealFormPattern: Record<string, unknown>;
}> = ({
  exerciseKey,
  currentForm,
  validationResult,
  idealFormPattern,
}) => {
  const [analysis, setAnalysis] = useState<FormAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'details' | 'trends'>('overview');
  const [recommendations, setRecommendations] = useState<AnalysisRecommendations[]>([]);
  const [historicalData, setHistoricalData] = useState<FormHistoryEntry[]>([]);

  // Add state for feedback preferences
  const [feedbackPreferences, setFeedbackPreferences] = useState({
    audioEnabled: true,
    hapticEnabled: true,
  });

  // Add state for feedback manager preferences
  const [feedbackManagerPreferences, setFeedbackManagerPreferences] = useState({
    audioEnabled: true,
    visualEnabled: true,
    hapticEnabled: true,
    analyticsEnabled: true
  });

  const [feedbackPatterns, setFeedbackPatterns] = useState<{
    metric: string;
    threshold: number;
    priority: 'high' | 'medium' | 'low';
    frequency: number;
    successRate: number;
    lastUsed: number;
  }[]>([]);

  const generateFormAnalysis = useCallback(async (
    currentForm: Record<string, unknown>,
    idealForm: Record<string, unknown>,
    validationResult: ValidationResult
  ): Promise<FormAnalysis> => {
    // Calculate base metrics
    const accuracy = calculateAccuracy(currentForm, idealForm);
    const stability = calculateStability(currentForm);
    const alignment = calculateAlignment(currentForm, idealForm);
    const timing = calculateTiming(currentForm, idealForm);
    const consistency = calculateConsistency(currentForm);

    // Analyze patterns
    const patterns = await analyzeFormPatterns(currentForm, idealForm, validationResult);

    // Generate recommendations
    const recommendations = generateRecommendations({
      accuracy,
      stability,
      alignment,
      timing,
      consistency,
      patterns,
      recommendations: []
    }).map(rec => rec.message);

    return {
      accuracy,
      stability,
      alignment,
      timing,
      consistency,
      patterns,
      recommendations
    };
  }, []);

  useEffect(() => {
    const analyzeForm = async () => {
      setLoading(true);
      try {
        const analytics = validationAnalytics;

        // Generate form analysis
        const formAnalysis = await generateFormAnalysis(currentForm, idealFormPattern, validationResult);
        setAnalysis(formAnalysis);

        // Generate recommendations
        const formRecommendations = generateRecommendations(formAnalysis);
        setRecommendations(formRecommendations);

        // Record analytics
        await analytics.recordValidation(exerciseKey, {
          isValid: true,
          errors: [],
          warnings: [],
          metadata: {
            validationTime: 0,
            validationType: 'custom' as const,
            timestamp: new Date(),
            performanceMetrics: {
              cacheHit: false,
              middlewareTime: 0,
              validationTime: 0,
              totalTime: 0
            }
          }
        });
      } catch (error) {
        logError('Error analyzing form:', error);
      } finally {
        setLoading(false);
      }
    };

    analyzeForm();
  }, [exerciseKey, currentForm, validationResult, idealFormPattern, generateFormAnalysis]);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      try {
        // const analytics = validationAnalytics;
        // const data = await analytics.getHistoricalMetrics(exerciseKey);
        // setHistoricalData(data);
        setHistoricalData([]);
      } catch (error) {
        logError('Error fetching historical data:', error);
      }
    };

    fetchHistoricalData();
  }, [exerciseKey]);

  // Add effect for feedback preferences
  useEffect(() => {
    // Load user preferences from localStorage
    const savedPreferences = localStorage.getItem('feedbackPreferences');
    if (savedPreferences) {
      setFeedbackPreferences(JSON.parse(savedPreferences));
    }
  }, []);

  // Add handler for feedback preference changes
  const handleFeedbackPreferenceChange = (preference: 'audio' | 'haptic', enabled: boolean) => {
    setFeedbackPreferences(prev => ({
      ...prev,
      [preference === 'audio' ? 'audioEnabled' : 'hapticEnabled']: enabled,
    }));
    localStorage.setItem('feedbackPreferences', JSON.stringify(feedbackPreferences));
  };

  // Add effect for feedback manager preferences
  useEffect(() => {
    const savedPreferences = localStorage.getItem('feedbackManagerPreferences');
    if (savedPreferences) {
      setFeedbackManagerPreferences(JSON.parse(savedPreferences));
    }
  }, []);

  // Load feedback patterns
  useEffect(() => {
    const loadFeedbackPatterns = async () => {
      try {
        // const analytics = validationAnalytics;
        // const patterns = await analytics.getFeedbackPatterns(exerciseKey);
        // setFeedbackPatterns(patterns);
        setFeedbackPatterns([]);
      } catch (error) {
        logError('Error loading feedback patterns:', error);
      }
    };

    loadFeedbackPatterns();
  }, [exerciseKey]);

  const calculateAccuracy = (_current: Record<string, unknown>, _ideal: Record<string, unknown>): number => {
    // Implementation of accuracy calculation
    return 0.85; // Placeholder
  };

  const calculateStability = (_form: Record<string, unknown>): number => {
    // Implementation of stability calculation
    return 0.78; // Placeholder
  };

  const calculateAlignment = (_current: Record<string, unknown>, _ideal: Record<string, unknown>): number => {
    // Implementation of alignment calculation
    return 0.92; // Placeholder
  };

  const calculateTiming = (_current: Record<string, unknown>, _ideal: Record<string, unknown>): number => {
    // Implementation of timing calculation
    return 0.88; // Placeholder
  };

  const calculateConsistency = (_form: Record<string, unknown>): number => {
    // Implementation of consistency calculation
    return 0.75; // Placeholder
  };

  const analyzeFormPatterns = async (
    _currentForm: Record<string, unknown>,
    _idealForm: Record<string, unknown>,
    _validationResult: ValidationResult
  ): Promise<FormPatterns> => {
    // Implementation of pattern analysis
    return {
      commonErrors: [],
      improvementAreas: [],
      strengths: [],
      trends: {
        accuracy: [],
        stability: [],
        alignment: [],
        timing: []
      }
    };
  };

  const generateRecommendations = (analysis: FormAnalysis): AnalysisRecommendations[] => {
    const recommendations: AnalysisRecommendations[] = [];

    // Generate recommendations based on analysis
    if (analysis.accuracy < 0.8) {
      recommendations.push({
        priority: 'high',
        message: 'Focus on improving form accuracy',
        action: 'Practice with slower movements',
        impact: 'High impact on exercise effectiveness'
      });
    }

    if (analysis.stability < 0.7) {
      recommendations.push({
        priority: 'medium',
        message: 'Work on movement stability',
        action: 'Include stability exercises',
        impact: 'Medium impact on exercise safety'
      });
    }

    return recommendations;
  };

  if (loading) {
    return (
      <div className="form-analysis-dashboard loading">
        <div className="loading-spinner" />
        <p>Analyzing form data...</p>
      </div>
    );
  }

  return (
    <div className="form-analysis-dashboard">
      <div className="dashboard-header">
        <h2>Form Analysis Dashboard</h2>
        <div className="view-selector">
          <button
            className={selectedView === 'overview' ? 'active' : ''}
            onClick={() => setSelectedView('overview')}
          >
            Overview
          </button>
          <button
            className={selectedView === 'details' ? 'active' : ''}
            onClick={() => setSelectedView('details')}
          >
            Details
          </button>
          <button
            className={selectedView === 'trends' ? 'active' : ''}
            onClick={() => setSelectedView('trends')}
          >
            Trends
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="main-content">
          <FormAnalysisFeedbackVisualizer
            exerciseKey={exerciseKey}
            currentMetrics={{
              accuracy: analysis?.accuracy ?? 0,
              stability: analysis?.stability ?? 0,
              alignment: analysis?.alignment ?? 0,
              timing: analysis?.timing ?? 0,
              consistency: analysis?.consistency ?? 0
            }}
            feedbackPatterns={feedbackPatterns}
          />

          <FormAnalysisVisualizer
            exerciseKey={exerciseKey}
            currentForm={currentForm}
            validationResult={validationResult}
          />

          <FormFeedbackSystem
            _exerciseKey={exerciseKey}
            currentMetrics={{
              accuracy: analysis?.accuracy ?? 0,
              stability: analysis?.stability ?? 0,
              alignment: analysis?.alignment ?? 0,
              timing: analysis?.timing ?? 0,
              consistency: analysis?.consistency ?? 0
            }}
            _validationResult={validationResult as unknown as Record<string, unknown>}
            audioEnabled={feedbackPreferences.audioEnabled}
            hapticEnabled={feedbackPreferences.hapticEnabled}
            onPreferenceChange={handleFeedbackPreferenceChange}
          />

          {selectedView === 'details' && (
            <PerformanceMetricsVisualizer
              metrics={{
                accuracy: analysis?.accuracy ?? 0,
                stability: analysis?.stability ?? 0,
                alignment: analysis?.alignment ?? 0,
                timing: analysis?.timing ?? 0,
                consistency: analysis?.consistency ?? 0
              }}
              historicalData={{
                trends: historicalData.map(entry => ({
                  metric: 'accuracy' as keyof { accuracy: number; stability: number; alignment: number; timing: number; consistency: number },
                  trend: entry.metrics?.accuracy ?? 0,
                  confidence: 85
                }))
              }}
              onMetricSelect={(metric: keyof { accuracy: number; stability: number; alignment: number; timing: number; consistency: number }) => {
                // Handle metric selection
                logError('Selected metric:', metric);
              }}
            />
          )}

          {selectedView === 'trends' && (
            <PerformanceMetricsVisualizer
              metrics={{
                accuracy: analysis?.accuracy ?? 0,
                stability: analysis?.stability ?? 0,
                alignment: analysis?.alignment ?? 0,
                timing: analysis?.timing ?? 0,
                consistency: analysis?.consistency ?? 0
              }}
              historicalData={{
                trends: historicalData.map(entry => ({
                  metric: 'accuracy' as keyof { accuracy: number; stability: number; alignment: number; timing: number; consistency: number },
                  trend: entry.metrics?.accuracy ?? 0,
                  confidence: 85
                }))
              }}
              onMetricSelect={(metric: keyof { accuracy: number; stability: number; alignment: number; timing: number; consistency: number }) => {
                // Handle metric selection
                logError('Selected metric:', metric);
              }}
            />
          )}
        </div>

        <div className="sidebar">
          <div className="recommendations-section">
            <h3>Recommendations</h3>
            {recommendations.map((rec, index) => (
              <motion.div
                key={index}
                className={`recommendation-item ${rec.priority}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="recommendation-header">
                  <span className="priority-indicator" />
                  <h4>{rec.message}</h4>
                </div>
                <p className="recommendation-action">{rec.action}</p>
                <p className="recommendation-impact">Impact: {rec.impact}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormAnalysisDashboard; 