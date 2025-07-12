import { motion } from 'framer-motion';
import React, { useState, useEffect, useCallback } from 'react';
import '../styles/FormFeedbackSystem.css';

interface FormFeedbackSystemProps {
  _exerciseKey: string;
  currentMetrics: {
    accuracy: number;
    stability: number;
    alignment: number;
    timing: number;
    consistency: number;
  };
  _validationResult: Record<string, unknown>;
  audioEnabled: boolean;
  hapticEnabled: boolean;
  onPreferenceChange: (preference: 'audio' | 'haptic', enabled: boolean) => void;
}

interface FeedbackItem {
  id: string;
  type: 'error' | 'warning' | 'success' | 'tip';
  message: string;
  priority: 'high' | 'medium' | 'low';
  category: 'accuracy' | 'stability' | 'alignment' | 'timing' | 'consistency';
  action?: string;
  acknowledged: boolean;
}

export const FormFeedbackSystem: React.FC<FormFeedbackSystemProps> = ({
  _exerciseKey,
  currentMetrics,
  _validationResult,
  audioEnabled,
  hapticEnabled,
  onPreferenceChange,
}) => {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Generate feedback based on metrics
  const generateFeedback = useCallback((metrics: typeof currentMetrics): FeedbackItem[] => {
    const feedback: FeedbackItem[] = [];

    // Accuracy feedback
    if (metrics.accuracy < 0.7) {
      feedback.push({
        id: `accuracy-${Date.now()}`,
        type: 'error',
        message: 'Form accuracy needs improvement',
        priority: 'high',
        category: 'accuracy',
        action: 'Focus on maintaining proper form throughout the movement',
        acknowledged: false,
      });
    } else if (metrics.accuracy < 0.85) {
      feedback.push({
        id: `accuracy-${Date.now()}`,
        type: 'warning',
        message: 'Form accuracy could be improved',
        priority: 'medium',
        category: 'accuracy',
        action: 'Pay attention to movement precision',
        acknowledged: false,
      });
    }

    // Stability feedback
    if (metrics.stability < 0.6) {
      feedback.push({
        id: `stability-${Date.now()}`,
        type: 'error',
        message: 'Movement stability is compromised',
        priority: 'high',
        category: 'stability',
        action: 'Work on maintaining balance and control',
        acknowledged: false,
      });
    } else if (metrics.stability < 0.8) {
      feedback.push({
        id: `stability-${Date.now()}`,
        type: 'warning',
        message: 'Movement stability needs attention',
        priority: 'medium',
        category: 'stability',
        action: 'Focus on controlled movements',
        acknowledged: false,
      });
    }

    // Alignment feedback
    if (metrics.alignment < 0.75) {
      feedback.push({
        id: `alignment-${Date.now()}`,
        type: 'error',
        message: 'Body alignment needs correction',
        priority: 'high',
        category: 'alignment',
        action: 'Check your posture and body positioning',
        acknowledged: false,
      });
    }

    // Timing feedback
    if (metrics.timing < 0.7) {
      feedback.push({
        id: `timing-${Date.now()}`,
        type: 'warning',
        message: 'Movement timing could be improved',
        priority: 'medium',
        category: 'timing',
        action: 'Focus on consistent movement speed',
        acknowledged: false,
      });
    }

    // Consistency feedback
    if (metrics.consistency < 0.65) {
      feedback.push({
        id: `consistency-${Date.now()}`,
        type: 'warning',
        message: 'Movement consistency needs work',
        priority: 'medium',
        category: 'consistency',
        action: 'Practice maintaining consistent form across repetitions',
        acknowledged: false,
      });
    }

    // Add success feedback for good metrics
    if (metrics.accuracy > 0.9 && metrics.stability > 0.85) {
      feedback.push({
        id: `success-${Date.now()}`,
        type: 'success',
        message: 'Excellent form! Keep up the good work',
        priority: 'low',
        category: 'accuracy',
        acknowledged: false,
      });
    }

    return feedback;
  }, []);

  // Provide audio feedback
  const provideAudioFeedback = useCallback((feedback: FeedbackItem) => {
    if (!audioEnabled) return;

    let audioContext: AudioContext;
    if ('AudioContext' in window) {
      audioContext = new window.AudioContext();
    } else if ('webkitAudioContext' in window) {
      audioContext = new (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext();
    } else {
      return; // AudioContext not supported
    }
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different tones for different feedback types
    switch (feedback.type) {
      case 'error':
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
        break;
      case 'warning':
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        break;
      case 'success':
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
        break;
      default:
        oscillator.frequency.setValueAtTime(392, audioContext.currentTime); // G4
    }

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  }, [audioEnabled]);

  // Provide haptic feedback
  const provideHapticFeedback = useCallback((feedback: FeedbackItem) => {
    if (!hapticEnabled || !navigator.vibrate) return;

    // Different vibration patterns for different feedback types
    switch (feedback.type) {
      case 'error':
        navigator.vibrate([100, 50, 100]); // Strong vibration
        break;
      case 'warning':
        navigator.vibrate([50, 50, 50]); // Medium vibration
        break;
      case 'success':
        navigator.vibrate([30, 30, 30]); // Light vibration
        break;
      default:
        navigator.vibrate(50); // Single vibration
    }
  }, [hapticEnabled]);

  // Handle feedback acknowledgment
  const handleAcknowledge = (feedbackId: string) => {
    setFeedbackItems(prev =>
      prev.map(item =>
        item.id === feedbackId ? { ...item, acknowledged: true } : item
      )
    );

    // Record feedback acknowledgment in analytics
    // validationAnalytics.recordFeedbackAcknowledgment({
    //   exerciseKey,
    //   metric,
    //   feedbackType,
    //   timestamp: Date.now(),
    //   userLevel: userProgression?.level
    // });
  };

  // Effect to generate feedback when metrics change
  useEffect(() => {
    setIsAnalyzing(true);
    const newFeedback = generateFeedback(currentMetrics);
    
    // Filter out duplicate feedback
    setFeedbackItems(prev => {
      const existingCategories = new Set(prev.map(item => item.category));
      const uniqueNewFeedback = newFeedback.filter(
        item => !existingCategories.has(item.category)
      );
      return [...prev, ...uniqueNewFeedback];
    });

    setIsAnalyzing(false);
  }, [currentMetrics, generateFeedback]);

  // Effect to provide feedback when new items are added
  useEffect(() => {
    feedbackItems.forEach(item => {
      if (!item.acknowledged) {
        provideAudioFeedback(item);
        provideHapticFeedback(item);
      }
    });
  }, [feedbackItems, provideAudioFeedback, provideHapticFeedback]);

  if (isAnalyzing) {
    return (
      <div className="form-feedback-system">
        <div className="feedback-loading">
          <div className="loading-spinner" />
          <p>Analyzing form feedback...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-feedback-system">
      <div className="feedback-header">
        <h3>Form Feedback</h3>
        <div className="feedback-preferences">
          <button
            className={`preference-button ${audioEnabled ? 'active' : ''}`}
            onClick={() => onPreferenceChange('audio', !audioEnabled)}
            title={audioEnabled ? 'Disable audio feedback' : 'Enable audio feedback'}
          >
            🔊
          </button>
          <button
            className={`preference-button ${hapticEnabled ? 'active' : ''}`}
            onClick={() => onPreferenceChange('haptic', !hapticEnabled)}
            title={hapticEnabled ? 'Disable haptic feedback' : 'Enable haptic feedback'}
          >
            📳
          </button>
        </div>
      </div>

      <div className="feedback-container">
        {feedbackItems.map(item => (
          <motion.div
            key={item.id}
            className={`feedback-item ${item.type}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="feedback-content">
              <div className="feedback-icon">
                {item.type === 'error' && '⚠️'}
                {item.type === 'warning' && '⚡'}
                {item.type === 'success' && '✅'}
                {item.type === 'tip' && '💡'}
              </div>
              <div className="feedback-message">
                <p>{item.message}</p>
                {item.action && (
                  <p className="feedback-action">Action: {item.action}</p>
                )}
              </div>
              {!item.acknowledged && (
                <button
                  className="acknowledge-button"
                  onClick={() => handleAcknowledge(item.id)}
                  title="Acknowledge feedback"
                >
                  ✓
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}; 