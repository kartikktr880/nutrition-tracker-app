import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useRef, useState, useCallback } from 'react';

import { ValidationResult } from '../../services/stateValidation';
import { logError } from '../../utils/logger';

interface FormAnalysisVisualizerProps {
  exerciseKey: string;
  currentForm: Record<string, unknown>;
  validationResult: ValidationResult;
  onFeedbackComplete?: () => void;
  showDetailedMetrics?: boolean;
  className?: string;
}

interface FormMetrics {
  accuracy: number;
  alignment: number;
  stability: number;
  timing: number;
  overall: number;
}

interface FeedbackItem {
  type: 'error' | 'warning' | 'success';
  message: string;
  priority: number;
  timestamp: number;
}

export const FormAnalysisVisualizer: React.FC<FormAnalysisVisualizerProps> = ({
  exerciseKey,
  currentForm,
  validationResult,
  onFeedbackComplete,
  showDetailedMetrics = false,
  className = ''
}) => {
  const theme = {
    colors: {
      background: '#fff',
      primary: '#28a745',
      secondary: '#ff9800',
      accent: '#007bff',
      success: '#4caf50',
      text: '#222',
    },
  };
  const [metrics, setMetrics] = useState<FormMetrics>({
    accuracy: 0,
    alignment: 0,
    stability: 0,
    timing: 0,
    overall: 0
  });
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  const calculateFormMetrics = useCallback((
    validationResult: ValidationResult,
    _visualizationData: Record<string, unknown>
  ): FormMetrics => {
    // Calculate metrics based on validation results and historical data
    const accuracy = calculateAccuracy(validationResult, _visualizationData);
    const alignment = calculateAlignment(validationResult, _visualizationData);
    const stability = calculateStability(validationResult, _visualizationData);
    const timing = calculateTiming(validationResult, _visualizationData);

    return {
      accuracy,
      alignment,
      stability,
      timing,
      overall: (accuracy + alignment + stability + timing) / 4
    };
  }, []);

  const generateFeedback = useCallback((
    validationResult: ValidationResult,
    _visualizationData: Record<string, unknown>
  ): FeedbackItem[] => {
    const feedback: FeedbackItem[] = [];

    // Process errors
    validationResult.errors.forEach((error, index) => {
      feedback.push({
        type: 'error',
        message: error,
        priority: validationResult.errors.length - index,
        timestamp: Date.now()
      });
    });

    // Process warnings
    validationResult.warnings.forEach((warning, index) => {
      feedback.push({
        type: 'warning',
        message: warning,
        priority: validationResult.warnings.length - index,
        timestamp: Date.now()
      });
    });

    // Add success feedback if no errors
    if (validationResult.isValid) {
      feedback.push({
        type: 'success',
        message: 'Form is correct!',
        priority: 0,
        timestamp: Date.now()
      });
    }

    return feedback.sort((a, b) => b.priority - a.priority);
  }, []);

  const updateVisualization = useCallback((metrics: FormMetrics) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Define drawFormAnalysis inside useCallback to avoid unstable dependency
    const drawFormAnalysis = (ctx: CanvasRenderingContext2D, metrics: FormMetrics) => {
      const { width, height } = ctx.canvas;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.4;

      // Draw background
      ctx.fillStyle = theme.colors.background;
      ctx.fillRect(0, 0, width, height);

      // Draw metrics
      const metricsArray = [
        { value: metrics.accuracy, label: 'Accuracy', color: theme.colors.primary },
        { value: metrics.alignment, label: 'Alignment', color: theme.colors.secondary },
        { value: metrics.stability, label: 'Stability', color: theme.colors.accent },
        { value: metrics.timing, label: 'Timing', color: theme.colors.success }
      ];

      metricsArray.forEach((metric, index) => {
        const angle = (index * Math.PI * 2) / metricsArray.length;
        const x = centerX + Math.cos(angle) * radius * metric.value;
        const y = centerY + Math.sin(angle) * radius * metric.value;

        // Draw metric line
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = metric.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw metric point
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = metric.color;
        ctx.fill();

        // Draw metric label
        ctx.fillStyle = theme.colors.text;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(metric.label, x, y - 10);
      });

      // Draw overall score
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * metrics.overall, 0, Math.PI * 2);
      ctx.strokeStyle = theme.colors.primary;
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw form analysis visualization
    drawFormAnalysis(ctx, metrics);
  }, [theme]);

  useEffect(() => {
    const analyzeForm = async () => {
      setIsAnalyzing(true);
      try {
        // Get visualization data for real-time analysis
        // const visualizationData = await validationVisualization.generateVisualizationData(exerciseKey);
        
        // Calculate form metrics based on validation results and visualization data
        const newMetrics = calculateFormMetrics(validationResult, {});
        setMetrics(newMetrics);

        // Generate feedback based on validation results
        const newFeedback = generateFeedback(validationResult, {});
        setFeedback(prev => [...newFeedback, ...prev].slice(0, 5));

        // Update visualization
        updateVisualization(newMetrics);

        onFeedbackComplete?.();
      } catch (error) {
        logError('Form analysis failed:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyzeForm();
    // Fix: copy animationFrameRef.current to a local variable for cleanup
    const animationFrame = animationFrameRef.current;
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [exerciseKey, currentForm, validationResult, calculateFormMetrics, generateFeedback, updateVisualization, onFeedbackComplete]);

  return (
    <div className={`form-analysis-visualizer ${className}`} data-testid="form-analysis-visualizer-root">
      <div className="visualization-container">
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          className="form-analysis-canvas"
        />
        {isAnalyzing && (
          <div className="analysis-indicator">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="loading-spinner"
            />
          </div>
        )}
      </div>

      <AnimatePresence>
        {feedback.map((item, index) => (
          <motion.div
            key={`${item.timestamp}-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={`feedback-item ${item.type}`}
          >
            <span className="feedback-icon">
              {item.type === 'error' ? '⚠️' : item.type === 'warning' ? '⚡' : '✅'}
            </span>
            <span className="feedback-message">{item.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>

      {showDetailedMetrics && (
        <div className="detailed-metrics">
          <div className="metric">
            <span className="metric-label" aria-label="Accuracy">Accuracy</span>
            <div className="metric-bar">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${metrics.accuracy * 100}%` }}
                className="metric-fill"
                style={{ backgroundColor: theme.colors.primary }}
              />
            </div>
          </div>
          <div className="metric">
            <span className="metric-label" aria-label="Alignment">Alignment</span>
            <div className="metric-bar">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${metrics.alignment * 100}%` }}
                className="metric-fill"
                style={{ backgroundColor: theme.colors.secondary }}
              />
            </div>
          </div>
          <div className="metric">
            <span className="metric-label" aria-label="Stability">Stability</span>
            <div className="metric-bar">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${metrics.stability * 100}%` }}
                className="metric-fill"
                style={{ backgroundColor: theme.colors.accent }}
              />
            </div>
          </div>
          <div className="metric">
            <span className="metric-label" aria-label="Timing">Timing</span>
            <div className="metric-bar">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${metrics.timing * 100}%` }}
                className="metric-fill"
                style={{ backgroundColor: theme.colors.success }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions for metric calculations
const calculateAccuracy = (validationResult: ValidationResult, _visualizationData: Record<string, unknown>): number => {
  // Implement accuracy calculation based on validation results and historical data
  return Math.max(0, Math.min(1, 1 - validationResult.errors.length * 0.2));
};

const calculateAlignment = (validationResult: ValidationResult, _visualizationData: Record<string, unknown>): number => {
  // Implement alignment calculation based on form data
  return Math.max(0, Math.min(1, 1 - validationResult.warnings.length * 0.1));
};

const calculateStability = (validationResult: ValidationResult, _visualizationData: Record<string, unknown>): number => {
  // Implement stability calculation based on form consistency
  return Math.max(0, Math.min(1, validationResult.isValid ? 1 : 0.5));
};

const calculateTiming = (validationResult: ValidationResult, _visualizationData: Record<string, unknown>): number => {
  // Implement timing calculation based on validation performance
  const validationTime = validationResult.metadata.validationTime;
  return Math.max(0, Math.min(1, 1 - validationTime / 1000));
};

export default FormAnalysisVisualizer; 