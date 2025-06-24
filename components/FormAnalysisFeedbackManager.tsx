import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ValidationAnalytics } from '../services/ValidationAnalytics';
import '../styles/FormAnalysisFeedbackManager.css';

interface FormAnalysisFeedbackManagerProps {
  exerciseKey: string;
  currentMetrics: {
    accuracy: number;
    stability: number;
    alignment: number;
    timing: number;
    consistency: number;
  };
  validationResult: any;
  preferences: {
    audioEnabled: boolean;
    visualEnabled: boolean;
    hapticEnabled: boolean;
    analyticsEnabled: boolean;
  };
  onPreferenceChange: (preferences: typeof preferences) => void;
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
}

interface FeedbackPattern {
  metric: string;
  threshold: number;
  priority: 'high' | 'medium' | 'low';
  frequency: number;
  successRate: number;
  lastUsed: number;
}

interface UserFeedbackProfile {
  preferredChannels: string[];
  sensitivityLevels: {
    audio: number;
    visual: number;
    haptic: number;
  };
  learningRate: number;
  adaptationThreshold: number;
}

interface FeedbackEffectiveness {
  metric: string;
  improvement: number;
  feedbackCount: number;
  acknowledgmentRate: number;
  averageResponseTime: number;
}

interface FeedbackChannel {
  type: 'audio' | 'visual' | 'haptic';
  enabled: boolean;
  effectiveness: number;
  lastUsed: number;
}

interface FeedbackPreference {
  channel: FeedbackChannel;
  threshold: number;
  priority: 'high' | 'medium' | 'low';
}

export const FormAnalysisFeedbackManager: React.FC<FormAnalysisFeedbackManagerProps> = ({
  exerciseKey,
  currentMetrics,
  validationResult,
  preferences,
  onPreferenceChange,
  userProgression
}) => {
  const [feedbackChannels, setFeedbackChannels] = useState<FeedbackChannel[]>([
    { type: 'audio', enabled: preferences.audioEnabled, effectiveness: 0, lastUsed: 0 },
    { type: 'visual', enabled: preferences.visualEnabled, effectiveness: 0, lastUsed: 0 },
    { type: 'haptic', enabled: preferences.hapticEnabled, effectiveness: 0, lastUsed: 0 }
  ]);

  const [feedbackPreferences, setFeedbackPreferences] = useState<FeedbackPreference[]>([]);
  const [effectivenessData, setEffectivenessData] = useState<FeedbackEffectiveness[]>([]);
  const [feedbackPatterns, setFeedbackPatterns] = useState<FeedbackPattern[]>([]);
  const [userProfile, setUserProfile] = useState<UserFeedbackProfile>({
    preferredChannels: ['visual', 'audio', 'haptic'],
    sensitivityLevels: {
      audio: 0.7,
      visual: 0.8,
      haptic: 0.6
    },
    learningRate: 0.1,
    adaptationThreshold: 0.75
  });

  // Load user preferences and profile
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const analytics = ValidationAnalytics.getInstance();
        const [savedPreferences, savedProfile, savedPatterns] = await Promise.all([
          analytics.getFeedbackPreferences(exerciseKey),
          analytics.getUserFeedbackProfile(exerciseKey),
          analytics.getFeedbackPatterns(exerciseKey)
        ]);

        if (savedPreferences) {
          setFeedbackPreferences(savedPreferences);
        }
        if (savedProfile) {
          setUserProfile(savedProfile);
        }
        if (savedPatterns) {
          setFeedbackPatterns(savedPatterns);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [exerciseKey]);

  // Track feedback effectiveness
  const trackFeedbackEffectiveness = useCallback(async (metric: string, feedbackType: string) => {
    if (!preferences.analyticsEnabled) return;

    try {
      const analytics = ValidationAnalytics.getInstance();
      const effectiveness = await analytics.trackFeedbackEffectiveness({
        exerciseKey,
        metric,
        feedbackType,
        timestamp: Date.now(),
        userLevel: userProgression?.level,
        patternId: feedbackPatterns.find(p => p.metric === metric)?.metric
      });

      setEffectivenessData(prev => {
        const newData = [...prev];
        const index = newData.findIndex(d => d.metric === metric);
        if (index >= 0) {
          newData[index] = { ...newData[index], ...effectiveness };
        } else {
          newData.push({ metric, ...effectiveness });
        }
        return newData;
      });
    } catch (error) {
      console.error('Error tracking feedback effectiveness:', error);
    }
  }, [exerciseKey, preferences.analyticsEnabled, userProgression, feedbackPatterns]);

  // Update feedback patterns
  const updateFeedbackPatterns = useCallback(async (metric: string, success: boolean) => {
    const analytics = ValidationAnalytics.getInstance();
    const pattern = feedbackPatterns.find(p => p.metric === metric);
    
    if (pattern) {
      const updatedPattern = {
        ...pattern,
        frequency: pattern.frequency + 1,
        successRate: (pattern.successRate * pattern.frequency + (success ? 1 : 0)) / (pattern.frequency + 1),
        lastUsed: Date.now()
      };

      setFeedbackPatterns(prev =>
        prev.map(p => p.metric === metric ? updatedPattern : p)
      );

      await analytics.updateFeedbackPattern(exerciseKey, updatedPattern);
    }
  }, [exerciseKey, feedbackPatterns]);

  // Get adaptive thresholds
  const getAdaptiveThresholds = useCallback(() => {
    const baseThresholds = {
      accuracy: 0.8,
      stability: 0.7,
      alignment: 0.75,
      timing: 0.7,
      consistency: 0.65
    };

    if (!userProgression) return baseThresholds;

    const { level, experience, exerciseHistory } = userProgression;
    const exerciseData = exerciseHistory.find(h => h.exerciseKey === exerciseKey);
    
    if (!exerciseData) return baseThresholds;

    const adaptationFactor = Math.min(1, (level * 0.1) + (experience * 0.05));
    const successFactor = exerciseData.successRate;

    return Object.entries(baseThresholds).reduce((acc, [metric, threshold]) => ({
      ...acc,
      [metric]: threshold * (1 + (adaptationFactor * successFactor))
    }), {} as typeof baseThresholds);
  }, [exerciseKey, userProgression]);

  // Provide feedback with pattern learning
  const provideFeedback = useCallback(async (metric: string, value: number, threshold: number) => {
    const analytics = ValidationAnalytics.getInstance();
    const timestamp = Date.now();
    const adaptiveThresholds = getAdaptiveThresholds();
    const currentThreshold = adaptiveThresholds[metric as keyof typeof adaptiveThresholds] || threshold;

    // Determine feedback type and priority
    const pattern = feedbackPatterns.find(p => p.metric === metric);
    const feedbackType = value < currentThreshold ? 'error' : 'success';
    const priority = pattern?.successRate < userProfile.adaptationThreshold
      ? 'high'
      : value < currentThreshold * 0.8
        ? 'high'
        : value < currentThreshold
          ? 'medium'
          : 'low';

    // Get active channels with preferences
    const activeChannels = feedbackChannels
      .filter(channel => channel.enabled)
      .sort((a, b) => {
        const aIndex = userProfile.preferredChannels.indexOf(a.type);
        const bIndex = userProfile.preferredChannels.indexOf(b.type);
        return aIndex - bIndex;
      });

    // Provide feedback through channels
    for (const channel of activeChannels) {
      try {
        const sensitivity = userProfile.sensitivityLevels[channel.type as keyof typeof userProfile.sensitivityLevels];
        
        switch (channel.type) {
          case 'audio':
            if (preferences.audioEnabled) {
              await provideAudioFeedback(feedbackType, priority, sensitivity);
            }
            break;
          case 'visual':
            if (preferences.visualEnabled) {
              await provideVisualFeedback(feedbackType, priority, sensitivity);
            }
            break;
          case 'haptic':
            if (preferences.hapticEnabled) {
              await provideHapticFeedback(feedbackType, priority, sensitivity);
            }
            break;
        }

        // Track feedback delivery
        if (preferences.analyticsEnabled) {
          await analytics.recordFeedbackDelivery({
            exerciseKey,
            metric,
            channelType: channel.type,
            feedbackType,
            priority,
            timestamp,
            patternId: pattern?.metric,
            userLevel: userProgression?.level,
            sensitivity
          });
        }

        // Update effectiveness
        const effectiveness = 1 - (pattern ? (1 - pattern.successRate) * userProfile.learningRate : 0);
        updateChannelEffectiveness(channel.type, effectiveness);
      } catch (error) {
        console.error(`Error providing ${channel.type} feedback:`, error);
        updateChannelEffectiveness(channel.type, 0);
      }
    }

    // Track effectiveness and update patterns
    await Promise.all([
      trackFeedbackEffectiveness(metric, feedbackType),
      updateFeedbackPatterns(metric, feedbackType === 'success')
    ]);
  }, [
    exerciseKey,
    feedbackChannels,
    preferences,
    trackFeedbackEffectiveness,
    updateChannelEffectiveness,
    updateFeedbackPatterns,
    userProfile,
    userProgression,
    feedbackPatterns,
    getAdaptiveThresholds
  ]);

  // Audio feedback with sensitivity
  const provideAudioFeedback = async (type: string, priority: string, sensitivity: number) => {
    if (!window.AudioContext) return;

    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const baseFrequency = type === 'error' ? 440 : 880;
    const frequency = baseFrequency * (1 + (sensitivity - 0.5));
    const duration = priority === 'high' 
      ? 0.3 * sensitivity 
      : priority === 'medium' 
        ? 0.2 * sensitivity 
        : 0.1 * sensitivity;

    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1 * sensitivity, audioContext.currentTime);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  };

  // Visual feedback with sensitivity
  const provideVisualFeedback = async (type: string, priority: string, sensitivity: number) => {
    // Visual feedback is handled by UI components with sensitivity
    return Promise.resolve();
  };

  // Haptic feedback with sensitivity
  const provideHapticFeedback = async (type: string, priority: string, sensitivity: number) => {
    if (!navigator.vibrate) return;

    const basePattern = type === 'error'
      ? [100, 50, 100]
      : [50, 50, 50];

    const pattern = basePattern.map(duration => Math.round(duration * sensitivity));
    navigator.vibrate(pattern);
    return Promise.resolve();
  };

  // Monitor metrics with adaptive thresholds
  useEffect(() => {
    const metrics = Object.entries(currentMetrics);
    const adaptiveThresholds = getAdaptiveThresholds();

    metrics.forEach(([metric, value]) => {
      const threshold = adaptiveThresholds[metric as keyof typeof adaptiveThresholds];
      if (value !== undefined) {
        provideFeedback(metric, value, threshold);
      }
    });
  }, [currentMetrics, provideFeedback, getAdaptiveThresholds]);

  // Handle preference changes
  const handlePreferenceChange = (channelType: string, enabled: boolean) => {
    const newPreferences = {
      ...preferences,
      [`${channelType}Enabled`]: enabled
    };
    onPreferenceChange(newPreferences);
  };

  return (
    <div className="form-analysis-feedback-manager">
      <div className="feedback-channels">
        {feedbackChannels.map(channel => (
          <motion.div
            key={channel.type}
            className={`feedback-channel ${channel.enabled ? 'active' : ''}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="channel-header">
              <h4>{channel.type.charAt(0).toUpperCase() + channel.type.slice(1)} Feedback</h4>
              <div className="channel-status">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={channel.enabled}
                    onChange={(e) => handlePreferenceChange(channel.type, e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
                <span className="effectiveness">
                  Effectiveness: {Math.round(channel.effectiveness * 100)}%
                </span>
              </div>
            </div>
            <div className="channel-metrics">
              {effectivenessData
                .filter(data => data.metric)
                .map(data => (
                  <div key={data.metric} className="metric-item">
                    <span className="metric-name">{data.metric}</span>
                    <div className="metric-progress">
                      <div
                        className="progress-bar"
                        style={{ width: `${data.improvement * 100}%` }}
                      />
                    </div>
                    <span className="metric-value">
                      {Math.round(data.improvement * 100)}%
                    </span>
                  </div>
                ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}; 