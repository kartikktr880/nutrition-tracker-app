import { useState, useEffect } from 'react';
import { ExerciseFormCheck } from '@/lib/validations/exerciseForm';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Lightbulb,
  Info,
  Target,
  AlertCircle,
  Clock,
  Calendar,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FormRecommendationEngineProps {
  checks: ExerciseFormCheck[];
  currentCheck: ExerciseFormCheck;
}

interface Recommendation {
  type: 'improvement' | 'maintenance' | 'warning';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
  impact: string;
}

interface RecommendationMetrics {
  recommendations: Recommendation[];
  focusAreas: string[];
  optimalTiming: string;
  nextSteps: string[];
}

export function FormRecommendationEngine({
  checks,
  currentCheck,
}: FormRecommendationEngineProps) {
  const [metrics, setMetrics] = useState<RecommendationMetrics>({
    recommendations: [],
    focusAreas: [],
    optimalTiming: '',
    nextSteps: [],
  });

  useEffect(() => {
    if (!currentCheck || !checks.length) return;

    const recommendations = generateRecommendations(checks, currentCheck);
    const focusAreas = identifyFocusAreas(checks);
    const optimalTiming = determineOptimalTiming(checks);
    const nextSteps = generateNextSteps(checks, currentCheck);

    setMetrics({
      recommendations,
      focusAreas,
      optimalTiming,
      nextSteps,
    });
  }, [checks, currentCheck]);

  const generateRecommendations = (
    checks: ExerciseFormCheck[],
    currentCheck: ExerciseFormCheck
  ): Recommendation[] => {
    const recommendations: Recommendation[] = [];

    // Analyze recent performance
    const recentChecks = checks.slice(-5);
    const recentScores = recentChecks.map((check) => {
      const completed = check.checklist.filter((item) => item.completed).length;
      return (completed / check.checklist.length) * 100;
    });

    const averageScore = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    const trend = recentScores[recentScores.length - 1] - recentScores[0];

    // Generate recommendations based on performance
    if (averageScore < 70) {
      recommendations.push({
        type: 'warning',
        title: 'Form Needs Attention',
        description: 'Your recent form scores indicate areas needing immediate attention.',
        priority: 'high',
        action: 'Review form checklist',
        impact: 'Prevent potential injury and improve effectiveness',
      });
    } else if (trend < -5) {
      recommendations.push({
        type: 'improvement',
        title: 'Form Consistency Declining',
        description: 'Your form consistency has decreased recently.',
        priority: 'medium',
        action: 'Focus on form fundamentals',
        impact: 'Maintain progress and prevent regression',
      });
    }

    // Analyze time-based patterns
    const timeBasedAnalysis = analyzeTimeBasedPatterns(checks);
    if (timeBasedAnalysis.optimalTime) {
      recommendations.push({
        type: 'maintenance',
        title: 'Optimal Training Time',
        description: `Your form is most consistent during ${timeBasedAnalysis.optimalTime}.`,
        priority: 'low',
        action: 'Schedule workouts accordingly',
        impact: 'Maximize form consistency',
      });
    }

    // Analyze area-specific patterns
    const areaAnalysis = analyzeAreaPatterns(checks);
    areaAnalysis.weakAreas.forEach((area) => {
      recommendations.push({
        type: 'improvement',
        title: `${area} Form Focus`,
        description: `Your ${area.toLowerCase()} form needs attention.`,
        priority: 'medium',
        action: 'Practice specific exercises',
        impact: 'Improve overall form quality',
      });
    });

    return recommendations;
  };

  const identifyFocusAreas = (checks: ExerciseFormCheck[]): string[] => {
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

    return Object.entries(areaScores)
      .filter(([, score]) => score < 80)
      .map(([area]) => area);
  };

  const determineOptimalTiming = (checks: ExerciseFormCheck[]): string => {
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

    let optimalTime = '';
    let highestScore = 0;

    Object.entries(timeBasedScores).forEach(([time, totalScore]) => {
      const count = timeBasedCounts[time as keyof typeof timeBasedScores];
      if (count > 0) {
        const averageScore = totalScore / count;
        if (averageScore > highestScore) {
          highestScore = averageScore;
          optimalTime = time;
        }
      }
    });

    return optimalTime;
  };

  const generateNextSteps = (
    checks: ExerciseFormCheck[],
    currentCheck: ExerciseFormCheck
  ): string[] => {
    const nextSteps: string[] = [];
    const recentChecks = checks.slice(-5);
    const averageScore = recentChecks.reduce((sum, check) => {
      const completed = check.checklist.filter((item) => item.completed).length;
      return sum + (completed / check.checklist.length) * 100;
    }, 0) / recentChecks.length;

    if (averageScore < 70) {
      nextSteps.push('Review form fundamentals');
      nextSteps.push('Practice with lighter weights');
      nextSteps.push('Record and analyze your form');
    } else if (averageScore < 85) {
      nextSteps.push('Focus on weak areas');
      nextSteps.push('Maintain current progress');
      nextSteps.push('Gradually increase intensity');
    } else {
      nextSteps.push('Maintain form consistency');
      nextSteps.push('Challenge with variations');
      nextSteps.push('Help others improve');
    }

    return nextSteps;
  };

  const analyzeTimeBasedPatterns = (checks: ExerciseFormCheck[]) => {
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

    let optimalTime = '';
    let highestScore = 0;

    Object.entries(timeBasedScores).forEach(([time, totalScore]) => {
      const count = timeBasedCounts[time as keyof typeof timeBasedScores];
      if (count > 0) {
        const averageScore = totalScore / count;
        if (averageScore > highestScore) {
          highestScore = averageScore;
          optimalTime = time;
        }
      }
    });

    return { optimalTime };
  };

  const analyzeAreaPatterns = (checks: ExerciseFormCheck[]) => {
    const areas = ['upper_body', 'lower_body', 'core', 'posture'];
    const areaScores: { [key: string]: number } = {};
    const weakAreas: string[] = [];

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
      if (areaScores[area] < 80) {
        weakAreas.push(area);
      }
    });

    return { weakAreas };
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'improvement':
        return <Target className="w-5 h-5 text-blue-500" />;
      case 'maintenance':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Form Recommendations</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-5 h-5 text-gray-400" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Personalized recommendations for form improvement</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="space-y-6">
        {/* Recommendations */}
        <div className="space-y-4">
          {metrics.recommendations.map((recommendation, index) => (
            <div
              key={index}
              className="p-4 border rounded-lg space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getRecommendationIcon(recommendation.type)}
                  <span className="font-medium">{recommendation.title}</span>
                </div>
                <Badge
                  variant="outline"
                  className={getPriorityColor(recommendation.priority)}
                >
                  {recommendation.priority}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{recommendation.description}</p>
              {recommendation.action && (
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    {recommendation.action}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <span className="text-sm text-gray-500">
                    Impact: {recommendation.impact}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Focus Areas */}
        {metrics.focusAreas.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Focus Areas</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {metrics.focusAreas.map((area) => (
                <Badge key={area} variant="outline">
                  {area.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Optimal Timing */}
        {metrics.optimalTiming && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              <span className="font-medium">Optimal Training Time</span>
            </div>
            <Badge variant="outline" className="text-lg">
              {metrics.optimalTiming.charAt(0).toUpperCase() + 
               metrics.optimalTiming.slice(1)}
            </Badge>
          </div>
        )}

        {/* Next Steps */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <span className="font-medium">Next Steps</span>
          </div>
          <div className="space-y-2">
            {metrics.nextSteps.map((step, index) => (
              <div key={index} className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
} 