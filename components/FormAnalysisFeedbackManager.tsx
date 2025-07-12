import { motion } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';

import { logError, logInfo } from '../utils/logger';

import '../styles/FormAnalysisFeedbackManager.css';

export const FormAnalysisFeedbackManager: React.FC<{
  exerciseKey: string;
  currentMetrics: {
    accuracy: number;
    stability: number;
    alignment: number;
    timing: number;
    consistency: number;
  };
  validationResult: Record<string, unknown>;
  preferences: {
    adaptationThreshold: number;
    feedbackFrequency: 'high' | 'medium' | 'low';
    channelPreferences: {
      visual: boolean;
      audio: boolean;
      haptic: boolean;
      analyticsEnabled: boolean;
    };
  };
  onPreferenceChange: (preferences: {
    adaptationThreshold: number;
    feedbackFrequency: 'high' | 'medium' | 'low';
    channelPreferences: {
      visual: boolean;
      audio: boolean;
      haptic: boolean;
      analyticsEnabled: boolean;
    };
  }) => void;
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
  preferences,
  onPreferenceChange,
  userProgression
}) => {
  const [feedbackChannels, _setFeedbackChannels] = useState<{ type: string; enabled: boolean; effectiveness: number; lastUsed: number }[]>([
    { type: 'audio', enabled: preferences.channelPreferences.audio, effectiveness: 0, lastUsed: 0 },
    { type: 'visual', enabled: preferences.channelPreferences.visual, effectiveness: 0, lastUsed: 0 },
    { type: 'haptic', enabled: preferences.channelPreferences.haptic, effectiveness: 0, lastUsed: 0 }
  ]);

  const [_feedbackPreferences, setFeedbackPreferences] = useState<{ channel: string; threshold: number; priority: string }[]>([]);
  const [effectivenessData, setEffectivenessData] = useState<{ metric: string; improvement: number; feedbackCount: number; acknowledgmentRate: number; averageResponseTime: number }[]>([]);
  const [feedbackPatterns, setFeedbackPatterns] = useState<{ metric: string; threshold: number; priority: string; frequency: number; successRate: number; lastUsed: number }[]>([]);
  const [userProfile, setUserProfile] = useState<{ preferredChannels: string[]; sensitivityLevels: { audio: number; visual: number; haptic: number }; learningRate: number; adaptationThreshold: number }>({
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
        // const analytics = validationAnalytics;
        const [savedPreferences, savedProfile, savedPatterns] = await Promise.all([
          // analytics.getFeedbackPreferences(exerciseKey),
          // analytics.getUserFeedbackProfile(exerciseKey),
          // analytics.getFeedbackPatterns(exerciseKey)
          Promise.resolve(null),
          Promise.resolve(null),
          Promise.resolve(null)
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
        logError('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [exerciseKey]);

  // Track feedback effectiveness
  const trackFeedbackEffectiveness = useCallback(async (metric: string) => {
    if (!preferences.channelPreferences.analyticsEnabled) return;
    try {
      setEffectivenessData(prev => {
        const newData = [...prev];
        const index = newData.findIndex(d => d.metric === metric);
        if (index >= 0) {
          newData[index] = { ...newData[index] };
        } else {
          newData.push({ 
            metric, 
            improvement: 0,
            feedbackCount: 0,
            acknowledgmentRate: 0,
            averageResponseTime: 0
          });
        }
        return newData;
      });
    } catch (error) {
      logError('Error tracking feedback effectiveness:', error);
    }
  }, [preferences.channelPreferences.analyticsEnabled]);

  // Update feedback patterns
  const updateFeedbackPatterns = useCallback(async (metric: string, success: boolean) => {
    // const analytics = validationAnalytics;
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

      // await analytics.updateFeedbackPattern(exerciseKey, updatedPattern);
    }
  }, [feedbackPatterns]);

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
  }, [userProgression, exerciseKey]);

  // Update channel effectiveness
  const updateChannelEffectiveness = useCallback((_channelType: string, _effectiveness: number) => {
    logInfo(`Updating channel effectiveness`);
  }, []);

  // Provide feedback with pattern learning
  const provideFeedback = useCallback(async (metric: string, value: number, threshold: number) => {
    // const analytics = validationAnalytics;
    const adaptiveThresholds = getAdaptiveThresholds();
    const currentThreshold = adaptiveThresholds[metric as keyof typeof adaptiveThresholds] || threshold;

    // Determine feedback type and priority
    const pattern = feedbackPatterns.find(p => p.metric === metric);
    const feedbackType = value < currentThreshold ? 'error' : 'success';

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
            if (preferences.channelPreferences.audio) {
              await provideAudioFeedback(sensitivity);
            }
            break;
          case 'visual':
            if (preferences.channelPreferences.visual) {
              await provideVisualFeedback();
            }
            break;
          case 'haptic':
            if (preferences.channelPreferences.haptic) {
              await provideHapticFeedback();
            }
            break;
        }

        // Track feedback delivery
        // if (preferences.channelPreferences.analyticsEnabled) {
        //   await analytics.recordFeedbackDelivery({
        //     exerciseKey,
        //     metric,
        //     channelType: channel.type,
        //     feedbackType,
        //     priority,
        //     timestamp,
        //     patternId: pattern?.metric,
        //     userLevel: userProgression?.level,
        //     sensitivity
        //   });
        // }

        // Update effectiveness
        const effectiveness = 1 - (pattern ? (1 - pattern.successRate) * userProfile.learningRate : 0);
        updateChannelEffectiveness(channel.type, effectiveness);
      } catch (error) {
        logError(`Error providing ${channel.type} feedback:`, error);
        updateChannelEffectiveness(channel.type, 0);
      }
    }

    // Track effectiveness and update patterns
    await Promise.all([
      trackFeedbackEffectiveness(metric),
      updateFeedbackPatterns(metric, feedbackType === 'success')
    ]);
  }, [
    feedbackChannels,
    preferences,
    trackFeedbackEffectiveness,
    updateChannelEffectiveness,
    updateFeedbackPatterns,
    userProfile,
    feedbackPatterns,
    getAdaptiveThresholds
  ]);

  // Audio feedback with sensitivity
  const provideAudioFeedback = async (sensitivity: number) => {
    if (!window.AudioContext) return;

    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const baseFrequency = 880;
    const frequency = baseFrequency * (1 + (sensitivity - 0.5));
    const duration = 0.2 * sensitivity;

    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1 * sensitivity, audioContext.currentTime);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  };

  // Visual feedback with sensitivity
  const provideVisualFeedback = async () => {
    // Visual feedback is handled by UI components with sensitivity
    return Promise.resolve();
  };

  // Haptic feedback with sensitivity
  const provideHapticFeedback = async () => {
    if (!navigator.vibrate) return;

    const basePattern = [50, 50, 50];
    const pattern = basePattern.map(duration => Math.round(duration * 0.5));
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
      channelPreferences: {
        ...preferences.channelPreferences,
        [`${channelType}Enabled`]: enabled
      }
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