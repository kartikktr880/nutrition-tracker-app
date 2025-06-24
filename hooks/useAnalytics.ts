import { useState, useEffect } from 'react';
import AnalyticsService from '@/services/analytics';

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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const analyticsService = AnalyticsService.getInstance();
      const analyticsData = await analyticsService.getAnalytics(userId, period);
      setData(analyticsData);
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

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [userId, period, autoRefresh, refreshInterval]);

  const refresh = () => {
    fetchData();
  };

  return {
    data,
    loading,
    error,
    refresh
  };
} 