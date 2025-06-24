import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FormAnalysisVisualizer } from './FormAnalysisVisualizer';
import { FormComparisonAnalyzer } from './FormComparisonAnalyzer';
import { ValidationAnalytics } from '../services/validationAnalytics';
import { ValidationVisualization } from '../services/validationVisualization';
import { PerformanceMetricsVisualizer } from './PerformanceMetricsVisualizer';
import { FormFeedbackSystem } from './FormFeedbackSystem';
import { FormAnalysisFeedbackManager } from './FormAnalysisFeedbackManager';
import { FormAnalysisFeedbackVisualizer } from './FormAnalysisFeedbackVisualizer';
import '../styles/FormAnalysisDashboard.css';
import '../styles/FormFeedbackSystem.css';
import '../styles/FormAnalysisFeedbackManager.css';
import '../styles/FormAnalysisFeedbackVisualizer.css';

interface FormAnalysisDashboardProps {
  exerciseKey: string;
  currentForm: any;
  validationResult: any;
  idealFormPattern: any;
  onFormUpdate?: (form: any) => void;
}

interface FormAnalysis {
  accuracy: number;
  stability: number;
  alignment: number;
  timing: number;
  consistency: number;
  patterns: FormPatterns;
  recommendations: string[];
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

interface PatternAnalysis {
  type: 'error' | 'warning' | 'success';
  message: string;
  impact: 'high' | 'medium' | 'low';
  frequency: number;
}

interface PerformanceMetrics {
  accuracy: number;
  stability: number;
  alignment: number;
  timing: number;
  consistency: number;
  trend: 'improving' | 'stable' | 'declining';
}

interface AnalysisRecommendations {
  priority: 'high' | 'medium' | 'low';
  message: string;
  action: string;
  impact: string;
}

export const FormAnalysisDashboard: React.FC<FormAnalysisDashboardProps> = ({
  exerciseKey,
  currentForm,
  validationResult,
  idealFormPattern,
  onFormUpdate
}) => {
  const [analysis, setAnalysis] = useState<FormAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'details' | 'trends'>('overview');
  const [recommendations, setRecommendations] = useState<AnalysisRecommendations[]>([]);
  const [historicalData, setHistoricalData] = useState<{
    timestamp: number;
    metrics: {
      accuracy: number;
      stability: number;
      alignment: number;
      timing: number;
      consistency: number;
    };
  }[]>([]);

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

  useEffect(() => {
    const analyzeForm = async () => {
      setLoading(true);
      try {
        const analytics = ValidationAnalytics.getInstance();
        const visualization = ValidationVisualization.getInstance();

        // Generate form analysis
        const formAnalysis = await generateFormAnalysis(currentForm, idealFormPattern, validationResult);
        setAnalysis(formAnalysis);

        // Generate recommendations
        const formRecommendations = generateRecommendations(formAnalysis);
        setRecommendations(formRecommendations);

        // Record analytics
        await analytics.recordValidation({
          exerciseKey,
          validationResult,
          metrics: {
            accuracy: formAnalysis.accuracy,
            stability: formAnalysis.stability,
            alignment: formAnalysis.alignment,
            timing: formAnalysis.timing,
            consistency: formAnalysis.consistency
          }
        });

        // Update visualization data
        await visualization.updateVisualizationData({
          exerciseKey,
          metrics: formAnalysis,
          patterns: formAnalysis.patterns,
          recommendations: formRecommendations
        });
      } catch (error) {
        console.error('Error analyzing form:', error);
      } finally {
        setLoading(false);
      }
    };

    analyzeForm();
  }, [exerciseKey, currentForm, validationResult, idealFormPattern]);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      try {
        const analytics = ValidationAnalytics.getInstance();
        const data = await analytics.getHistoricalMetrics(exerciseKey);
        setHistoricalData(data);
      } catch (error) {
        console.error('Error fetching historical data:', error);
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

  // Add handler for feedback manager preference changes
  const handleFeedbackManagerPreferenceChange = (preferences: typeof feedbackManagerPreferences) => {
    setFeedbackManagerPreferences(preferences);
    localStorage.setItem('feedbackManagerPreferences', JSON.stringify(preferences));
  };

  // Load feedback patterns
  useEffect(() => {
    const loadFeedbackPatterns = async () => {
      try {
        const analytics = ValidationAnalytics.getInstance();
        const patterns = await analytics.getFeedbackPatterns(exerciseKey);
        setFeedbackPatterns(patterns);
      } catch (error) {
        console.error('Error loading feedback patterns:', error);
      }
    };

    loadFeedbackPatterns();
  }, [exerciseKey]);

  const generateFormAnalysis = async (
    currentForm: any,
    idealForm: any,
    validationResult: any
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
      patterns
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
  };

  const calculateAccuracy = (current: any, ideal: any): number => {
    // Implementation of accuracy calculation
    return 0.85; // Placeholder
  };

  const calculateStability = (form: any): number => {
    // Implementation of stability calculation
    return 0.78; // Placeholder
  };

  const calculateAlignment = (current: any, ideal: any): number => {
    // Implementation of alignment calculation
    return 0.92; // Placeholder
  };

  const calculateTiming = (current: any, ideal: any): number => {
    // Implementation of timing calculation
    return 0.88; // Placeholder
  };

  const calculateConsistency = (form: any): number => {
    // Implementation of consistency calculation
    return 0.75; // Placeholder
  };

  const analyzeFormPatterns = async (
    currentForm: any,
    idealForm: any,
    validationResult: any
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
          <FormAnalysisVisualizer
            exerciseKey={exerciseKey}
            currentForm={currentForm}
            validationResult={validationResult}
            idealFormPattern={idealFormPattern}
            onFormUpdate={onFormUpdate}
          />

          <FormAnalysisFeedbackVisualizer
            exerciseKey={exerciseKey}
            currentMetrics={{
              accuracy: analysis?.accuracy,
              stability: analysis?.stability,
              alignment: analysis?.alignment,
              timing: analysis?.timing,
              consistency: analysis?.consistency
            }}
            feedbackPatterns={feedbackPatterns}
          />

          <FormAnalysisFeedbackManager
            exerciseKey={exerciseKey}
            currentMetrics={{
              accuracy: analysis?.accuracy,
              stability: analysis?.stability,
              alignment: analysis?.alignment,
              timing: analysis?.timing,
              consistency: analysis?.consistency
            }}
            validationResult={validationResult}
            preferences={feedbackManagerPreferences}
            onPreferenceChange={handleFeedbackManagerPreferenceChange}
          />

          <FormFeedbackSystem
            exerciseKey={exerciseKey}
            currentMetrics={{
              accuracy: analysis?.accuracy,
              stability: analysis?.stability,
              alignment: analysis?.alignment,
              timing: analysis?.timing,
              consistency: analysis?.consistency
            }}
            validationResult={validationResult}
            audioEnabled={feedbackPreferences.audioEnabled}
            hapticEnabled={feedbackPreferences.hapticEnabled}
            onPreferenceChange={handleFeedbackPreferenceChange}
          />

          {selectedView === 'details' && (
            <FormComparisonAnalyzer
              exerciseKey={exerciseKey}
              currentForm={currentForm}
              idealFormPattern={idealFormPattern}
              historicalData={historicalData}
              onFormUpdate={onFormUpdate}
            />
          )}

          {selectedView === 'trends' && (
            <PerformanceMetricsVisualizer
              exerciseKey={exerciseKey}
              currentMetrics={{
                accuracy: analysis?.accuracy,
                stability: analysis?.stability,
                alignment: analysis?.alignment,
                timing: analysis?.timing,
                consistency: analysis?.consistency
              }}
              historicalData={historicalData}
              onMetricSelect={(metric) => {
                // Handle metric selection
                console.log('Selected metric:', metric);
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