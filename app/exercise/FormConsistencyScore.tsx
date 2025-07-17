import { AlertCircle, BarChart3, Info, Target, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipTrigger } from '@/components/ui/tooltip';
import { ExerciseFormCheck } from '@/lib/validations/exerciseForm';

interface FormConsistencyScoreProps {
  checks: ExerciseFormCheck[];
  currentCheck: ExerciseFormCheck;
}

interface ConsistencyMetrics {
  overallScore: number;
  criticalScore: number;
  areaScores: {
    [key: string]: number;
  };
  trend: 'improving' | 'declining' | 'stable';
}

export function FormConsistencyScore({
  checks,
  currentCheck,
}: FormConsistencyScoreProps) {
  const [metrics, setMetrics] = useState<ConsistencyMetrics>({
    overallScore: 0,
    criticalScore: 0,
    areaScores: {},
    trend: 'stable',
  });

  useEffect(() => {
    if (!currentCheck || !checks.length) return;

    // Calculate overall consistency score
    const overallScore = calculateOverallScore(checks);
    
    // Calculate critical form points score
    const criticalScore = calculateCriticalScore(checks);
    
    // Calculate area-specific scores
    const areaScores = calculateAreaScores(checks);
    
    // Determine trend
    const trend = calculateTrend(checks);

    setMetrics({
      overallScore,
      criticalScore,
      areaScores,
      trend,
    });
  }, [checks, currentCheck]);

  const calculateOverallScore = (checks: ExerciseFormCheck[]): number => {
    const recentChecks = checks.slice(-5); // Consider last 5 checks
    const scores = recentChecks.map((check) => {
      const completed = check.checklist.filter((item) => item.completed).length;
      return (completed / check.checklist.length) * 100;
    });
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  };

  const calculateCriticalScore = (checks: ExerciseFormCheck[]): number => {
    const recentChecks = checks.slice(-5);
    const scores = recentChecks.map((check) => {
      const criticalItems = check.checklist.filter(
        (item) => item.importance === 'critical'
      );
      const completed = criticalItems.filter((item) => item.completed).length;
      return (completed / criticalItems.length) * 100;
    });
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  };

  const calculateAreaScores = (checks: ExerciseFormCheck[]): { [key: string]: number } => {
    const areas = ['upper_body', 'lower_body', 'core', 'posture'];
    const scores: { [key: string]: number } = {};

    areas.forEach((area) => {
      const recentChecks = checks.slice(-5);
      const areaScores = recentChecks.map((check) => {
        const areaItems = check.checklist.filter((item) =>
          item.item.toLowerCase().includes(area)
        );
        if (areaItems.length === 0) return 100;
        const completed = areaItems.filter((item) => item.completed).length;
        return (completed / areaItems.length) * 100;
      });
      
      scores[area] = areaScores.reduce((sum, score) => sum + score, 0) / areaScores.length;
    });

    return scores;
  };

  const calculateTrend = (checks: ExerciseFormCheck[]): 'improving' | 'declining' | 'stable' => {
    if (checks.length < 2) return 'stable';
    
    const recentScores = checks.slice(-5).map((check) => {
      const completed = check.checklist.filter((item) => item.completed).length;
      return (completed / check.checklist.length) * 100;
    });

    const firstHalf = recentScores.slice(0, Math.floor(recentScores.length / 2));
    const secondHalf = recentScores.slice(Math.floor(recentScores.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
    
    const difference = secondAvg - firstAvg;
    
    if (Math.abs(difference) < 5) return 'stable';
    return difference > 0 ? 'improving' : 'declining';
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-500';
      case 'declining':
        return 'text-red-500';
      default:
        return 'text-yellow-500';
    }
  };

  const formatAreaName = (area: string) => {
    return area
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Form Consistency Score</h3>
        <Tooltip content="This section explains your overall form consistency score and how it's calculated.">
          <TooltipTrigger>
            <Info className="w-5 h-5 text-gray-400" />
          </TooltipTrigger>
        </Tooltip>
      </div>

      <div className="space-y-6">
        {/* Overall Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Overall Consistency</span>
            </div>
            <Badge variant="outline" className="text-lg">
              {Math.round(metrics.overallScore)}%
            </Badge>
          </div>
          <Progress value={metrics.overallScore} className="h-2" />
        </div>

        {/* Critical Form Points */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="font-medium">Critical Form Points</span>
            </div>
            <Badge variant="outline" className="text-lg">
              {Math.round(metrics.criticalScore)}%
            </Badge>
          </div>
          <Progress value={metrics.criticalScore} className="h-2" />
        </div>

        {/* Area-specific Scores */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            <span className="font-medium">Area Analysis</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(metrics.areaScores).map(([area, score]) => (
              <div key={area} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {formatAreaName(area)}
                  </span>
                  <Badge variant="outline" className="text-sm">
                    {Math.round(score)}%
                  </Badge>
                </div>
                <Progress value={score} className="h-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center space-x-2">
          <TrendingUp className={`w-5 h-5 ${getTrendColor(metrics.trend)}`} />
          <span className={`font-medium ${getTrendColor(metrics.trend)}`}>
            Form {metrics.trend.charAt(0).toUpperCase() + metrics.trend.slice(1)}
          </span>
        </div>

        <Tooltip content="View detailed breakdown of your form consistency analysis.">
          <TooltipTrigger>
            <Button variant="outline" size="sm">
              View Details
            </Button>
          </TooltipTrigger>
        </Tooltip>
      </div>
    </Card>
  );
} 