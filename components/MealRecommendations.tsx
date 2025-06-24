import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, Typography, Grid, Chip, CircularProgress, Box, Button, Skeleton } from '@mui/material';
import { useTheme } from '@mui/material/styles';

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
  const theme = useTheme();

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
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: onSelect ? 'scale(1.02)' : 'none',
          boxShadow: theme.shadows[4]
        },
        position: 'relative'
      }}
      onClick={handleSelect}
    >
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 1
          }}
        >
          <CircularProgress size={24} />
        </Box>
      )}
      {error && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            zIndex: 1,
            p: 2
          }}
        >
          <Typography color="error" align="center">
            {error}
          </Typography>
        </Box>
      )}
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {meal.name}
        </Typography>
        
        <Box mb={2}>
          <Typography variant="body2" color="text.secondary">
            {meal.calories} calories
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Protein: {meal.protein}g | Carbs: {meal.carbs}g | Fat: {meal.fat}g
          </Typography>
        </Box>

        <Box display="flex" flexWrap="wrap" gap={1}>
          <Chip 
            label={`${Math.round(meal.confidence * 100)}% match`}
            color="primary"
            size="small"
          />
          {meal.reason.split(', ').map((reason, index) => (
            <Chip
              key={index}
              label={reason}
              variant="outlined"
              size="small"
            />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

const MealCardSkeleton = () => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Skeleton variant="text" width="60%" height={32} />
      <Box mb={2}>
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="80%" />
      </Box>
      <Box display="flex" gap={1}>
        <Skeleton variant="rounded" width={80} height={24} />
        <Skeleton variant="rounded" width={120} height={24} />
      </Box>
    </CardContent>
  </Card>
);

const MealRecommendations: React.FC<MealRecommendationsProps> = ({ mealType, onSelect }) => {
  const [recommendations, setRecommendations] = useState<MealRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const theme = useTheme();

  const validateRecommendations = (data: any): MealRecommendation[] => {
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format');
    }

    return data.map((item: any) => {
      if (!item.id || !item.name || typeof item.calories !== 'number') {
        throw new Error('Invalid meal data format');
      }
      return {
        id: item.id,
        name: item.name,
        calories: item.calories,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        confidence: item.confidence || 0,
        reason: item.reason || ''
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
      <Grid container spacing={2}>
        {[1, 2, 3, 4, 5, 6].map((index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <MealCardSkeleton />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="200px" gap={2}>
        <Typography color="error">{error}</Typography>
        {retryCount < 3 ? (
          <Typography variant="body2" color="text.secondary">
            Retrying... ({retryCount + 1}/3)
          </Typography>
        ) : (
          <Button 
            variant="contained" 
            onClick={() => {
              setRetryCount(0);
              fetchRecommendations();
            }}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Retrying...' : 'Retry'}
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Recommended Meals
          {lastUpdated && (
            <Typography component="span" variant="caption" color="text.secondary" ml={1}>
              (Last updated: {lastUpdated.toLocaleTimeString()})
            </Typography>
          )}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={handleRefresh}
          disabled={isRefreshing}
          startIcon={isRefreshing ? <CircularProgress size={16} /> : null}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>
      <Grid container spacing={2}>
        {recommendations.map((meal) => (
          <Grid item xs={12} sm={6} md={4} key={meal.id}>
            <MealCard meal={meal} onSelect={onSelect} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default MealRecommendations; 