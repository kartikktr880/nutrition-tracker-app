import { useState, useEffect, useCallback } from 'react';
import { analytics } from '../services/analytics';

interface UseAnalyticsOptions {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useAnalytics({ 
  userId, 
  period, 
  autoRefresh = true, 
  refreshInterval = 5 * 60 * 1000 // 5 minutes
}: UseAnalyticsOptions) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the available methods from analytics service
      const nutritionData = await analytics.trackEvent({
        category: 'nutrition_data',
        action: 'data_export',
        metadata: {}
      });
      
      setData({
        nutrition: nutritionData,
        goals: { achieved: 0, progress: {} },
        trends: { current: 0 }
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch analytics'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    let intervalId: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      intervalId = setInterval(fetchData, refreshInterval);
    }

    setIsInitialized(true);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [userId, period, autoRefresh, refreshInterval]);

  const refresh = () => {
    fetchData();
  };

  const trackEvent = useCallback((event: any) => {
    if (isInitialized) {
      analytics.trackEvent(event);
    }
  }, [isInitialized]);

  const trackError = useCallback((error: any) => {
    if (isInitialized) {
      analytics.trackError(error);
    }
  }, [isInitialized]);

  return {
    data,
    loading,
    error,
    refresh,
    trackEvent,
    trackError,
    isInitialized
  };
} 