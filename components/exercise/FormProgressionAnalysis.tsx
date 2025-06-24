import { useState, useEffect } from 'react';
import { ExerciseFormCheck } from '@/lib/validations/exerciseForm';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  AlertCircle,
  Info,
  Target,
  BarChart3,
  Calendar,
  Clock,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FormProgressionAnalysisProps {
  checks: ExerciseFormCheck[];
  currentCheck: ExerciseFormCheck;
}

interface ProgressionMetrics {
  weeklyProgress: number;
  monthlyProgress: number;
  consistencyStreak: number;
  bestAreas: string[];
  improvementAreas: string[];
  timeBasedAnalysis: {
    morning: number;
    afternoon: number;
    evening: number;
  };
  dayBasedAnalysis: {
    [key: string]: number;
  };
  realTimeMetrics: {
    currentAccuracy: number;
    formStability: number;
    movementEfficiency: number;
    lastUpdate: Date;
  };
}

export function FormProgressionAnalysis({
  checks,
  currentCheck,
}: FormProgressionAnalysisProps) {
  const [metrics, setMetrics] = useState<ProgressionMetrics>({
    weeklyProgress: 0,
    monthlyProgress: 0,
    consistencyStreak: 0,
    bestAreas: [],
    improvementAreas: [],
    timeBasedAnalysis: {
      morning: 0,
      afternoon: 0,
      evening: 0,
    },
    dayBasedAnalysis: {},
    realTimeMetrics: {
      currentAccuracy: 0,
      formStability: 0,
      movementEfficiency: 0,
      lastUpdate: new Date(),
    }
  });

  useEffect(() => {
    if (!currentCheck || !checks.length) return;

    // Calculate progression metrics
    const weeklyProgress = calculateWeeklyProgress(checks);
    const monthlyProgress = calculateMonthlyProgress(checks);
    const consistencyStreak = calculateConsistencyStreak(checks);
    const { bestAreas, improvementAreas } = analyzeAreas(checks);
    const timeBasedAnalysis = analyzeTimeBasedPerformance(checks);
    const dayBasedAnalysis = analyzeDayBasedPerformance(checks);
    const realTimeMetrics = calculateRealTimeMetrics(currentCheck);

    setMetrics({
      weeklyProgress,
      monthlyProgress,
      consistencyStreak,
      bestAreas,
      improvementAreas,
      timeBasedAnalysis,
      dayBasedAnalysis,
      realTimeMetrics
    });

    // Track performance metrics
    trackPerformanceMetrics(realTimeMetrics);
  }, [checks, currentCheck]);

  const calculateWeeklyProgress = (checks: ExerciseFormCheck[]): number => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentChecks = checks.filter(
      (check) => new Date(check.timestamp) >= oneWeekAgo
    );
    
    if (recentChecks.length === 0) return 0;
    
    const scores = recentChecks.map((check) => {
      const completed = check.checklist.filter((item) => item.completed).length;
      return (completed / check.checklist.length) * 100;
    });
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  };

  const calculateMonthlyProgress = (checks: ExerciseFormCheck[]): number => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const recentChecks = checks.filter(
      (check) => new Date(check.timestamp) >= oneMonthAgo
    );
    
    if (recentChecks.length === 0) return 0;
    
    const scores = recentChecks.map((check) => {
      const completed = check.checklist.filter((item) => item.completed).length;
      return (completed / check.checklist.length) * 100;
    });
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  };

  const calculateConsistencyStreak = (checks: ExerciseFormCheck[]): number => {
    let streak = 0;
    const sortedChecks = [...checks].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    for (const check of sortedChecks) {
      const completed = check.checklist.filter((item) => item.completed).length;
      const score = (completed / check.checklist.length) * 100;
      
      if (score >= 80) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const analyzeAreas = (checks: ExerciseFormCheck[]) => {
    const areas = ['upper_body', 'lower_body', 'core', 'posture'];
    const areaScores: { [key: string]: number } = {};
    
    areas.forEach((area) => {
      const recentChecks = checks.slice(-5);
      const scores = recentChecks.map((check) => {
        const areaItems = check.checklist.filter((item) =>
          item.item.toLowerCase().includes(area)
        );
        if (areaItems.length === 0) return 100;
        const completed = areaItems.filter((item) => item.completed).length;
        return (completed / areaItems.length) * 100;
      });
      
      areaScores[area] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    });
    
    const sortedAreas = Object.entries(areaScores)
      .sort(([, a], [, b]) => b - a)
      .map(([area]) => area);
    
    return {
      bestAreas: sortedAreas.slice(0, 2),
      improvementAreas: sortedAreas.slice(-2),
    };
  };

  const analyzeTimeBasedPerformance = (checks: ExerciseFormCheck[]) => {
    const timeBasedScores = {
      morning: 0,
      afternoon: 0,
      evening: 0,
    };
    
    const timeBasedCounts = {
      morning: 0,
      afternoon: 0,
      evening: 0,
    };
    
    checks.forEach((check) => {
      const hour = new Date(check.timestamp).getHours();
      let timeOfDay: keyof typeof timeBasedScores;
      
      if (hour >= 5 && hour < 12) {
        timeOfDay = 'morning';
      } else if (hour >= 12 && hour < 17) {
        timeOfDay = 'afternoon';
      } else {
        timeOfDay = 'evening';
      }
      
      const completed = check.checklist.filter((item) => item.completed).length;
      const score = (completed / check.checklist.length) * 100;
      
      timeBasedScores[timeOfDay] += score;
      timeBasedCounts[timeOfDay]++;
    });
    
    Object.keys(timeBasedScores).forEach((timeOfDay) => {
      const key = timeOfDay as keyof typeof timeBasedScores;
      timeBasedScores[key] = timeBasedCounts[key] > 0
        ? timeBasedScores[key] / timeBasedCounts[key]
        : 0;
    });
    
    return timeBasedScores;
  };

  const analyzeDayBasedPerformance = (checks: ExerciseFormCheck[]) => {
    const dayScores: { [key: string]: number } = {};
    const dayCounts: { [key: string]: number } = {};
    
    checks.forEach((check) => {
      const day = new Date(check.timestamp).toLocaleDateString('en-US', { weekday: 'long' });
      const completed = check.checklist.filter((item) => item.completed).length;
      const score = (completed / check.checklist.length) * 100;
      
      dayScores[day] = (dayScores[day] || 0) + score;
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    
    Object.keys(dayScores).forEach((day) => {
      dayScores[day] = dayScores[day] / dayCounts[day];
    });
    
    return dayScores;
  };

  const calculateRealTimeMetrics = (check: ExerciseFormCheck) => {
    const now = new Date();
    const accuracy = calculateFormAccuracy(check);
    const stability = calculateFormStability(check);
    const efficiency = calculateMovementEfficiency(check);

    return {
      currentAccuracy: accuracy,
      formStability: stability,
      movementEfficiency: efficiency,
      lastUpdate: now
    };
  };

  const calculateFormAccuracy = (check: ExerciseFormCheck): number => {
    const completed = check.checklist.filter(item => item.completed).length;
    const total = check.checklist.length;
    return (completed / total) * 100;
  };

  const calculateFormStability = (check: ExerciseFormCheck): number => {
    try {
      // Calculate stability based on form consistency with weighted metrics
      const stabilityScores = check.checklist.map(item => {
        if (!item.metrics) return 0;
        
        // Weight different aspects of stability
        const weights = {
          stability: 0.4,
          consistency: 0.3,
          alignment: 0.3
        };
        
        const metrics = item.metrics;
        const weightedScore = 
          (metrics.stability || 0) * weights.stability +
          (metrics.consistency || 0) * weights.consistency +
          (metrics.alignment || 0) * weights.alignment;
          
        return weightedScore;
      });
      
      // Filter out invalid scores and calculate average
      const validScores = stabilityScores.filter(score => !isNaN(score) && score >= 0);
      if (validScores.length === 0) return 0;
      
      return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
    } catch (error) {
      console.error('Error calculating form stability:', error);
      return 0;
    }
  };

  const calculateMovementEfficiency = (check: ExerciseFormCheck): number => {
    // Calculate movement efficiency based on form metrics
    const efficiencyScores = check.checklist.map(item => {
      if (!item.metrics) return 0;
      return item.metrics.efficiency || 0;
    });
    return efficiencyScores.reduce((sum, score) => sum + score, 0) / efficiencyScores.length;
  };

  const trackPerformanceMetrics = (metrics: any) => {
    // Track metrics in performance monitor
    if (window.performanceMonitor) {
      window.performanceMonitor.trackExerciseMetric('formTrackingAccuracy', {
        value: metrics.currentAccuracy,
        timestamp: Date.now()
      });
      window.performanceMonitor.trackExerciseMetric('formStability', {
        value: metrics.formStability,
        timestamp: Date.now()
      });
      window.performanceMonitor.trackExerciseMetric('movementEfficiency', {
        value: metrics.movementEfficiency,
        timestamp: Date.now()
      });
    }
  };

  const getProgressIcon = (progress: number) => {
    if (progress > 0) return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    if (progress < 0) return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
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
        <h3 className="text-lg font-semibold">Form Progression Analysis</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-5 h-5 text-gray-400" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Detailed analysis of your form progression patterns</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Real-time Form Analysis</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Form Accuracy:</span>
                <span className="font-medium">{metrics.realTimeMetrics.currentAccuracy.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Form Stability:</span>
                <span className="font-medium">{metrics.realTimeMetrics.formStability.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Movement Efficiency:</span>
                <span className="font-medium">{metrics.realTimeMetrics.movementEfficiency.toFixed(1)}%</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Progress Overview</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Weekly Progress:</span>
                <span className="font-medium">{metrics.weeklyProgress.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Monthly Progress:</span>
                <span className="font-medium">{metrics.monthlyProgress.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Consistency Streak:</span>
                <span className="font-medium">{metrics.consistencyStreak} days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Weekly Progress</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-lg">
                {Math.round(metrics.weeklyProgress)}%
              </Badge>
              {getProgressIcon(metrics.weeklyProgress)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              <span className="font-medium">Monthly Progress</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-lg">
                {Math.round(metrics.monthlyProgress)}%
              </Badge>
              {getProgressIcon(metrics.monthlyProgress)}
            </div>
          </div>
        </div>

        {/* Consistency Streak */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-yellow-500" />
            <span className="font-medium">Consistency Streak</span>
          </div>
          <Badge variant="outline" className="text-lg">
            {metrics.consistencyStreak} days
          </Badge>
        </div>

        {/* Best and Improvement Areas */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="font-medium">Best Areas</span>
            </div>
            <div className="space-y-1">
              {metrics.bestAreas.map((area) => (
                <Badge key={area} variant="outline" className="mr-2">
                  {formatAreaName(area)}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="font-medium">Need Improvement</span>
            </div>
            <div className="space-y-1">
              {metrics.improvementAreas.map((area) => (
                <Badge key={area} variant="outline" className="mr-2">
                  {formatAreaName(area)}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Time-based Analysis */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            <span className="font-medium">Time-based Performance</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(metrics.timeBasedAnalysis).map(([time, score]) => (
              <div key={time} className="space-y-1">
                <span className="text-sm text-gray-600 capitalize">{time}</span>
                <Badge variant="outline" className="text-sm">
                  {Math.round(score)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Day-based Analysis */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <span className="font-medium">Day-based Performance</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(metrics.dayBasedAnalysis).map(([day, score]) => (
              <div key={day} className="space-y-1">
                <span className="text-sm text-gray-600">{day.slice(0, 3)}</span>
                <Badge variant="outline" className="text-sm">
                  {Math.round(score)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
} 