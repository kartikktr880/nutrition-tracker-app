import React, { useCallback, useEffect, useState } from 'react';

interface MealRecommendation {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  reason: string;
}

interface MealRecommendationsProps {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  onSelect?: (meal: MealRecommendation) => void;
}

const MealCard: React.FC<{ meal: MealRecommendation; onSelect?: (meal: MealRecommendation) => void }> = ({ meal, onSelect }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async () => {
    if (onSelect) {
      setIsLoading(true);
      setError(null);
      try {
        await onSelect(meal);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to select meal');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-md p-4 h-full flex flex-col cursor-pointer transition-transform hover:scale-105 relative ${
        onSelect ? 'hover:shadow-lg' : ''
      }`}
      onClick={handleSelect}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10 p-4">
          <p className="text-red-500 text-center text-sm">{error}</p>
        </div>
      )}
      <div className="flex-1">
        <h3 className="text-lg font-semibold mb-2">{meal.name}</h3>
        
        <div className="mb-4">
          <p className="text-gray-600 text-sm">{meal.calories} calories</p>
          <p className="text-gray-600 text-sm">
            Protein: {meal.protein}g | Carbs: {meal.carbs}g | Fat: {meal.fat}g
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
            {Math.round(meal.confidence * 100)}% match
          </span>
          {meal.reason.split(', ').map((reason, index) => (
            <span
              key={index}
              className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded border"
            >
              {reason}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const MealCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md p-4 h-full">
    <div className="animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-3/5 mb-2"></div>
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-gray-200 rounded w-2/5"></div>
        <div className="h-4 bg-gray-200 rounded w-4/5"></div>
      </div>
      <div className="flex gap-2">
        <div className="h-6 bg-gray-200 rounded w-20"></div>
        <div className="h-6 bg-gray-200 rounded w-24"></div>
      </div>
    </div>
  </div>
);

const MealRecommendations: React.FC<MealRecommendationsProps> = ({ mealType, onSelect }) => {
  const [recommendations, setRecommendations] = useState<MealRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const validateRecommendations = (data: unknown): MealRecommendation[] => {
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format');
    }

    return data.map((item: Record<string, unknown>) => {
      if (!item.id || !item.name || typeof item.calories !== 'number') {
        throw new Error('Invalid meal data format');
      }
      return {
        id: item.id as string,
        name: item.name as string,
        calories: item.calories as number,
        protein: (item.protein as number) || 0,
        carbs: (item.carbs as number) || 0,
        fat: (item.fat as number) || 0,
        confidence: (item.confidence as number) || 0,
        reason: (item.reason as string) || ''
      };
    });
  };

  const fetchRecommendations = useCallback(async (isRetry = false) => {
    if (!isMounted) return;

    try {
      if (!isRetry) {
        setLoading(true);
      }
      setError(null);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`/api/recommendations/meals?mealType=${mealType}`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a minute before trying again.');
        }
        throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const validatedData = validateRecommendations(data);
      
      if (isMounted) {
        setRecommendations(validatedData);
        setRetryCount(0);
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (err) {
      if (!isMounted) return;
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else if (err.message.includes('Too many requests')) {
          setError(err.message);
          // Don't retry on rate limit
          return;
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred');
      }

      if (retryCount < 3) {
        setTimeout(() => {
          if (isMounted) {
            setRetryCount(prev => prev + 1);
            fetchRecommendations(true);
          }
        }, 1000 * Math.pow(2, retryCount)); // Exponential backoff
      }
    } finally {
      if (isMounted) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [mealType, retryCount, isMounted]);

  const handleRefresh = useCallback(() => {
    if (!isMounted || isRefreshing) return;
    setIsRefreshing(true);
    setRetryCount(0);
    fetchRecommendations();
  }, [fetchRecommendations, isMounted, isRefreshing]);

  useEffect(() => {
    setIsMounted(true);
    fetchRecommendations();

    return () => {
      setIsMounted(false);
    };
  }, [fetchRecommendations]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdated && Date.now() - lastUpdated.getTime() > 5 * 60 * 1000) { // 5 minutes
        handleRefresh();
      }
    }, 60 * 1000); // Check every minute

    return () => {
      clearInterval(interval);
    };
  }, [lastUpdated, handleRefresh]);

  if (loading && !isRefreshing) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((index) => (
          <div key={index} className="col-span-1">
            <MealCardSkeleton />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
        <p className="text-red-500">{error}</p>
        {retryCount < 3 ? (
          <p className="text-gray-600 text-sm">
            Retrying... ({retryCount + 1}/3)
          </p>
        ) : (
          <button 
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => {
              setRetryCount(0);
              fetchRecommendations();
            }}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Retrying...' : 'Retry'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">
          Recommended Meals
          {lastUpdated && (
            <span className="text-gray-600 text-sm ml-2">
              (Last updated: {lastUpdated.toLocaleTimeString()})
            </span>
          )}
        </h2>
        <button
          className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {recommendations.map((meal) => (
          <div key={meal.id} className="col-span-1">
            <MealCard meal={meal} onSelect={onSelect} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MealRecommendations; 